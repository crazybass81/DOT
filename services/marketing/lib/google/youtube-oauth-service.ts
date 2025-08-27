/**
 * YouTube OAuth Service - 사용자 토큰으로 YouTube API 호출
 * 각 사용자의 일일 10,000 units 할당량 사용
 */

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnails: {
    default?: string;
    medium?: string;
    high?: string;
  };
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
  topicCategories?: string[];
  country?: string;
  businessEmail?: string;  // 비즈니스 이메일
  socialLinks?: {          // 소셜 미디어 링크
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  recentVideos?: {         // 최근 동영상
    title: string;
    publishedAt: string;
    viewCount?: string;
  }[];
}

export class YouTubeOAuthService {
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  
  constructor(private accessToken: string) {}
  
  /**
   * 사용자 토큰으로 YouTube 채널 검색
   * Cost: ~100 units per search
   */
  async searchChannels(
    query: string,
    options: {
      maxResults?: number;
      regionCode?: string;
      relevanceLanguage?: string;
    } = {}
  ): Promise<YouTubeChannel[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      q: query,
      maxResults: (options.maxResults || 10).toString(),
      regionCode: options.regionCode || 'KR',
      relevanceLanguage: options.relevanceLanguage || 'ko',
      // API 키를 추가하면 사용자별 할당량이 아닌 프로젝트 할당량 사용
      // key: process.env.YOUTUBE_API_KEY, // 주석 처리 - OAuth 토큰만 사용
    });
    
    const response = await fetch(
      `${this.baseUrl}/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API Error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    // 채널 ID로 상세 정보 가져오기
    if (data.items && data.items.length > 0) {
      const channelIds = data.items.map((item: any) => item.snippet.channelId).join(',');
      return await this.getChannelDetails(channelIds);
    }
    
    return [];
  }
  
  /**
   * 채널 상세 정보 가져오기 (이메일 포함)
   * Cost: ~3 units per channel
   */
  async getChannelDetails(channelIds: string): Promise<YouTubeChannel[]> {
    const params = new URLSearchParams({
      part: 'snippet,statistics,topicDetails,brandingSettings',
      id: channelIds,
    });
    
    const response = await fetch(
      `${this.baseUrl}/channels?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API Error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    const channels = await Promise.all((data.items || []).map(async (item: any) => {
      const channel: YouTubeChannel = {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        customUrl: item.snippet.customUrl,
        thumbnails: {
          default: item.snippet.thumbnails?.default?.url,
          medium: item.snippet.thumbnails?.medium?.url,
          high: item.snippet.thumbnails?.high?.url,
        },
        statistics: item.statistics ? {
          viewCount: item.statistics.viewCount,
          subscriberCount: item.statistics.subscriberCount,
          videoCount: item.statistics.videoCount,
        } : undefined,
        topicCategories: item.topicDetails?.topicCategories,
        country: item.snippet.country,
      };
      
      // 비즈니스 이메일 추출 (description에서)
      const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
      const emails = channel.description.match(emailRegex);
      if (emails && emails.length > 0) {
        channel.businessEmail = emails[0];
      }
      
      // 소셜 미디어 링크 추출
      channel.socialLinks = this.extractSocialLinks(channel.description);
      
      // 최근 동영상 가져오기 (선택적 - 오류 시 무시)
      // 주석 처리: 권한 문제로 일시적으로 비활성화
      // try {
      //   channel.recentVideos = await this.getRecentVideos(item.id);
      // } catch (error) {
      //   console.error('Failed to get recent videos:', error);
      // }
      
      return channel;
    }));
    
    return channels;
  }
  
  /**
   * 소셜 미디어 링크 추출
   */
  private extractSocialLinks(description: string): any {
    const links: any = {};
    
    // Instagram
    const instagramRegex = /(?:instagram\.com|instagr\.am)\/[\w\.]+/gi;
    const instagram = description.match(instagramRegex);
    if (instagram) links.instagram = `https://${instagram[0]}`;
    
    // Twitter
    const twitterRegex = /(?:twitter\.com|x\.com)\/[\w]+/gi;
    const twitter = description.match(twitterRegex);
    if (twitter) links.twitter = `https://${twitter[0]}`;
    
    // Facebook
    const facebookRegex = /facebook\.com\/[\w\.]+/gi;
    const facebook = description.match(facebookRegex);
    if (facebook) links.facebook = `https://${facebook[0]}`;
    
    return Object.keys(links).length > 0 ? links : undefined;
  }
  
  /**
   * 최근 동영상 가져오기
   * Cost: ~100 units
   */
  async getRecentVideos(channelId: string, maxResults: number = 3): Promise<any[]> {
    const params = new URLSearchParams({
      part: 'snippet,statistics',
      channelId: channelId,
      maxResults: maxResults.toString(),
      order: 'date',
      type: 'video',
    });
    
    try {
      const response = await fetch(
        `${this.baseUrl}/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent videos');
      }
      
      const data = await response.json();
      
      return data.items?.map((item: any) => ({
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.medium?.url,
      })) || [];
    } catch (error) {
      console.error('Error fetching recent videos:', error);
      return [];
    }
  }
  
  /**
   * 카테고리별 인기 채널 검색
   * Cost: ~100 units
   */
  async searchChannelsByCategory(
    category: string,
    options: {
      maxResults?: number;
      location?: { lat: number; lng: number };
      locationRadius?: string; // e.g., "10km"
    } = {}
  ): Promise<YouTubeChannel[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      q: category,
      maxResults: (options.maxResults || 20).toString(),
      order: 'relevance',
      regionCode: 'KR',
    });
    
    // 위치 기반 검색 (선택적)
    if (options.location) {
      params.append('location', `${options.location.lat},${options.location.lng}`);
      params.append('locationRadius', options.locationRadius || '50km');
    }
    
    const response = await fetch(
      `${this.baseUrl}/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API Error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const channelIds = data.items.map((item: any) => item.snippet.channelId).join(',');
      return await this.getChannelDetails(channelIds);
    }
    
    return [];
  }
  
  /**
   * API 할당량 계산
   */
  calculateQuotaCost(operation: 'search' | 'details' | 'videos', count: number = 1): number {
    const costs = {
      search: 100,  // Search operation
      details: 3,   // Channel details
      videos: 3,    // Video list
    };
    
    return costs[operation] * count;
  }
  
  /**
   * 남은 할당량 예측 (클라이언트 측 추정)
   */
  estimateRemainingQuota(used: number, daily: number = 10000): {
    remaining: number;
    percentage: number;
    canSearch: number;
  } {
    const remaining = daily - used;
    const percentage = (remaining / daily) * 100;
    const canSearch = Math.floor(remaining / 100); // 검색 가능 횟수
    
    return {
      remaining,
      percentage,
      canSearch
    };
  }
}