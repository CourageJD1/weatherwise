# WeatherWise

A weather application built for the PM Accelerator AI Engineer Intern technical
assessment. The full requirements are in `docs/ASSESSMENT.md`. Read them before
making architectural decisions. This is a DUAL ROLE submission: it must satisfy
both Tech Assessment #1 (frontend) and Tech Assessment #2 (backend).

The approved architecture plan — schema, endpoint list, and settled design
decisions — is in `docs/PLAN.md`. Later phases refer to it as "the agreed
schema/plan". Follow it; raise it with me before deviating.

## Stack (do not change without asking me)

- Backend: Node.js + Express, ESM modules (`"type": "module"`)
- Database: MySQL via the `mysql2/promise` driver, local server on port 3308
- Frontend: React + Vite + Tailwind CSS
- Weather data: Open-Meteo (no API key required)
- Maps: Leaflet + OpenStreetMap
- LLM: Google Gemini via REST, isolated behind a single service module

## Repo layout

weatherwise/
  backend/
    src/
      config/     db connection, env loading
      db/         schema creation, seed script
      services/   external API wrappers (weather, ai, media)
      routes/     express routers
      middleware/ error handler, validation
      utils/      exporters, formatters
    server.js
  frontend/
    src/
      components/
      hooks/
      services/   calls to OUR backend only
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
- Temperatures stored in Celsius, converted for display only.
