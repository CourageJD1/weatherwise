// Typed errors, per the project convention: services and middleware throw
// these and the error-handling middleware maps each class to an HTTP status
// (ValidationError -> 400, LocationNotFoundError -> 404, UpstreamApiError
// -> 502). Shared here so the upcoming ai/media services can reuse
// UpstreamApiError.

// Bad client input (malformed dates, incoherent ranges, unresolvable
// location on the CRUD routes). The message is shown to the user verbatim,
// so it must say what was wrong AND what was expected.
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class LocationNotFoundError extends Error {
  constructor(query) {
    super(`No location found matching "${query}"`);
    this.name = 'LocationNotFoundError';
  }
}

export class UpstreamApiError extends Error {
  // options.cause (standard Error option) carries the original network
  // error for server-side logging; the message alone goes to the client.
  constructor(message, options) {
    super(message, options);
    this.name = 'UpstreamApiError';
  }
}

// Thrown when GEMINI_API_KEY is not set. Distinct from UpstreamApiError
// because nothing failed upstream — the optional AI feature is simply off.
// Mapped to 503 so the frontend can quietly hide the insights panel while
// every other feature keeps working.
export class AiNotConfiguredError extends Error {
  constructor() {
    super('AI insights are not configured on this server.');
    this.name = 'AiNotConfiguredError';
  }
}
