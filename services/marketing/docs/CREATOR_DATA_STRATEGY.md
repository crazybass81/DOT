# Creator Data Management Strategy

## Overview

DOT Marketing 서비스는 모든 YouTube 크리에이터를 DynamoDB에 저장하지 **않습니다**. 대신 효율적인 하이브리드 접근 방식을 사용합니다.

## 데이터 저장 전략

### 1. DynamoDB에 저장되는 크리에이터

#### 등록된 파트너 크리에이터
```typescript
// creators 테이블에 영구 저장
{
  creatorId: "creator_123",
  channelId: "@foodcreator",
  email: "creator@example.com",
  status: "verified",
  joinedAt: "2024-01-20",
  preferences: {
    categories: ["food", "restaurant"],
    locations: ["서울", "경기"],
    minBudget: 500000
  }
}
```

**저장 기준:**
- 플랫폼에 직접 가입한 크리에이터
- 이메일 인증 완료
- 프로필 정보 제공
- 캠페인 참여 의사 확인

#### 캠페인 참여 이력이 있는 크리에이터
- 과거 캠페인 참여자
- 성과 데이터 보유
- 재참여 가능성 높음

### 2. 실시간 YouTube API 검색

#### 동적 크리에이터 발견
```typescript
async findCreators(criteria: SearchCriteria) {
  // YouTube Data API v3 실시간 검색
  const results = await youtube.search.list({
    part: ['snippet'],
    q: criteria.keywords,
    type: 'channel',
    regionCode: 'KR',
    maxResults: 50,
    order: 'relevance'
  });
  
  // 채널 상세 정보 조회
  const channels = await youtube.channels.list({
    part: ['statistics', 'snippet', 'contentDetails'],
    id: results.map(r => r.id.channelId)
  });
  
  return channels;
}
```

**검색 시나리오:**
- 새로운 매칭 요청 시
- 특정 카테고리/지역 크리에이터 검색
- 트렌딩 크리에이터 발견

### 3. 지능형 캐싱 시스템

#### 캐싱 레이어 구조
```
┌─────────────────────────────────┐
│     요청 (Store URL)            │
└────────────┬────────────────────┘
             ▼
┌─────────────────────────────────┐
│   1차: Redis 캐시 (1시간)       │ ← 빠른 응답
└────────────┬────────────────────┘
             ▼ (캐시 미스)
┌─────────────────────────────────┐
│   2차: DynamoDB 캐시 (24시간)   │ ← 중간 속도
└────────────┬────────────────────┘
             ▼ (캐시 미스)
┌─────────────────────────────────┐
│   3차: YouTube API 실시간 조회   │ ← 최신 데이터
└─────────────────────────────────┘
```

#### DynamoDB 캐시 테이블
```typescript
// scraping-cache 테이블
{
  PK: "CACHE#youtube",
  SK: "CHANNEL#@foodcreator",
  data: {
    channelId: "UC...",
    title: "맛집 탐방러",
    subscriberCount: 45000,
    videoCount: 234,
    viewCount: 5600000,
    categories: ["food", "review"],
    location: "서울",
    lastVideoDate: "2024-01-19"
  },
  ttl: 1705756800, // 24시간 후 자동 삭제
  cachedAt: "2024-01-20T10:00:00Z"
}
```

### 4. 데이터 수집 우선순위

#### 레벨 1: 즉시 저장 (DynamoDB)
- 플랫폼 가입 크리에이터
- 캠페인 참여 확정자
- VIP/프리미엄 파트너

#### 레벨 2: 임시 캐싱 (24-72시간)
- 매칭 알고리즘 검색 결과
- 스토어가 관심 표시한 크리에이터
- 높은 매치 스코어 (80점 이상)

#### 레벨 3: 실시간 조회만
- 일반 검색 결과
- 낮은 매치 스코어
- 일회성 조회

## 구현 세부사항

### YouTube API 쿼터 관리
```typescript
class YouTubeQuotaManager {
  private dailyQuota = 10000; // YouTube API 일일 할당량
  private usedQuota = 0;
  
  async searchWithQuotaCheck(params: SearchParams) {
    const estimatedCost = this.calculateCost(params);
    
    if (this.usedQuota + estimatedCost > this.dailyQuota * 0.8) {
      // 80% 도달 시 캐시 우선 사용
      return this.searchFromCache(params);
    }
    
    return this.searchFromAPI(params);
  }
  
  calculateCost(params: SearchParams): number {
    // search.list = 100 units
    // channels.list = 1 unit per channel
    return 100 + params.maxResults;
  }
}
```

### 데이터 신선도 전략
```typescript
interface DataFreshnessPolicy {
  registeredCreators: {
    updateFrequency: 'weekly',
    ttl: 604800 // 7일
  },
  searchResults: {
    updateFrequency: 'daily',
    ttl: 86400 // 24시간
  },
  trendingCreators: {
    updateFrequency: 'hourly',
    ttl: 3600 // 1시간
  }
}
```

## 비용 최적화

### DynamoDB 비용 절감
1. **On-Demand 모드**: 예측 불가능한 트래픽 패턴
2. **TTL 활용**: 자동 데이터 정리
3. **선택적 저장**: 필요한 크리에이터만 저장

### YouTube API 비용 관리
1. **캐싱 최대화**: 24시간 캐시로 API 호출 90% 감소
2. **배치 요청**: 여러 채널 정보 한 번에 조회
3. **필드 선택**: 필요한 데이터만 요청

## 실제 사용 예시

### 시나리오 1: 새 스토어 매칭
```typescript
async function matchStore(storeUrl: string) {
  // 1. 등록된 크리에이터 먼저 검색
  const registeredCreators = await creatorRepo.findByCategory(
    store.category
  );
  
  // 2. 부족하면 YouTube API 검색
  if (registeredCreators.length < 10) {
    const youtubeCreators = await youtube.searchChannels({
      keywords: store.keywords,
      location: store.location,
      limit: 20
    });
    
    // 3. 고득점자만 캐시에 저장
    const highScoreCreators = youtubeCreators.filter(
      c => calculateScore(c, store) > 70
    );
    
    await cache.batchSave(highScoreCreators, TTL_24H);
  }
  
  return combineResults(registeredCreators, youtubeCreators);
}
```

### 시나리오 2: 크리에이터 상세 조회
```typescript
async function getCreatorDetails(channelId: string) {
  // 1. 등록된 크리에이터인지 확인
  const registered = await creatorRepo.findByChannelId(channelId);
  if (registered) return registered;
  
  // 2. 캐시 확인
  const cached = await cache.get(`channel:${channelId}`);
  if (cached && !isExpired(cached)) return cached;
  
  // 3. YouTube API 실시간 조회
  const fresh = await youtube.getChannel(channelId);
  
  // 4. 캐시 업데이트
  await cache.set(`channel:${channelId}`, fresh, TTL_24H);
  
  return fresh;
}
```

## 장점

1. **비용 효율성**: 불필요한 데이터 저장 방지
2. **데이터 신선도**: 실시간 API로 최신 정보 보장
3. **확장성**: 크리에이터 수 증가에도 유연하게 대응
4. **성능**: 캐싱으로 빠른 응답 시간

## 단점 및 해결책

| 단점 | 해결책 |
|-----|--------|
| YouTube API 할당량 제한 | 지능형 캐싱, 오프피크 시간 활용 |
| 실시간 조회 지연 | Redis 캐싱, 백그라운드 프리페칭 |
| 데이터 일관성 | TTL 기반 자동 갱신, 웹훅 연동 |

## 향후 개선 계획

### Phase 1 (현재)
- ✅ 기본 캐싱 시스템
- ✅ YouTube API 통합
- ✅ 선택적 크리에이터 저장

### Phase 2 (Q2 2024)
- GraphQL 구독으로 실시간 업데이트
- Instagram, TikTok API 통합
- ML 기반 크리에이터 추천

### Phase 3 (Q3 2024)
- 크리에이터 데이터 레이크 구축
- 예측 분석 기반 프리페칭
- 분산 캐싱 시스템