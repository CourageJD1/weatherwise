import { LocationNotFoundError, UpstreamApiError } from './errors.js';

// Open-Meteo endpoints (parameter names verified against the live docs,
// see docs/PLAN.md decision 2). No API key required.
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// The archive API trails real time by ~5 days; use 6 for safety margin.
// Dates newer than (today - ARCHIVE_LAG_DAYS) are served by the forecast
// API's past_days parameter instead (plan decision 2).
const ARCHIVE_LAG_DAYS = 6;

// Matches coordinate-shaped input like "40.7,-74.0" (plan decision 4).
const COORD_REGEX = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/* ---------------------------------- helpers --------------------------------- */

// All Open-Meteo calls go through here so network failures and API error
// bodies ({ error: true, reason }) become one typed UpstreamApiError.
async function fetchJson(baseUrl, params) {
  const url = `${baseUrl}?${new URLSearchParams(params)}`;
  let res;
  try {
    res = await fetch(url);
  } catch (cause) {
    throw new UpstreamApiError(`Could not reach Open-Meteo: ${cause.message}`);
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body; fall through to the status check below.
  }
  if (!res.ok || body?.error) {
    throw new UpstreamApiError(body?.reason || `Open-Meteo responded with HTTP ${res.status}`);
  }
  return body;
}

// Dates are handled as YYYY-MM-DD strings throughout (project convention);
// they compare correctly with plain string comparison.
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  return Math.round((new Date(toIso) - new Date(fromIso)) / 86_400_000);
}

// Open-Meteo returns daily data as parallel arrays keyed by variable name;
// reshape into one object per day, matching the weather_data shape in the
// agreed schema: { date, tempMax, tempMin, weatherCode, precipitationProbability }.
function mapDailyToDays(daily) {
  return daily.time.map((date, i) => ({
    date,
    tempMax: daily.temperature_2m_max[i],
    tempMin: daily.temperature_2m_min[i],
    weatherCode: daily.weather_code[i],
    // Archive responses have no probability (past weather is observed, not
    // predicted), so this stays null for archive days.
    precipitationProbability: daily.precipitation_probability_max?.[i] ?? null,
  }));
}

/* ---------------------------------- geocoding ------------------------------- */

// Accepts a city, town, landmark, or postal code — the geocoding API handles
// all of those under its single `name` parameter — or a raw "lat,lon" string,
// which bypasses the geocoder entirely. Returns an array of candidates
// (top-ranked first) so callers can take [0] or offer a picker.
export async function geocode(query) {
  const trimmed = String(query ?? '').trim();
  if (!trimmed) throw new LocationNotFoundError(query);

  const coordMatch = trimmed.match(COORD_REGEX);
  if (coordMatch) {
    const lat = Number(coordMatch[1]);
    const lon = Number(coordMatch[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new LocationNotFoundError(query);
    }
    return [{ name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, country: null, admin1: null, lat, lon }];
  }

  const data = await fetchJson(GEOCODE_URL, { name: trimmed, count: 5, language: 'en', format: 'json' });
  if (!data.results?.length) throw new LocationNotFoundError(query);

  return data.results.map((r) => ({
    name: r.name,
    country: r.country ?? null,
    admin1: r.admin1 ?? null, // region/state, useful to disambiguate duplicates
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/* --------------------------------- conditions ------------------------------- */

export async function getCurrent(lat, lon) {
  const data = await fetchJson(FORECAST_URL, {
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'is_day',
    ].join(','),
    timezone: 'auto',
  });
  const c = data.current;
  return {
    time: c.time,
    timezone: data.timezone,
    temperature: c.temperature_2m,
    apparentTemperature: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    precipitation: c.precipitation,
    weatherCode: c.weather_code,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    windGusts: c.wind_gusts_10m,
    isDay: c.is_day === 1,
  };
}

export async function getForecast(lat, lon) {
  const data = await fetchJson(FORECAST_URL, {
    latitude: lat,
    longitude: lon,
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
    forecast_days: 5,
    timezone: 'auto',
  });
  return mapDailyToDays(data.daily);
}

/* --------------------------------- historical ------------------------------- */

// Fetches daily data for [startDate, endDate], splitting the range at the
// archive cutoff: older dates come from the archive API, the last ~5 days
// (which the archive hasn't ingested yet) come from the forecast API via
// past_days (plan decision 2). Both halves are fetched in parallel and merged.
export async function getHistorical(lat, lon, startDate, endDate) {
  const cutoff = addDaysIso(todayIso(), -ARCHIVE_LAG_DAYS); // newest date the archive reliably has
  const tasks = [];

  if (startDate <= cutoff) {
    const archiveEnd = endDate <= cutoff ? endDate : cutoff;
    tasks.push(fetchArchiveDays(lat, lon, startDate, archiveEnd));
  }
  if (endDate > cutoff) {
    const recentStart = startDate > cutoff ? startDate : addDaysIso(cutoff, 1);
    tasks.push(fetchRecentPastDays(lat, lon, recentStart, endDate));
  }

  const parts = await Promise.all(tasks);
  return parts.flat().sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchArchiveDays(lat, lon, startDate, endDate) {
  const data = await fetchJson(ARCHIVE_URL, {
    latitude: lat,
    longitude: lon,
    start_date: startDate,
    end_date: endDate,
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
  });
  return mapDailyToDays(data.daily);
}

// The forecast API's past_days parameter (max 92) returns recent past days
// the archive lags on. It always counts back from today, so we request enough
// days to cover the range, then trim the response to exactly [from, to].
async function fetchRecentPastDays(lat, lon, from, to) {
  // past_days/forecast_days count from "today" in the LOCATION'S timezone
  // (we pass timezone=auto), which can differ from our UTC today by one day
  // in either direction. Over-fetch a day on each side to absorb that; the
  // filter below trims the result to exactly [from, to].
  const today = todayIso();
  const pastDays = Math.min(92, Math.max(0, daysBetween(from, today) + 1));
  const forecastDays = Math.min(16, Math.max(0, daysBetween(today, to) + 2));

  const data = await fetchJson(FORECAST_URL, {
    latitude: lat,
    longitude: lon,
    past_days: pastDays,
    forecast_days: forecastDays,
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
    timezone: 'auto',
  });
  return mapDailyToDays(data.daily).filter((d) => d.date >= from && d.date <= to);
}

/* --------------------------------- air quality ------------------------------ */

export async function getAirQuality(lat, lon) {
  const data = await fetchJson(AIR_QUALITY_URL, {
    latitude: lat,
    longitude: lon,
    current: 'us_aqi,european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide',
    timezone: 'auto',
  });
  const c = data.current;
  return {
    time: c.time,
    usAqi: c.us_aqi,
    europeanAqi: c.european_aqi,
    pm2_5: c.pm2_5,
    pm10: c.pm10,
    ozone: c.ozone,
    nitrogenDioxide: c.nitrogen_dioxide,
  };
}
