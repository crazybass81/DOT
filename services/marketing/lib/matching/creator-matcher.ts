/**
 * YouTube Creator Matching Engine
 * 가게 프로필을 기반으로 적합한 유튜브 크리에이터를 찾습니다
 */

import { StoreProfile } from '@/types/smartplace';
import { Creator, SearchFilters } from '@/types';

interface CreatorMatch extends Creator {
  matchScore: number;
  matchReasons: string[];
  recentPerformance: {
    avgViews: number;
    avgEngagement: number;
    uploadFrequency: number;
  };
}

interface MatchingOptions {
  maxResults?: number;
  minScore?: number;
  includeInactive?: boolean;
}

export class YouTubeCreatorMatcher {
  // MVP: Mock creator database
  private readonly mockCreators: Creator[] = [
    {
      id: 'creator-001',
      channelId: 'UCExample1',
      channelName: '먹방러버 김사장',
      subscriberCount: 85000,
      videoCount: 247,
      viewCount: 12500000,
      category: '음식/먹방',
      location: '서울 강남구',
      email: 'contact@foodlover.com',
      engagementScore: 85,
      activityScore: 92,
      fitScore: 0, // Will be calculated
      lastUpdated: new Date(),
      metadata: {
        averageViews: 45000,
        uploadFrequency: 3.5, // videos per week
        recentVideos: [],
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        description: '맛집 탐방과 음식 리뷰 전문 채널'
      }
    },
    {
      id: 'creator-002',
      channelId: 'UCExample2',
      channelName: '홍대 맛집 탐험가',
      subscriberCount: 120000,
      videoCount: 156,
      viewCount: 8700000,
      category: '음식/먹방',
      location: '서울 마포구',
      email: 'hello@hongdaefood.com',
      engagementScore: 78,
      activityScore: 88,
      fitScore: 0,
      lastUpdated: new Date(),
      metadata: {
        averageViews: 62000,
        uploadFrequency: 2.8,
        recentVideos: [],
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        description: '홍대 먹거리와 핫플레이스 소개'
      }
    },
    {
      id: 'creator-003',
      channelId: 'UCExample3',
      channelName: '서울 디저트 여행',
      subscriberCount: 95000,
      videoCount: 189,
      viewCount: 6200000,
      category: '음식/디저트',
      location: '서울 강남구',
      email: 'info@dessertseoul.com',
      engagementScore: 91,
      activityScore: 85,
      fitScore: 0,
      lastUpdated: new Date(),
      metadata: {
        averageViews: 38000,
        uploadFrequency: 4.2,
        recentVideos: [],
        thumbnailUrl: 'https://example.com/thumb3.jpg',
        description: '서울의 숨은 디저트 맛집 발굴'
      }
    },
    {
      id: 'creator-004',
      channelId: 'UCExample4',
      channelName: '데이트 맛집 추천',
      subscriberCount: 67000,
      videoCount: 134,
      viewCount: 4500000,
      category: '음식/레스토랑',
      location: '서울 중구',
      email: 'contact@datespot.com',
      engagementScore: 87,
      activityScore: 79,
      fitScore: 0,
      lastUpdated: new Date(),
      metadata: {
        averageViews: 28000,
        uploadFrequency: 2.1,
        recentVideos: [],
        thumbnailUrl: 'https://example.com/thumb4.jpg',
        description: '커플을 위한 로맨틱 레스토랑 추천'
      }
    },
    {
      id: 'creator-005',
      channelId: 'UCExample5',
      channelName: '야식 도전단',
      subscriberCount: 142000,
      videoCount: 201,
      viewCount: 15800000,
      category: '음식/먹방',
      location: '서울 송파구',
      email: 'team@latenight.com',
      engagementScore: 82,
      activityScore: 94,
      fitScore: 0,
      lastUpdated: new Date(),
      metadata: {
        averageViews: 72000,
        uploadFrequency: 4.7,
        recentVideos: [],
        thumbnailUrl: 'https://example.com/thumb5.jpg',
        description: '늦은 밤 야식과 심야 맛집 탐방'
      }
    }
  ];

  /**
   * 가게 프로필에 맞는 크리에이터 찾기
   */
  async findMatches(
    storeProfile: StoreProfile,
    options: MatchingOptions = {}
  ): Promise<CreatorMatch[]> {
    const opts = {
      maxResults: options.maxResults ?? 20,
      minScore: options.minScore ?? 60,
      includeInactive: options.includeInactive ?? false,
      ...options
    };

    console.log('🎯 Starting creator matching for:', storeProfile.name);
    console.log('Store category:', storeProfile.primaryCategory);
    console.log('Store location:', storeProfile.location.city, storeProfile.location.district);

    // Calculate match scores for all creators
    const matches: CreatorMatch[] = [];

    for (const creator of this.mockCreators) {
      const matchScore = this.calculateMatchScore(storeProfile, creator);
      const matchReasons = this.getMatchReasons(storeProfile, creator, matchScore);

      if (matchScore >= opts.minScore) {
        matches.push({
          ...creator,
          matchScore,
          matchReasons,
          recentPerformance: {
            avgViews: creator.metadata.averageViews,
            avgEngagement: (creator.engagementScore / 100) * creator.metadata.averageViews,
            uploadFrequency: creator.metadata.uploadFrequency
          }
        });
      }
    }

    // Sort by match score (descending)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    const result = matches.slice(0, opts.maxResults);
    console.log(`✅ Found ${result.length} matching creators`);

    return result;
  }

  /**
   * 매칭 점수 계산
   */
  private calculateMatchScore(storeProfile: StoreProfile, creator: Creator): number {
    let totalScore = 0;
    let maxScore = 0;

    // 1. 카테고리 매칭 (40% 가중치)
    const categoryScore = this.calculateCategoryScore(storeProfile, creator);
    totalScore += categoryScore * 0.4;
    maxScore += 100 * 0.4;

    // 2. 위치 매칭 (25% 가중치)
    const locationScore = this.calculateLocationScore(storeProfile, creator);
    totalScore += locationScore * 0.25;
    maxScore += 100 * 0.25;

    // 3. 타겟 고객층 매칭 (20% 가중치)
    const audienceScore = this.calculateAudienceScore(storeProfile, creator);
    totalScore += audienceScore * 0.2;
    maxScore += 100 * 0.2;

    // 4. 크리에이터 품질 (15% 가중치)
    const qualityScore = this.calculateQualityScore(creator);
    totalScore += qualityScore * 0.15;
    maxScore += 100 * 0.15;

    return Math.round((totalScore / maxScore) * 100);
  }

  /**
   * 카테고리 매칭 점수
   */
  private calculateCategoryScore(storeProfile: StoreProfile, creator: Creator): number {
    const storeCategoryKeywords = this.extractCategoryKeywords(storeProfile.primaryCategory);
    const creatorCategoryKeywords = this.extractCategoryKeywords(creator.category);

    // 정확한 매칭
    if (storeCategoryKeywords.some(k => creatorCategoryKeywords.includes(k))) {
      return 100;
    }

    // 관련 카테고리 매칭
    const relatedMatches = this.findRelatedCategories(storeProfile.primaryCategory, creator.category);
    if (relatedMatches > 0) {
      return Math.min(85, 60 + (relatedMatches * 25));
    }

    // 일반 음식 카테고리
    if (creator.category.includes('음식') && storeProfile.primaryCategory.includes('음식')) {
      return 70;
    }

    return 30; // 최소 기본점수
  }

  /**
   * 위치 매칭 점수
   */
  private calculateLocationScore(storeProfile: StoreProfile, creator: Creator): number {
    if (!creator.location) return 50; // 위치 정보 없으면 중간점수

    const storeLocation = storeProfile.location;
    const creatorLocationParts = creator.location?.split(' ') || [];

    // 같은 구
    if (creator.location?.includes(storeLocation.district)) {
      return 100;
    }

    // 같은 시
    if (creator.location?.includes(storeLocation.city)) {
      return 80;
    }

    // 서울 내 다른 구
    if (storeLocation.city === '서울' && creator.location?.includes('서울')) {
      return 70;
    }

    // 수도권
    const metropolitanAreas = ['서울', '경기', '인천'];
    const storeInMetro = metropolitanAreas.some(area => storeLocation.city.includes(area));
    const creatorInMetro = metropolitanAreas.some(area => creator.location?.includes(area) || false);
    
    if (storeInMetro && creatorInMetro) {
      return 60;
    }

    return 40; // 다른 지역
  }

  /**
   * 타겟 고객층 매칭 점수
   */
  private calculateAudienceScore(storeProfile: StoreProfile, creator: Creator): number {
    let score = 50; // 기본 점수

    // 가격대 매칭
    const priceLevel = storeProfile.priceAnalysis.level;
    const subscriberRange = this.getSubscriberRange(creator.subscriberCount);

    if (priceLevel === 'luxury' && subscriberRange === 'high') score += 20;
    else if (priceLevel === 'premium' && subscriberRange === 'medium') score += 15;
    else if (priceLevel === 'moderate' && subscriberRange === 'medium') score += 10;
    else if (priceLevel === 'budget' && subscriberRange === 'low') score += 10;

    // 분위기 매칭
    const atmosphere = storeProfile.atmosphere;
    const creatorDesc = creator.metadata.description?.toLowerCase() || '';

    if (atmosphere.style.includes('트렌디한') && creatorDesc.includes('핫플레이스')) {
      score += 15;
    }
    if (atmosphere.suitable.includes('데이트') && creatorDesc.includes('데이트')) {
      score += 15;
    }
    if (atmosphere.suitable.includes('혼술') && creatorDesc.includes('혼자')) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * 크리에이터 품질 점수
   */
  private calculateQualityScore(creator: Creator): number {
    let score = 0;

    // 활동성 점수 (40%)
    score += creator.activityScore * 0.4;

    // 참여율 점수 (40%)
    score += creator.engagementScore * 0.4;

    // 채널 성장성 (20%)
    const growthScore = this.calculateGrowthScore(creator);
    score += growthScore * 0.2;

    return Math.min(100, score);
  }

  /**
   * 성장성 점수 계산
   */
  private calculateGrowthScore(creator: Creator): number {
    const avgViewsPerVideo = creator.viewCount / creator.videoCount;
    const recentAvgViews = creator.metadata.averageViews;

    // 최근 조회수가 전체 평균보다 높으면 성장중
    if (recentAvgViews > avgViewsPerVideo * 1.2) {
      return 90;
    } else if (recentAvgViews > avgViewsPerVideo) {
      return 75;
    } else if (recentAvgViews > avgViewsPerVideo * 0.8) {
      return 60;
    } else {
      return 40;
    }
  }

  /**
   * 매칭 이유 생성
   */
  private getMatchReasons(
    storeProfile: StoreProfile,
    creator: Creator,
    matchScore: number
  ): string[] {
    const reasons: string[] = [];

    // 카테고리 매칭
    const categoryScore = this.calculateCategoryScore(storeProfile, creator);
    if (categoryScore >= 90) {
      reasons.push(`${creator.category} 전문 크리에이터`);
    } else if (categoryScore >= 70) {
      reasons.push('관련 카테고리 크리에이터');
    }

    // 위치 매칭
    const locationScore = this.calculateLocationScore(storeProfile, creator);
    if (locationScore >= 90) {
      reasons.push(`${storeProfile.location.district} 지역 크리에이터`);
    } else if (locationScore >= 70) {
      reasons.push(`${storeProfile.location.city} 지역 크리에이터`);
    }

    // 구독자 수
    if (creator.subscriberCount >= 100000) {
      reasons.push('높은 구독자 수 (10만+)');
    } else if (creator.subscriberCount >= 50000) {
      reasons.push('적정 구독자 수 (5만+)');
    }

    // 참여율
    if (creator.engagementScore >= 85) {
      reasons.push('높은 참여율');
    }

    // 활동성
    if (creator.activityScore >= 90) {
      reasons.push('활발한 업로드');
    }

    // 특별한 매칭 포인트
    const storeKeywords = storeProfile.keywords.hashtags.join(' ');
    const creatorDesc = creator.metadata.description || '';
    
    if (storeKeywords.includes('데이트') && creatorDesc.includes('데이트')) {
      reasons.push('데이트 맛집 전문');
    }
    if (storeProfile.atmosphere.suitable.includes('혼술') && creatorDesc.includes('혼자')) {
      reasons.push('혼밥/혼술 컨텐츠');
    }

    return reasons.slice(0, 4); // 최대 4개까지
  }

  /**
   * 카테고리 키워드 추출
   */
  private extractCategoryKeywords(category: string): string[] {
    const keywords: string[] = [];
    
    if (category.includes('음식') || category.includes('먹방')) {
      keywords.push('음식', '먹방', '맛집');
    }
    if (category.includes('디저트')) {
      keywords.push('디저트', '카페', '베이커리');
    }
    if (category.includes('레스토랑')) {
      keywords.push('레스토랑', '파인다이닝', '데이트');
    }
    if (category.includes('카페')) {
      keywords.push('카페', '커피', '브런치');
    }
    
    return keywords;
  }

  /**
   * 관련 카테고리 찾기
   */
  private findRelatedCategories(storeCategory: string, creatorCategory: string): number {
    const relatedPairs = [
      ['음식점', '음식/먹방'],
      ['카페', '음식/디저트'],
      ['베이커리', '음식/디저트'],
      ['레스토랑', '음식/레스토랑'],
      ['술집', '음식/먹방'],
      ['바', '음식/먹방']
    ];

    return relatedPairs.filter(pair => 
      (storeCategory.includes(pair[0]) && creatorCategory.includes(pair[1])) ||
      (storeCategory.includes(pair[1]) && creatorCategory.includes(pair[0]))
    ).length;
  }

  /**
   * 구독자 수 범위 분류
   */
  private getSubscriberRange(count: number): 'low' | 'medium' | 'high' {
    if (count >= 100000) return 'high';
    if (count >= 30000) return 'medium';
    return 'low';
  }

  /**
   * 검색 필터를 통한 크리에이터 찾기 (기존 검색 기능과 호환)
   */
  async searchCreators(filters: SearchFilters): Promise<Creator[]> {
    let results = [...this.mockCreators];

    // 키워드 필터
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      results = results.filter(creator => 
        creator.channelName.toLowerCase().includes(keyword) ||
        creator.category.toLowerCase().includes(keyword) ||
        (creator.metadata.description?.toLowerCase() || '').includes(keyword)
      );
    }

    // 카테고리 필터
    if (filters.category) {
      results = results.filter(creator => 
        creator.category.includes(filters.category!)
      );
    }

    // 지역 필터
    if (filters.location) {
      results = results.filter(creator => 
        creator.location?.includes(filters.location!) || false
      );
    }

    // 구독자 수 필터
    if (filters.minSubscribers) {
      results = results.filter(creator => 
        creator.subscriberCount >= filters.minSubscribers!
      );
    }

    if (filters.maxSubscribers) {
      results = results.filter(creator => 
        creator.subscriberCount <= filters.maxSubscribers!
      );
    }

    // 점수 필터
    if (filters.minEngagementScore) {
      results = results.filter(creator => 
        creator.engagementScore >= filters.minEngagementScore!
      );
    }

    if (filters.minActivityScore) {
      results = results.filter(creator => 
        creator.activityScore >= filters.minActivityScore!
      );
    }

    return results;
  }
}
