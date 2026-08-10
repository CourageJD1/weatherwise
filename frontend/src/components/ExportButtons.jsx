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
        {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
        {FORMATS.map(({ format, label: name }) => (
          <button
            key={format}
            type="button"
            onClick={() => handleExport(format)}
            disabled={busyFormat !== null}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium
                       text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyFormat === format ? 'Preparing…' : name}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default ExportButtons;
