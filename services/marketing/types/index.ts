export interface Creator {
  id: string;
  channelId: string;
  channelName: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  category: string;
  location?: string;
  email?: string;
  engagementScore: number;
  activityScore: number;
  fitScore: number;
  lastUpdated: Date;
  metadata: {
    averageViews: number;
    uploadFrequency: number;
    recentVideos: Video[];
    thumbnailUrl?: string;
    description?: string;
  };
}

export interface Video {
  id: string;
  title: string;
  publishedAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  thumbnailUrl: string;
}

export interface Campaign {
  id: string;
  restaurantId: string;
  name: string;
  budget: number;
  targetCreators: string[];
  emailTemplate: string;
  status: 'draft' | 'active' | 'completed';
  results: {
    emailsSent: number;
    responses: number;
    conversions: number;
  };
  createdAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'general' | 'review' | 'visit' | 'event' | 'partnership';
  variables: string[];
}

export interface EmailHistory {
  id: string;
  campaignId: string;
  creatorId: string;
  template: string;
  sentAt: Date;
  status: 'sent' | 'opened' | 'replied' | 'bounced';
  responseData?: {
    openedAt?: Date;
    repliedAt?: Date;
    message?: string;
  };
}

export interface SearchFilters {
  keyword?: string;
  minSubscribers?: number;
  maxSubscribers?: number;
  category?: string;
  location?: string;
  minEngagementScore?: number;
  minActivityScore?: number;
}