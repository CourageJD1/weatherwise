// Presentational card for current conditions. Receives the backend's
// { location, current } payload untouched and does formatting only.

// WMO weather codes (what Open-Meteo's weather_code field contains) mapped
// to a label and an icon. Codes 0-2 get day/night icon variants via is_day.
const WEATHER_CODES = {
  0: { label: 'Clear sky', day: '☀️', night: '🌕' },
  1: { label: 'Mainly clear', day: '🌤️', night: '🌕' },
  2: { label: 'Partly cloudy', day: '⛅', night: '☁️' },
  3: { label: 'Overcast', day: '☁️', night: '☁️' },
  45: { label: 'Fog', day: '🌫️', night: '🌫️' },
  48: { label: 'Depositing rime fog', day: '🌫️', night: '🌫️' },
  51: { label: 'Light drizzle', day: '🌦️', night: '🌧️' },
  53: { label: 'Drizzle', day: '🌦️', night: '🌧️' },
  55: { label: 'Dense drizzle', day: '🌧️', night: '🌧️' },
  56: { label: 'Freezing drizzle', day: '🌧️', night: '🌧️' },
  57: { label: 'Dense freezing drizzle', day: '🌧️', night: '🌧️' },
  61: { label: 'Light rain', day: '🌦️', night: '🌧️' },
  63: { label: 'Rain', day: '🌧️', night: '🌧️' },
  65: { label: 'Heavy rain', day: '🌧️', night: '🌧️' },
  66: { label: 'Freezing rain', day: '🌧️', night: '🌧️' },
  67: { label: 'Heavy freezing rain', day: '🌧️', night: '🌧️' },
  71: { label: 'Light snow', day: '🌨️', night: '🌨️' },
  73: { label: 'Snow', day: '🌨️', night: '🌨️' },
  75: { label: 'Heavy snow', day: '❄️', night: '❄️' },
  77: { label: 'Snow grains', day: '🌨️', night: '🌨️' },
  80: { label: 'Light rain showers', day: '🌦️', night: '🌧️' },
  81: { label: 'Rain showers', day: '🌧️', night: '🌧️' },
  82: { label: 'Violent rain showers', day: '⛈️', night: '⛈️' },
  85: { label: 'Snow showers', day: '🌨️', night: '🌨️' },
  86: { label: 'Heavy snow showers', day: '❄️', night: '❄️' },
  95: { label: 'Thunderstorm', day: '⛈️', night: '⛈️' },
  96: { label: 'Thunderstorm with hail', day: '⛈️', night: '⛈️' },
  99: { label: 'Thunderstorm with heavy hail', day: '⛈️', night: '⛈️' },
};

function describeWeather(code, isDay) {
  const entry = WEATHER_CODES[code] ?? { label: 'Unknown conditions', day: '🌡️', night: '🌡️' };
  return { label: entry.label, icon: isDay ? entry.day : entry.night };
}

// 16-point compass label from degrees (0° = N, each sector spans 22.5°).
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

function compassPoint(degrees) {
  return COMPASS[Math.round(degrees / 22.5) % 16];
}

// Sunrise/sunset arrive as "2026-08-10T06:45" ALREADY in the location's
// timezone (the backend requests timezone=auto), so we just slice out
// "06:45" — parsing via new Date() would re-interpret it in the BROWSER's
// timezone and show the wrong time for faraway places.
function localClockTime(isoLocal) {
  return isoLocal?.slice(11, 16) ?? '—';
}

function Stat({ label, value, detail }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-800">
        {value}
        {detail && <span className="ml-1 text-sm font-normal text-slate-500">{detail}</span>}
      </dd>
    </div>
  );
}

function CurrentConditions({ title, location, current }) {
  const { label, icon } = describeWeather(current.weatherCode, current.isDay);
  const subtitle = [location.admin1, location.country].filter(Boolean).join(', ');

  return (
    <section className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
      <header>
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">{title ?? location.name}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </header>

      {/* Hero row: icon, temperature, condition */}
      <div className="mt-4 flex items-center gap-4">
        <span className="text-5xl sm:text-6xl" role="img" aria-label={label}>
          {icon}
        </span>
        <div>
          <p className="text-4xl font-bold text-slate-900 sm:text-5xl">
            {Math.round(current.temperature)}°C
          </p>
          <p className="text-sm text-slate-600">
            {label} · Feels like {Math.round(current.apparentTemperature)}°C
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Humidity" value={`${current.humidity}%`} />
        <Stat
          label="Wind"
          value={`${Math.round(current.windSpeed)} km/h`}
          detail={compassPoint(current.windDirection)}
        />
        <Stat label="Sunrise" value={localClockTime(current.sunrise)} />
        <Stat label="Sunset" value={localClockTime(current.sunset)} />
      </dl>

      <p className="mt-3 text-xs text-slate-400">
        Sunrise/sunset shown in the location&apos;s timezone ({current.timezone}).
      </p>
    </section>
  );
}

export default CurrentConditions;
