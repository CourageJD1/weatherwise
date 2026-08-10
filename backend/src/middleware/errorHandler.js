import {
  ValidationError,
  LocationNotFoundError,
  UpstreamApiError,
  AiNotConfiguredError,
} from '../services/errors.js';

// Central error middleware: maps typed errors to HTTP statuses and shapes
// every failure as { success: false, data: null, error: message }. Must be
// registered after all routes (Express matches error middleware by arity).
export function errorHandler(err, req, res, next) {
  // express.json() throws this when the request body is not valid JSON.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'Request body is not valid JSON.',
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({ success: false, data: null, error: err.message });
  }
  if (err instanceof LocationNotFoundError) {
    return res.status(404).json({ success: false, data: null, error: err.message });
  }
  if (err instanceof AiNotConfiguredError) {
    // Not logged as an error: a missing GEMINI_API_KEY is a supported
    // configuration, not a failure (the AI feature is optional by design).
    return res.status(503).json({ success: false, data: null, error: err.message });
  }
  if (err instanceof UpstreamApiError) {
    // The client gets the clean message; the underlying cause (DNS failure,
    // timeout, upstream error body) is only ever logged here.
    console.error('Upstream API failure:', err.cause ?? err.message);
    return res.status(502).json({ success: false, data: null, error: err.message });
  }

  // Anything else is a bug: log the details server-side, keep them out of
  // the response.
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, data: null, error: 'Internal server error.' });
}
