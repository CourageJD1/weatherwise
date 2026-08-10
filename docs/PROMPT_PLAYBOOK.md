# WeatherWise: Claude Code Prompt Playbook

**Project:** PM Accelerator AI Engineer Intern tech assessment (dual role, Assessment #1 + #2)
**Received:** 29 July 2026 | **Due:** on or before 12 August 2026
**Author:** Benijeh Douglas-Inegbedion

---

## Locked-in stack

| Layer      | Choice                                                    | Why                                                                                                          |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Frontend   | React + Vite + Tailwind                                   | Already familiar from StudySmart, brief forbids Python/Java frontends                                        |
| Backend    | Node.js + Express (ESM)                                   | Your stack, satisfies "RESTful API" requirement                                                              |
| Database   | MySQL via `mysql2`                                        | Your stack, auto-create schema on boot to reduce reviewer friction                                           |
| Weather    | Open-Meteo (geocoding + forecast + archive + air quality) | Free, no API key, and the archive endpoint is the only free way to satisfy the CREATE date-range requirement |
| Map        | Leaflet + OpenStreetMap tiles                             | Free, no key, no billing account                                                                             |
| AI feature | Google Gemini free tier                                   | No card required, isolated behind one service module                                                         |
| Exports    | JSON, CSV, Markdown, XML, PDF                             | First four are near-free, PDF via PDFKit if time allows                                                      |
| Repo name  | `weatherwise`                                             | Ages better as a portfolio piece than "pma-assessment"                                                       |

---

## Phase 0: do this yourself, before opening Claude Code

1. Create an empty GitHub repo named `weatherwise`, public. Clone it locally.
2. Create `docs/ASSESSMENT.md` and paste in the **entire text** of the assessment PDF. Claude Code needs to read the actual requirements, not your summary of them.
3. Create `CLAUDE.md` in the repo root with the content in the next section. Claude Code reads this automatically at the start of every session, so it saves you repeating yourself.
4. Get a Gemini API key from Google AI Studio (free, about two minutes, no card).
5. Confirm which port your MySQL Server is on. StudySmart used 3308, so do not assume 3306.
6. Commit these files before writing any code.

---

## Your CLAUDE.md

Paste this in verbatim, adjusting the MySQL port if needed.

```markdown
# WeatherWise

A weather application built for the PM Accelerator AI Engineer Intern technical
assessment. The full requirements are in `docs/ASSESSMENT.md`. Read them before
making architectural decisions. This is a DUAL ROLE submission: it must satisfy
both Tech Assessment #1 (frontend) and Tech Assessment #2 (backend).

## Stack (do not change without asking me)

- Backend: Node.js + Express, ESM modules (`"type": "module"`)
- Database: MySQL via the `mysql2/promise` driver
- Frontend: React + Vite + Tailwind CSS
- Weather data: Open-Meteo (no API key required)
- Maps: Leaflet + OpenStreetMap
- LLM: Google Gemini via REST, isolated behind a single service module

## Repo layout

weatherwise/
backend/
src/
config/ db connection, env loading
db/ schema creation, seed script
services/ external API wrappers (weather, ai, media)
routes/ express routers
middleware/ error handler, validation
utils/ exporters, formatters
server.js
frontend/
src/
components/
hooks/
services/ calls to OUR backend only
App.jsx
docs/

## Hard rules

- NEVER commit `.env`. It must be in `.gitignore` from the first commit.
- The frontend NEVER calls an external API directly. All external calls go
  through our backend so keys are never exposed to the browser.
- Always maintain a `.env.example` with every variable, using placeholder values.
- Ask me before adding any npm dependency. Justify why it is needed.
- Keep functions small. Comment anything non-obvious, because I have to explain
  this code out loud in a recorded video.
- Do not refactor files outside the scope of the current task.
- Do not over-engineer. No abstraction layers I did not ask for.
- Do not invent API parameters. If you are unsure of an Open-Meteo or Gemini
  parameter name, fetch and read the official docs first.

## Conventions

- Backend responses: `{ success: boolean, data: any, error: string | null }`
- Errors thrown from services should be typed so route handlers can map them to
  the right HTTP status code.
- Dates stored and compared as `YYYY-MM-DD`.
- Temperatures stored and displayed in Celsius. If a unit toggle is ever added,
  convert at the display layer only — never change what is stored.
```

---

## How to run each phase

1. Paste the prompt.
2. Read the diff properly. Do not just accept.
3. Run it. Confirm the "Done when" condition actually holds.
4. `git add . && git commit -m "phase N: ..."`
5. Run `/clear` before starting the next phase. `CLAUDE.md` carries the important context forward.

If a phase goes badly wrong, you can `git reset --hard` back one commit instead of losing the whole project.

---

# THE PROMPTS

## Phase 1: architecture plan (no code)

```
Read docs/ASSESSMENT.md and CLAUDE.md in full.

This is a dual-role submission, so it has to satisfy every requirement in BOTH
Tech Assessment #1 and #2.

Task: produce a plan only. Do NOT write any code yet.

Give me:
1. A requirements checklist extracted from the brief, split into MUST HAVE and
   STAND APART, with a note on which are easy to accidentally miss.
2. The full file tree you intend to create.
3. The database schema you propose, with column types and reasoning.
4. The list of API endpoints, with method, path, and one-line purpose.
5. Any requirement in the brief that you think is ambiguous or technically
   tricky, and how you would handle it.

Be honest about anything you think is a risk.
```

Read this output carefully. It is the cheapest chance to catch a wrong assumption.

## Phase 2: scaffold

```
Context: plan approved. Nothing built yet.

Task: create the project scaffold only.
- backend/ and frontend/ folders per CLAUDE.md
- package.json for each with the dependencies we agreed
- .gitignore at root covering node_modules, .env, build output
- .env.example for the backend with every variable and placeholder values
- A minimal Express server that starts and responds to GET /api/health
- A Vite + React + Tailwind frontend that starts and renders "WeatherWise"

Constraints: no business logic yet. No database connection yet. Do not install
anything beyond what is needed for the above.

Done when: `npm run dev` works in both folders and /api/health returns 200.
```

## Phase 3: database layer

```
Context: scaffold works. MySQL Server is running locally on port 3308.

Task: build the database layer.
- backend/src/config/db.js: a mysql2/promise connection pool reading from .env
- backend/src/db/schema.js: creates the tables from our agreed schema using
  CREATE TABLE IF NOT EXISTS, called automatically on server startup
- backend/src/db/seed.js: a script runnable via `npm run seed` that inserts
  about 8 realistic sample records across different locations and date ranges

Constraints: the schema must self-create on boot so a reviewer cloning this repo
only needs MySQL running and a .env. They should never have to import a .sql file
by hand.

Done when: I delete the database, start the server, and the tables are recreated
automatically. Then `npm run seed` fills them.
```

## Phase 4: weather service

```
Context: DB layer done. Now the external data.

Task: build backend/src/services/weatherService.js wrapping Open-Meteo.

Functions needed:
- geocode(query): accepts a city, town, landmark, postal code, or "lat,lon"
  string. Returns matched location(s) with name, country, lat, lon. This is what
  gives us the fuzzy location matching the brief asks for.
- getCurrent(lat, lon)
- getForecast(lat, lon): 5 days
- getHistorical(lat, lon, startDate, endDate): uses the Open-Meteo archive API
  for older dates, but the archive lags ~5 days behind, so route recent past
  dates through the forecast API's past_days parameter (see docs/PLAN.md
  decision 2)
- getAirQuality(lat, lon)

IMPORTANT: fetch and read the current Open-Meteo documentation before writing
this. Do not guess parameter names from memory.

Constraints: use native fetch, no new dependencies. Throw typed errors
(LocationNotFoundError, UpstreamApiError) rather than returning null. Do not
touch routes yet.

Done when: I can run a scratch script that calls each function for "Vacoas,
Mauritius" and prints real data, including a historical range from last month.
```

## Phase 5: CRUD routes and validation

This is the heaviest phase and the one they score most closely.

```
Context: weather service works.

Task: build the CRUD routes for weather records per section 2.1 of the brief.

CREATE POST /api/records
- Body: location string + startDate + endDate
- Validate: dates are real, start is not after end, range is not absurd
  (cap it at 90 days), the range does not extend more than 16 days into the
  future (Open-Meteo forecast limit — say so in the error message), and the
  location resolves via geocode()
- Fetch temperatures for that range and persist location + range + results

READ
- GET /api/records (all records, newest first)
- GET /api/records/:id

UPDATE PUT /api/records/:id
- Allow editing location and date range, re-validating and re-fetching weather
- Reject incoherent input the same way CREATE does

DELETE /api/records/:id

Constraints: all validation lives in middleware, not scattered inside handlers.
Validation failures return 400 with a clear human-readable message saying what
was wrong and what was expected. Do not add authentication, the brief explicitly
says row-level security is not needed.

Done when: I can exercise all four operations and every validation rule rejects
bad input with a helpful message.
```

## Phase 6: error handling

```
Context: CRUD works on the happy path.

Task: centralised error handling.
- backend/src/middleware/errorHandler.js mapping our typed errors to status codes
  (404 for location not found, 502 for upstream API failure, 400 for validation,
  500 for anything unexpected)
- Consistent response shape per CLAUDE.md
- A timeout on outbound Open-Meteo calls so a hanging upstream does not hang us
- Server-side logging of the real error, generic message to the client

Then show me how to deliberately trigger each error type so I can demonstrate
them in my demo video. The brief specifically asks for this.

Done when: requesting a nonsense city returns a clean 404 and the server does not
crash.
```

## Phase 7: data export

```
Context: CRUD and error handling done.

Task: implement section 2.3, data export.

GET /api/export/:format where format is json, csv, markdown, xml, or pdf.
Optionally accepts ?id= to export a single record. The route lives OUTSIDE
/api/records so it can never collide with GET /api/records/:id.

- Build the formatters in backend/src/utils/exporters.js, one function per format
- Set correct Content-Type and Content-Disposition so the browser downloads
- CSV must handle commas and quotes inside values correctly
- Use PDFKit for the PDF. This is the only new dependency here.

Done when: all five endpoints return a downloadable file that opens correctly in
the relevant application.
```

## Phase 8: the AI feature

```
Context: backend core is complete.

Task: add the AI-powered feature, which is our main differentiator for an AI
Engineer Intern role.

- backend/src/services/aiService.js calling the Google Gemini API via REST,
  key from GEMINI_API_KEY in .env
- POST /api/insights takes weather data for a location and returns a natural
  language briefing: what to wear, what a traveller should watch out for, and
  anything non-obvious (UV, wind chill, humidity, air quality, big day-to-day
  swings)
- Prompt Gemini to return structured JSON with fields like summary,
  clothingAdvice, travelTips, warnings, and parse it safely

Constraints: keep the provider behind a single module so swapping to another LLM
is a small change. If the AI call fails, the app must still work and simply omit
the insight panel. It must never break the core weather flow.

Done when: I get sensible advice back for a hot humid Mauritius day and a cold
London day, and the app still functions when I remove the API key.
```

## Phase 9: additional API integration

```
Context: AI feature works.

Task: section 2.2, additional API integration.
- GET /api/location/:id/map returns the coordinates and bounding box the frontend
  needs to render a Leaflet map with OpenStreetMap tiles
- Fold the Open-Meteo air quality data into the location detail response

Constraints: no Google Maps, we are avoiding services that need a billing account.
No new backend dependencies, Leaflet is a frontend-only library.

Done when: the endpoint returns valid coordinates for a stored record.
```

## Phase 10: frontend core

```
Context: backend is feature-complete. Now Tech Assessment #1.

Task: build the core weather UI.
- A search input accepting city, postal code, landmark, or coordinates, with
  clear placeholder text guiding the user on accepted formats
- A "use my location" button using the browser Geolocation API, with a graceful
  fallback and a clear message if the user denies permission
- A current conditions display: temperature, feels-like, condition icon,
  humidity, wind, sunrise and sunset in the LOCATION's timezone not the user's
- Loading and error states for every request

Constraints: the frontend calls only our backend. Tailwind for styling.
Mobile-first responsive classes. Do not build the forecast or the CRUD UI yet.

Done when: I can search "Vacoas" and see live current conditions, and the
geolocation button works.
```

## Phase 11: forecast and responsiveness

```
Context: current weather UI works.

Task:
- 5-day forecast per section 1.1: a responsive grid that is a horizontal row on
  desktop, two columns on tablet, a vertical stack on mobile. Each day shows
  date, icon, high, low, and precipitation chance.
- Go through the whole app and make the responsive behaviour deliberate and
  consistent.

Then write me a short plain-English summary of exactly which responsive
techniques were used and where, because the brief asks me to justify this and I
need to say it out loud in my video.

Done when: the layout works cleanly at 375px, 768px and 1440px with no horizontal
scrolling.
```

## Phase 12: management UI

```
Context: weather display is done.

Task: build the UI for the backend features so a reviewer can see them without
using curl or Postman.
- A records view listing saved searches with edit and delete controls
- A form to create a record with a location and a date range, using a date picker
  that surfaces our validation errors inline
- Export buttons for all five formats
- A Leaflet map showing the selected location
- A panel displaying the AI insight

Constraints: reuse existing components where sensible. Do not restyle the
existing weather views.

Done when: I can perform every CRUD operation and every export from the browser.
```

## Phase 13: required submission details

```
Context: app is functionally complete.

Task: add the two things the brief explicitly requires that are easy to forget.
- My name, Benijeh Douglas-Inegbedion, visible in the app
- An info section or modal with the PM Accelerator description. Use the text in
  docs/PMA_DESCRIPTION.md, link to
  https://www.linkedin.com/school/pmaccelerator/

Done when: both are visible without hunting for them.
```

Create `docs/PMA_DESCRIPTION.md` yourself first, with their LinkedIn About text including the four service lines (PMA Pro, AI PM Bootcamp, PMA Power Skills, PMA Leader).

## Phase 14: README and requirements

```
Context: app is complete.

Task: write the README.md. It has to let a stranger clone and run this in under
five minutes.
- What was built, stating clearly that BOTH Tech Assessment #1 and #2 were
  completed
- Tech stack and why
- Prerequisites, with exact versions (Node v22.12.0, MySQL)
- Step-by-step setup, including .env configuration
- How to seed sample data
- Full API endpoint reference table
- A requirements section listing every package and its purpose, since the brief
  asks for a requirements file
- A short section mapping each assessment requirement to where it is implemented

Constraints: concise and scannable. No marketing language. Leave a placeholder
line at the top for the demo video URL.

Done when: I could hand this to someone with none of my setup.
```

## Phase 15: self-review

```
Task: review the entire finished project against docs/ASSESSMENT.md line by line.

For every single requirement in both Tech Assessment #1 and #2, tell me:
- Where it is implemented
- Whether it is fully, partially, or not satisfied

Be critical. I would rather find gaps now than have the reviewer find them. List
anything weak, unhandled, or fragile, ordered by how much it would hurt my
evaluation.
```

Fix whatever this surfaces, then re-run it.

## Phase 16: understand your own code

Run these before recording the video. Do them across several sessions, not all at once.

```
Walk me through backend/src/services/weatherService.js line by line as if I have
never seen it. Explain what each function does, why it is structured that way,
and what would break if the Open-Meteo API changed.
```

```
Explain how a request flows through this app from the moment I type "Tokyo" into
the search box to the moment I see the forecast. Name every file it touches in
order.
```

```
Quiz me. Ask me ten questions about this codebase that a technical interviewer
might ask, wait for my answer to each one, then tell me what I got wrong or
missed.
```
  
That last one is the highest-value prompt in this document.

---

# THE VISUAL OVERHAUL

Added 10 August 2026. Optional upside, not scored baseline — the brief says
"NO NEED to make the UI beautiful… However, if you want to make it nice, feel
free to do it. It's nice to have." Everything below is therefore sequenced so a
submittable build is never at risk.

Three tiers, ordered by payoff per hour and by risk. Do them in order. Each is a
separate Claude Code prompt on the `visual` branch, with a commit between each.

## Before you touch anything

```
git checkout main
git tag submission-safe
git push --tags
git checkout -b visual
```

`submission-safe` is the escape hatch. If the globe eats the machine at 11pm the
night before submission, `git checkout main` gets back to a working app
instantly. Only tag a `main` that has passed Phase 15, or the escape hatch may
itself be broken.

Merge to `main` only when it runs cleanly.

## The design direction

Innovative but still easy to use means **spending all the boldness in one place**
and keeping everything around it disciplined. The globe is the bold thing.
Therefore the panels, type, and controls stay quiet, or the screen becomes noise
and the reviewer cannot find the temperature.

### Palette

Not a fixed palette. The palette is **derived from the weather**, which is the
actual innovation and the thing that makes it feel alive rather than skinned.

Six CSS custom properties, re-set whenever conditions change, with a slow
transition:

```
--surface        deep base, the "atmosphere"
--surface-raised panel background, semi-transparent
--ink            primary text
--ink-muted      secondary text
--accent         condition-driven highlight
--glow           the light source colour behind the globe
```

| Condition | surface | accent | feel |
| --- | --- | --- | --- |
| Clear day | `#1B3A4B` | `#F2C14E` | high sun, warm light |
| Clear night | `#101826` | `#7FA8D9` | cold moonlight |
| Rain | `#1E2A32` | `#6FB1C4` | wet slate |
| Snow | `#243040` | `#D6E4F0` | flat blue-grey |
| Storm | `#161B26` | `#8C7AE6` | bruised violet |
| Fog | `#2A2F33` | `#A9B4BA` | desaturated, low contrast |

Base surface stays dark across all of them so the globe reads and text contrast
is never in question. Only the accent and glow swing hard.

Avoid the cream-and-terracotta look and the near-black-with-acid-green look.
Both are what every AI-generated interface currently looks like, and a reviewer
who has seen forty submissions will clock it.

### Type

- **Display:** Bricolage Grotesque. Variable width, real character, free on
  Google Fonts. Used only for the temperature and the location name.
- **Body:** Public Sans or Figtree. Quiet, readable over a moving background.
- **Data:** IBM Plex Mono, tabular figures, for humidity, wind, pressure,
  sunrise and sunset.

The mono for readouts is the deliberate choice worth defending in the video: a
weather app is an **instrument**, and instruments show numbers in fixed-width so
they do not jitter as values change. That is a real reason, not decoration.

### Signature

The globe. One memorable element, executed properly.

## Tier A: design system and weather-driven colour

Highest payoff per hour, zero risk, no new dependencies. If only one tier gets
done, do this one.

```
Context: the app is functionally complete through Phase 14. I now want to improve
the visual design. Nothing about the backend, API contracts, or data flow should
change.

Task: build a design system layer.

1. Add the fonts: Bricolage Grotesque (display), Public Sans (body), IBM Plex Mono
   (numeric readouts). Load them properly, not with a render-blocking import.

2. Create a theme module that maps a weather condition code plus is-day into a set
   of CSS custom properties: --surface, --surface-raised, --ink, --ink-muted,
   --accent, --glow. Use the preset table in the design direction above.

3. Apply the theme at the root element whenever the displayed weather changes, with
   a 700ms ease transition on the colour properties so it fades rather than snaps.

4. Restyle the existing panels as raised surfaces: subtle backdrop blur, 1px border
   at low opacity, generous internal padding, consistent corner radius. Set a real
   type scale. Temperature in the display face at a large size, readouts in the mono
   face with tabular figures.

5. Verify contrast: all text must hit at least 4.5:1 against its background in every
   one of the six conditions.

Constraints: Tailwind plus CSS custom properties. No new component libraries. Do not
change any component's props or behaviour, only its presentation. Do not touch the
records table, exports, or the AI panel logic.

Done when: searching a rainy city and then a clear city visibly shifts the whole
palette, and every reading stays legible in both.
```

## Tier B: weather-reactive animation

Medium effort, high visual impact, moderate risk. This is the "rain droplets on
the screen" part.

```
Context: Tier A is merged. Theme tokens exist.

Task: add an ambient weather animation layer.

1. Create a full-viewport canvas layer sitting behind the UI panels and above the
   background, with pointer-events: none.

2. Implement particle systems driven by the current condition:
   - rain: fine vertical streaks, angle and density scaled by wind speed and
     precipitation intensity
   - snow: slower, drifting, varied sizes
   - fog: a few large soft drifting shapes at very low opacity
   - clear day: sparse slow-moving dust motes catching the light
   - clear night: a faint starfield with occasional twinkle
   - storm: rain plus an occasional full-screen flash at random intervals of 8 to 20
     seconds

3. Animate the condition icons themselves in SVG with CSS, matching the layer: falling
   droplets on the rain icon, drifting flakes on snow, a slow rotation on the sun.

4. Cross-fade between particle systems over about 1 second when the condition changes.
   Never hard-cut.

Hard requirements:
- Respect prefers-reduced-motion: if set, render a single static frame and stop.
- Pause the animation loop when document.hidden is true.
- Cap particle count and scale it down on small viewports.
- Use requestAnimationFrame with a delta-time step so speed is frame-rate independent.
- The layer must never intercept clicks or block scrolling.

Constraints: plain canvas 2D and SVG. No animation libraries. Keep the particle logic
in one file with the tunable values as named constants at the top, so I can explain
them.

Done when: rain visibly falls behind the UI during rain, it snows during snow, the
whole thing stops for reduced-motion, and I can still click every control.
```

## Tier C: the globe

Biggest effort, biggest risk, highest ceiling. **Adds npm dependencies** —
`@react-three/fiber` and `@react-three/drei` — which the `CLAUDE.md` hard rule
says must be approved before installing.

```
Context: Tiers A and B are merged.

Task: replace the static background with an interactive 3D globe.

1. Add @react-three/fiber and @react-three/drei. Render a sphere with an
   equirectangular earth texture, positioned so it occupies the background with the UI
   panels floating above it.

2. Idle behaviour: the globe rotates slowly and continuously. Cursor position applies a
   gentle parallax tilt, damped so it eases rather than tracking rigidly. Cursor drag
   rotates it directly with inertia on release.

3. On location select: animate the globe so the chosen latitude and longitude rotates
   to face the camera. Ease over roughly 1.5 seconds. Drop a subtle marker at that
   point. The camera should pull in slightly during the move and settle back.

4. Lighting: a directional light positioned from the real sub-solar point for the
   current UTC time, so the day/night terminator on the globe is actually correct.
   Tint the light using the --glow theme token.

5. Atmosphere: a thin rim glow around the sphere edge in the accent colour.

Hard requirements:
- Lazy-load the whole 3D bundle so first paint is not blocked.
- Detect WebGL support. If absent, fall back to a static gradient background using the
  theme tokens. The app must never break.
- Respect prefers-reduced-motion: no idle rotation, no cursor parallax, jump directly
  to the selected location.
- Cap the device pixel ratio at 2 and pause rendering when the tab is hidden.
- Target 60fps on a mid-range laptop. If a texture is heavy, compress it.

Constraints: keep all 3D code inside components/globe/. Do not entangle it with the
weather data layer beyond passing in lat, lon, and theme tokens as props.

Done when: I search Tokyo, the globe swings around to Japan and settles, and the app
still works with WebGL disabled in devtools.
```

The day/night terminator in step 4 is the detail that will make a technical
reviewer sit up, because it means the astronomy was actually thought about
rather than a globe component pasted in. It is also the part most likely to be
subtly wrong. Test it against a known sunrise time before trusting it.

If the globe fights back, ship Tiers A and B. A beautifully coloured, animated,
correctly built app beats a broken globe by a wide margin.

## Tier D: polish pass, if time remains

```
Task: a final polish pass. No new features.

- Page-load sequence: panels stagger in over about 400ms total rather than all
  appearing at once.
- Hover states on every interactive element, consistent timing across all of them.
- Number transitions: temperature counts up to its new value rather than snapping.
- Skeleton loading states shaped like the content they replace, not spinners.
- Empty state for the records view that invites the first action rather than saying
  "no data".
- Visible keyboard focus rings on everything focusable. Check the whole flow with Tab.
- Rewrite every error message to say what happened and what to do next, in the app's
  voice.

Then screenshot the app at 375px, 768px and 1440px and tell me honestly what still
looks unfinished.
```

Also parked here, from the Phase 15 review (10 August): a **°C/°F toggle**.
Not a brief requirement, so it was deliberately deferred rather than built
before recording — it would touch CurrentConditions, Forecast and RecordDetail
at the worst possible moment. Worth doing afterwards, since PM Accelerator is
US-based and a Fahrenheit-native reviewer reads Celsius less fluently. Convert
at the display layer only; Celsius stays the stored unit.

## Two things that will bite you

**Recording.** Screen recorders and a 3D globe compete for the same GPU. The demo
video may stutter even though the app is smooth. Close everything else, record at
1080p rather than higher, and do a fifteen-second test recording before the real
take.

**The reviewer's machine.** You do not know what they will run this on. That is
what the WebGL fallback and the reduced-motion path are for, and both are worth a
sentence in the README. Saying graceful degradation was handled is itself a
technical signal.

---

## Original pacing (as planned on 29 July, 9 days remaining)

| Day | Phases                           |
| --- | -------------------------------- |
| 1   | 0, 1, 2                          |
| 2   | 3, 4                             |
| 3   | 5                                |
| 4   | 6, 7                             |
| 5   | 8, 9                             |
| 6   | 10, 11                           |
| 7   | 12, 13                           |
| 8   | 14, 15, plus optional deployment |
| 9   | 16, record video, submit         |

Build in a buffer. Do not plan to submit on the final day.

## Revised pacing (from 10 August, 2 days remaining)

Phases 0–14 are done and pushed. Due on or before **12 August**, so there are
roughly two working days left and the visual overhaul now competes directly with
Phase 15, Phase 16, and the recording.

| Remaining time | Work | Droppable? |
| --- | --- | --- |
| First | Phase 15 self-review, fix what it surfaces, tag `submission-safe` | No — this is what makes the build submittable |
| Then | Tier A (design system, weather-driven colour) | Yes, but cheapest win of the four |
| Then | Phase 16 + record video + paste URL in README + submit | **No — the video is a hard requirement** |
| Only if time genuinely remains | Tier B, then Tier C, then Tier D | Yes, all of them |

The ordering constraint that matters: **Phase 16 and the recording are not
optional and cannot be compressed**, because the brief requires a 1–2 minute
video explaining both the code and the output. Every tier is optional. If the
tiers eat the recording slot, the submission is worse, not better.

---

## Prompting reminders

- Ask for a plan before code on anything substantial.
- One concern per prompt.
- State explicitly what not to touch.
- Never accept a diff you have not read.
- Run the code before committing. "It compiles" is not "it works".
- `.gitignore` before `.env`, always. This repo goes public.
- `/clear` between phases.
- When it over-builds, say so plainly: "this is more than I asked for, simplify it".

---

## Final submission checklist

- [ ] Repo public, or private with `community@pmaccelerator.io` and `hr@pmaccelerator.io` added as collaborators
- [ ] README with setup instructions and requirements list
- [ ] Your name visible in the app
- [ ] PM Accelerator description in the app
- [ ] Demo video, 1 to 2 minutes, showing both code and output
- [ ] Video URL viewable by anyone, and pasted in the README
- [ ] Google form submitted, stating clearly that both assessments were completed
- [ ] No `.env` in the commit history

If any visual tier shipped, also:

- [ ] `visual` branch merged into `main`, and `main` still runs from a clean clone
- [ ] README notes the WebGL fallback and the `prefers-reduced-motion` path, since
      graceful degradation is itself a technical signal
- [ ] App re-checked in the browser after the merge — the smoke driver only covers
      the backend and will stay green through a broken frontend
