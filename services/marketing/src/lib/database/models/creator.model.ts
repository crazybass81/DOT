import { Creator } from '../../../matching-engine/types';

// DynamoDB Creator Entity
export interface CreatorEntity extends Creator {
  // Primary Key
  PK: string; // CREATOR#<creatorId>
  SK: string; // PLATFORM#<platform>#<channelId>
  
  // GSI Keys
  GSI1PK?: string; // CATEGORY#<primaryCategory>
  GSI1SK?: string; // CREATOR#<creatorId>
  GSI2PK?: string; // LOCATION#<primaryRegion>
  GSI2SK?: string; // CREATOR#<creatorId>
  GSI3PK?: string; // PLATFORM#<platform>
  GSI3SK?: string; // INFLUENCE#<subscribers>
  GSI4PK?: string; // INFLUENCE_TIER#<tier>
  GSI4SK?: string; // ENGAGEMENT#<engagementRate>
  
  // Entity Type
  entityType: 'CREATOR';
  
  // Additional DynamoDB fields
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  version: number;
  ttl?: number;
  
  // Influence Tier Classification
  influenceTier: 'nano' | 'micro' | 'mid' | 'macro' | 'mega';
  
  // Verification & Trust
  isVerified: boolean;
  verificationDate?: string;
  trustScore: number; // 0-100
  
  // Performance metrics
  performance: {
    avgSponsorshipSuccess: number;
    completedCampaigns: number;
    responseRate: number;
    avgResponseTime: number; // hours
  };
  
  // Pricing information
  pricing?: {
    baseRate?: number;
    currency: string;
    negotiable: boolean;
    packages?: Array<{
      name: string;
      price: number;
      includes: string[];
    }>;
  };
  
  // Platform-specific data
  platformData?: {
    youtube?: {
      channelId: string;
      customUrl?: string;
      partnered: boolean;
      monetized: boolean;
    };
    instagram?: {
      username: string;
      businessAccount: boolean;
      shoppingEnabled: boolean;
    };
    tiktok?: {
      username: string;
      creatorFund: boolean;
    };
  };
  
  // Content calendar
  contentCalendar?: {
    uploadSchedule: string[];
    plannedContent?: Array<{
      date: string;
      topic: string;
      type: string;
    }>;
  };
  
  // Preferences
  preferences?: {
    categories: string[];
    excludedCategories: string[];
    minBudget?: number;
    preferredContactTime?: string;
    languages: string[];
  };
  
  // Status
  status: 'active' | 'inactive' | 'busy' | 'vacation' | 'blacklisted';
  blacklistReason?: string;
  
  // Internal notes
  internalNotes?: string;
  tags?: string[];
}