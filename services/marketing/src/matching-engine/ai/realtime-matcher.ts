import { youtube_v3 } from 'googleapis';
import { Configuration, OpenAIApi } from 'openai';
import { Store } from '../types';
import { 
  RealtimeCreatorData, 
  RecommendationResult,
  AnalysisRepository 
} from '../../lib/database/repositories/analysis.repository';

// AI 기반 실시간 매칭 엔진
export class RealtimeAIMatcher {
  private youtube: youtube_v3.Youtube;
  private openai: OpenAIApi;
  private analysisRepo: AnalysisRepository;
  private readonly DAYS_TO_ANALYZE = 30;

  constructor() {
    // YouTube API 초기화
    this.youtube = new youtube_v3.Youtube({
      auth: process.env.YOUTUBE_API_KEY,
    });

    // OpenAI GPT-4 초기화
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);

    this.analysisRepo = new AnalysisRepository();
  }

  // 메인 매칭 함수
  async findMatches(store: Store): Promise<RecommendationResult[]> {
    console.log(`🔍 Finding real-time matches for ${store.name}`);

    // 1. YouTube에서 관련 크리에이터 실시간 검색
    const creators = await this.searchActiveCreators(store);

    // 2. 각 크리에이터의 최근 30일 데이터 수집
    const creatorData = await Promise.all(
      creators.map(c => this.collectRecentData(c.channelId))
    );

    // 3. AI 분석으로 매칭 점수 계산
    const recommendations = await Promise.all(
      creatorData.map(data => this.analyzeMatch(store, data))
    );

    // 4. 점수 기준 정렬 및 필터링
    const filtered = recommendations
      .filter(r => r.score >= 70) // 70점 이상만
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // 상위 20개

    // 5. 분석 이력 저장
    await this.analysisRepo.createAnalysis(
      store.storeId,
      store.name,
      filtered,
      {
        searchKeywords: store.keywords,
        locationFilter: store.location.city,
        dataFreshnessInDays: this.DAYS_TO_ANALYZE,
        analysisVersion: '2.0',
      }
    );

    return filtered;
  }

  // YouTube에서 활발한 크리에이터 검색
  private async searchActiveCreators(store: Store): Promise<{ channelId: string }[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - this.DAYS_TO_ANALYZE);

    // 검색 키워드 조합
    const searchQuery = [
      store.location.district,
      store.location.city,
      ...store.keywords,
      store.category,
    ].join(' ');

    try {
      // 채널 검색
      const searchResponse = await this.youtube.search.list({
        part: ['snippet'],
        q: searchQuery,
        type: ['channel'],
        regionCode: 'KR',
        maxResults: 50,
        order: 'relevance',
      });

      const channelIds = searchResponse.data.items?.map(
        item => ({ channelId: item.snippet?.channelId || '' })
      ) || [];

      // 최근 활동이 있는 채널만 필터링
      const activeChannels = await this.filterActiveChannels(
        channelIds.map(c => c.channelId),
        thirtyDaysAgo
      );

      return activeChannels.map(id => ({ channelId: id }));
    } catch (error) {
      console.error('YouTube search error:', error);
      return [];
    }
  }

  // 최근 30일 내 활동이 있는 채널만 필터
  private async filterActiveChannels(
    channelIds: string[],
    since: Date
  ): Promise<string[]> {
    const activeChannels: string[] = [];

    for (const channelId of channelIds) {
      try {
        const videosResponse = await this.youtube.search.list({
          part: ['id'],
          channelId: channelId,
          type: ['video'],
          publishedAfter: since.toISOString(),
          maxResults: 1,
        });

        if (videosResponse.data.items && videosResponse.data.items.length > 0) {
          activeChannels.push(channelId);
        }
      } catch (error) {
        console.error(`Error checking channel ${channelId}:`, error);
      }
    }

    return activeChannels;
  }

  // 크리에이터의 최근 30일 데이터 수집
  private async collectRecentData(channelId: string): Promise<RealtimeCreatorData> {
    // 캐시 확인 (1시간)
    const cached = await this.analysisRepo.getCachedRealtimeData(channelId);
    if (cached) {
      console.log(`📦 Using cached data for ${channelId}`);
      return cached;
    }

    console.log(`🔄 Collecting fresh data for ${channelId}`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - this.DAYS_TO_ANALYZE);

    // 채널 정보 가져오기
    const channelResponse = await this.youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [channelId],
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) throw new Error(`Channel ${channelId} not found`);

    // 최근 영상 목록 가져오기
    const videosResponse = await this.youtube.search.list({
      part: ['id'],
      channelId: channelId,
      type: ['video'],
      publishedAfter: thirtyDaysAgo.toISOString(),
      order: 'date',
      maxResults: 50,
    });

    const videoIds = videosResponse.data.items?.map(
      item => item.id?.videoId || ''
    ).filter(id => id) || [];

    // 영상 상세 정보 가져오기
    let videos: RealtimeCreatorData['recentActivity']['videos'] = [];
    if (videoIds.length > 0) {
      const videoDetailsResponse = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: videoIds,
      });

      videos = videoDetailsResponse.data.items?.map(video => ({
        videoId: video.id || '',
        title: video.snippet?.title || '',
        publishedAt: video.snippet?.publishedAt || '',
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        likeCount: parseInt(video.statistics?.likeCount || '0'),
        commentCount: parseInt(video.statistics?.commentCount || '0'),
        duration: video.contentDetails?.duration || '',
        tags: video.snippet?.tags || [],
        description: video.snippet?.description || '',
      })) || [];
    }

    // 통계 계산
    const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
    const avgViews = videos.length > 0 ? totalViews / videos.length : 0;
    const avgEngagement = videos.length > 0
      ? videos.reduce((sum, v) => {
          const views = v.viewCount || 1;
          return sum + ((v.likeCount + v.commentCount) / views);
        }, 0) / videos.length
      : 0;

    // 콘텐츠 분석 (AI)
    const contentAnalysis = await this.analyzeContent(videos);

    const data: RealtimeCreatorData = {
      channelId,
      channelName: channel.snippet?.title || '',
      channelUrl: `https://youtube.com/channel/${channelId}`,
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      totalViews: parseInt(channel.statistics?.viewCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
      recentActivity: {
        videos,
        uploadFrequency: videos.length / 4, // 주당 평균
        avgViewsPerVideo: avgViews,
        avgEngagementRate: avgEngagement,
        growthRate: {
          subscribers: 0, // TODO: 이전 데이터와 비교 필요
          views: 0,
        },
      },
      contentAnalysis,
    };

    // 캐시 저장 (1시간)
    await this.analysisRepo.cacheRealtimeData(channelId, data);

    return data;
  }

  // AI로 콘텐츠 분석
  private async analyzeContent(
    videos: RealtimeCreatorData['recentActivity']['videos']
  ): Promise<RealtimeCreatorData['contentAnalysis']> {
    if (videos.length === 0) {
      return {
        primaryTopics: [],
        contentStyle: 'unknown',
        productionQuality: 0,
        consistency: 0,
        brandMentions: [],
      };
    }

    // 제목과 태그에서 주요 토픽 추출
    const allTags = videos.flatMap(v => v.tags);
    const topicCounts = new Map<string, number>();
    allTags.forEach(tag => {
      topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
    });

    const primaryTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    // 업로드 일정 규칙성 계산
    const uploadDates = videos.map(v => new Date(v.publishedAt).getTime());
    const intervals = [];
    for (let i = 1; i < uploadDates.length; i++) {
      intervals.push(uploadDates[i - 1] - uploadDates[i]);
    }
    
    const avgInterval = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;
    
    const variance = intervals.length > 0
      ? intervals.reduce((sum, interval) => {
          return sum + Math.pow(interval - avgInterval, 2);
        }, 0) / intervals.length
      : 0;
    
    const consistency = variance > 0 ? 100 / (1 + Math.sqrt(variance) / avgInterval) : 0;

    // 프로덕션 품질 (조회수와 참여율 기반 추정)
    const avgViews = videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length;
    const productionQuality = Math.min(100, (avgViews / 10000) * 100);

    // 콘텐츠 스타일 추정
    const contentStyle = this.detectContentStyle(videos);

    return {
      primaryTopics,
      contentStyle,
      productionQuality,
      consistency,
      brandMentions: [], // TODO: 설명에서 브랜드 추출
    };
  }

  // 콘텐츠 스타일 감지
  private detectContentStyle(
    videos: RealtimeCreatorData['recentActivity']['videos']
  ): string {
    const styleKeywords = {
      review: ['리뷰', '평가', '솔직', '후기'],
      vlog: ['브이로그', 'vlog', '일상', '데일리'],
      mukbang: ['먹방', '맛집', '음식', '푸드'],
      tutorial: ['튜토리얼', '강의', '하는법', 'how to'],
      entertainment: ['예능', '웃긴', '재미', '코미디'],
    };

    const styleCounts = new Map<string, number>();

    videos.forEach(video => {
      const text = `${video.title} ${video.description}`.toLowerCase();
      
      Object.entries(styleKeywords).forEach(([style, keywords]) => {
        const count = keywords.filter(keyword => 
          text.includes(keyword.toLowerCase())
        ).length;
        
        if (count > 0) {
          styleCounts.set(style, (styleCounts.get(style) || 0) + count);
        }
      });
    });

    if (styleCounts.size === 0) return 'general';

    const sorted = Array.from(styleCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    return sorted[0][0];
  }

  // AI로 매칭 분석
  private async analyzeMatch(
    store: Store,
    creator: RealtimeCreatorData
  ): Promise<RecommendationResult> {
    // GPT-4 분석
    const gptAnalysis = await this.runGPTAnalysis(store, creator);

    // 자체 알고리즘 점수 계산
    const algorithmScore = this.calculateAlgorithmScore(store, creator);

    // 종합 점수 (GPT 60%, 알고리즘 40%)
    const finalScore = gptAnalysis.synergyScore * 0.6 + algorithmScore * 0.4;

    // ROI 예측
    const roiPrediction = this.predictROI(store, creator, finalScore);

    return {
      channelId: creator.channelId,
      channelName: creator.channelName,
      channelUrl: creator.channelUrl,
      score: Math.round(finalScore),
      roiPrediction,
      recentPerformance: {
        last30Days: {
          videoCount: creator.recentActivity.videos.length,
          avgViews: Math.round(creator.recentActivity.avgViewsPerVideo),
          avgLikes: Math.round(
            creator.recentActivity.videos.reduce((sum, v) => sum + v.likeCount, 0) /
            Math.max(1, creator.recentActivity.videos.length)
          ),
          avgComments: Math.round(
            creator.recentActivity.videos.reduce((sum, v) => sum + v.commentCount, 0) /
            Math.max(1, creator.recentActivity.videos.length)
          ),
          engagementRate: creator.recentActivity.avgEngagementRate,
          viewGrowth: creator.recentActivity.growthRate.views,
        },
        topVideos: creator.recentActivity.videos
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, 3)
          .map(v => ({
            title: v.title,
            views: v.viewCount,
            publishedAt: v.publishedAt,
            engagement: (v.likeCount + v.commentCount) / Math.max(1, v.viewCount),
          })),
      },
      audienceInsights: {
        estimatedAge: '20-35', // TODO: 실제 분석 필요
        estimatedGender: 'mixed',
        interests: creator.contentAnalysis.primaryTopics,
        geoDistribution: [
          { region: store.location.city, percentage: 60 },
          { region: '기타', percentage: 40 },
        ],
      },
      matchReasons: gptAnalysis.reasons,
      aiAnalysis: {
        synergyScore: gptAnalysis.synergyScore,
        brandSafety: gptAnalysis.brandSafety,
        contentQuality: creator.contentAnalysis.productionQuality,
        audienceOverlap: gptAnalysis.audienceOverlap,
      },
    };
  }

  // GPT-4 분석 실행
  private async runGPTAnalysis(
    store: Store,
    creator: RealtimeCreatorData
  ): Promise<{
    synergyScore: number;
    brandSafety: number;
    audienceOverlap: number;
    reasons: string[];
    risks: string[];
  }> {
    const prompt = `
      가게 정보:
      - 이름: ${store.name}
      - 업종: ${store.category}
      - 위치: ${store.location.city} ${store.location.district}
      - 키워드: ${store.keywords.join(', ')}
      
      크리에이터 최근 30일 활동:
      - 채널명: ${creator.channelName}
      - 구독자: ${creator.subscriberCount.toLocaleString()}
      - 최근 영상 수: ${creator.recentActivity.videos.length}
      - 평균 조회수: ${Math.round(creator.recentActivity.avgViewsPerVideo).toLocaleString()}
      - 평균 참여율: ${(creator.recentActivity.avgEngagementRate * 100).toFixed(2)}%
      - 콘텐츠 스타일: ${creator.contentAnalysis.contentStyle}
      - 주요 주제: ${creator.contentAnalysis.primaryTopics.join(', ')}
      - 최근 영상 제목들: ${creator.recentActivity.videos.slice(0, 5).map(v => v.title).join(', ')}
      
      다음을 JSON 형식으로 분석해주세요:
      {
        "synergyScore": 0-100 사이의 시너지 점수,
        "brandSafety": 0-100 사이의 브랜드 안전성 점수,
        "audienceOverlap": 0-100 사이의 시청자 겹침 정도,
        "reasons": ["추천 이유 1", "추천 이유 2", "추천 이유 3"],
        "risks": ["잠재적 위험 1", "잠재적 위험 2"]
      }
    `;

    try {
      const response = await this.openai.createChatCompletion({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: '당신은 마케팅 전문가입니다. 가게와 크리에이터의 매칭을 정확히 분석해주세요.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.data.choices[0].message?.content || '{}');
      
      return {
        synergyScore: result.synergyScore || 50,
        brandSafety: result.brandSafety || 70,
        audienceOverlap: result.audienceOverlap || 50,
        reasons: result.reasons || ['데이터 기반 매칭'],
        risks: result.risks || [],
      };
    } catch (error) {
      console.error('GPT analysis error:', error);
      
      // 폴백 응답
      return {
        synergyScore: 50,
        brandSafety: 70,
        audienceOverlap: 50,
        reasons: ['AI 분석 일시적 오류, 기본 알고리즘 사용'],
        risks: [],
      };
    }
  }

  // 자체 알고리즘 점수 계산
  private calculateAlgorithmScore(
    store: Store,
    creator: RealtimeCreatorData
  ): number {
    let score = 0;

    // 1. 콘텐츠 카테고리 매칭 (30점)
    const categoryMatch = this.calculateCategoryMatch(store, creator);
    score += categoryMatch * 30;

    // 2. 지역 관련성 (20점)
    const locationMatch = this.calculateLocationMatch(store, creator);
    score += locationMatch * 20;

    // 3. 활동성 (20점)
    const activityScore = Math.min(1, creator.recentActivity.videos.length / 10);
    score += activityScore * 20;

    // 4. 참여율 (15점)
    const engagementScore = Math.min(1, creator.recentActivity.avgEngagementRate / 0.05);
    score += engagementScore * 15;

    // 5. 일관성 (15점)
    const consistencyScore = creator.contentAnalysis.consistency / 100;
    score += consistencyScore * 15;

    return score;
  }

  // 카테고리 매칭 계산
  private calculateCategoryMatch(
    store: Store,
    creator: RealtimeCreatorData
  ): number {
    const storeKeywords = new Set(store.keywords.map(k => k.toLowerCase()));
    const creatorTopics = new Set(
      creator.contentAnalysis.primaryTopics.map(t => t.toLowerCase())
    );

    let matches = 0;
    storeKeywords.forEach(keyword => {
      if (creatorTopics.has(keyword)) matches++;
    });

    return Math.min(1, matches / Math.max(1, storeKeywords.size));
  }

  // 지역 매칭 계산
  private calculateLocationMatch(
    store: Store,
    creator: RealtimeCreatorData
  ): number {
    const locationKeywords = [
      store.location.city,
      store.location.district,
    ].map(l => l.toLowerCase());

    const videoTexts = creator.recentActivity.videos.map(v => 
      `${v.title} ${v.description}`.toLowerCase()
    );

    let locationMentions = 0;
    videoTexts.forEach(text => {
      locationKeywords.forEach(location => {
        if (text.includes(location)) locationMentions++;
      });
    });

    return Math.min(1, locationMentions / Math.max(1, creator.recentActivity.videos.length));
  }

  // ROI 예측
  private predictROI(
    store: Store,
    creator: RealtimeCreatorData,
    matchScore: number
  ): RecommendationResult['roiPrediction'] {
    // 예상 조회수 (최근 평균 * 매치 점수 보정)
    const expectedViews = Math.round(
      creator.recentActivity.avgViewsPerVideo * (matchScore / 100) * 1.2
    );

    // 예상 참여수
    const expectedEngagement = Math.round(
      expectedViews * creator.recentActivity.avgEngagementRate
    );

    // 예상 ROI (조회수 * 전환율 * 객단가)
    const conversionRate = 0.001 * (matchScore / 100); // 0.1% 기본 전환율
    const avgTicketSize = 30000; // 평균 객단가 3만원
    const estimatedROI = Math.round(
      expectedViews * conversionRate * avgTicketSize
    );

    // 신뢰도 (데이터 양과 일관성 기반)
    const confidence = Math.min(95, 
      50 + 
      (creator.recentActivity.videos.length * 2) + 
      (creator.contentAnalysis.consistency / 5)
    );

    return {
      expectedViews,
      expectedEngagement,
      estimatedROI,
      confidence,
    };
  }
}