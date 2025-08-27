import { Creator, Video } from '@/types';

export class ScoringEngine {
  calculateEngagementScore(creator: Creator, recentVideos: Video[]): number {
    if (!recentVideos.length) return 0;

    const avgViews = recentVideos.reduce((sum, v) => sum + v.viewCount, 0) / recentVideos.length;
    const avgLikes = recentVideos.reduce((sum, v) => sum + v.likeCount, 0) / recentVideos.length;
    const avgComments = recentVideos.reduce((sum, v) => sum + v.commentCount, 0) / recentVideos.length;

    const likeRate = avgViews > 0 ? (avgLikes / avgViews) : 0;
    const commentRate = avgViews > 0 ? (avgComments / avgViews) : 0;
    
    const subscriberGrowthRate = this.estimateSubscriberGrowthRate(creator, recentVideos);

    const engagementScore = (
      likeRate * 0.4 +
      commentRate * 0.3 +
      subscriberGrowthRate * 0.3
    ) * 100;

    return Math.min(100, Math.round(engagementScore));
  }

  calculateActivityScore(creator: Creator, recentVideos: Video[]): number {
    if (!recentVideos.length) return 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentUploads = recentVideos.filter(v => 
      new Date(v.publishedAt) > thirtyDaysAgo
    ).length;

    const uploadFrequencyScore = Math.min(1, recentUploads / 4);

    const daysSinceLastUpload = recentVideos.length > 0
      ? Math.floor((now.getTime() - new Date(recentVideos[0].publishedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 365;
    
    const recencyScore = Math.max(0, 1 - (daysSinceLastUpload / 30));

    const consistencyScore = this.calculateConsistencyScore(recentVideos);

    const activityScore = (
      uploadFrequencyScore * 0.5 +
      recencyScore * 0.3 +
      consistencyScore * 0.2
    ) * 100;

    return Math.min(100, Math.round(activityScore));
  }

  calculateFitScore(
    creator: Creator,
    targetCategory: string,
    targetLocation?: string,
    idealSubscriberRange?: { min: number; max: number }
  ): number {
    let categoryScore = 0;
    if (creator.category === targetCategory) {
      categoryScore = 1;
    } else if (creator.category === '음식' || targetCategory === '음식') {
      categoryScore = 0.7;
    } else {
      categoryScore = 0.3;
    }

    let locationScore = 1;
    if (targetLocation) {
      if (creator.location === targetLocation) {
        locationScore = 1;
      } else if (creator.location && this.isSameRegion(creator.location, targetLocation)) {
        locationScore = 0.7;
      } else {
        locationScore = 0.3;
      }
    }

    let subscriberScore = 1;
    if (idealSubscriberRange) {
      const { min, max } = idealSubscriberRange;
      if (creator.subscriberCount >= min && creator.subscriberCount <= max) {
        subscriberScore = 1;
      } else if (creator.subscriberCount < min) {
        subscriberScore = Math.max(0.3, creator.subscriberCount / min);
      } else {
        subscriberScore = Math.max(0.3, max / creator.subscriberCount);
      }
    }

    const fitScore = (
      categoryScore * 0.4 +
      locationScore * 0.3 +
      subscriberScore * 0.3
    ) * 100;

    return Math.min(100, Math.round(fitScore));
  }

  calculateOverallScore(
    creator: Creator,
    engagementScore: number,
    activityScore: number,
    fitScore: number
  ): number {
    return Math.round(
      engagementScore * 0.35 +
      activityScore * 0.25 +
      fitScore * 0.4
    );
  }

  private estimateSubscriberGrowthRate(creator: Creator, recentVideos: Video[]): number {
    if (!recentVideos.length || !creator.subscriberCount) return 0;

    const avgViewsPerVideo = creator.metadata.averageViews || 0;
    const subscriberViewRatio = avgViewsPerVideo / creator.subscriberCount;
    
    if (subscriberViewRatio > 0.1) return 0.9;
    if (subscriberViewRatio > 0.05) return 0.7;
    if (subscriberViewRatio > 0.02) return 0.5;
    if (subscriberViewRatio > 0.01) return 0.3;
    return 0.1;
  }

  private calculateConsistencyScore(videos: Video[]): number {
    if (videos.length < 3) return 0;

    const uploadDates = videos
      .map(v => new Date(v.publishedAt).getTime())
      .sort((a, b) => a - b);

    const intervals: number[] = [];
    for (let i = 1; i < uploadDates.length; i++) {
      intervals.push(uploadDates[i] - uploadDates[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = avgInterval > 0 ? stdDev / avgInterval : 1;
    
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private isSameRegion(location1: string, location2: string): boolean {
    const regions = {
      '수도권': ['서울', '경기', '인천'],
      '충청권': ['대전', '충북', '충남', '세종'],
      '경상권': ['부산', '대구', '울산', '경북', '경남'],
      '전라권': ['광주', '전북', '전남'],
      '강원권': ['강원'],
      '제주권': ['제주'],
    };

    for (const [region, cities] of Object.entries(regions)) {
      if (cities.some(city => location1.includes(city)) &&
          cities.some(city => location2.includes(city))) {
        return true;
      }
    }

    return false;
  }
}

export const scoringEngine = new ScoringEngine();