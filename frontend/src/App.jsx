import { useEffect, useState } from 'react';
import { themeFor, themeNameFor, applyTheme } from './utils/theme.js';
import WeatherCanvas from './components/WeatherCanvas.jsx';
import SearchBar from './components/SearchBar.jsx';
import CurrentConditions from './components/CurrentConditions.jsx';
import Forecast from './components/Forecast.jsx';
import RecordsView from './components/RecordsView.jsx';
import AboutFooter from './components/AboutFooter.jsx';
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

// Tab button for the weather/records switch. Segmented-control styling so
// it reads as navigation, not an action.
function ViewTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors
        ${active
          ? 'bg-[var(--accent)] text-[var(--surface)] shadow-sm'
          : 'text-[var(--ink-muted)] hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] hover:text-[var(--ink)]'}`}
    >
      {children}
    </button>
  );
}

function App() {
  // Which top-level view is showing: the live weather lookup ('weather')
  // or the persisted CRUD records ('records').
  const [view, setView] = useState('weather');

  // One state machine for the whole lookup flow: 'idle' | 'loading' |
  // 'success' | 'error'. Every request path funnels through runLookup so
  // loading/error handling can never be forgotten on a new code path.
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null); // { title, location, current, forecast }
  const [error, setError] = useState(null);

  // The palette follows whatever weather is on screen. Runs on the successful
  // result only, so a failed lookup leaves the previous conditions in place
  // rather than flashing the screen back to a default.
  useEffect(() => {
    if (result?.current) {
      applyTheme(themeFor(result.current.weatherCode, result.current.isDay));
    }
  }, [result]);

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
    <div className="relative min-h-screen px-4 py-8 sm:py-12">
      {/* Ambient layer. Driven by the same condition the palette uses, so the
          colour and the motion always agree. */}
      <WeatherCanvas
        themeName={
          result?.current
            ? themeNameFor(result.current.weatherCode, result.current.isDay)
            : 'clearDay'
        }
        windSpeed={result?.current?.windSpeed ?? 0}
        precipitation={result?.current?.precipitation ?? 0}
      />
      {/* One column capped at 42rem until lg, where the cap widens to 56rem so
          the forecast's five-across row gets usable card widths. */}
      <main className="mx-auto w-full max-w-2xl space-y-6 lg:max-w-4xl">
        <header className="text-center">
          <h1 className="display text-4xl font-extrabold text-[var(--ink)] sm:text-5xl">
            WeatherWise
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Live conditions for any city, postal code, landmark, or coordinates
          </p>
        </header>

        <nav
          className="flex justify-center gap-1 rounded-xl p-1
                     bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
          aria-label="Main views"
        >
          <ViewTab active={view === 'weather'} onClick={() => setView('weather')}>
            Weather
          </ViewTab>
          <ViewTab active={view === 'records'} onClick={() => setView('records')}>
            Saved Records
          </ViewTab>
        </nav>

        {view === 'records' && <RecordsView />}

        {view === 'weather' && (
          <>
            <SearchBar
              onSearch={handleSearch}
              onUseMyLocation={handleUseMyLocation}
              busy={status === 'loading'}
            />

            {status === 'loading' && (
              <div
                className="flex items-center justify-center gap-3 py-10 text-[var(--ink-muted)]"
                role="status"
              >
                <span
                  className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"
                  aria-hidden="true"
                />
                Fetching weather…
              </div>
            )}

            {status === 'error' && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3
                           text-sm text-red-200"
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
              <p className="py-10 text-center text-sm text-[var(--ink-muted)]">
                Search for a place or use your location to see current conditions.
              </p>
            )}
          </>
        )}

        {/* Outside the view switch so the author/PM Accelerator details the
            assessment asks for are on screen whichever tab is open. */}
        <AboutFooter />
      </main>
    </div>
  );
}

export default App;
