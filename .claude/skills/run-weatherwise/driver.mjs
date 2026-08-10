#!/usr/bin/env node
// WeatherWise smoke driver — drives the RUNNING app over HTTP.
//
// This does not start the servers; start them first (see SKILL.md), then:
//   node .claude/skills/run-weatherwise/driver.mjs
//
// It exercises the surface most changes touch: the CRUD lifecycle, all five
// export formats, the map/air-quality endpoint, the AI insights endpoint, and
// the validation rejections. It also checks the app through the VITE PROXY,
// not just the backend port, because the frontend calls relative /api URLs —
// a working backend with a broken proxy is invisible to a direct :5000 check.
//
// No dependencies: Node 22's built-in fetch only.
//
// Flags:
//   --backend <url>   default http://localhost:5000
//   --frontend <url>  default http://localhost:5173
//   --keep            don't delete the record it creates (leaves it for the UI)

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
}
const BACKEND = flag('--backend', 'http://localhost:5000').replace(/\/$/, '');
const FRONTEND = flag('--frontend', 'http://localhost:5173').replace(/\/$/, '');
const KEEP = args.includes('--keep');

let passed = 0;
let failed = 0;
let skipped = 0;

// Each check prints one line. A thrown Error fails that check only; the run
// continues so one broken endpoint doesn't hide the state of the others.
async function check(name, fn) {
  try {
    const note = await fn();
    if (note && note.skip) {
      skipped++;
      console.log(`  SKIP  ${name} — ${note.skip}`);
    } else {
      passed++;
      console.log(`  ok    ${name}${note ? ` — ${note}` : ''}`);
    }
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}\n          ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Node's fetch reports every connection failure as a bare "fetch failed",
// which tells a reader nothing. Surface the underlying code and the URL so a
// server that simply isn't running is obvious at a glance.
async function http(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    const cause = err.cause?.code ?? err.cause?.message ?? err.message;
    throw new Error(`cannot reach ${url} (${cause}) — is that server running?`);
  }
}

// Unwraps the { success, data, error } envelope and asserts the status.
async function api(path, { method = 'GET', body, expect = 200 } = {}) {
  const res = await http(`${BACKEND}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  assert(
    res.status === expect,
    `${method} ${path} expected HTTP ${expect}, got ${res.status} (${json?.error ?? 'no error field'})`
  );
  return json;
}

// Dates are chosen relative to today so the range stays inside the backend's
// "no more than 15 days ahead" rule no matter when this runs.
function isoOffset(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const START = isoOffset(-3);
const END = isoOffset(1);

console.log(`WeatherWise smoke driver\n  backend  ${BACKEND}\n  frontend ${FRONTEND}\n`);

/* ------------------------------ reachability ------------------------------ */

console.log('Reachability');

await check('backend /api/health', async () => {
  const { data } = await api('/api/health');
  assert(data.status === 'ok', `unexpected health payload: ${JSON.stringify(data)}`);
});

await check('frontend serves the Vite page', async () => {
  const res = await http(`${FRONTEND}/`);
  assert(res.ok, `GET ${FRONTEND}/ returned HTTP ${res.status}`);
  const html = await res.text();
  assert(html.includes('id="root"'), 'page HTML has no #root mount point');
});

await check('vite proxies /api to the backend', async () => {
  // The frontend only ever uses relative URLs, so this proxy hop is load
  // bearing; when it breaks, every request in the browser 404s as HTML.
  const res = await http(`${FRONTEND}/api/health`);
  assert(res.ok, `GET ${FRONTEND}/api/health returned HTTP ${res.status}`);
  const json = await res.json();
  assert(json.success, 'proxied health check did not return success');
});

/* -------------------------------- weather -------------------------------- */

console.log('\nEphemeral weather (search box)');

await check('current conditions by name', async () => {
  const { data } = await api('/api/weather/current?location=Lisbon');
  assert(typeof data.current.temperature === 'number', 'no numeric temperature');
  return `${data.location.name} ${Math.round(data.current.temperature)}C`;
});

await check('5-day forecast by coords', async () => {
  const { data } = await api('/api/weather/forecast?lat=38.7167&lon=-9.1333');
  assert(data.forecast.length === 5, `expected 5 days, got ${data.forecast.length}`);
});

/* ------------------------------ CRUD lifecycle ---------------------------- */

console.log('\nCRUD lifecycle');

let createdId = null;

await check('CREATE record', async () => {
  const { data } = await api('/api/records', {
    method: 'POST',
    expect: 201,
    body: { location: 'Reykjavik', startDate: START, endDate: END },
  });
  createdId = data.id;
  assert(data.weatherData.length > 0, 'record stored with no weather days');
  // Regression guard: seeded and created rows must carry the same fields, or
  // the UI shows "Unknown conditions" and exports leave the column blank.
  assert(
    data.weatherData[0].weatherCode !== undefined,
    'weatherData days are missing weatherCode'
  );
  return `id ${createdId}, ${data.weatherData.length} days`;
});

await check('READ one', async () => {
  assert(createdId, 'nothing was created to read');
  const { data } = await api(`/api/records/${createdId}`);
  assert(data.id === createdId, 'returned a different record');
});

await check('READ all includes it', async () => {
  const { data } = await api('/api/records');
  assert(data.some((r) => r.id === createdId), 'created record missing from the list');
  return `${data.length} records`;
});

await check('UPDATE re-geocodes and re-fetches', async () => {
  assert(createdId, 'nothing was created to update');
  const { data } = await api(`/api/records/${createdId}`, {
    method: 'PUT',
    body: { location: 'Tromso', startDate: START, endDate: isoOffset(0) },
  });
  assert(data.id === createdId, 'update changed the record id');
  assert(data.locationQuery === 'Tromso', `locationQuery not updated: ${data.locationQuery}`);
  assert(data.latitude > 60, `coordinates were not re-geocoded (lat ${data.latitude})`);
  return `now ${data.locationName}`;
});

/* --------------------------------- exports -------------------------------- */

console.log('\nExports (all five formats)');

// Each format gets a sanity check on the actual bytes, not just HTTP 200 —
// a JSON error body wearing a .pdf filename would otherwise look like a pass.
const FORMATS = [
  ['json', 'application/json', (t) => JSON.parse(t).length > 0, 'not a non-empty JSON array'],
  ['csv', 'text/csv', (t) => t.includes('recordId,location'), 'missing CSV header row'],
  ['markdown', 'text/markdown', (t) => t.includes('# WeatherWise Export'), 'missing markdown heading'],
  ['xml', 'application/xml', (t) => t.startsWith('<?xml'), 'missing XML declaration'],
  ['pdf', 'application/pdf', (t) => t.startsWith('%PDF-'), 'missing %PDF- magic bytes'],
];

for (const [format, contentType, validate, why] of FORMATS) {
  await check(`export ${format} (single record)`, async () => {
    const res = await http(`${BACKEND}/api/export/${format}?id=${createdId}`);
    assert(res.ok, `HTTP ${res.status}`);
    assert(
      res.headers.get('content-type')?.includes(contentType),
      `content-type was ${res.headers.get('content-type')}, expected ${contentType}`
    );
    const disposition = res.headers.get('content-disposition') ?? '';
    assert(
      disposition.includes('attachment'),
      'no attachment disposition — the browser would render this inline instead of downloading'
    );
    // Read as bytes so the PDF check sees real magic bytes, then latin1-decode
    // for the text assertions (utf8 would mangle the PDF's binary sections).
    const text = Buffer.from(await res.arrayBuffer()).toString('latin1');
    assert(validate(text), why);
    return disposition.match(/filename="([^"]+)"/)?.[1] ?? '';
  });
}

await check('export all records', async () => {
  const res = await http(`${BACKEND}/api/export/json`);
  assert(res.ok, `HTTP ${res.status}`);
  const all = JSON.parse(await res.text());
  assert(Array.isArray(all) && all.length > 1, 'export-all returned fewer than 2 records');
  return `${all.length} records`;
});

await check('unknown export format is rejected', async () => {
  await api('/api/export/yaml', { expect: 400 });
});

/* ---------------------------- extra integrations -------------------------- */

console.log('\nMap + AI');

await check('map endpoint returns center and bbox', async () => {
  const { data } = await api(`/api/location/${createdId}/map`);
  assert(typeof data.center.lat === 'number', 'no numeric center.lat');
  assert(data.boundingBox?.length === 2, 'boundingBox is not [[S,W],[N,E]]');
  // Air quality is an enrichment and may legitimately be null if that upstream
  // is down; the map itself must still come back.
  return data.airQuality ? `AQI ${data.airQuality.usAqi}` : 'air quality unavailable (tolerated)';
});

await check('AI insights', async () => {
  const { data } = await api('/api/records/' + createdId);
  const res = await http(`${BACKEND}/api/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: data.locationName, forecast: data.weatherData }),
  });
  const json = await res.json().catch(() => null);
  // 503 = GEMINI_API_KEY not set. That is a supported configuration (the panel
  // hides itself), so it is a skip, not a failure.
  if (res.status === 503) return { skip: 'GEMINI_API_KEY not configured' };
  if (res.status === 502) return { skip: `upstream AI failure: ${json?.error}` };
  assert(res.ok, `HTTP ${res.status} (${json?.error})`);
  assert(typeof json.data.summary === 'string', 'insight has no summary string');
  return `${json.data.summary.slice(0, 48)}…`;
});

/* ------------------------------- validation ------------------------------- */

console.log('\nValidation rejections');

await check('end date too far ahead → 400', async () => {
  const { error } = await api('/api/records', {
    method: 'POST',
    expect: 400,
    body: { location: 'Paris', startDate: isoOffset(0), endDate: isoOffset(60) },
  });
  assert(/latest allowed date/.test(error), `unexpected message: ${error}`);
});

await check('start after end → 400', async () => {
  await api('/api/records', {
    method: 'POST',
    expect: 400,
    body: { location: 'Paris', startDate: isoOffset(2), endDate: isoOffset(-2) },
  });
});

await check('unknown location → 400', async () => {
  const { error } = await api('/api/records', {
    method: 'POST',
    expect: 400,
    body: { location: 'Zzyzxville Nowhereland', startDate: START, endDate: END },
  });
  assert(/did not match any known place/.test(error), `unexpected message: ${error}`);
});

await check('non-numeric id → 400', async () => {
  await api('/api/records/abc', { expect: 400 });
});

await check('missing record → 404', async () => {
  await api('/api/records/99999999', { expect: 404 });
});

/* --------------------------------- cleanup -------------------------------- */

console.log('\nCleanup');

if (KEEP) {
  console.log(`  kept  record ${createdId} (--keep)`);
} else {
  await check('DELETE record', async () => {
    assert(createdId, 'nothing was created to delete');
    await api(`/api/records/${createdId}`, { method: 'DELETE' });
    await api(`/api/records/${createdId}`, { expect: 404 });
    return `id ${createdId} gone`;
  });
}

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
