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
    <div className="panel-inset p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </dt>
      <dd className="readout mt-1 text-lg font-semibold text-[var(--ink)]">
        {value}
        {detail && (
          <span className="ml-1 text-sm font-normal text-[var(--ink-muted)]">{detail}</span>
        )}
      </dd>
    </div>
  );
}

function CurrentConditions({ title, location, current }) {
  const { label, icon } = describeWeather(current.weatherCode, current.isDay);
  const subtitle = [location.admin1, location.country].filter(Boolean).join(', ');

  return (
    <section className="panel p-5 sm:p-6">
      <header>
        <h2 className="display text-2xl font-bold text-[var(--ink)] sm:text-3xl">
          {title ?? location.name}
        </h2>
        {subtitle && <p className="text-sm text-[var(--ink-muted)]">{subtitle}</p>}
      </header>

      {/* Hero row: icon, temperature, condition */}
      <div className="mt-4 flex items-center gap-4">
        <span className="text-5xl sm:text-6xl" role="img" aria-label={label}>
          {icon}
        </span>
        <div>
          <p className="display text-6xl font-extrabold text-[var(--ink)] sm:text-7xl">
            {Math.round(current.temperature)}°
            <span className="text-3xl font-semibold text-[var(--ink-muted)] sm:text-4xl">C</span>
          </p>
          <p className="text-sm text-[var(--ink-muted)]">
            {label} · Feels like{' '}
            <span className="readout">{Math.round(current.apparentTemperature)}°C</span>
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

      <p className="mt-3 text-xs text-[var(--ink-muted)] opacity-80">
        Sunrise/sunset shown in the location&apos;s timezone ({current.timezone}).
      </p>
    </section>
  );
}

export default CurrentConditions;
