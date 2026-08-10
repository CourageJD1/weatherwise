import { useState } from 'react';
import SearchBar from './components/SearchBar.jsx';
import CurrentConditions from './components/CurrentConditions.jsx';
import Forecast from './components/Forecast.jsx';
import {
  fetchCurrentByQuery,
  fetchCurrentByCoords,
  fetchForecastByQuery,
  fetchForecastByCoords,
} from './services/api.js';

// Wraps the callback-based Geolocation API in a promise and normalizes its
// failure modes into user-facing messages (most importantly a clear one for
// denied permission, with search-by-name as the suggested fallback).
function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support geolocation — search by name instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. You can still search by city, postal code, or coordinates.'
            : 'Could not determine your location. Try searching by name instead.';
        reject(new Error(message));
      },
      { timeout: 10_000 }
    );
  });
}

function App() {
  // One state machine for the whole lookup flow: 'idle' | 'loading' |
  // 'success' | 'error'. Every request path funnels through runLookup so
  // loading/error handling can never be forgotten on a new code path.
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null); // { title, location, current, forecast }
  const [error, setError] = useState(null);

  // Current conditions and the 5-day forecast are separate backend endpoints;
  // fetch them in parallel and show one combined result (or one error).
  async function runLookup(currentPromise, forecastPromise, title) {
    setStatus('loading');
    setError(null);
    try {
      const [{ location, current }, { forecast }] = await Promise.all([
        currentPromise,
        forecastPromise,
      ]);
      setResult({ title, location, current, forecast });
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  function handleSearch(query) {
    // null title -> show geocoded name
    runLookup(fetchCurrentByQuery(query), fetchForecastByQuery(query), null);
  }

  async function handleUseMyLocation() {
    setStatus('loading');
    setError(null);
    try {
      const { latitude, longitude } = await getBrowserPosition();
      await runLookup(
        fetchCurrentByCoords(latitude, longitude),
        fetchForecastByCoords(latitude, longitude),
        'Your location'
      );
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-slate-100 px-4 py-8 sm:py-12">
      {/* One column capped at 42rem until lg, where the cap widens to 56rem so
          the forecast's five-across row gets usable card widths. */}
      <main className="mx-auto w-full max-w-2xl space-y-6 lg:max-w-4xl">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 sm:text-4xl">WeatherWise</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live conditions for any city, postal code, landmark, or coordinates
          </p>
        </header>

        <SearchBar
          onSearch={handleSearch}
          onUseMyLocation={handleUseMyLocation}
          busy={status === 'loading'}
        />

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-3 py-10 text-slate-600" role="status">
            <span
              className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"
              aria-hidden="true"
            />
            Fetching weather…
          </div>
        )}

        {status === 'error' && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {status === 'success' && (
          <>
            <CurrentConditions
              title={result.title}
              location={result.location}
              current={result.current}
            />
            <Forecast forecast={result.forecast} />
          </>
        )}

        {status === 'idle' && (
          <p className="py-10 text-center text-sm text-slate-400">
            Search for a place or use your location to see current conditions.
          </p>
        )}
      </main>
    </div>
  );
}

export default App;
