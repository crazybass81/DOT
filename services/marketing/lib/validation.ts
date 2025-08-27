import { z } from 'zod';

// YouTube API validation schemas
export const YouTubeSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Query too long'),
  maxResults: z.number().min(1).max(50).default(10),
  type: z.enum(['channel', 'video', 'playlist']).default('channel'),
});

export const YouTubeChannelSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  includeVideos: z.boolean().default(false),
  maxVideos: z.number().min(1).max(50).default(10),
});

// Creator validation schemas
export const CreatorSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  channelName: z.string(),
  subscriberCount: z.number().min(0),
  videoCount: z.number().min(0),
  viewCount: z.number().min(0),
  category: z.string(),
  location: z.string().optional(),
  email: z.string().email().optional(),
  engagementScore: z.number().min(0).max(100),
  activityScore: z.number().min(0).max(100),
  fitScore: z.number().min(0).max(100),
  lastUpdated: z.date(),
  metadata: z.object({
    averageViews: z.number().min(0),
    uploadFrequency: z.number().min(0),
    recentVideos: z.array(z.any()), // Video schema
    thumbnailUrl: z.string().url().optional(),
    description: z.string().optional(),
  }),
});

// Search filters validation
export const SearchFiltersSchema = z.object({
  keyword: z.string().max(100).optional(),
  minSubscribers: z.number().min(0).optional(),
  maxSubscribers: z.number().min(0).optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  minEngagementScore: z.number().min(0).max(100).optional(),
  minActivityScore: z.number().min(0).max(100).optional(),
}).refine(
  (data) => {
    if (data.minSubscribers && data.maxSubscribers) {
      return data.minSubscribers <= data.maxSubscribers;
    }
    return true;
  },
  {
    message: 'Min subscribers must be less than or equal to max subscribers',
    path: ['minSubscribers'],
  }
);

// Campaign validation schemas
export const CampaignCreateSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  name: z.string().min(1, 'Campaign name is required').max(100),
  budget: z.number().min(0, 'Budget must be positive'),
  targetCreators: z.array(z.string()).min(1, 'At least one creator is required'),
  emailTemplate: z.string().min(1, 'Email template is required'),
});

export const CampaignUpdateSchema = CampaignCreateSchema.partial();

// Email template validation
export const EmailTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  category: z.enum(['general', 'review', 'visit', 'event', 'partnership']),
  variables: z.array(z.string()).default([]),
});

// API response validation
export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }).optional(),
  metadata: z.object({
    timestamp: z.string(),
    requestId: z.string().optional(),
  }).optional(),
});

// Type exports
export type YouTubeSearch = z.infer<typeof YouTubeSearchSchema>;
export type Creator = z.infer<typeof CreatorSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type CampaignCreate = z.infer<typeof CampaignCreateSchema>;
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;
export type APIResponse = z.infer<typeof APIResponseSchema>;

// Validation helper functions
export function validateSearchFilters(filters: unknown): SearchFilters {
  return SearchFiltersSchema.parse(filters);
}

export function validateCampaignData(data: unknown): CampaignCreate {
  return CampaignCreateSchema.parse(data);
}

export function validateEmailTemplate(template: unknown): EmailTemplate {
  return EmailTemplateSchema.parse(template);
}

// Safe parsing with error handling
export function safeParseJSON<T>(
  json: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(json);
    const validated = schema.parse(parsed);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    if (error instanceof SyntaxError) {
      return { success: false, error: 'Invalid JSON format' };
    }
    return { success: false, error: 'Unknown parsing error' };
  }
}