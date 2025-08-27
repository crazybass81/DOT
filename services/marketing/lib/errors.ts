/**
 * Custom error classes for better error handling
 */

export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class APIError extends BaseError {
  constructor(message: string, statusCode = 500) {
    super(message, statusCode, true);
  }
}

export class ValidationError extends BaseError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message, 400, true);
    this.field = field;
    this.value = value;
  }
}

export class AuthenticationError extends BaseError {
  constructor(message = 'Authentication required') {
    super(message, 401, true);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, true);
  }
}

export class NotFoundError extends BaseError {
  public readonly resource?: string;
  public readonly id?: string;

  constructor(resource?: string, id?: string) {
    const message = resource 
      ? `${resource}${id ? ` with id ${id}` : ''} not found`
      : 'Resource not found';
    super(message, 404, true);
    this.resource = resource;
    this.id = id;
  }
}

export class RateLimitError extends BaseError {
  public readonly retryAfter?: number;

  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, true);
    this.retryAfter = retryAfter;
  }
}

export class YouTubeAPIError extends APIError {
  public readonly quota?: number;
  public readonly reason?: string;

  constructor(message: string, details?: any) {
    super(message, details?.code || 500);
    this.quota = details?.quota;
    this.reason = details?.reason;
  }
}

export class DynamoDBError extends BaseError {
  public readonly operation?: string;

  constructor(message: string, operation?: string) {
    super(message, 500, false);
    this.operation = operation;
  }
}

/**
 * Error handler utility
 */
export function handleError(error: unknown): BaseError {
  if (error instanceof BaseError) {
    return error;
  }

  if (error instanceof Error) {
    return new BaseError(error.message, 500, false);
  }

  if (typeof error === 'string') {
    return new BaseError(error, 500, false);
  }

  return new BaseError('An unknown error occurred', 500, false);
}

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: BaseError) {
  return {
    error: {
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    },
  };
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T>(
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T | void> {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const handledError = handleError(error);
      console.error('Async handler error:', handledError);
      throw handledError;
    }
  };
}