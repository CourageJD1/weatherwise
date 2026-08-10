import { useState } from 'react';

// Saved-records list: one row per record with view/edit/delete controls.
// Delete uses a two-click inline confirm (the button turns into "Confirm?")
// instead of a browser confirm() dialog, so nothing blocks the page.

function RecordRow({ record, selected, onSelect, onEdit, onDelete, deleting }) {
  const [confirming, setConfirming] = useState(false);
  const place = [record.locationName, record.country].filter(Boolean).join(', ');

  return (
    <li
      className={`rounded-xl border px-4 py-3 transition-colors
        ${selected ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* The text block doubles as the "view" control; the explicit View
            button below exists so the affordance is discoverable. */}
        <button type="button" onClick={() => onSelect(record.id)} className="text-left">
          <p className="text-sm font-semibold text-slate-800">
            {place}
            <span className="ml-2 font-normal text-slate-400">#{record.id}</span>
          </p>
          <p className="text-xs text-slate-500">
            {record.startDate} → {record.endDate} · {record.weatherData.length}{' '}
            {record.weatherData.length === 1 ? 'day' : 'days'} · saved as “{record.locationQuery}”
          </p>
        </button>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onSelect(record.id)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium
                       text-slate-700 hover:bg-slate-100"
          >
            {selected ? 'Viewing' : 'View'}
          </button>
          <button
            type="button"
            onClick={() => onEdit(record)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium
                       text-slate-700 hover:bg-slate-100"
          >
            Edit
          </button>
          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => onDelete(record.id)}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white
                           hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Confirm?'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs
                           font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium
                         text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function RecordList({ records, selectedId, onSelect, onEdit, onDelete, deletingId }) {
  if (records.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        No saved records yet — create one with the form above.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {records.map((record) => (
        <RecordRow
          key={record.id}
          record={record}
          selected={record.id === selectedId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          deleting={record.id === deletingId}
        />
      ))}
    </ul>
  );
}

export default RecordList;
