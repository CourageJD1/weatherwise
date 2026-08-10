import { useEffect, useState } from 'react';
import RecordForm from './RecordForm.jsx';
import RecordList from './RecordList.jsx';
import RecordDetail from './RecordDetail.jsx';
import ExportButtons from './ExportButtons.jsx';
import { fetchRecords, deleteRecord } from '../services/api.js';

// The "Saved Records" tab: full CRUD over /api/records plus exports, driven
// entirely from the browser (assessment #2). One component owns the record
// list and selection; the form, list, and detail are children of that state.

function RecordsView() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [loadError, setLoadError] = useState(null);

  const [editing, setEditing] = useState(null); // record being edited, or null = create mode
  const [selectedId, setSelectedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  async function load() {
    setStatus('loading');
    setLoadError(null);
    try {
      setRecords(await fetchRecords());
      setStatus('success');
    } catch (err) {
      setLoadError(err.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  // After create or update: refresh the list and jump to the saved record,
  // so the reviewer immediately sees the result of the operation.
  async function handleSaved(record) {
    setEditing(null);
    setSelectedId(record.id);
    await load();
  }

  async function handleDelete(id) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteRecord(id);
      if (selectedId === id) setSelectedId(null);
      if (editing?.id === id) setEditing(null);
      await load();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const selectedRecord = records.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <RecordForm
        // key forces a remount when switching create<->edit so no stale
        // field state leaks between modes
        key={editing?.id ?? 'create'}
        record={editing}
        onSaved={handleSaved}
        onCancel={() => setEditing(null)}
      />

      <section className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-800">Saved records</h3>
          {records.length > 0 && <ExportButtons label="Export all:" />}
        </div>

        {deleteError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            Could not delete: {deleteError}
          </div>
        )}

        <div className="mt-4">
          {status === 'loading' && (
            <p className="py-6 text-center text-sm text-slate-400" role="status">
              Loading records…
            </p>
          )}

          {status === 'error' && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <p>{loadError}</p>
              <button
                type="button"
                onClick={load}
                className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs
                           font-medium text-red-700 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}

          {status === 'success' && (
            <RecordList
              records={records}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              onEdit={(record) => setEditing(record)}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          )}
        </div>
      </section>

      {selectedRecord && <RecordDetail record={selectedRecord} />}
    </div>
  );
}

export default RecordsView;
