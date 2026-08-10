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
