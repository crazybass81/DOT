import { StoreProfile } from '../../../matching-engine/types';

// DynamoDB Store Entity
export interface StoreEntity extends StoreProfile {
  // Primary Key
  PK: string; // STORE#<storeId>
  SK: string; // PROFILE#<timestamp>
  
  // GSI Keys
  GSI1PK?: string; // CATEGORY#<primaryCategory>
  GSI1SK?: string; // STORE#<storeId>
  GSI2PK?: string; // LOCATION#<city>#<district>
  GSI2SK?: string; // STORE#<storeId>
  GSI3PK?: string; // PRICE#<priceLevel>
  GSI3SK?: string; // STORE#<storeId>
  
  // Entity Type
  entityType: 'STORE';
  
  // Additional DynamoDB fields
  createdAt: string;
  updatedAt: string;
  version: number;
  ttl?: number; // Time to live for cache entries
  
  // Scraping metadata
  scrapingMetadata?: {
    lastScrapedAt: string;
    scrapingDuration: number;
    dataQuality: number; // 0-100
    missingFields?: string[];
  };
  
  // User metadata
  userId?: string; // Who created this profile
  organizationId?: string;
  tags?: string[];
  notes?: string;
  
  // Status
  status: 'active' | 'inactive' | 'pending' | 'error';
  isVerified?: boolean;
}