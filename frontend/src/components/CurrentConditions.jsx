import { describeWeather } from '../utils/weatherCodes.js';

// Presentational card for current conditions. Receives the backend's
// { location, current } payload untouched and does formatting only.

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
