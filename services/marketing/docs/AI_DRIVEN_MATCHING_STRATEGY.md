# AI-Driven Real-Time Creator Matching Strategy

## 핵심 컨셉

**크리에이터 가입 없음** - YouTube/Instagram 공개 데이터만으로 AI 분석을 통해 최적의 크리에이터를 실시간 추천

## 시스템 아키텍처

### 1. 실시간 데이터 수집 (1달 이내 최신 데이터)

```typescript
interface RealtimeCreatorData {
  // YouTube에서 실시간 수집
  channelId: string
  channelName: string
  
  // 최근 1달 데이터만 분석
  recentVideos: {
    publishedAt: Date        // 1달 이내 영상만
    title: string
    viewCount: number
    engagementRate: number   // (좋아요+댓글)/조회수
    category: string
    tags: string[]
    location?: string        // 영상 제목/설명에서 추출
  }[]
  
  // 최근 성장 트렌드
  monthlyGrowth: {
    subscriberGrowth: number  // 최근 30일 구독자 증가율
    viewGrowth: number        // 최근 30일 조회수 증가율
    uploadFrequency: number   // 최근 30일 업로드 빈도
  }
  
  // AI 분석 결과
  aiAnalysis: {
    contentQuality: number    // 영상 품질 점수
    audienceEngagement: number // 시청자 참여도
    brandSafety: number       // 브랜드 안전성
    roi Prediction: number    // 예상 ROI
  }
}
```

### 2. AI 분석 엔진

```typescript
class AIMatchingEngine {
  async analyzeCreatorMatch(store: StoreData, creator: RealtimeCreatorData) {
    // 1. 최근 콘텐츠 분석 (1달 이내)
    const recentContent = await this.analyzeRecentContent(creator.recentVideos)
    
    // 2. 시청자 반응 패턴 분석
    const audiencePattern = await this.analyzeAudienceEngagement({
      comments: await this.scrapeRecentComments(creator.channelId),
      likeRatio: creator.recentVideos.map(v => v.engagementRate),
      viewRetention: await this.estimateViewRetention(creator)
    })
    
    // 3. 가게와의 시너지 예측
    const synergy = await this.predictSynergy({
      storeCategory: store.category,
      storeLocation: store.location,
      creatorContent: recentContent,
      audienceOverlap: this.calculateAudienceOverlap(store, creator)
    })
    
    // 4. ROI 예측 모델
    const roiPrediction = await this.predictROI({
      averageViews: this.getRecentAverageViews(creator),
      engagementQuality: audiencePattern.quality,
      conversionProbability: synergy.conversionScore,
      storeCapacity: store.monthlyCustomerCapacity
    })
    
    return {
      matchScore: synergy.score,
      roiPrediction: roiPrediction.value,
      confidence: roiPrediction.confidence,
      reasoning: this.generateReasoning(synergy, roiPrediction)
    }
  }
}
```

### 3. 실시간 YouTube 데이터 수집

```typescript
class YouTubeRealtimeCollector {
  async collectRecentData(searchCriteria: SearchCriteria) {
    // 1. 카테고리/지역 기반 채널 검색
    const channels = await youtube.search.list({
      q: `${searchCriteria.location} ${searchCriteria.category}`,
      type: 'channel',
      order: 'relevance',
      publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30일
      regionCode: 'KR',
      maxResults: 100
    })
    
    // 2. 각 채널의 최근 영상 수집 (1달 이내)
    const recentVideos = await Promise.all(
      channels.map(ch => this.getRecentVideos(ch.id, 30))
    )
    
    // 3. 실시간 통계 수집
    const statistics = await Promise.all(
      channels.map(ch => this.getChannelStatistics(ch.id))
    )
    
    // 4. 댓글 감성 분석 (최근 영상)
    const sentiment = await Promise.all(
      recentVideos.map(videos => this.analyzeCommentSentiment(videos))
    )
    
    return this.combineData(channels, recentVideos, statistics, sentiment)
  }
  
  async getRecentVideos(channelId: string, days: number = 30) {
    const videos = await youtube.search.list({
      channelId: channelId,
      type: 'video',
      order: 'date',
      publishedAfter: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      maxResults: 50
    })
    
    // 상세 통계 가져오기
    const videoDetails = await youtube.videos.list({
      id: videos.map(v => v.id.videoId).join(','),
      part: ['statistics', 'snippet', 'contentDetails']
    })
    
    return videoDetails.map(v => ({
      ...v,
      ageInDays: Math.floor((Date.now() - new Date(v.publishedAt)) / (1000 * 60 * 60 * 24))
    }))
  }
}
```

### 4. OpenAI GPT-4 통합 분석

```typescript
class GPTAnalyzer {
  async analyzeCreatorStoreMatch(store: StoreData, creator: CreatorData) {
    const prompt = `
      가게 정보:
      - 업종: ${store.category}
      - 위치: ${store.location}
      - 특징: ${store.description}
      - 타겟 고객: ${store.targetAudience}
      
      크리에이터 최근 30일 데이터:
      - 채널명: ${creator.channelName}
      - 최근 영상 주제: ${creator.recentVideos.map(v => v.title).join(', ')}
      - 평균 조회수: ${creator.averageViews}
      - 참여율: ${creator.engagementRate}
      - 주요 시청자층: ${creator.audienceDemographics}
      - 콘텐츠 스타일: ${creator.contentStyle}
      
      다음을 분석해주세요:
      1. 이 크리에이터와 가게의 시너지 점수 (0-100)
      2. 예상 마케팅 효과 (구체적 수치)
      3. 추천 이유 (3가지)
      4. 주의사항 또는 리스크
      5. 예상 ROI
    `
    
    const response = await openai.createCompletion({
      model: "gpt-4-turbo-preview",
      prompt,
      temperature: 0.3,
      max_tokens: 1000
    })
    
    return this.parseGPTResponse(response)
  }
  
  async batchAnalyzeCreators(store: StoreData, creators: CreatorData[]) {
    // 병렬 처리로 여러 크리에이터 동시 분석
    const analyses = await Promise.all(
      creators.map(creator => this.analyzeCreatorStoreMatch(store, creator))
    )
    
    // 점수 기준 정렬
    return analyses.sort((a, b) => b.synergyScore - a.synergyScore)
  }
}
```

### 5. 캐싱 전략 (단기 캐싱만)

```typescript
class ShortTermCache {
  // 크리에이터 데이터는 최대 24시간만 캐싱
  async cacheCreatorData(channelId: string, data: CreatorData) {
    await redis.setex(
      `creator:${channelId}`,
      86400, // 24시간
      JSON.stringify({
        ...data,
        cachedAt: new Date(),
        isRealtimeData: true
      })
    )
  }
  
  // 매칭 결과는 1시간만 캐싱 (빠르게 변하는 트렌드 반영)
  async cacheMatchResult(storeId: string, matches: MatchResult[]) {
    await redis.setex(
      `matches:${storeId}`,
      3600, // 1시간
      JSON.stringify({
        matches,
        generatedAt: new Date(),
        dataFreshness: '1hour'
      })
    )
  }
}
```

### 6. 데이터베이스 구조 변경

```typescript
// creators 테이블 제거 - 가입 시스템 없음
// 대신 분석 이력만 저장

interface AnalysisHistory {
  PK: 'ANALYSIS#${analysisId}',
  SK: 'STORE#${storeId}',
  
  // 분석 요청 정보
  storeId: string,
  requestedAt: Date,
  
  // 분석 결과 (크리에이터 정보는 익명화)
  recommendations: {
    channelId: string,  // YouTube 채널 ID만 저장
    score: number,
    roiPrediction: number,
    analysisData: {
      recentPerformance: object,  // 최근 30일 성과
      audienceMatch: number,       // 시청자 매칭도
      contentRelevance: number     // 콘텐츠 관련성
    }
  }[],
  
  // 30일 후 자동 삭제
  ttl: number
}
```

## 구현 플로우

### 1. 스토어 매칭 요청
```typescript
async function requestMatching(storeUrl: string) {
  // 1. SmartPlace에서 가게 정보 스크래핑
  const store = await scrapeSmartPlace(storeUrl)
  
  // 2. YouTube에서 관련 크리에이터 실시간 검색 (최근 30일 활동)
  const creators = await youtube.searchActiveCreators({
    keywords: [...store.keywords, store.location],
    publishedAfter: thirtyDaysAgo(),
    minVideos: 3  // 최근 30일 내 최소 3개 영상
  })
  
  // 3. 각 크리에이터의 최근 데이터 수집
  const creatorData = await Promise.all(
    creators.map(c => collectRecentData(c.channelId))
  )
  
  // 4. AI 분석 (GPT-4 + 자체 알고리즘)
  const analyses = await aiEngine.analyzeMatches(store, creatorData)
  
  // 5. 상위 20개 추천
  return analyses
    .filter(a => a.score > 70)
    .slice(0, 20)
    .map(a => ({
      channelUrl: `https://youtube.com/channel/${a.channelId}`,
      matchScore: a.score,
      expectedROI: a.roi,
      reasoning: a.reasoning,
      recentPerformance: a.performance
    }))
}
```

### 2. 실시간 성과 추적
```typescript
class PerformanceTracker {
  async trackRecommendationPerformance(analysisId: string) {
    const analysis = await getAnalysis(analysisId)
    
    // 추천 후 실제 성과 추적 (영상 조회수, 매장 언급 등)
    for (const recommendation of analysis.recommendations) {
      const performance = await this.measureActualPerformance(
        recommendation.channelId,
        analysis.storeId,
        analysis.requestedAt
      )
      
      // ML 모델 학습용 데이터 저장
      await this.saveForMLTraining({
        predicted: recommendation.roiPrediction,
        actual: performance.actualROI,
        features: recommendation.analysisData
      })
    }
  }
}
```

## 핵심 차별점

### 기존 설계 → 새로운 설계

| 항목 | 기존 | 새로운 접근 |
|------|------|------------|
| 크리에이터 데이터 | DB 저장 | 실시간 API 조회 |
| 데이터 신선도 | 일주일 캐싱 | 최대 24시간, 주로 실시간 |
| 크리에이터 가입 | 필요 | 불필요 |
| 매칭 기준 | 정적 프로필 | 최근 30일 활동 데이터 |
| 분석 방법 | 규칙 기반 | AI/ML 기반 |
| ROI 예측 | 없음 | GPT-4 + ML 모델 |

## 장점

1. **항상 최신 데이터**: 1달 이내 데이터만 사용
2. **객관적 분석**: 실제 성과 데이터 기반
3. **크리에이터 부담 없음**: 가입/프로필 관리 불필요
4. **높은 정확도**: AI가 실시간 트렌드 반영
5. **빠른 매칭**: 가입 대기 없이 즉시 추천

## 비용 최적화

```typescript
// YouTube API 쿼터 관리
const DAILY_QUOTA = 10000
const COST_PER_SEARCH = 100
const COST_PER_VIDEO = 1

// 스마트 쿼터 사용
async function smartQuotaUsage() {
  // 1. 피크 시간 회피
  if (isPeakHour()) {
    return getCachedResults()  // 1시간 캐시 사용
  }
  
  // 2. 배치 처리
  const batchRequests = groupRequests(pendingRequests)
  
  // 3. 필수 데이터만 요청
  const essentialParts = ['statistics', 'snippet']  // contentDetails 제외
  
  return fetchWithQuota(batchRequests, essentialParts)
}
```