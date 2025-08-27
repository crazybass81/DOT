// Campaign Types
export enum CampaignType {
  REVIEW = 'REVIEW',
  SPONSORED_POST = 'SPONSORED_POST',
  PRODUCT_PLACEMENT = 'PRODUCT_PLACEMENT',
  BRAND_AMBASSADOR = 'BRAND_AMBASSADOR',
  EVENT_COVERAGE = 'EVENT_COVERAGE',
  GIVEAWAY = 'GIVEAWAY',
  COLLABORATION = 'COLLABORATION',
}

// Campaign Status
export enum CampaignStatus {
  DRAFT = 'DRAFT',
  PLANNING = 'PLANNING',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// DynamoDB Campaign Entity
export interface CampaignEntity {
  // Primary Key
  PK: string; // CAMPAIGN#<campaignId>
  SK: string; // STORE#<storeId>
  
  // GSI Keys
  GSI1PK?: string; // STATUS#<status>
  GSI1SK?: string; // DATE#<startDate>
  GSI2PK?: string; // STORE#<storeId>
  GSI2SK?: string; // DATE#<createdAt>
  
  // Entity Type
  entityType: 'CAMPAIGN';
  
  // Campaign Information
  campaignId: string;
  campaignName: string;
  campaignType: CampaignType;
  description: string;
  
  // Store Information
  storeId: string;
  storeName: string;
  storeProfile?: any; // Snapshot of store profile at campaign creation
  
  // Campaign Details
  objectives: string[];
  targetAudience: {
    demographics: string[];
    interests: string[];
    locations: string[];
  };
  
  // Timeline
  timeline: {
    startDate: string;
    endDate: string;
    milestones?: Array<{
      date: string;
      description: string;
      completed: boolean;
    }>;
  };
  
  // Budget
  budget: {
    total: number;
    allocated: number;
    spent: number;
    currency: string;
    breakdown?: {
      creatorFees: number;
      production: number;
      advertising: number;
      other: number;
    };
  };
  
  // Creators in campaign
  creators: Array<{
    creatorId: string;
    creatorName: string;
    platform: string;
    status: 'invited' | 'confirmed' | 'declined' | 'completed';
    fee?: number;
    deliverables?: string[];
    deadlines?: string[];
  }>;
  
  // Content requirements
  contentRequirements: {
    platforms: string[];
    formats: string[]; // video, image, story, reel
    quantity: number;
    guidelines?: string;
    hashtags?: string[];
    mentions?: string[];
  };
  
  // Performance targets
  kpis: {
    targetReach: number;
    targetEngagement: number;
    targetConversions?: number;
    targetROI?: number;
  };
  
  // Actual performance
  performance?: {
    actualReach: number;
    actualEngagement: number;
    actualConversions?: number;
    actualROI?: number;
    contentCreated: number;
    lastUpdated: string;
  };
  
  // Status and workflow
  status: CampaignStatus;
  statusHistory: Array<{
    status: CampaignStatus;
    timestamp: string;
    reason?: string;
    updatedBy: string;
  }>;
  
  // Approval workflow
  approval?: {
    required: boolean;
    approvedBy?: string;
    approvedAt?: string;
    comments?: string;
  };
  
  // Assets and materials
  assets?: {
    brief?: string; // URL to campaign brief
    contracts?: string[]; // URLs to contracts
    creatives?: string[]; // URLs to creative assets
    reports?: string[]; // URLs to reports
  };
  
  // Communication
  communication?: {
    channelId?: string; // Slack/Discord channel
    emailThreads?: string[];
    meetingNotes?: string[];
  };
  
  // Analytics integration
  analytics?: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    customTrackingUrl?: string;
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  
  // User management
  createdBy: string;
  managedBy: string[];
  
  // Organization
  organizationId?: string;
  teamId?: string;
  
  // Tags and categorization
  tags?: string[];
  category?: string;
  priority: 'high' | 'medium' | 'low';
  
  // Notes
  notes?: string;
  lessons?: string; // Lessons learned after completion
}