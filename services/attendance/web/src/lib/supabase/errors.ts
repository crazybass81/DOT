/**
 * TDD Phase 3: REFACTOR - Error Handling
 * Comprehensive error handling for Supabase operations
 */

import { PostgrestError, AuthError } from '@supabase/supabase-js';

// Custom error types
export class SupabaseConnectionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'SupabaseConnectionError';
  }
}

export class SupabaseAuthError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'SupabaseAuthError';
  }
}

export class SupabaseDatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly hint?: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'SupabaseDatabaseError';
  }
}

// Error code mappings
export const PostgresErrorCodes = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  NOT_NULL_VIOLATION: '23502',
  INSUFFICIENT_PRIVILEGE: '42501',
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_COLUMN: '42703',
  INVALID_TEXT_REPRESENTATION: '22P02',
  CONNECTION_FAILURE: 'PGRST000',
  RATE_LIMIT_EXCEEDED: 'PGRST001'
} as const;

// Error messages
export const ErrorMessages = {
  CONNECTION_FAILED: 'Failed to connect to database',
  AUTH_REQUIRED: 'Authentication required',
  PERMISSION_DENIED: 'Permission denied for this operation',
  RESOURCE_NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  DUPLICATE_ENTRY: 'Duplicate entry exists',
  FOREIGN_KEY_CONSTRAINT: 'Related record not found',
  NETWORK_ERROR: 'Network error occurred',
  TIMEOUT: 'Operation timed out',
  UNKNOWN_ERROR: 'An unknown error occurred'
} as const;

/**
 * Parse PostgreSQL error
 */
export function parsePostgrestError(error: PostgrestError): SupabaseDatabaseError {
  const code = error.code;
  let message = error.message;
  
  // Map common error codes to user-friendly messages
  switch (code) {
    case PostgresErrorCodes.UNIQUE_VIOLATION:
      message = ErrorMessages.DUPLICATE_ENTRY;
      break;
    case PostgresErrorCodes.FOREIGN_KEY_VIOLATION:
      message = ErrorMessages.FOREIGN_KEY_CONSTRAINT;
      break;
    case PostgresErrorCodes.INSUFFICIENT_PRIVILEGE:
      message = ErrorMessages.PERMISSION_DENIED;
      break;
    case PostgresErrorCodes.UNDEFINED_TABLE:
      message = ErrorMessages.RESOURCE_NOT_FOUND;
      break;
    default:
      // Use original message if no mapping exists
      break;
  }
  
  return new SupabaseDatabaseError(
    message,
    code,
    error.hint,
    error.details
  );
}

/**
 * Parse Auth error
 */
export function parseAuthError(error: AuthError): SupabaseAuthError {
  const status = error.status;
  let message = error.message;
  
  // Map auth errors to user-friendly messages
  if (status === 401) {
    message = ErrorMessages.AUTH_REQUIRED;
  } else if (status === 403) {
    message = ErrorMessages.PERMISSION_DENIED;
  }
  
  return new SupabaseAuthError(
    message,
    error.code,
    status
  );
}

/**
 * Generic error handler
 */
export function handleSupabaseError(error: any): Error {
  // Check if it's a Postgrest error
  if (error && typeof error.code === 'string' && error.message) {
    if (error.status) {
      // Auth error
      return parseAuthError(error as AuthError);
    } else {
      // Database error
      return parsePostgrestError(error as PostgrestError);
    }
  }
  
  // Network or connection error
  if (error && error.message && error.message.includes('fetch')) {
    return new SupabaseConnectionError(
      ErrorMessages.NETWORK_ERROR,
      'NETWORK_ERROR',
      error
    );
  }
  
  // Timeout error
  if (error && error.message && error.message.includes('timeout')) {
    return new SupabaseConnectionError(
      ErrorMessages.TIMEOUT,
      'TIMEOUT',
      error
    );
  }
  
  // Unknown error
  return new Error(error?.message || ErrorMessages.UNKNOWN_ERROR);
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on auth errors or validation errors
      if (error instanceof SupabaseAuthError || 
          error instanceof SupabaseDatabaseError &&
          [PostgresErrorCodes.UNIQUE_VIOLATION, 
           PostgresErrorCodes.CHECK_VIOLATION,
           PostgresErrorCodes.NOT_NULL_VIOLATION].includes(error.code as any)) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Safe wrapper for Supabase operations
 */
export async function safeSupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options?: {
    retry?: boolean;
    maxRetries?: number;
    throwOnError?: boolean;
  }
): Promise<{ data: T | null; error: Error | null }> {
  const { retry = true, maxRetries = 3, throwOnError = false } = options || {};
  
  try {
    const execute = async () => {
      const result = await operation();
      
      if (result.error) {
        throw handleSupabaseError(result.error);
      }
      
      return result;
    };
    
    const result = retry 
      ? await retryWithBackoff(execute, maxRetries)
      : await execute();
    
    return { data: result.data, error: null };
  } catch (error) {
    const handledError = error instanceof Error ? error : new Error(String(error));
    
    if (throwOnError) {
      throw handledError;
    }
    
    return { data: null, error: handledError };
  }
}

/**
 * Log error with context
 */
export function logError(error: Error, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context
  };
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to Sentry or similar service
    console.error('[ERROR]', errorInfo);
  } else {
    console.error('[ERROR]', errorInfo);
  }
}