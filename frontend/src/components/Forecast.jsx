import { describeWeather } from '../utils/weatherCodes.js';

// 5-day forecast (assessment section 1.1). One grid, three deliberate layouts:
// a vertical stack on mobile (1 col), two columns on tablet (md), and a single
// horizontal row of five on desktop (lg). Each card also reorients: a compact
// left-to-right row while stacked, a top-to-bottom column once the grid is a row.

// Backend dates are "YYYY-MM-DD" in the LOCATION's timezone. Appending
// T00:00:00Z and formatting with timeZone:'UTC' keeps the weekday stable —
// letting new Date() parse in the browser's local zone could shift the date
// by a day for viewers west of Greenwich.
function dayLabels(dateIso) {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
  };
}

function DayCard({ day }) {
  const { label, icon } = describeWeather(day.weatherCode);
  const { weekday, date } = dayLabels(day.date);

  return (
    <li
      className="panel-inset flex items-center justify-between gap-3 px-4 py-3
                 lg:flex-col lg:justify-start lg:gap-1.5 lg:py-4 lg:text-center"
    >
      <div className="w-16 lg:w-auto">
        <p className="text-sm font-semibold text-[var(--ink)]">{weekday}</p>
        <p className="readout text-xs text-[var(--ink-muted)]">{date}</p>
      </div>

      <span className="text-3xl" role="img" aria-label={label} title={label}>
        {icon}
      </span>

      <p className="readout text-sm text-[var(--ink)]">
        <span className="font-semibold">{Math.round(day.tempMax)}°</span>
        <span className="mx-1 text-[var(--ink-muted)]" aria-hidden="true">/</span>
        <span className="text-[var(--ink-muted)]">{Math.round(day.tempMin)}°</span>
      </p>

      {/* precipitationProbability is null for past days (observed, not predicted) */}
      <p className="readout w-14 text-right text-sm text-[var(--accent)] lg:w-auto lg:text-center">
        <span aria-hidden="true">💧</span>{' '}
        {day.precipitationProbability != null ? `${day.precipitationProbability}%` : '—'}
        <span className="sr-only">{' chance of precipitation'}</span>
      </p>
    </li>
  );
}

function Forecast({ forecast }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-lg font-bold text-[var(--ink)]">5-Day Forecast</h2>
      <p className="text-xs text-[var(--ink-muted)]">
        High / low in °C with chance of precipitation
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        {forecast.map((day) => (
          <DayCard key={day.date} day={day} />
        ))}
      </ul>
    </section>
  );
}

export default Forecast;
