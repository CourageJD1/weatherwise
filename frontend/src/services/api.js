// The ONLY module that talks to the network. Everything goes to OUR backend
// (relative /api URLs, proxied to Express by Vite in dev) — the frontend
// never calls Open-Meteo or any other external API directly.

// Unwraps the backend's { success, data, error } envelope: returns data on
// success, throws an Error carrying the backend's human-readable message
// otherwise, so components can render err.message directly.
async function request(path, options) {
  let res;
  try {
    res = await fetch(path, options);
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

/* ------------------------- saved records (CRUD) ------------------------- */

// JSON-body variants of request() for POST/PUT.
function jsonOptions(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function fetchRecords() {
  return request('/api/records');
}

// body = { location, startDate, endDate }; the backend validates, geocodes,
// fetches temperatures for the range, and returns the stored record.
export function createRecord(body) {
  return request('/api/records', jsonOptions('POST', body));
}

export function updateRecord(id, body) {
  return request(`/api/records/${id}`, jsonOptions('PUT', body));
}

export function deleteRecord(id) {
  return request(`/api/records/${id}`, { method: 'DELETE' });
}

/* --------------------- record enrichments (map, AI) --------------------- */

// Map center + bounding box for Leaflet, with air quality folded in.
export function fetchRecordMap(id) {
  return request(`/api/location/${id}/map`);
}

// AI briefing. `location` is a display name; `forecast` is the record's
// per-day weather array (the backend accepts it under this key).
export function fetchInsights({ location, forecast }) {
  return request('/api/insights', jsonOptions('POST', { location, forecast }));
}

/* -------------------------------- export -------------------------------- */

// Exports are file downloads, not JSON, so they bypass request(): fetch the
// blob ourselves and hand it to the browser via a temporary object-URL link.
// Fetching (instead of a plain <a href>) lets us surface backend errors as
// inline messages rather than navigating to a raw JSON error page.
export async function downloadExport(format, recordId) {
  const query = recordId != null ? `?id=${recordId}` : '';
  let res;
  try {
    res = await fetch(`/api/export/${format}${query}`);
  } catch {
    throw new Error('Could not reach the WeatherWise server. Is the backend running?');
  }
  if (!res.ok) {
    // Failures come back as the usual JSON envelope.
    let body = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON error body; fall through to the generic message.
    }
    throw new Error(body?.error || `Export failed with HTTP ${res.status}.`);
  }

  // The backend names the file via Content-Disposition; reuse that name.
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const filename =
    disposition.match(/filename="([^"]+)"/)?.[1] ?? `weatherwise-export.${format}`;

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
