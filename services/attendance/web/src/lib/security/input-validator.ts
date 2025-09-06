/**
 * Input Validation and Sanitization Module
 * Provides comprehensive input validation to prevent injection attacks
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// Common validation schemas
export const ValidationSchemas = {
  // User authentication
  email: z.string().email().max(255).transform(val => val.toLowerCase().trim()),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  // IDs
  uuid: z.string().uuid(),
  
  organizationId: z.string().uuid(),
  
  userId: z.string().uuid(),
  
  // Organization status
  organizationStatus: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
  
  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()),
  }).refine(data => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
  }, {
    message: 'Start date must be before or equal to end date',
  }),
  
  // Search query
  searchQuery: z.string()
    .max(100)
    .transform(val => val.trim())
    .refine(val => !containsSQLKeywords(val), {
      message: 'Invalid search query',
    }),
  
  // Reason text
  reason: z.string()
    .max(500)
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  
  // Name fields
  name: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s\-'가-힣]+$/, 'Name contains invalid characters')
    .transform(val => val.trim()),
  
  // Phone number
  phoneNumber: z.string()
    .regex(/^[0-9\-\+\(\)\s]+$/, 'Invalid phone number format')
    .transform(val => val.replace(/\D/g, '')),
  
  // URL
  url: z.string().url().max(2048),
  
  // File upload
  fileUpload: z.object({
    filename: z.string().max(255).regex(/^[a-zA-Z0-9\-_\.]+$/, 'Invalid filename'),
    mimetype: z.enum(['image/jpeg', 'image/png', 'image/gif', 'application/pdf']),
    size: z.number().max(10 * 1024 * 1024), // 10MB max
  }),
};

/**
 * Check if string contains SQL keywords (basic SQL injection prevention)
 */
function containsSQLKeywords(input: string): boolean {
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
    'ALTER', 'UNION', 'EXEC', 'EXECUTE', '--', '/*', '*/',
    'XP_', 'SP_', 'WAITFOR', 'DELAY', 'BENCHMARK', 'SLEEP'
  ];
  
  const upperInput = input.toUpperCase();
  return sqlKeywords.some(keyword => upperInput.includes(keyword));
}

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizeText(input: string): string {
  // Remove any HTML tags and scripts
  let sanitized = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true 
  });
  
  // Additional sanitization
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
  
  return sanitized;
}

/**
 * Sanitize HTML content (for rich text fields)
 */
export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string } {
  const trimmed = email.trim().toLowerCase();
  
  if (!validator.isEmail(trimmed)) {
    return { valid: false, sanitized: '' };
  }
  
  // Additional checks for common typos
  const normalized = validator.normalizeEmail(trimmed, {
    all_lowercase: true,
    gmail_remove_dots: true,
    gmail_remove_subaddress: false,
    gmail_convert_googlemaildotcom: true,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false,
  });
  
  return { valid: true, sanitized: normalized || trimmed };
}

/**
 * Validate and sanitize phone number
 */
export function validatePhoneNumber(phone: string, locale: string = 'ko-KR'): { 
  valid: boolean; 
  sanitized: string 
} {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Korean phone number validation
  if (locale === 'ko-KR') {
    const koreanPhoneRegex = /^(01[016789])\d{7,8}$/;
    if (!koreanPhoneRegex.test(cleaned)) {
      return { valid: false, sanitized: '' };
    }
    
    // Format as 010-1234-5678
    const formatted = cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    return { valid: true, sanitized: formatted };
  }
  
  // Generic validation
  if (!validator.isMobilePhone(cleaned, 'any')) {
    return { valid: false, sanitized: '' };
  }
  
  return { valid: true, sanitized: cleaned };
}

/**
 * Validate UUID
 */
export function validateUUID(uuid: string): boolean {
  return validator.isUUID(uuid, 4);
}

/**
 * Validate and sanitize URL
 */
export function validateURL(url: string): { valid: boolean; sanitized: string } {
  const trimmed = url.trim();
  
  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    require_host: true,
    require_port: false,
    allow_query_components: true,
    allow_fragments: true,
    allow_protocol_relative_urls: false,
  })) {
    return { valid: false, sanitized: '' };
  }
  
  // Additional checks for suspicious URLs
  const suspicious = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ];
  
  if (suspicious.some(proto => trimmed.toLowerCase().startsWith(proto))) {
    return { valid: false, sanitized: '' };
  }
  
  return { valid: true, sanitized: trimmed };
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: {
  name: string;
  type: string;
  size: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    errors.push(`File extension ${ext} is not allowed`);
  }
  
  // Check MIME type
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  if (!allowedMimeTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum of 10MB`);
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.com$/i,
    /\.pif$/i,
    /\.scr$/i,
    /\.vbs$/i,
    /\.js$/i,
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    errors.push('Suspicious file name detected');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a validated API handler
 */
export function createValidatedHandler<T extends z.ZodType>(
  schema: T,
  handler: (data: z.infer<T>) => Promise<any>
) {
  return async (input: unknown) => {
    try {
      // Validate input against schema
      const validated = schema.parse(input);
      
      // Execute handler with validated data
      return await handler(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        };
      }
      
      throw error;
    }
  };
}

/**
 * SQL parameter binding helper
 */
export function bindSQLParams(query: string, params: any[]): string {
  // This is a placeholder - in production, use proper parameterized queries
  // Never use string concatenation for SQL queries
  let boundQuery = query;
  params.forEach((param, index) => {
    const placeholder = `$${index + 1}`;
    if (typeof param === 'string') {
      // Escape single quotes and backslashes
      const escaped = param.replace(/'/g, "''").replace(/\\/g, '\\\\');
      boundQuery = boundQuery.replace(placeholder, `'${escaped}'`);
    } else if (param === null) {
      boundQuery = boundQuery.replace(placeholder, 'NULL');
    } else {
      boundQuery = boundQuery.replace(placeholder, String(param));
    }
  });
  return boundQuery;
}

/**
 * NoSQL injection prevention
 */
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return query;
  }
  
  const sanitized: any = {};
  
  for (const key in query) {
    // Remove keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) {
      continue;
    }
    
    const value = query[key];
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Command injection prevention
 */
export function sanitizeShellCommand(command: string): string {
  // Remove potentially dangerous characters
  const dangerous = [';', '&', '|', '`', '$', '(', ')', '<', '>', '\\n', '\\r'];
  let sanitized = command;
  
  dangerous.forEach(char => {
    sanitized = sanitized.replace(new RegExp(`\\${char}`, 'g'), '');
  });
  
  return sanitized;
}

/**
 * Path traversal prevention
 */
export function sanitizePath(path: string): string {
  // Remove any path traversal attempts
  return path
    .replace(/\.\./g, '')
    .replace(/~\//g, '')
    .replace(/^\//, '')
    .replace(/\\/g, '/');
}

/**
 * Rate limit key sanitization
 */
export function sanitizeRateLimitKey(key: string): string {
  // Ensure key is safe for storage systems
  return key
    .replace(/[^a-zA-Z0-9\-_:]/g, '_')
    .substring(0, 128); // Limit key length
}