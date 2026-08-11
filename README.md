# WeatherWise

A full-stack weather application built for the **Product Manager Accelerator**
AI Engineer Intern technical assessment by **Benijeh Douglas-Inegbedion**.

## Which assessment was completed

**Both.** This is a dual-role submission covering:

- **Tech Assessment #1 (Frontend)** — location search, current conditions,
  "use my current location", weather icons, a 5-day forecast, and graceful
  error handling.
- **Tech Assessment #2 (Backend)** — full CRUD persistence in MySQL with
  validation, a REST API, exports in five formats, and additional API
  integrations.

## Demo video

**https://youtu.be/rVfcFbgHDOY**

A screen-recorded walkthrough of both the running application and the code
behind it — location search and the five-day forecast, error handling, the full
CRUD lifecycle with exports, the map and AI briefing, and the architectural
decisions that hold it together.

## What it does

**Live weather (Assessment #1)**

- Accepts a city, town, landmark, postal/ZIP code, or `lat,lon` coordinates.
- "Use my location" via the browser Geolocation API, with a clear fallback
  message when permission is denied.
- Current conditions: temperature, feels-like, humidity, wind with compass
  direction, and sunrise/sunset shown in the *location's* timezone.
- 5-day forecast with WMO weather icons, responsive across three breakpoints
  (stacked on mobile, two columns on tablet, five across on desktop).
- Two demonstrable error paths: an unknown location, and an upstream API
  failure — both surfaced as readable messages rather than a broken page.

**Saved records (Assessment #2)**

- **CREATE** — enter a location and a date range; the backend validates both,
  resolves the location, fetches the temperatures for every day in the range,
  and stores the result.
- **READ** — list all records, or open one for detail.
- **UPDATE** — edit the location or date range; the record is re-validated,
  re-geocoded, and the weather re-fetched (temperatures are never hand-edited).
- **DELETE** — remove a record, with an inline confirm step.
- **Export** — download records as JSON, CSV, Markdown, XML, or PDF.
- **Extra API integrations** — a Leaflet/OpenStreetMap map of the selected
  location with live air quality, plus an AI weather briefing from Google
  Gemini (clothing advice, travel tips, and non-obvious warnings).

Validation rules are enforced on the server and mirrored in the form so most
mistakes are caught inline: real calendar dates, start on or before end, a
range no longer than 90 days, and no end date more than 15 days ahead (the
limit of Open-Meteo's forecast).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Backend | Node.js 22, Express 4 (ESM) |
| Database | MySQL via `mysql2/promise` |
| Weather | [Open-Meteo](https://open-meteo.com) — forecast, archive, geocoding, air quality (no API key) |
| Maps | Leaflet + OpenStreetMap tiles |
| AI | Google Gemini via REST |
| PDF export | `pdfkit` |

The frontend never calls an external API directly — every request goes through
this project's own backend, so no API key is ever exposed to the browser.

## Requirements

Installed with `npm install` in each package; no global tooling beyond Node and
MySQL.

**Prerequisites**

- Node.js 22+ and npm
- A running MySQL server (this project defaults to port **3308**, not 3306)

**`backend/package.json`**

| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `mysql2` | MySQL driver (promise API) |
| `dotenv` | Loads `.env` configuration |
| `pdfkit` | PDF export generation |

**`frontend/package.json`**

| Package | Purpose |
|---|---|
| `react`, `react-dom` | UI framework |
| `leaflet` | Map rendering |
| `vite`, `@vitejs/plugin-react` | Dev server and build |
| `tailwindcss`, `@tailwindcss/vite` | Styling |

## Setup

**1. Clone**

```bash
git clone https://github.com/CourageJD1/weatherwise.git
cd weatherwise
```

**2. Configure the backend**

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env` and set your MySQL credentials. Every variable is
documented in `.env.example`:

| Variable | Notes |
|---|---|
| `PORT` | Backend port (default `5000`) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection; `DB_PORT` defaults to `3308` |
| `GEMINI_API_KEY` | **Optional.** Free key from [Google AI Studio](https://aistudio.google.com). Leave it unset and the app runs normally with the AI panel hidden. |
| `GEMINI_MODEL` | Optional model override |

`.env` is gitignored and has never been committed.

**3. Install dependencies**

```bash
cd backend  && npm install
cd ../frontend && npm install
```

**4. Run both servers** (two terminals)

```bash
# terminal 1 — backend on http://localhost:5000
cd backend && npm run dev

# terminal 2 — frontend on http://localhost:5173
cd frontend && npm run dev
```

Open **http://localhost:5173**. The backend creates its database and tables on
first boot, so there is no `.sql` file to import.

**5. Optional — load sample data**

```bash
cd backend && npm run seed
```

This inserts 8 demo records across several continents. It clears the
`weather_records` table first, so don't run it if you have data you want to
keep.

## API

All responses use the envelope `{ success, data, error }`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/weather/current?location=` or `?lat=&lon=` | Current conditions (not persisted) |
| `GET` | `/api/weather/forecast?location=` or `?lat=&lon=` | 5-day forecast |
| `POST` | `/api/records` | Create: validate, geocode, fetch range, persist |
| `GET` | `/api/records` | List all records, newest first |
| `GET` | `/api/records/:id` | Read one |
| `PUT` | `/api/records/:id` | Update: re-validate, re-geocode, re-fetch |
| `DELETE` | `/api/records/:id` | Delete |
| `GET` | `/api/export/:format?id=` | Export as `json`, `csv`, `markdown`, `xml`, or `pdf` |
| `GET` | `/api/location/:id/map` | Map centre, bounding box, and air quality |
| `POST` | `/api/insights` | AI weather briefing |

## Where each assessment requirement is implemented

**Tech Assessment #1 — Frontend**

| Requirement | Implemented in |
|---|---|
| Enter a location (zip/postal, coordinates, landmark, town, city) | `frontend/src/components/SearchBar.jsx` → `backend/src/services/weatherService.js` (`geocode`) |
| Current weather with useful details | `frontend/src/components/CurrentConditions.jsx` |
| Weather for the user's current location | `frontend/src/App.jsx` (`getBrowserPosition`), with a permission-denied fallback message |
| Icons / imagery | `frontend/src/utils/weatherCodes.js` — WMO code → icon and label |
| **1.1** Five-day forecast | `frontend/src/components/Forecast.jsx` — 1 / 2 / 5 columns across breakpoints |
| **1.2** Graceful error handling | Unknown location → `services/errors.js` `LocationNotFoundError`; upstream or backend failure → `frontend/src/services/api.js` |

**Tech Assessment #2 — Backend**

| Requirement | Implemented in |
|---|---|
| **2.1** CREATE with location + date range, validated and persisted | `backend/src/routes/records.js`, `backend/src/middleware/validate.js` |
| **2.1** READ (all records and one) | `GET /api/records`, `GET /api/records/:id` |
| **2.1** UPDATE with re-validation | `PUT /api/records/:id` — re-geocodes and re-fetches rather than hand-editing temperatures |
| **2.1** DELETE | `DELETE /api/records/:id` |
| Date-range validation | `middleware/validate.js` — real dates, start ≤ end, ≤ 90 days, ≤ 15 days ahead |
| Location validation / fuzzy match | `services/weatherService.js` — top-ranked candidate, coordinate input bypasses the geocoder |
| **2.2** Additional API integration | Leaflet + OpenStreetMap map and air quality (`routes/location.js`), AI briefing (`services/aiService.js`) |
| **2.3** Export to five formats | `backend/src/utils/exporters.js`, served by `routes/export.js` |

**Submission requirements**

| Requirement | Where |
|---|---|
| Name visible in the app | `frontend/src/components/AboutFooter.jsx` |
| PM Accelerator description + LinkedIn | `frontend/src/components/AboutFooter.jsx` |
| Requirements list | `backend/package.json`, `frontend/package.json`, and the Requirements section above |

## Notes on location lookup

Two geocoders sit behind the search box. Open-Meteo answers first: it is fast,
keyless, and good at populated places. It has no entry for landmarks, and it
indexes postcodes for only some countries — "Eiffel Tower", "SW1A 1AA" and
"100-0001" all return nothing. Since the brief lists Landmarks and Postal Codes
as supported inputs, anything Open-Meteo cannot resolve falls through to
OpenStreetMap's Nominatim, which covers points of interest and international
postcodes. Coordinate-shaped input ("-20.32, 57.52") skips both and is parsed
directly.

Both lookups happen in the backend, so no third-party geocoder is ever called
from the browser.

## Responsive design

> *Assessment #1 asks which responsive techniques were used. This section answers
> that directly.* Verified at 375 px, 768 px and 1440 px.

The approach is **mobile-first**: base styles describe the narrow case and each
breakpoint adds to it, so nothing has to be undone at a smaller size. Tailwind's
`sm` (640 px), `md` (768 px) and `lg` (1024 px) are the only breakpoints used —
three, chosen because the content genuinely changes shape three times.

| Technique | Where | Effect |
|---|---|---|
| Fluid column with a stepped cap | `App.jsx:132` — `max-w-2xl lg:max-w-4xl` | One readable column on phones and tablets; the cap widens at `lg` so five forecast cards get usable widths instead of five cramped ones |
| Grid reflow | `Forecast.jsx:62` — `grid-cols-1 md:grid-cols-2 lg:grid-cols-5` | The 5-day forecast is a vertical list, then a 2-up grid, then a single horizontal row |
| Grid reflow (secondary) | `CurrentConditions.jsx:68` (`grid-cols-2 sm:grid-cols-4`), `RecordForm.jsx:147` (`grid-cols-1 sm:grid-cols-2`) | Stats and form fields pair up on narrow screens rather than stretching full width |
| Axis switch | `SearchBar.jsx:16`, `RecordList.jsx:16` — `flex-col sm:flex-row` | Search field and record controls stack vertically on phones, sit inline from `sm` up |
| Component reorientation | `Forecast.jsx:26` — `lg:flex-col` on each card | A day card is a compact left-to-right row while stacked, and a top-to-bottom column once the grid becomes a row |
| Touch-target floor | `index.css:233` — `@media (max-width: 40rem), (pointer: coarse)` | Every button, summary and input gets `min-height: 44px` (WCAG 2.5.5). Measured first: 40 of 44 controls were under 44 px, some as small as 25 px. Applied as `min-height`, not padding, so nothing reflows or changes type scale — and keyed on coarse *pointer* as well as width, so touch laptops get it too |
| Responsive disclosure, not deletion | `RecordDetail.jsx:37` — `sr-only sm:not-sr-only` | The widest table column (condition name) is hidden visually on phones but stays in the accessibility tree — the icon alone is not an accessible substitute |
| Overflow containment | `RecordDetail.jsx:13` — `max-h-64 overflow-y-auto`, plus `px-2 sm:px-3` | A record can hold 90 days; the table scrolls inside a fixed height instead of pushing the map and AI panel off screen, and cell padding tightens on narrow screens |
| Viewport meta | `index.html:5` | Prevents mobile browsers rendering at a fake 980 px width and zooming out |
| Workload scales with the device | `utils/particles.js` | The ambient canvas scales particle count with viewport area and caps device pixel ratio, so a phone never runs a desktop's rendering load |

Per the brief this is a **web-first** build: the desktop layout is the richest,
and the smaller breakpoints adapt it rather than the reverse.

## Accessibility and graceful degradation

The interface is themed from the weather rather than from a fixed palette, and
an ambient canvas layer animates the current conditions behind the panels.
Neither is allowed to cost legibility or usability:

- **Reduced motion is respected.** If the operating system reports
  `prefers-reduced-motion: reduce`, the animation layer paints a single static
  frame and stops — no loop, no cross-fade, no icon movement. The palette and
  every reading stay exactly as they are. Run
  `node frontend/scripts/check-contrast.mjs` to re-verify the colour side.
- **Contrast is measured, not assumed.** Every text colour is checked against
  its background in all seven weather palettes and must clear WCAG AA at 4.5:1.
  The check is a script, so it can gate a change rather than relying on a
  designer's eye. It caught the storm accent from the original design at
  4.20:1, which was lightened until it passed.
- **The animation never blocks the app.** The canvas is `pointer-events: none`
  and `aria-hidden`, sits behind every panel, and pauses whenever the tab is
  hidden so a background tab burns no CPU. Particle counts scale with viewport
  area and device pixel ratio is capped, so a phone does not run a desktop's
  workload.
- **Nothing depends on it.** The layer is decoration over a fully working app:
  disable JavaScript animation, throttle the GPU, or run with reduced motion
  and every feature — search, forecast, records, exports, map, AI briefing —
  behaves identically.

## Project layout

```
weatherwise/
  backend/
    src/
      config/      database connection and env loading
      db/          schema creation, seed script
      services/    external API wrappers (weather, AI)
      routes/      Express routers
      middleware/  error handler, validation
      utils/       export formatters
  frontend/
    src/
      components/
      services/    calls to this project's backend only
      utils/
  docs/            assessment brief, architecture plan
```

## Verifying it works

A smoke driver exercises the running app end to end — the CRUD lifecycle, all
five export formats, the map endpoint, AI insights, and the validation
rejections:

```bash
node .claude/skills/run-weatherwise/driver.mjs
```

## About the Product Manager Accelerator

The Product Manager Accelerator Program is designed to support PM professionals
through every stage of their careers. From students looking for entry-level
jobs to Directors looking to take on a leadership role, our program has helped
over hundreds of students fulfill their career aspirations.

Our Product Manager Accelerator community are ambitious and committed. Through
our program they have learnt, honed and developed new PM and leadership skills,
giving them a strong foundation for their future endeavors.

🚀 **PMA Pro** — End-to-end product manager job hunting program that helps you
master FAANG-level Product Management skills, conduct unlimited mock
interviews, and gain job referrals through our largest alumni network. 25% of
our offers came from tier 1 companies and get paid as high as $800K/year.

🚀 **AI PM Bootcamp** — Gain hands-on AI Product Management skills by building a
real-life AI product with a team of AI Engineers, data scientists, and
designers. We will also help you launch your product with real user engagement
using our 100,000+ PM community and social media channels.

🚀 **PMA Power Skills** — Designed for existing product managers to sharpen
their product management skills, leadership skills, and executive presentation
skills.

🚀 **PMA Leader** — We help you accelerate your product management career, get
promoted to Director and product executive levels, and win in the board room.

**LinkedIn:** https://www.linkedin.com/school/pmaccelerator/
