import { describeWeather } from '../utils/weatherCodes.js';
import LocationMap from './LocationMap.jsx';
import InsightsPanel from './InsightsPanel.jsx';
import ExportButtons from './ExportButtons.jsx';

// Detail panel for the selected record: Leaflet map (+ air quality), the
// stored per-day temperatures, the AI briefing, and single-record exports.

// A record can hold up to 90 days, so the table scrolls inside a fixed
// height instead of pushing the map and insights off screen.
function StoredDaysTable({ days }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-[color-mix(in_srgb,var(--ink)_14%,transparent)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] text-left text-xs uppercase tracking-wide text-[var(--ink-muted)]">
          <tr>
            <th className="px-2 py-2 font-medium sm:px-3">Date</th>
            <th className="px-2 py-2 font-medium sm:px-3">Conditions</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">Max</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">Min</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">Precip</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--surface-raised)]">
          {days.map((day) => {
            const { label, icon } = describeWeather(day.weatherCode);
            return (
              <tr key={day.date}>
                <td className="px-2 py-1.5 text-[var(--ink)] sm:px-3">{day.date}</td>
                <td className="px-2 py-1.5 text-[var(--ink-muted)] sm:px-3">
                  <span role="img" aria-hidden="true" className="mr-1.5">
                    {icon}
                  </span>
                  {/* Label is the widest column. Below sm it is hidden visually
                      but kept for screen readers — the icon alone is not an
                      accessible substitute for the condition name. */}
                  <span className="sr-only sm:not-sr-only">{label}</span>
                </td>
                <td className="px-2 py-1.5 text-right font-medium text-[var(--ink)] sm:px-3">
                  {Math.round(day.tempMax)}°C
                </td>
                <td className="px-2 py-1.5 text-right text-[var(--ink-muted)] sm:px-3">
                  {Math.round(day.tempMin)}°C
                </td>
                {/* precipitationProbability is null for archived past days */}
                <td className="px-2 py-1.5 text-right text-[var(--accent)] sm:px-3">
                  {day.precipitationProbability != null ? `${day.precipitationProbability}%` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RecordDetail({ record }) {
  const place = [record.locationName, record.country].filter(Boolean).join(', ');

  return (
    <section className="panel p-5 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-[var(--ink)]">{place}</h3>
          <p className="text-xs text-[var(--ink-muted)]">
            Record #{record.id} · {record.startDate} → {record.endDate} · lat{' '}
            {record.latitude.toFixed(4)}, lon {record.longitude.toFixed(4)}
          </p>
        </div>
        <ExportButtons recordId={record.id} label="Export this record:" />
      </header>

      <div className="mt-4 space-y-4">
        <LocationMap recordId={record.id} />
        <StoredDaysTable days={record.weatherData} />
        <InsightsPanel record={record} />
      </div>
    </section>
  );
}

export default RecordDetail;
