import { z } from 'zod';

// Define environment variable schema
const envSchema = z.object({
  // Server-side only
  YOUTUBE_API_KEY: z.string().min(1, 'YouTube API key is required'),
  AWS_REGION: z.string().default('ap-northeast-2'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  DYNAMODB_CREATORS_TABLE: z.string().default('dot-marketing-creators'),
  DYNAMODB_CAMPAIGNS_TABLE: z.string().default('dot-marketing-campaigns'),
  DYNAMODB_EMAIL_HISTORY_TABLE: z.string().default('dot-marketing-email-history'),
  SES_FROM_EMAIL: z.string().email().default('marketing@dot-platform.com'),
  SES_CONFIGURATION_SET: z.string().default('dot-marketing'),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse({
      YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      DYNAMODB_CREATORS_TABLE: process.env.DYNAMODB_CREATORS_TABLE,
      DYNAMODB_CAMPAIGNS_TABLE: process.env.DYNAMODB_CAMPAIGNS_TABLE,
      DYNAMODB_EMAIL_HISTORY_TABLE: process.env.DYNAMODB_EMAIL_HISTORY_TABLE,
      SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
      SES_CONFIGURATION_SET: process.env.SES_CONFIGURATION_SET,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.flatten().fieldErrors);
      throw new Error(`Environment validation failed: ${error.message}`);
    }
    throw error;
  }
}

// Only validate in server-side contexts
let config: z.infer<typeof envSchema> | null = null;

export function getConfig(): z.infer<typeof envSchema> {
  // Only validate once and cache the result
  if (!config) {
    if (typeof window === 'undefined') {
      // Server-side: validate environment variables
      config = validateEnv();
    } else {
      // Client-side: return empty config (should not be used)
      throw new Error('Config should not be accessed from client-side code');
    }
  }
  return config;
}

// Type-safe config access
export type Config = z.infer<typeof envSchema>;

// API configuration constants
export const API_CONFIG = {
  YOUTUBE_API_BASE_URL: 'https://www.googleapis.com/youtube/v3',
  YOUTUBE_QUOTA_LIMIT: 10000, // Daily quota limit
  YOUTUBE_MAX_RESULTS: 50, // Max results per API call
  CACHE_TTL: 3600, // Cache TTL in seconds (1 hour)
} as const;

// Business logic constants
export const SCORING_CONFIG = {
  ENGAGEMENT_WEIGHTS: {
    LIKE_RATE: 0.4,
    COMMENT_RATE: 0.3,
    GROWTH_RATE: 0.3,
  },
  ACTIVITY_WEIGHTS: {
    UPLOAD_FREQUENCY: 0.5,
    RECENCY: 0.3,
    CONSISTENCY: 0.2,
  },
  FIT_WEIGHTS: {
    CATEGORY: 0.4,
    LOCATION: 0.3,
    SUBSCRIBER_RANGE: 0.3,
  },
  OVERALL_WEIGHTS: {
    ENGAGEMENT: 0.35,
    ACTIVITY: 0.25,
    FIT: 0.4,
  },
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  YOUTUBE_API: {
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_REQUESTS_PER_HOUR: 1000,
  },
  EMAIL_SENDING: {
    MAX_EMAILS_PER_DAY: 200,
    MAX_EMAILS_PER_SECOND: 1,
  },
} as const;