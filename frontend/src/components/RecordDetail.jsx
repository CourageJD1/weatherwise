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
    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Conditions</th>
            <th className="px-3 py-2 text-right font-medium">Max</th>
            <th className="px-3 py-2 text-right font-medium">Min</th>
            <th className="px-3 py-2 text-right font-medium">Precip</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {days.map((day) => {
            const { label, icon } = describeWeather(day.weatherCode);
            return (
              <tr key={day.date}>
                <td className="px-3 py-1.5 text-slate-700">{day.date}</td>
                <td className="px-3 py-1.5 text-slate-600">
                  <span role="img" aria-hidden="true" className="mr-1.5">
                    {icon}
                  </span>
                  {label}
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-slate-800">
                  {Math.round(day.tempMax)}°C
                </td>
                <td className="px-3 py-1.5 text-right text-slate-500">
                  {Math.round(day.tempMin)}°C
                </td>
                {/* precipitationProbability is null for archived past days */}
                <td className="px-3 py-1.5 text-right text-sky-700">
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
    <section className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{place}</h3>
          <p className="text-xs text-slate-500">
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
