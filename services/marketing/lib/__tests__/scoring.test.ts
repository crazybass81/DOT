import { ScoringEngine } from '../scoring';
import { Creator, Video } from '@/types';

describe('ScoringEngine', () => {
  const scoringEngine = new ScoringEngine();
  
  const mockCreator: Creator = {
    id: 'test-id',
    channelId: 'test-channel',
    channelName: 'Test Channel',
    subscriberCount: 10000,
    videoCount: 100,
    viewCount: 1000000,
    category: '음식',
    location: '서울',
    engagementScore: 0,
    activityScore: 0,
    fitScore: 0,
    lastUpdated: new Date(),
    metadata: {
      averageViews: 10000,
      uploadFrequency: 4,
      recentVideos: [],
      thumbnailUrl: 'https://example.com/thumb.jpg',
      description: 'Test channel description',
    },
  };

  const mockVideos: Video[] = [
    {
      id: 'video1',
      title: 'Video 1',
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      viewCount: 15000,
      likeCount: 500,
      commentCount: 50,
      duration: 'PT10M',
      thumbnailUrl: 'https://example.com/video1.jpg',
    },
    {
      id: 'video2',
      title: 'Video 2',
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      viewCount: 12000,
      likeCount: 400,
      commentCount: 40,
      duration: 'PT8M',
      thumbnailUrl: 'https://example.com/video2.jpg',
    },
  ];

  describe('calculateEngagementScore', () => {
    it('returns 0 for empty video list', () => {
      const score = scoringEngine.calculateEngagementScore(mockCreator, []);
      expect(score).toBe(0);
    });

    it('calculates engagement score correctly', () => {
      const score = scoringEngine.calculateEngagementScore(mockCreator, mockVideos);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('handles videos with zero views', () => {
      const videosWithZeroViews = mockVideos.map(v => ({ ...v, viewCount: 0 }));
      const score = scoringEngine.calculateEngagementScore(mockCreator, videosWithZeroViews);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateActivityScore', () => {
    it('returns 0 for empty video list', () => {
      const score = scoringEngine.calculateActivityScore(mockCreator, []);
      expect(score).toBe(0);
    });

    it('gives high score for recent uploads', () => {
      const recentVideos = [
        { ...mockVideos[0], publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { ...mockVideos[1], publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      ];
      const score = scoringEngine.calculateActivityScore(mockCreator, recentVideos);
      expect(score).toBeGreaterThan(50);
    });

    it('gives low score for old uploads', () => {
      const oldVideos = mockVideos.map(v => ({
        ...v,
        publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      }));
      const score = scoringEngine.calculateActivityScore(mockCreator, oldVideos);
      expect(score).toBeLessThan(50);
    });
  });

  describe('calculateFitScore', () => {
    it('gives perfect score for exact matches', () => {
      const score = scoringEngine.calculateFitScore(
        mockCreator,
        '음식',
        '서울',
        { min: 5000, max: 50000 }
      );
      expect(score).toBe(100);
    });

    it('gives lower score for category mismatch', () => {
      const score = scoringEngine.calculateFitScore(
        mockCreator,
        '게임',
        '서울',
        { min: 5000, max: 50000 }
      );
      expect(score).toBeLessThan(100);
    });

    it('handles same region matching', () => {
      const score1 = scoringEngine.calculateFitScore(
        mockCreator,
        '음식',
        '서울'
      );
      const score2 = scoringEngine.calculateFitScore(
        { ...mockCreator, location: '경기' },
        '음식',
        '인천'
      );
      expect(score2).toBeLessThan(score1); // Same region but different cities
    });

    it('handles subscriber range correctly', () => {
      const inRangeScore = scoringEngine.calculateFitScore(
        mockCreator,
        '음식',
        undefined,
        { min: 5000, max: 15000 }
      );
      
      const outOfRangeScore = scoringEngine.calculateFitScore(
        mockCreator,
        '음식',
        undefined,
        { min: 20000, max: 30000 }
      );
      
      expect(inRangeScore).toBeGreaterThan(outOfRangeScore);
    });
  });

  describe('calculateOverallScore', () => {
    it('weights scores correctly', () => {
      const overall = scoringEngine.calculateOverallScore(
        mockCreator,
        80, // engagement
        60, // activity
        90  // fit
      );
      
      // Expected: 80*0.35 + 60*0.25 + 90*0.4 = 28 + 15 + 36 = 79
      expect(overall).toBe(79);
    });

    it('handles zero scores', () => {
      const overall = scoringEngine.calculateOverallScore(
        mockCreator,
        0,
        0,
        0
      );
      expect(overall).toBe(0);
    });

    it('handles perfect scores', () => {
      const overall = scoringEngine.calculateOverallScore(
        mockCreator,
        100,
        100,
        100
      );
      expect(overall).toBe(100);
    });
  });
});