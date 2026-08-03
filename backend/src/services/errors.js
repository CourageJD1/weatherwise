// Typed service errors, per the project convention: services throw these and
// the error-handling middleware maps each class to an HTTP status
// (LocationNotFoundError -> 404, UpstreamApiError -> 502). Shared here so the
// upcoming ai/media services can reuse UpstreamApiError.

export class LocationNotFoundError extends Error {
  constructor(query) {
    super(`No location found matching "${query}"`);
    this.name = 'LocationNotFoundError';
  }
}

export class UpstreamApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UpstreamApiError';
  }
}
