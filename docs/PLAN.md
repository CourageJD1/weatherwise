# WeatherWise — Approved Architecture Plan (Phase 1)

Approved 3 Aug 2026. This is the agreed plan referenced by later phase prompts
("our agreed schema", "the dependencies we agreed"). Deviations need discussion.

## Requirements checklist

### MUST HAVE — Assessment #1 (frontend)
- Accept location as zip/postal, GPS coordinates, landmark, town, or city
- Show current weather clearly with useful details
- "Use my current location" via browser geolocation, with permission-denied fallback
- Weather icons/imagery
- Real API data, never static
- Web-first, JS framework only

### STAND APART — Assessment #1
- 5-day forecast in a responsive layout
- Two demonstrable graceful-error examples (city not found, upstream API failure)

### MUST HAVE — Assessment #2 (backend)
- CREATE: location + date range → validate both, fetch temps, persist
- READ: list all records and read one; explicitly NO row-level security / auth
- UPDATE: edit location/date range with same validation as CREATE (re-fetch, overwrite)
- DELETE: remove records
- Export to JSON, CSV, Markdown, XML (PDF last, droppable if time runs short)

### STAND APART — Assessment #2
- Additional API integration: Leaflet/OSM map + air quality folded into location
  detail. YouTube videos = optional stretch only if time remains.

### Submission mechanics (easy to forget)
- Name (Benijeh Douglas-Inegbedion) visible in the app
- PM Accelerator description visible in the app + LinkedIn link (highest miss risk)
- README stating BOTH assessments completed, setup steps, requirements list
- Repo public, demo video URL in README, `.env` never committed

## Database schema

```sql
CREATE TABLE IF NOT EXISTS weather_records (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  location_query  VARCHAR(255) NOT NULL,   -- raw text the user typed
  location_name   VARCHAR(255) NOT NULL,   -- resolved display name from geocoding
  country         VARCHAR(100),
  latitude        DECIMAL(9,6) NOT NULL,
  longitude       DECIMAL(9,6) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  weather_data    JSON NOT NULL,           -- [{date, tempMax, tempMin, weatherCode, precipitationProbability}, ...]
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

- `location_query` vs `location_name` kept separate to make fuzzy matching visible.
- Coordinates stored on the record so exports and the map endpoint need no re-geocode.
- `weather_data` as one JSON column, deliberately NOT normalized to a per-day child
  table: UPDATE re-fetches the whole range, so per-day rows add a join for no gain.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/weather/current?location=` or `?lat=&lon=` | Ephemeral current conditions, not persisted |
| GET | `/api/weather/forecast?location=` or `?lat=&lon=` | 5-day forecast (lat/lon variant needed for the geolocation button) |
| POST | `/api/records` | CREATE: validate, fetch temps for range, persist |
| GET | `/api/records` | READ all, newest first |
| GET | `/api/records/:id` | READ one |
| PUT | `/api/records/:id` | UPDATE: re-validate, re-fetch, overwrite |
| DELETE | `/api/records/:id` | DELETE |
| GET | `/api/export/:format?id=` | Export all records (or one via `?id=`); format = json\|csv\|markdown\|xml\|pdf. Lives OUTSIDE `/api/records` to avoid colliding with `/api/records/:id` |
| GET | `/api/location/:id/map` | Coords + bounding box for Leaflet, plus air quality |
| POST | `/api/insights` | Gemini natural-language weather briefing |

## Settled design decisions

1. **Ephemeral search vs persisted records are two separate features.**
   `/api/weather/*` serves the search box (nothing saved); `/api/records/*` is the
   deliberate CRUD flow. Be ready to justify this in the demo video.
2. **Archive lag is handled via the forecast API's `past_days` parameter** (covers
   the ~5 recent days the Open-Meteo archive endpoint lags on). `getHistorical`
   routes each date to archive vs forecast accordingly. Verify exact parameter
   names against the live docs in Phase 4 — do not code from memory.
3. **Date-range validation:** real dates, start ≤ end, range capped at 90 days,
   and reject ranges extending more than 15 days into the future, with a
   message that says so. (Open-Meteo's `forecast_days` maxes at 16 but counts
   today as day 1, so the furthest fetchable date is today + 15 — found during
   phase 4 review.)
4. **Fuzzy matching:** take Open-Meteo geocoding's top-ranked candidate; a
   coordinate-shaped input ("40.7,-74.0") is detected by regex and bypasses the
   text geocoder.
5. **UPDATE means** editing location/date range with re-validation and re-fetch —
   users never hand-edit temperature values.
6. **No auth, no users, no ownership columns** — the brief explicitly waives
   row-level security.
7. **AI resilience:** strip markdown fences before `JSON.parse`; on parse failure
   degrade to plain-text summary; on API failure omit the panel. Never break the
   core weather flow.
