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
        ${selected ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]' : 'border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]'}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* The text block doubles as the "view" control; the explicit View
            button below exists so the affordance is discoverable. */}
        <button type="button" onClick={() => onSelect(record.id)} className="text-left">
          <p className="text-sm font-semibold text-[var(--ink)]">
            {place}
            <span className="ml-2 font-normal text-[var(--ink-muted)]">#{record.id}</span>
          </p>
          <p className="text-xs text-[var(--ink-muted)]">
            {record.startDate} → {record.endDate} · {record.weatherData.length}{' '}
            {record.weatherData.length === 1 ? 'day' : 'days'} · saved as “{record.locationQuery}”
          </p>
        </button>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onSelect(record.id)}
            className="rounded-lg border border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium
                       text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
          >
            {selected ? 'Viewing' : 'View'}
          </button>
          <button
            type="button"
            onClick={() => onEdit(record)}
            className="rounded-lg border border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium
                       text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
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
                className="rounded-lg border border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs
                           font-medium text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] disabled:opacity-50"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-red-400/40 bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium
                         text-red-300 hover:bg-red-500/10"
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
      <p className="py-6 text-center text-sm text-[var(--ink-muted)]">
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
