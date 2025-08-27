import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// DynamoDB Client Configuration for Marketing Service
const REGION = process.env.AWS_REGION || 'ap-northeast-2'; // Seoul region

// Create base DynamoDB client
const client = new DynamoDBClient({
  region: REGION,
  ...(process.env.NODE_ENV === 'development' && process.env.DYNAMODB_LOCAL_ENDPOINT
    ? {
        endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT,
        credentials: {
          accessKeyId: 'dummy',
          secretAccessKey: 'dummy',
        },
      }
    : {}),
  maxAttempts: 3,
  retryMode: 'adaptive',
});

// Create document client for simplified operations
export const dynamoDBClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Table names configuration for Marketing Service
export const TABLE_NAMES = {
  // Store & Creator Management
  STORES: process.env.STORES_TABLE_NAME || 'dot-marketing-stores',
  CREATORS: process.env.CREATORS_TABLE_NAME || 'dot-marketing-creators',
  MATCHES: process.env.MATCHES_TABLE_NAME || 'dot-marketing-matches',
  
  // Campaign Management
  CAMPAIGNS: process.env.CAMPAIGNS_TABLE_NAME || 'dot-marketing-campaigns',
  TEMPLATES: process.env.TEMPLATES_TABLE_NAME || 'dot-marketing-templates',
  
  // Analytics & History
  ANALYTICS: process.env.ANALYTICS_TABLE_NAME || 'dot-marketing-analytics',
  SCRAPING_CACHE: process.env.SCRAPING_CACHE_TABLE_NAME || 'dot-marketing-cache',
  
  // Contact & Communication
  CONTACTS: process.env.CONTACTS_TABLE_NAME || 'dot-marketing-contacts',
  EMAIL_HISTORY: process.env.EMAIL_HISTORY_TABLE_NAME || 'dot-marketing-emails',
} as const;

// GSI names for efficient querying
export const GSI_NAMES = {
  // Store GSIs
  STORE_CATEGORY_INDEX: 'store-category-index',
  STORE_LOCATION_INDEX: 'store-location-index',
  STORE_PRICE_INDEX: 'store-price-index',
  
  // Creator GSIs
  CREATOR_CATEGORY_INDEX: 'creator-category-index',
  CREATOR_LOCATION_INDEX: 'creator-location-index',
  CREATOR_PLATFORM_INDEX: 'creator-platform-index',
  CREATOR_INFLUENCE_INDEX: 'creator-influence-index',
  
  // Match GSIs
  MATCH_SCORE_INDEX: 'match-score-index',
  MATCH_STATUS_INDEX: 'match-status-index',
  MATCH_DATE_INDEX: 'match-date-index',
  
  // Campaign GSIs
  CAMPAIGN_STATUS_INDEX: 'campaign-status-index',
  CAMPAIGN_STORE_INDEX: 'campaign-store-index',
  
  // Analytics GSIs
  ANALYTICS_DATE_INDEX: 'analytics-date-index',
  ANALYTICS_TYPE_INDEX: 'analytics-type-index',
} as const;

// TTL settings for cache (in seconds)
export const TTL_SETTINGS = {
  SCRAPING_CACHE: 7 * 24 * 60 * 60, // 7 days
  CREATOR_CACHE: 24 * 60 * 60, // 1 day
  MATCH_RESULTS: 30 * 24 * 60 * 60, // 30 days
  ANALYTICS: 90 * 24 * 60 * 60, // 90 days
} as const;

export default dynamoDBClient;