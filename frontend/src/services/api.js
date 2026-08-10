// The ONLY module that talks to the network. Everything goes to OUR backend
// (relative /api URLs, proxied to Express by Vite in dev) — the frontend
// never calls Open-Meteo or any other external API directly.

// Unwraps the backend's { success, data, error } envelope: returns data on
// success, throws an Error carrying the backend's human-readable message
// otherwise, so components can render err.message directly.
async function request(path) {
  let res;
  try {
    res = await fetch(path);
  } catch {
    throw new Error('Could not reach the WeatherWise server. Is the backend running?');
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (e.g. proxy error page); fall through to the generic throw.
  }
  if (!res.ok || !body?.success) {
    throw new Error(body?.error || `Request failed with HTTP ${res.status}.`);
  }
  return body.data;
}

// Current conditions for a free-text query (city, postal code, landmark,
// or "lat,lon"). Resolves to { location, current }.
export function fetchCurrentByQuery(query) {
  return request(`/api/weather/current?location=${encodeURIComponent(query)}`);
}

// Same, but for explicit coordinates from the browser's Geolocation API.
export function fetchCurrentByCoords(lat, lon) {
  return request(`/api/weather/current?lat=${lat}&lon=${lon}`);
}

// 5-day forecast; resolves to { location, forecast }. Query/coords variants
// mirror the current-conditions pair above.
export function fetchForecastByQuery(query) {
  return request(`/api/weather/forecast?location=${encodeURIComponent(query)}`);
}

export function fetchForecastByCoords(lat, lon) {
  return request(`/api/weather/forecast?lat=${lat}&lon=${lon}`);
}
