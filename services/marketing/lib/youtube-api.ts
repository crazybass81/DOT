import { Creator, Video } from '@/types';

// API calls are now handled through Next.js API routes for security
// This ensures API keys are never exposed to the client

export class YouTubeAPI {
  private baseUrl: string;

  constructor() {
    // Use relative URLs to call our API routes
    this.baseUrl = '/api/youtube';
  }

  async searchChannels(query: string, maxResults = 10): Promise<Creator[]> {
    try {
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(
        query
      )}&maxResults=${maxResults}&type=channel`;

      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        console.error('Search API error:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('API error:', data.error);
        return [];
      }

      const channelsData = data.channels || data;

      return this.mapChannelsToCreators(channelsData.items || []);
    } catch (error) {
      console.error('YouTube API search error:', error);
      return [];
    }
  }

  async getChannelById(channelId: string): Promise<Creator | null> {
    try {
      const url = `${this.baseUrl}/channel/${channelId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Channel API error:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('API error:', data.error);
        return null;
      }

      if (!data.channel) {
        return null;
      }

      const creators = this.mapChannelsToCreators([data.channel]);
      return creators[0] || null;
    } catch (error) {
      console.error('YouTube API channel fetch error:', error);
      return null;
    }
  }

  async getRecentVideos(channelId: string, maxResults = 10): Promise<Video[]> {
    try {
      const url = `${this.baseUrl}/channel/${channelId}?includeVideos=true&maxVideos=${maxResults}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Videos API error:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('API error:', data.error);
        return [];
      }

      const videosData = data.videos || data;

      return this.mapVideos(videosData.items || []);
    } catch (error) {
      console.error('YouTube API videos fetch error:', error);
      return [];
    }
  }

  private mapChannelsToCreators(channels: any[]): Creator[] {
    return channels.map((channel) => {
      const statistics = channel.statistics || {};
      const snippet = channel.snippet || {};
      
      return {
        id: channel.id,
        channelId: channel.id,
        channelName: snippet.title || 'Unknown',
        subscriberCount: parseInt(statistics.subscriberCount || '0'),
        videoCount: parseInt(statistics.videoCount || '0'),
        viewCount: parseInt(statistics.viewCount || '0'),
        category: this.detectCategory(snippet.title, snippet.description),
        location: this.extractLocation(snippet.description),
        email: this.extractEmail(snippet.description),
        engagementScore: 0,
        activityScore: 0,
        fitScore: 0,
        lastUpdated: new Date(),
        metadata: {
          averageViews: statistics.viewCount ? 
            Math.round(parseInt(statistics.viewCount) / Math.max(1, parseInt(statistics.videoCount || '1'))) : 0,
          uploadFrequency: 0,
          recentVideos: [],
          thumbnailUrl: snippet.thumbnails?.default?.url,
          description: snippet.description,
        },
      };
    });
  }

  private mapVideos(videos: any[]): Video[] {
    return videos.map((video) => {
      const snippet = video.snippet || {};
      const statistics = video.statistics || {};
      const contentDetails = video.contentDetails || {};
      
      return {
        id: video.id,
        title: snippet.title || '',
        publishedAt: new Date(snippet.publishedAt || Date.now()),
        viewCount: parseInt(statistics.viewCount || '0'),
        likeCount: parseInt(statistics.likeCount || '0'),
        commentCount: parseInt(statistics.commentCount || '0'),
        duration: contentDetails.duration || '',
        thumbnailUrl: snippet.thumbnails?.default?.url || '',
      };
    });
  }

  private detectCategory(title?: string, description?: string): string {
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    
    if (text.includes('먹방') || text.includes('음식') || text.includes('맛집') || text.includes('요리')) {
      return '음식';
    }
    if (text.includes('여행') || text.includes('travel') || text.includes('tour')) {
      return '여행';
    }
    if (text.includes('뷰티') || text.includes('화장') || text.includes('beauty')) {
      return '뷰티';
    }
    if (text.includes('게임') || text.includes('game') || text.includes('플레이')) {
      return '게임';
    }
    if (text.includes('일상') || text.includes('브이로그') || text.includes('vlog')) {
      return '일상';
    }
    
    return '기타';
  }

  private extractLocation(description: string): string | undefined {
    const locationPatterns = [
      /📍\s*([^\n]+)/,
      /위치\s*:\s*([^\n]+)/i,
      /location\s*:\s*([^\n]+)/i,
      /(서울|부산|대구|인천|광주|대전|울산|경기|강원|충북|충남|전북|전남|경북|경남|제주)/,
    ];

    for (const pattern of locationPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractEmail(description: string): string | undefined {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = description.match(emailPattern);
    return match ? match[0] : undefined;
  }
}

export const youtubeAPI = new YouTubeAPI();