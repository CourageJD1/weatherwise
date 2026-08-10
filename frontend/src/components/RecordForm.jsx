import { useEffect, useState } from 'react';
import { createRecord, updateRecord } from '../services/api.js';

// Create/edit form for saved records. The same component serves both modes:
// pass `record` to edit it, omit it to create. Client-side checks mirror the
// backend's rules (backend/src/middleware/validate.js) so most mistakes are
// flagged inline before a request is made — but the backend remains the
// authority, and its rejections (e.g. unknown location, which only the
// geocoder can know) are mapped back onto the same inline field slots.

const MAX_RANGE_DAYS = 90;
const MAX_FUTURE_DAYS = 15;

// Date helpers duplicated from the backend on purpose: importing across the
// frontend/backend boundary would couple the builds for three tiny functions.
// All arithmetic is UTC so the browser's timezone can't shift a date.
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Inclusive day count, matching the backend's definition.
function countDays(fromIso, toIso) {
  return Math.round((new Date(toIso) - new Date(fromIso)) / 86_400_000) + 1;
}

// Returns { location?, startDate?, endDate? } — one message per broken field.
function validateFields({ location, startDate, endDate }) {
  const errors = {};
  const maxEnd = addDaysIso(todayIso(), MAX_FUTURE_DAYS);

  if (!location.trim()) {
    errors.location = 'Enter a city, town, landmark, postal code, or "lat,lon" coordinates.';
  }
  if (!startDate) errors.startDate = 'Pick a start date.';
  if (!endDate) errors.endDate = 'Pick an end date.';

  if (startDate && endDate) {
    if (startDate > endDate) {
      errors.endDate = 'End date must be on or after the start date.';
    } else if (countDays(startDate, endDate) > MAX_RANGE_DAYS) {
      errors.endDate = `Range covers ${countDays(startDate, endDate)} days; the maximum is ${MAX_RANGE_DAYS}.`;
    }
  }
  if (endDate && endDate > maxEnd) {
    errors.endDate = `Forecasts only reach ${MAX_FUTURE_DAYS} days ahead — the latest allowed date is ${maxEnd}.`;
  }
  return errors;
}

// Backend validation messages name the offending field in quotes (or say
// "did not match any known place" for a failed geocode); use that to show
// the server's message under the right input instead of a generic banner.
function serverErrorField(message) {
  if (message.includes('"startDate"')) return 'startDate';
  if (message.includes('"endDate"')) return 'endDate';
  if (message.includes('"location"') || message.includes('did not match any known place')) {
    return 'location';
  }
  return null;
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}

const inputClass = (hasError) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm
   focus:outline-none focus:ring-2 disabled:opacity-60
   ${hasError
     ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
     : 'border-slate-300 focus:border-sky-500 focus:ring-sky-200'}`;

function RecordForm({ record, onSaved, onCancel }) {
  const editing = Boolean(record);
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null); // non-field failures (e.g. API down)
  const [busy, setBusy] = useState(false);

  // Repopulate when the record being edited changes (locationQuery is the
  // raw text the user originally typed, so editing starts from their words).
  useEffect(() => {
    setLocation(record?.locationQuery ?? '');
    setStartDate(record?.startDate ?? '');
    setEndDate(record?.endDate ?? '');
    setFieldErrors({});
    setFormError(null);
  }, [record]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    const values = { location, startDate, endDate };
    const errors = validateFields(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const saved = editing
        ? await updateRecord(record.id, values)
        : await createRecord(values);
      if (!editing) {
        setLocation('');
        setStartDate('');
        setEndDate('');
      }
      onSaved(saved);
    } catch (err) {
      const field = serverErrorField(err.message);
      if (field) setFieldErrors({ [field]: err.message });
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Native date pickers get the same ceiling the backend enforces, so the
  // calendar greys out un-savable dates; the checks above still run because
  // dates can also be typed in.
  const maxDate = addDaysIso(todayIso(), MAX_FUTURE_DAYS);

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-md sm:p-6" noValidate>
      <h3 className="text-lg font-bold text-slate-800">
        {editing ? `Edit record #${record.id}` : 'Save a location & date range'}
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Temperatures for the range are fetched and stored — up to {MAX_RANGE_DAYS} days,
        no further than {MAX_FUTURE_DAYS} days ahead.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="record-location" className="mb-1 block text-xs font-medium text-slate-600">
            Location
          </label>
          <input
            id="record-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={busy}
            placeholder='e.g. "Port Louis", "10001", "Eiffel Tower", "-20.32, 57.52"'
            className={inputClass(fieldErrors.location)}
            aria-invalid={Boolean(fieldErrors.location)}
          />
          <FieldError message={fieldErrors.location} />
        </div>

        <div>
          <label htmlFor="record-start" className="mb-1 block text-xs font-medium text-slate-600">
            Start date
          </label>
          <input
            id="record-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={busy}
            max={maxDate}
            className={inputClass(fieldErrors.startDate)}
            aria-invalid={Boolean(fieldErrors.startDate)}
          />
          <FieldError message={fieldErrors.startDate} />
        </div>

        <div>
          <label htmlFor="record-end" className="mb-1 block text-xs font-medium text-slate-600">
            End date
          </label>
          <input
            id="record-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={busy}
            max={maxDate}
            className={inputClass(fieldErrors.endDate)}
            aria-invalid={Boolean(fieldErrors.endDate)}
          />
          <FieldError message={fieldErrors.endDate} />
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm
                     hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Fetching weather…' : editing ? 'Save changes' : 'Create record'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium
                       text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default RecordForm;
