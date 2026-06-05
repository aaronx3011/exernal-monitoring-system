export class MonitoringError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'MonitoringError';
  }
}

export class ConfigurationError extends MonitoringError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends MonitoringError {
  constructor() {
    super('Invalid API key or authentication failed', 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends MonitoringError {
  constructor(public readonly retryAfterMs: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}
