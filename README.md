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

> **TODO before submitting:** record a 1–2 minute screen share walking through
> the code and the running app, upload it (YouTube / Google Drive / Vimeo), and
> paste the viewable URL here.

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
