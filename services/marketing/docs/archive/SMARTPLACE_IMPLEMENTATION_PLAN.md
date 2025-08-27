# SmartPlace 기반 시스템 구현 계획

## 📁 프로젝트 구조 변경

```
services/marketing/
├── app/
│   ├── page.tsx                    # ✏️ 수정: URL 입력 UI로 변경
│   ├── api/
│   │   ├── smartplace/
│   │   │   └── analyze/
│   │   │       └── route.ts        # ✨ NEW: SmartPlace 분석 API
│   │   ├── creators/
│   │   │   └── match/
│   │   │       └── route.ts        # ✨ NEW: AI 매칭 API
│   │   ├── email/
│   │   │   ├── generate/
│   │   │   │   └── route.ts        # ✨ NEW: 맞춤 템플릿 생성
│   │   │   └── send/
│   │   │       └── route.ts        # ✨ NEW: 이메일 발송
│   │   └── youtube/                # ✅ KEEP: 기존 YouTube API
│
├── lib/
│   ├── smartplace/
│   │   ├── scraper.ts              # ✨ NEW: 네이버 스크래핑
│   │   ├── parser.ts               # ✨ NEW: 데이터 파싱
│   │   └── analyzer.ts             # ✨ NEW: 가게 분석
│   ├── matching/
│   │   ├── engine.ts               # ✨ NEW: 매칭 엔진
│   │   ├── scorer.ts               # ✏️ 수정: 새 매칭 로직
│   │   └── query-builder.ts        # ✨ NEW: 검색 쿼리 생성
│   ├── ai/
│   │   ├── openai-client.ts        # ✨ NEW: OpenAI 통합
│   │   └── prompts.ts              # ✨ NEW: AI 프롬프트
│   └── [기존 파일들...]
│
├── components/
│   ├── SmartPlaceInput.tsx         # ✨ NEW: URL 입력 컴포넌트
│   ├── StoreProfileCard.tsx        # ✨ NEW: 분석 결과 표시
│   ├── CreatorMatchList.tsx        # ✏️ 수정: 매칭 점수 표시
│   ├── MatchDetails.tsx            # ✨ NEW: 매칭 상세 정보
│   └── [기존 컴포넌트들...]
│
└── types/
    ├── smartplace.ts                # ✨ NEW: SmartPlace 타입
    ├── matching.ts                  # ✨ NEW: 매칭 관련 타입
    └── [기존 타입들...]
```

## 🔧 핵심 컴포넌트 상세 설계

### 1. SmartPlace Scraper (`lib/smartplace/scraper.ts`)

```typescript
import { chromium } from 'playwright';

export class SmartPlaceScraper {
  private browser: any;
  
  async initialize() {
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox'] 
    });
  }
  
  async scrapeStore(url: string): Promise<RawSmartPlaceData> {
    const page = await this.browser.newPage();
    await page.goto(url);
    
    // 기본 정보 추출
    const basicInfo = await this.extractBasicInfo(page);
    
    // 메뉴 정보 추출
    const menuInfo = await this.extractMenuInfo(page);
    
    // 리뷰 정보 추출
    const reviews = await this.extractReviews(page);
    
    // 이미지 추출
    const images = await this.extractImages(page);
    
    await page.close();
    
    return {
      basicInfo,
      menuInfo,
      reviews,
      images,
      scrapedAt: new Date()
    };
  }
  
  private async extractBasicInfo(page: any) {
    return await page.evaluate(() => {
      // 가게명, 카테고리, 주소, 전화번호 등 추출
      const name = document.querySelector('.name_selector')?.textContent;
      const category = document.querySelector('.category_selector')?.textContent;
      const address = document.querySelector('.address_selector')?.textContent;
      
      return { name, category, address };
    });
  }
  
  private async extractReviews(page: any) {
    // 리뷰 탭 클릭
    await page.click('.review_tab_selector');
    await page.waitForSelector('.review_item');
    
    return await page.evaluate(() => {
      const reviews = [];
      document.querySelectorAll('.review_item').forEach(item => {
        reviews.push({
          rating: parseFloat(item.querySelector('.rating')?.textContent || '0'),
          text: item.querySelector('.review_text')?.textContent,
          date: item.querySelector('.review_date')?.textContent
        });
      });
      return reviews;
    });
  }
}
```

### 2. Store Analyzer (`lib/smartplace/analyzer.ts`)

```typescript
import natural from 'natural';

export class StoreAnalyzer {
  private tokenizer: any;
  private sentiment: any;
  
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.sentiment = new natural.SentimentAnalyzer('Korean', 
      natural.PorterStemmerKo, 'afinn');
  }
  
  async analyzeStore(data: RawSmartPlaceData): Promise<StoreProfile> {
    // 1. 카테고리 분석
    const categoryAnalysis = this.analyzeCategory(data.basicInfo.category);
    
    // 2. 위치 분석
    const locationAnalysis = this.analyzeLocation(data.basicInfo.address);
    
    // 3. 가격대 분석
    const priceAnalysis = this.analyzePricing(data.menuInfo);
    
    // 4. 리뷰 감성 분석
    const sentimentAnalysis = await this.analyzeSentiment(data.reviews);
    
    // 5. 타겟층 분석
    const demographics = this.analyzeDemographics(data.reviews);
    
    // 6. 키워드 추출
    const keywords = this.extractKeywords(data.reviews);
    
    return {
      name: data.basicInfo.name,
      primaryCategory: categoryAnalysis.primary,
      secondaryCategories: categoryAnalysis.secondary,
      location: locationAnalysis,
      priceAnalysis,
      targetDemographics: demographics,
      sentiment: sentimentAnalysis,
      keywords,
      analyzedAt: new Date()
    };
  }
  
  private async analyzeSentiment(reviews: Review[]): Promise<SentimentAnalysis> {
    const scores = {
      taste: [],
      service: [],
      atmosphere: [],
      value: [],
      cleanliness: []
    };
    
    reviews.forEach(review => {
      const tokens = this.tokenizer.tokenize(review.text);
      
      // 각 측면별 키워드 매칭 및 점수 계산
      if (this.containsKeywords(tokens, ['맛', '음식', '요리'])) {
        scores.taste.push(this.sentiment.getSentiment(tokens));
      }
      if (this.containsKeywords(tokens, ['서비스', '친절', '직원'])) {
        scores.service.push(this.sentiment.getSentiment(tokens));
      }
      // ... 다른 측면들도 동일하게 처리
    });
    
    return {
      overall: this.calculateOverallSentiment(scores),
      aspects: {
        taste: this.average(scores.taste),
        service: this.average(scores.service),
        atmosphere: this.average(scores.atmosphere),
        value: this.average(scores.value),
        cleanliness: this.average(scores.cleanliness)
      }
    };
  }
  
  private analyzeDemographics(reviews: Review[]): TargetDemographics {
    const ageKeywords = {
      '20대': ['20대', '대학생', '젊은', '청춘'],
      '30대': ['30대', '직장인', '회사'],
      '40대': ['40대', '가족', '아이들'],
    };
    
    const interestKeywords = {
      '데이트': ['데이트', '연인', '커플', '분위기'],
      '모임': ['모임', '회식', '단체', '파티'],
      '혼밥': ['혼자', '혼밥', '혼술']
    };
    
    // 리뷰 텍스트 분석하여 연령대와 관심사 추출
    const ageGroups = new Set<string>();
    const interests = new Set<string>();
    
    reviews.forEach(review => {
      const text = review.text.toLowerCase();
      
      Object.entries(ageKeywords).forEach(([age, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          ageGroups.add(age);
        }
      });
      
      Object.entries(interestKeywords).forEach(([interest, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          interests.add(interest);
        }
      });
    });
    
    return {
      ageGroups: Array.from(ageGroups),
      interests: Array.from(interests),
      visitPatterns: this.analyzeVisitPatterns(reviews)
    };
  }
}
```

### 3. AI Matching Engine (`lib/matching/engine.ts`)

```typescript
export class AIMatchingEngine {
  private openai: OpenAIClient;
  private scorer: MatchingScorer;
  
  constructor() {
    this.openai = new OpenAIClient();
    this.scorer = new MatchingScorer();
  }
  
  async findMatches(
    storeProfile: StoreProfile, 
    options?: MatchOptions
  ): Promise<CreatorMatch[]> {
    // 1. 검색 쿼리 생성
    const queries = await this.generateSearchQueries(storeProfile);
    
    // 2. YouTube에서 크리에이터 검색
    const creators = await this.searchCreators(queries);
    
    // 3. 각 크리에이터와 매칭 점수 계산
    const matches = await Promise.all(
      creators.map(async (creator) => {
        const matchScore = await this.calculateMatchScore(
          storeProfile, 
          creator
        );
        
        return {
          creator,
          matchScore: matchScore.total,
          matchDetails: matchScore.details,
          reasoning: matchScore.reasoning
        };
      })
    );
    
    // 4. 점수 기준 정렬
    return matches
      .filter(m => m.matchScore >= (options?.minScore || 60))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, options?.maxResults || 20);
  }
  
  private async generateSearchQueries(
    profile: StoreProfile
  ): Promise<string[]> {
    // AI를 활용한 스마트 쿼리 생성
    const prompt = `
      가게 정보:
      - 카테고리: ${profile.primaryCategory}
      - 위치: ${profile.location.district}
      - 타겟: ${profile.targetDemographics.ageGroups.join(', ')}
      - 특징: ${profile.keywords.experience.join(', ')}
      
      이 가게를 리뷰하기 적합한 YouTube 크리에이터를 찾기 위한 
      검색 쿼리 5개를 생성해주세요.
    `;
    
    const response = await this.openai.complete(prompt);
    return response.queries;
  }
  
  private async calculateMatchScore(
    store: StoreProfile,
    creator: Creator
  ): Promise<MatchResult> {
    const criteria: MatchingCriteria = {
      categoryMatch: this.scorer.scoreCategoryMatch(store, creator),
      locationMatch: this.scorer.scoreLocationMatch(store, creator),
      audienceMatch: this.scorer.scoreAudienceMatch(store, creator),
      styleMatch: await this.scorer.scoreStyleMatch(store, creator),
      influence: this.scorer.scoreInfluence(creator)
    };
    
    const total = this.scorer.calculateTotal(criteria);
    
    // AI로 매칭 이유 생성
    const reasoning = await this.generateMatchReasoning(
      store, 
      creator, 
      criteria
    );
    
    return {
      total,
      details: criteria,
      reasoning
    };
  }
  
  private async generateMatchReasoning(
    store: StoreProfile,
    creator: Creator,
    criteria: MatchingCriteria
  ): Promise<string> {
    const prompt = `
      가게 "${store.name}"와 크리에이터 "${creator.channelName}"의 
      매칭 점수는 ${criteria}입니다.
      
      이 매칭이 좋은 이유를 2-3문장으로 설명해주세요.
      특히 강점과 시너지 효과를 중심으로 작성해주세요.
    `;
    
    return await this.openai.complete(prompt);
  }
}
```

### 4. UI 컴포넌트 (`components/SmartPlaceInput.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SmartPlaceInput({ onAnalyze }) {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const validateUrl = (url: string) => {
    return url.includes('naver.com') && 
           (url.includes('/restaurant/') || url.includes('/place/'));
  };
  
  const handleSubmit = async () => {
    if (!validateUrl(url)) {
      setError('올바른 네이버 스마트플레이스 URL을 입력해주세요');
      return;
    }
    
    setIsAnalyzing(true);
    setError('');
    
    try {
      const response = await fetch('/api/smartplace/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      onAnalyze(data.storeProfile);
    } catch (err) {
      setError('분석 중 오류가 발생했습니다');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold mb-4">
          AI 크리에이터 매칭 시스템
        </h1>
        <p className="text-gray-600">
          네이버 스마트플레이스 URL만 입력하면 
          최적의 크리에이터를 자동으로 찾아드립니다
        </p>
      </motion.div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            스마트플레이스 URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://map.naver.com/v5/entry/place/..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={isAnalyzing}
          />
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={isAnalyzing || !url}
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              분석 중... (약 30초 소요)
            </span>
          ) : (
            '가게 분석 시작'
          )}
        </button>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">💡 사용 방법</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. 네이버에서 내 가게 검색</li>
            <li>2. 스마트플레이스 페이지 URL 복사</li>
            <li>3. 위 입력창에 붙여넣기</li>
            <li>4. AI가 자동으로 분석 후 크리에이터 추천</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
```

## 🚀 구현 단계별 계획

### Week 1: 기초 인프라
- [ ] Playwright 설정 및 스크래핑 테스트
- [ ] SmartPlace 데이터 모델 정의
- [ ] 기본 스크래퍼 구현 (이름, 카테고리, 주소)
- [ ] URL 입력 UI 구현

### Week 2: 데이터 수집 확장
- [ ] 메뉴 정보 스크래핑
- [ ] 리뷰 데이터 스크래핑
- [ ] 이미지 수집
- [ ] 데이터 정규화 및 저장

### Week 3: 분석 엔진
- [ ] 감성 분석 구현
- [ ] 타겟층 분석 구현
- [ ] 키워드 추출
- [ ] Store Profile 생성

### Week 4: 매칭 시스템
- [ ] 매칭 점수 알고리즘 구현
- [ ] 검색 쿼리 자동 생성
- [ ] 크리에이터 필터링
- [ ] 결과 UI 구현

### Week 5: AI 통합
- [ ] OpenAI API 연동
- [ ] 스마트 쿼리 생성
- [ ] 매칭 이유 생성
- [ ] 맞춤 템플릿 생성

### Week 6: 최적화 및 테스트
- [ ] 성능 최적화
- [ ] 에러 처리
- [ ] 통합 테스트
- [ ] 배포 준비

## 📊 성공 지표

- **분석 정확도**: Store Profile 정확도 90% 이상
- **매칭 품질**: 사용자 만족도 80% 이상
- **처리 시간**: 전체 프로세스 1분 이내
- **전환율**: 추천 크리에이터 응답률 10% 이상