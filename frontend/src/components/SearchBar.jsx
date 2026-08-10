import { useState } from 'react';

// Search form + geolocation button. This component only collects input;
// App owns the actual requests, so `busy` disables everything here while
// any lookup is in flight.
function SearchBar({ onSearch, onUseMyLocation, busy }) {
  const [query, setQuery] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) onSearch(trimmed);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <form onSubmit={handleSubmit} className="flex flex-1 gap-2">
        <label htmlFor="location-search" className="sr-only">
          Search for a location
        </label>
        <input
          id="location-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={busy}
          placeholder='City, postal code, or landmark — e.g. "Vacoas", "10001", "Eiffel Tower", "-20.32, 57.52"'
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5
                     text-sm text-slate-800 placeholder:text-slate-400 shadow-sm
                     focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200
                     disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !query.trim()}
          className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm
                     hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </form>
      <button
        type="button"
        onClick={onUseMyLocation}
        disabled={busy}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300
                   bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm
                   hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200
                   disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* crosshair "locate me" glyph */}
        <span aria-hidden="true">📍</span>
        Use my location
      </button>
    </div>
  );
}

export default SearchBar;
