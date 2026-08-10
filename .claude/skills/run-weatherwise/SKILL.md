---
name: run-weatherwise
description: Build, launch, and drive the WeatherWise app — Express backend on :5000 plus Vite/React frontend on :5173. Use when asked to run, start, serve, smoke-test, screenshot, or verify WeatherWise, or to confirm a change works in the real app rather than only in tests.
---

# Running WeatherWise

Two processes that must both be up: an Express backend (`backend/`, port 5000)
and a Vite dev server (`frontend/`, port 5173). MySQL must already be running
on **port 3308** (not the default 3306).

The agent path is `driver.mjs` in this directory — a dependency-free Node
script that drives the running app over HTTP and checks 24 things: the CRUD
lifecycle, all five export formats, the map endpoint, AI insights, and the
validation rejections. Use the browser only when you need to see the UI.

All paths below are relative to the repo root (`weatherwise/`).

## Prerequisites

- Node 22 (verified on v22.12.0) and npm 11
- MySQL listening on **3308**, with `backend/.env` present. Copy it from the
  template and fill in the password — the app will not boot without it:
  ```bash
  cp backend/.env.example backend/.env
  ```
- `GEMINI_API_KEY` in `backend/.env` is **optional**. Without it the insights
  endpoint returns HTTP 503 and the UI hides that panel; everything else works.

Confirm MySQL is actually up before anything else — a missing database is the
most common cause of a backend that exits on boot:

```powershell
Get-NetTCPConnection -LocalPort 3308 -State Listen -ErrorAction SilentlyContinue
```

## Install

Two separate packages; there is no root `package.json` and no workspace.

```bash
cd backend  && npm install
cd ../frontend && npm install
```

## Run

Start both servers. **The backend entrypoint is `src/server.js`, not
`server.js`** — `node server.js` fails with `MODULE_NOT_FOUND`. Use the npm
scripts and you cannot get this wrong:

```bash
# terminal 1 — backend on :5000 (prints "Database schema ready" then the URL)
cd backend && npm run dev

# terminal 2 — frontend on :5173
cd frontend && npm run dev
```

The backend creates its database and tables on boot, so a fresh clone needs no
manual `.sql` import. To load 8 demo records:

```bash
cd backend && npm run seed
```

Note `npm run seed` runs `DELETE FROM weather_records` first — it **wipes
existing records** and resets the auto-increment ids. That is intended (rerunning
gives a clean 8 rows), but do not run it if there is hand-created data you want.

## Drive it (agent path)

With both servers up:

```bash
node .claude/skills/run-weatherwise/driver.mjs
```

Expected tail on success:

```
24 passed, 0 failed, 0 skipped
```

It exits non-zero on any failure, so it works as a gate. Flags:

- `--keep` — don't delete the record it creates, so you can look at it in the UI
- `--backend <url>` / `--frontend <url>` — point at non-default ports

The driver creates a real record, updates it (which re-geocodes and re-fetches
from Open-Meteo), exports it in all five formats, then deletes it. It needs
network access: Open-Meteo for weather and geocoding, Gemini for insights.

`SKIP` on the AI insights line means `GEMINI_API_KEY` is unset — a supported
configuration, not a failure.

## Drive the UI (browser path)

Only needed for visual/layout changes. There is **no `chromium-cli`,
Playwright, xvfb, or tmux on this machine** — the browser harness is the
Claude-in-Chrome MCP extension. Navigate to `http://localhost:5173/`, then use
`mcp__claude-in-chrome__find` to get element refs and `computer` to click.

Always drive the app through **:5173**, never by opening `frontend/index.html`
or hitting :5000 directly. Vite proxies `/api` to the backend, and the frontend
only ever uses relative URLs, so outside the dev server every request 404s.

The app has two tabs: "Weather" (live search) and "Saved Records" (the CRUD,
export, map, and AI surface).

## Gotchas

These cost real time; none are guessable from the README.

- **A passing `/api/health` does not mean *your* backend is running.** If a
  stale backend already holds :5000, your new one dies with `EADDRINUSE` while
  health checks keep answering from the old process — so you can be editing
  code and testing a server that never picked it up. Find the owner before
  assuming your restart worked:
  ```powershell
  $pid5000 = (Get-NetTCPConnection -LocalPort 5000 -State Listen).OwningProcess
  Get-Process -Id $pid5000 | Select-Object Id, ProcessName, StartTime
  ```
  A `StartTime` older than your last edit means you are testing stale code.

- **Vite silently moves to another port when 5173 is taken.** It prints
  `Port 5173 is in use, trying another one...` and binds **5174**, then exits 0
  and looks healthy. If an old dev server still holds 5173, your browser is
  driving the *stale* one while you edit code that is being served by the new
  one — changes appear not to apply, for no visible reason. This is the
  frontend twin of the `EADDRINUSE` trap above, except Vite does not fail
  loudly. **Always read the "Local:" line** and confirm it says 5173:
  ```powershell
  foreach ($p in @(5173,5174)) { $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; if ($c) { "port $p -> pid $($c.OwningProcess | Select-Object -First 1)" } else { "port $p free" } }
  ```
  If both are listening, kill both and start one.

- **Switching git branches under a running Vite serves stale CSS.** After a
  `git checkout` or `git merge`, the dev server can keep serving the previous
  branch's stylesheet while serving the new JS. The app then renders on a white
  background with near-invisible text and looks catastrophically broken, when
  nothing is actually wrong with the code — `npm run build` succeeds and the
  built CSS is correct. **Restart the dev server after any branch change**, and
  before concluding a visual change broke something, compare the built CSS in
  `dist/` against what the dev server returns.

- **Chrome screenshots intermittently time out** with `Page.captureScreenshot
  timed out after 30000ms / the renderer may be frozen`. This happened ~5 times
  in one session and was never a real hang — **just take the screenshot again**
  and it succeeds. Do not go debugging the page.

- **MCP synthetic clicks intermittently focus a button without activating it.**
  The element gets its focus ring, `aria-pressed` stays unchanged, and the view
  does not switch — through repeated retries, a fresh tab, and both coordinate
  and `ref` clicks. **The app is not at fault**: a native `.click()` via
  `javascript_tool` on the same button works instantly every time. When a click
  will not take, stop retrying and drive it with JavaScript:
  ```js
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Saved Records').click()
  ```
  React-controlled inputs need the native setter, not `el.value =`:
  ```js
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(el, 'Paris'); el.dispatchEvent(new Event('input', { bubbles: true }));
  ```

- **`form_input` sets date values directly and bypasses the `max` attribute**
  on `<input type="date">`. That is useful (it is how you test the
  "too far in the future" rejection) but it means a passing form interaction
  does not prove the native picker constrains anything.

- **Seeded rows and created rows must carry the same fields.** `seed.js` once
  omitted `weatherCode`, which surfaced only as "Unknown conditions" in the
  records table and a blank column in CSV/PDF exports. The driver asserts
  `weatherCode` is present on create; if you touch `buildDailyData` or
  `mapDailyToDays`, keep the two shapes in sync.

- **Editing a record does not change its id, so id alone is not a freshness
  key.** `RecordDetail` is keyed on `` `${id}:${updatedAt}` `` because its map
  and AI panel fetch per mount; keying on id alone left the map showing the
  *previous* location after an in-place edit while the temperature table
  updated. If you add another per-record fetch under the detail panel, rely on
  that remount rather than adding your own `[recordId]` effect.

- **`docs/PLAN.md` documents `weather_data` as
  `[{date, tempMax, tempMin, precipitationProbability}]`** — that comment is
  stale; the real shape includes `weatherCode`. Trust
  `backend/src/services/weatherService.js`.

- **Open-Meteo forecasts reach only 15 days ahead** (`forecast_days` maxes at
  16 counting today), so any date range ending later than today+15 is rejected
  by design. Use dates relative to today in tests, never hardcoded ones.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Cannot find module '.../backend/server.js'` | Wrong entrypoint. It is `backend/src/server.js`; use `npm run dev` from `backend/`. |
| `listen EADDRINUSE :::5000` (after "Database schema ready") | A backend is already running. Identify and stop it with the PowerShell snippet in Gotchas — do not just retry. |
| `Could not initialize the database` then exit 1 | MySQL is not up on 3308, or `backend/.env` is missing/wrong. Check the port with the prerequisites snippet. |
| Driver: `cannot reach http://... (ECONNREFUSED) — is that server running?` | That server is down. Start it; the message names which URL failed. |
| Driver: `SKIP  AI insights — GEMINI_API_KEY not configured` | Expected without a key. Not a failure. |
| Driver: `SKIP  AI insights — upstream AI failure: ... HTTP 503` | Gemini is overloaded. Transient and on Google's side; the app hides the panel and everything else works. Rerun if you need it. |
| Driver: a burst of failures right after starting the backend, but health passed | `npm run dev` uses `node --watch`, which restarts once more a second or two after the first "listening" line. The driver ran across that bounce. Wait for the output to settle, then rerun. |
| Browser shows data but the UI is empty at :5000 | You are on the backend port. The UI is served by Vite on :5173. |
| `npm run seed` succeeded but records look wrong in the UI | Seed wipes and recreates rows with new ids; reload the page. |
