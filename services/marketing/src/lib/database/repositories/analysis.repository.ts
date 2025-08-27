import {
  PutCommand,
  GetCommand,
  QueryCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAMES, GSI_NAMES } from '../dynamodb-client';

// AI 분석 결과만 저장 (크리에이터 가입 없음)
export interface AnalysisHistory {
  analysisId: string;
  storeId: string;
  storeName: string;
  requestedAt: string;
  recommendations: RecommendationResult[];
  metadata: {
    searchKeywords: string[];
    locationFilter: string;
    dataFreshnessInDays: number;
    analysisVersion: string;
  };
  ttl?: number; // 30일 후 자동 삭제
}

export interface RecommendationResult {
  channelId: string;
  channelName: string;
  channelUrl: string;
  score: number;
  roiPrediction: {
    expectedViews: number;
    expectedEngagement: number;
    estimatedROI: number;
    confidence: number;
  };
  recentPerformance: {
    last30Days: {
      videoCount: number;
      avgViews: number;
      avgLikes: number;
      avgComments: number;
      engagementRate: number;
      viewGrowth: number;
    };
    topVideos: Array<{
      title: string;
      views: number;
      publishedAt: string;
      engagement: number;
    }>;
  };
  audienceInsights: {
    estimatedAge: string;
    estimatedGender: string;
    interests: string[];
    geoDistribution: Array<{
      region: string;
      percentage: number;
    }>;
  };
  matchReasons: string[];
  aiAnalysis: {
    synergyScore: number;
    brandSafety: number;
    contentQuality: number;
    audienceOverlap: number;
  };
}

// YouTube API에서 실시간으로 가져오는 데이터
export interface RealtimeCreatorData {
  channelId: string;
  channelName: string;
  channelUrl: string;
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
  
  // 최근 30일 데이터만
  recentActivity: {
    videos: Array<{
      videoId: string;
      title: string;
      publishedAt: string;
      viewCount: number;
      likeCount: number;
      commentCount: number;
      duration: string;
      tags: string[];
      description: string;
    }>;
    uploadFrequency: number; // 주당 평균 업로드 수
    avgViewsPerVideo: number;
    avgEngagementRate: number;
    growthRate: {
      subscribers: number; // 30일간 증가율
      views: number;       // 30일간 조회수 증가율
    };
  };
  
  // 콘텐츠 분석 (AI)
  contentAnalysis: {
    primaryTopics: string[];
    contentStyle: string; // review, vlog, tutorial, etc.
    productionQuality: number; // 0-100
    consistency: number; // 업로드 일정의 규칙성
    brandMentions: string[]; // 언급된 브랜드들
  };
}

export class AnalysisRepository {
  private tableName = TABLE_NAMES.CREATORS; // 테이블 재활용 (분석 이력용)

  // 분석 이력 저장
  async saveAnalysisHistory(analysis: AnalysisHistory): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30일
    
    await dynamoDBClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `ANALYSIS#${analysis.analysisId}`,
        SK: `STORE#${analysis.storeId}`,
        GSI1PK: `STORE#${analysis.storeId}`,
        GSI1SK: `DATE#${analysis.requestedAt}`,
        entityType: 'ANALYSIS',
        ...analysis,
        ttl,
      },
    }));
  }

  // 스토어의 분석 이력 조회
  async getAnalysisHistory(storeId: string, limit = 10): Promise<AnalysisHistory[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.CREATOR_CATEGORY_INDEX, // GSI1 재활용
      KeyConditionExpression: 'GSI1PK = :storeId',
      ExpressionAttributeValues: {
        ':storeId': `STORE#${storeId}`,
      },
      ScanIndexForward: false, // 최신순
      Limit: limit,
    }));

    return (result.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, entityType, ttl, ...analysis } = item;
      return analysis as AnalysisHistory;
    });
  }

  // 특정 분석 결과 조회
  async getAnalysis(analysisId: string, storeId: string): Promise<AnalysisHistory | null> {
    const result = await dynamoDBClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `ANALYSIS#${analysisId}`,
        SK: `STORE#${storeId}`,
      },
    }));

    if (!result.Item) return null;

    const { PK, SK, GSI1PK, GSI1SK, entityType, ttl, ...analysis } = result.Item;
    return analysis as AnalysisHistory;
  }

  // 임시 캐시 저장 (1시간)
  async cacheRealtimeData(channelId: string, data: RealtimeCreatorData): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + 3600; // 1시간
    
    await dynamoDBClient.send(new PutCommand({
      TableName: TABLE_NAMES.SCRAPING_CACHE,
      Item: {
        PK: `YOUTUBE#${channelId}`,
        SK: `REALTIME#${new Date().toISOString()}`,
        entityType: 'CREATOR_CACHE',
        data,
        cachedAt: new Date().toISOString(),
        ttl,
      },
    }));
  }

  // 캐시된 실시간 데이터 조회
  async getCachedRealtimeData(channelId: string): Promise<RealtimeCreatorData | null> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: TABLE_NAMES.SCRAPING_CACHE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `YOUTUBE#${channelId}`,
      },
      ScanIndexForward: false, // 최신순
      Limit: 1,
    }));

    if (!result.Items || result.Items.length === 0) return null;

    return result.Items[0].data as RealtimeCreatorData;
  }

  // ML 학습용 데이터 저장 (예측 vs 실제 성과)
  async saveMLTrainingData(data: {
    analysisId: string;
    channelId: string;
    predicted: {
      score: number;
      roi: number;
    };
    actual?: {
      views: number;
      engagement: number;
      conversion: number;
    };
  }): Promise<void> {
    await dynamoDBClient.send(new PutCommand({
      TableName: TABLE_NAMES.ANALYTICS,
      Item: {
        PK: `ML_TRAINING#${data.analysisId}`,
        SK: `CHANNEL#${data.channelId}`,
        entityType: 'ML_TRAINING',
        ...data,
        createdAt: new Date().toISOString(),
      },
    }));
  }

  // 새로운 분석 생성
  async createAnalysis(
    storeId: string,
    storeName: string,
    recommendations: RecommendationResult[],
    metadata: AnalysisHistory['metadata']
  ): Promise<AnalysisHistory> {
    const analysis: AnalysisHistory = {
      analysisId: uuidv4(),
      storeId,
      storeName,
      requestedAt: new Date().toISOString(),
      recommendations,
      metadata,
    };

    await this.saveAnalysisHistory(analysis);
    return analysis;
  }

  // 최근 인기 크리에이터 조회 (여러 분석에서 자주 추천된)
  async getTrendingCreators(limit = 20): Promise<Array<{
    channelId: string;
    channelName: string;
    recommendationCount: number;
    avgScore: number;
  }>> {
    // 최근 7일 분석 데이터에서 집계
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.CREATOR_CATEGORY_INDEX,
      KeyConditionExpression: 'entityType = :type AND requestedAt >= :date',
      ExpressionAttributeValues: {
        ':type': 'ANALYSIS',
        ':date': sevenDaysAgo.toISOString(),
      },
    }));

    // 크리에이터별 집계
    const creatorStats = new Map<string, {
      channelName: string;
      count: number;
      totalScore: number;
    }>();

    (result.Items || []).forEach(item => {
      const analysis = item as unknown as AnalysisHistory;
      analysis.recommendations.forEach(rec => {
        const existing = creatorStats.get(rec.channelId) || {
          channelName: rec.channelName,
          count: 0,
          totalScore: 0,
        };
        
        existing.count += 1;
        existing.totalScore += rec.score;
        creatorStats.set(rec.channelId, existing);
      });
    });

    // 정렬 및 반환
    return Array.from(creatorStats.entries())
      .map(([channelId, stats]) => ({
        channelId,
        channelName: stats.channelName,
        recommendationCount: stats.count,
        avgScore: stats.totalScore / stats.count,
      }))
      .sort((a, b) => b.recommendationCount - a.recommendationCount)
      .slice(0, limit);
  }
}