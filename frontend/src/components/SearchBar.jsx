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
          className="min-w-0 flex-1 rounded-lg border border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--surface-raised)] px-4 py-2.5
                     text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] shadow-sm
                     focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40
                     disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !query.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--surface)] shadow-sm
                     hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </form>
      <button
        type="button"
        onClick={onUseMyLocation}
        disabled={busy}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--ink)_22%,transparent)]
                   bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] shadow-sm
                   hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40
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
