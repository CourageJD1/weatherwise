import { geocode } from '../services/weatherService.js';
import { ValidationError, LocationNotFoundError } from '../services/errors.js';

// All CRUD input validation lives here (project constraint: none of it in the
// route handlers). validateRecordBody guards POST and PUT /api/records;
// validateIdParam guards every /api/records/:id route.

// The longest range a record may cover, inclusive of both endpoints.
const MAX_RANGE_DAYS = 90;

// Open-Meteo's forecast_days parameter maxes at 16 but counts today as day 1,
// so the furthest fetchable date is today + 15 (see docs/PLAN.md decision 3).
const MAX_FUTURE_DAYS = 15;

/* ------------------------------ date helpers ------------------------------ */
// Dates are YYYY-MM-DD strings throughout (project convention); they compare
// correctly as plain strings. All arithmetic is done in UTC so the server's
// local timezone can never shift a date by a day.

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Inclusive day count: countDays('2026-08-01', '2026-08-03') === 3.
function countDays(fromIso, toIso) {
  return Math.round((new Date(toIso) - new Date(fromIso)) / 86_400_000) + 1;
}

// True only for a well-formed YYYY-MM-DD string naming a real calendar date.
// The round-trip through Date catches impossible dates like 2026-02-30,
// which JS would otherwise silently roll over to March 2nd.
function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/* ------------------------------- middleware ------------------------------- */

// :id must be a positive integer. Rejecting junk here means the handlers can
// pass req.params.id straight into a parameterized query.
export function validateIdParam(req, res, next) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return next(
      new ValidationError(`"${req.params.id}" is not a valid record id. Ids are whole numbers like 1, 2, 3 — open the record from the list to use the right one.`)
    );
  }
  next();
}

// Guards POST /api/insights. Deliberately shallow: the AI service tolerates
// any weather-data shape (it just serializes it into the prompt), so we only
// require a location name and at least one piece of weather data to reason
// about — enough to prevent a pointless Gemini call on an empty body.
export function validateInsightsBody(req, res, next) {
  const { location, current, forecast } = req.body ?? {};

  if (typeof location !== 'string' || !location.trim()) {
    return next(
      new ValidationError('"location" is required and must be a non-empty display name.')
    );
  }
  const hasCurrent = current && typeof current === 'object';
  const hasForecast = Array.isArray(forecast) && forecast.length > 0;
  if (!hasCurrent && !hasForecast) {
    return next(
      new ValidationError(
        'Provide weather data to analyse: a "current" conditions object, a non-empty "forecast" array, or both.'
      )
    );
  }
  next();
}

// Validates { location, startDate, endDate } for CREATE and UPDATE, then
// resolves the location. On success attaches the top-ranked geocoding
// candidate as req.resolvedLocation so handlers never re-geocode.
export async function validateRecordBody(req, res, next) {
  try {
    const { location, startDate, endDate } = req.body ?? {};

    if (typeof location !== 'string' || !location.trim()) {
      throw new ValidationError(
        '"location" is required and must be a non-empty string — a city, town, landmark, postal code, or "lat,lon" coordinates.'
      );
    }
    for (const [field, value] of [['startDate', startDate], ['endDate', endDate]]) {
      if (!isRealDate(value)) {
        throw new ValidationError(
          `The ${field === 'startDate' ? 'start' : 'end'} date ${JSON.stringify(value ?? null)} is not a real calendar date. Use the date picker, or type it as YYYY-MM-DD (for example 2026-08-11).`
        );
      }
    }
    if (startDate > endDate) {
      throw new ValidationError(
        `The start date (${startDate}) is after the end date (${endDate}). Swap them, or pick a start date on or before ${endDate}.`
      );
    }
    const rangeDays = countDays(startDate, endDate);
    if (rangeDays > MAX_RANGE_DAYS) {
      throw new ValidationError(
        `That range covers ${rangeDays} days, and a record can hold at most ${MAX_RANGE_DAYS}. Shorten it to ${MAX_RANGE_DAYS} days or fewer, or save it as more than one record.`
      );
    }
    const maxEnd = addDaysIso(todayIso(), MAX_FUTURE_DAYS);
    if (endDate > maxEnd) {
      throw new ValidationError(
        `That end date (${endDate}) is further ahead than forecasts reach. Weather is only available up to ${MAX_FUTURE_DAYS} days out, so the latest allowed date is ${maxEnd}.`
      );
    }

    // Location resolution is part of validation (plan decision 4: take the
    // top-ranked candidate). An unknown location is a 400 on these routes —
    // it is bad input to CREATE/UPDATE, not a missing resource.
    let candidates;
    try {
      candidates = await geocode(location);
    } catch (err) {
      if (err instanceof LocationNotFoundError) {
        throw new ValidationError(
          `"${location.trim()}" did not match any known place. Try a city, town, landmark, postal code, or "lat,lon" coordinates.`
        );
      }
      throw err;
    }
    req.resolvedLocation = candidates[0];

    next();
  } catch (err) {
    next(err);
  }
}
