import { useState } from 'react';
import { downloadExport } from '../services/api.js';

// One download button per export format (assessment section 2.3). With a
// recordId prop it exports that record; without, it exports everything.
// Keys match the backend's /api/export/:format dispatcher exactly.
const FORMATS = [
  { format: 'json', label: 'JSON' },
  { format: 'csv', label: 'CSV' },
  { format: 'markdown', label: 'Markdown' },
  { format: 'xml', label: 'XML' },
  { format: 'pdf', label: 'PDF' },
];

function ExportButtons({ recordId, label }) {
  const [busyFormat, setBusyFormat] = useState(null);
  const [error, setError] = useState(null);

  async function handleExport(format) {
    setBusyFormat(format);
    setError(null);
    try {
      await downloadExport(format, recordId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyFormat(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {label && <span className="text-xs font-medium text-[var(--ink-muted)]">{label}</span>}
        {FORMATS.map(({ format, label: name }) => (
          <button
            key={format}
            type="button"
            onClick={() => handleExport(format)}
            disabled={busyFormat !== null}
            className="rounded-full border border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-medium
                       text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyFormat === format ? 'Preparing…' : name}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export default ExportButtons;
