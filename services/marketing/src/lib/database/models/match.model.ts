import { MatchingResult } from '../../../matching-engine/types';

// Match Status
export enum MatchStatus {
  PENDING = 'PENDING',
  CONTACTED = 'CONTACTED',
  RESPONDED = 'RESPONDED',
  NEGOTIATING = 'NEGOTIATING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// DynamoDB Match Entity
export interface MatchEntity {
  // Primary Key
  PK: string; // MATCH#<matchId>
  SK: string; // STORE#<storeId>#CREATOR#<creatorId>
  
  // GSI Keys
  GSI1PK?: string; // SCORE#<scoreRange>
  GSI1SK?: string; // MATCH#<matchId>
  GSI2PK?: string; // STATUS#<status>
  GSI2SK?: string; // DATE#<date>
  GSI3PK?: string; // DATE#<YYYY-MM-DD>
  GSI3SK?: string; // SCORE#<score>
  
  // Entity Type
  entityType: 'MATCH';
  
  // Match Information
  matchId: string;
  storeId: string;
  storeName: string;
  creatorId: string;
  creatorName: string;
  
  // Match Results
  matchResult: MatchingResult;
  matchScore: number;
  confidence: 'high' | 'medium' | 'low';
  
  // Status tracking
  status: MatchStatus;
  statusHistory: Array<{
    status: MatchStatus;
    timestamp: string;
    note?: string;
    updatedBy?: string;
  }>;
  
  // Communication tracking
  communication: {
    firstContactDate?: string;
    lastContactDate?: string;
    contactAttempts: number;
    responseReceived: boolean;
    responseDate?: string;
    responseType?: 'positive' | 'negative' | 'neutral';
    conversationThreadId?: string;
  };
  
  // Campaign information
  campaign?: {
    campaignId: string;
    campaignName: string;
    campaignType: string;
    budget?: number;
    startDate?: string;
    endDate?: string;
  };
  
  // Email template used
  emailTemplate?: {
    templateId: string;
    subject: string;
    sentAt?: string;
    openedAt?: string;
    clickedAt?: string;
  };
  
  // Negotiation details
  negotiation?: {
    proposedBudget: number;
    counterOffer?: number;
    agreedAmount?: number;
    terms?: string;
    contractSigned?: boolean;
    contractDate?: string;
  };
  
  // Performance metrics
  performance?: {
    contentCreated: number;
    reach: number;
    engagement: number;
    conversions?: number;
    roi?: number;
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  
  // User tracking
  createdBy: string;
  assignedTo?: string;
  
  // Notes and tags
  notes?: string;
  tags?: string[];
  
  // Priority and flags
  priority: 'high' | 'medium' | 'low';
  isHot?: boolean; // High potential match
  requiresReview?: boolean;
  
  // TTL for automatic cleanup
  ttl?: number;
}