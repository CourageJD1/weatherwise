import { UpstreamApiError, AiNotConfiguredError } from './errors.js';

// The ONLY module that knows about Gemini (project constraint: the provider
// stays behind a single module, so swapping LLMs means rewriting this file
// and nothing else). Callers get back a plain insights object:
// { summary, clothingAdvice, travelTips, warnings }.

// REST endpoint and field names verified against the live docs at
// https://ai.google.dev/api/generate-content (CLAUDE.md: no invented params).
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Overridable via GEMINI_MODEL so a model deprecation is a .env edit, not a
// code change (gemini-2.5-flash already 404s for new keys). gemini-3.5-flash
// is stable per https://ai.google.dev/gemini-api/docs/models and confirmed
// available on our key via the ListModels endpoint.
const DEFAULT_MODEL = 'gemini-3.5-flash';

// LLM calls are much slower than Open-Meteo's; give them a longer leash
// than the 10s used in weatherService before aborting.
const UPSTREAM_TIMEOUT_MS = 30_000;

// Passed as generationConfig.responseSchema so Gemini is constrained to this
// exact shape (with responseMimeType "application/json"). parseInsights still
// re-validates — the schema is an instruction to the model, not a guarantee.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    clothingAdvice: { type: 'string' },
    travelTips: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'clothingAdvice', 'travelTips', 'warnings'],
};

/**
 * Generate a natural-language weather briefing.
 * @param {object} input
 * @param {string} input.location    display name, e.g. "Port Louis, Mauritius"
 * @param {object} [input.current]   current conditions from weatherService
 * @param {Array}  [input.forecast]  daily forecast from weatherService
 * @param {object} [input.airQuality] air quality snapshot, if the caller has one
 */
export async function getWeatherInsights({ location, current, forecast, airQuality }) {
  // Checked at call time, not import time, so the server boots fine without
  // a key and only this feature reports itself unavailable.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: buildPrompt({ location, current, forecast, airQuality }) }] }],
    generationConfig: {
      temperature: 0.4, // advice should be steady, not creative
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (cause) {
    const message =
      cause.name === 'TimeoutError'
        ? `The AI service did not respond within ${UPSTREAM_TIMEOUT_MS / 1000} seconds.`
        : 'Could not reach the AI service.';
    throw new UpstreamApiError(message, { cause });
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body; the status check below produces the error.
  }
  if (!res.ok) {
    // Client sees a generic message; the real Gemini error body only ever
    // reaches the server log (via err.cause in the error middleware).
    throw new UpstreamApiError(`The AI service responded with HTTP ${res.status}.`, {
      cause: data?.error ?? data,
    });
  }

  // Successful responses carry the text at candidates[0].content.parts[0].text.
  // It can legitimately be missing (e.g. the prompt was safety-blocked).
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new UpstreamApiError('The AI service returned an empty response.', { cause: data });
  }

  return parseInsights(text);
}

/* ---------------------------------- prompt ---------------------------------- */

function buildPrompt({ location, current, forecast, airQuality }) {
  // The raw data is passed as JSON rather than prose: it is unambiguous, and
  // the model handles it well. Only include sections the caller provided.
  const sections = [
    `Location: ${location}`,
    current && `Current conditions: ${JSON.stringify(current)}`,
    forecast?.length && `Daily forecast: ${JSON.stringify(forecast)}`,
    airQuality && `Air quality: ${JSON.stringify(airQuality)}`,
  ].filter(Boolean);

  return [
    'You are a concise, practical weather advisor helping someone plan their day and their travel.',
    '',
    ...sections,
    '',
    'Data notes: temperatures are in Celsius, wind speeds in km/h,',
    '"weatherCode" is a WMO weather interpretation code,',
    '"precipitationProbability" is a percentage, and air quality AQI values use the scale named in the key.',
    '',
    'Respond with JSON containing exactly these fields:',
    '- "summary": 2-3 sentences describing the overall weather picture in plain language.',
    '- "clothingAdvice": one short paragraph on what to wear.',
    '- "travelTips": array of 2-4 short, specific tips for a traveller in this location today.',
    '- "warnings": array (empty if none apply) of non-obvious things worth flagging,',
    '  such as strong UV, wind chill making it feel colder than the number, oppressive',
    '  humidity, poor air quality, or large temperature swings between forecast days.',
    'Do not invent data that is not present above. Keep every field practical and specific.',
  ].join('\n');
}

/* ---------------------------------- parsing --------------------------------- */

// Plan decision 7: strip markdown fences before parsing, and on parse failure
// degrade to a plain-text summary instead of failing the request.
function parseInsights(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  // The typeof check also covers valid-but-useless JSON like null, an array,
  // or a bare string — anything we can't read fields off falls back the same
  // way as unparseable text (typeof null is "object", hence the extra check).
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { summary: cleaned, clothingAdvice: null, travelTips: [], warnings: [] };
  }

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : cleaned,
    clothingAdvice: typeof parsed.clothingAdvice === 'string' ? parsed.clothingAdvice : null,
    travelTips: toStringArray(parsed.travelTips),
    warnings: toStringArray(parsed.warnings),
  };
}

// The frontend will render these with .map(), so guarantee an array of strings
// no matter what shape the model actually produced.
function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string');
}
