/**
 * SmartPlace Analyzer
 * 수집된 데이터를 분석하여 StoreProfile 생성
 */

import { 
  RawSmartPlaceData, 
  StoreProfile,
  AnalysisOptions 
} from '@/types/smartplace';
import { SmartPlaceParser } from './parser';

export class SmartPlaceAnalyzer {
  private readonly DEFAULT_OPTIONS: AnalysisOptions = {
    deepAnalysis: true,
    sentimentAnalysis: true,
    demographicAnalysis: true,
    keywordExtraction: true
  };

  /**
   * 가게 데이터 분석
   */
  async analyzeStore(
    data: RawSmartPlaceData,
    url: string,
    options: AnalysisOptions = {}
  ): Promise<StoreProfile> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // 카테고리 분석
    const categoryAnalysis = this.analyzeCategory(data.basicInfo.category);
    
    // 위치 분석
    const locationAnalysis = this.analyzeLocation(data.basicInfo.address);
    
    // 가격 분석
    const priceAnalysis = this.analyzePricing(data.menuInfo);
    
    // 타겟층 분석
    const demographics = opts.demographicAnalysis 
      ? this.analyzeDemographics(data.reviews)
      : { ageGroups: [], interests: [], visitPatterns: [] };
    
    // 분위기 분석
    const atmosphere = this.analyzeAtmosphere(data.reviews);
    
    // 강점 분석
    const strengths = this.analyzeStrengths(data);
    
    // 감성 분석
    const sentiment = opts.sentimentAnalysis
      ? this.analyzeSentiment(data.reviews)
      : this.getDefaultSentiment();
    
    // 키워드 추출
    const keywords = opts.keywordExtraction
      ? this.extractKeywords(data)
      : { menu: [], experience: [], hashtags: [] };
    
    // 메타데이터
    const metadata = {
      totalReviews: data.statistics.totalReviews,
      averageRating: data.statistics.averageRating,
      lastAnalyzed: new Date(),
      dataQuality: this.assessDataQuality(data)
    };

    return {
      name: data.basicInfo.name,
      url,
      primaryCategory: categoryAnalysis.primary,
      secondaryCategories: categoryAnalysis.secondary,
      location: locationAnalysis,
      priceAnalysis,
      targetDemographics: demographics,
      atmosphere,
      strengths,
      sentiment,
      keywords,
      metadata
    };
  }

  /**
   * 카테고리 분석
   */
  private analyzeCategory(category: string): {
    primary: string;
    secondary: string[];
  } {
    return SmartPlaceParser.normalizeCategory(category);
  }

  /**
   * 위치 분석
   */
  private analyzeLocation(address: string): StoreProfile['location'] {
    const parsed = SmartPlaceParser.parseAddress(address);
    
    // 주요 랜드마크 추출 (향후 구현)
    const nearbyLandmarks = this.extractLandmarks(address);
    
    return {
      fullAddress: address,
      city: parsed.city,
      district: parsed.district,
      neighborhood: parsed.neighborhood,
      nearbyLandmarks
    };
  }

  /**
   * 랜드마크 추출
   */
  private extractLandmarks(address: string): string[] {
    const landmarks: string[] = [];
    
    const landmarkPatterns = [
      { pattern: /강남역/, landmark: '강남역' },
      { pattern: /홍대/, landmark: '홍대입구역' },
      { pattern: /명동/, landmark: '명동' },
      { pattern: /이태원/, landmark: '이태원' },
      { pattern: /성수/, landmark: '성수동' }
    ];
    
    landmarkPatterns.forEach(({ pattern, landmark }) => {
      if (pattern.test(address)) {
        landmarks.push(landmark);
      }
    });
    
    return landmarks;
  }

  /**
   * 가격 분석
   */
  private analyzePricing(menuItems: Array<{ price: string }>): StoreProfile['priceAnalysis'] {
    const prices = menuItems
      .map(item => SmartPlaceParser.parsePrice(item.price))
      .filter(price => price > 0);
    
    if (prices.length === 0) {
      return {
        range: { min: 0, max: 0 },
        level: 'moderate',
        averageSpending: 0
      };
    }
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    return {
      range: { min, max },
      level: SmartPlaceParser.determinePriceLevel(prices),
      averageSpending: Math.round(average)
    };
  }

  /**
   * 타겟층 분석
   */
  private analyzeDemographics(
    reviews: Array<{ text: string; date: string; visitedDate?: string }>
  ): StoreProfile['targetDemographics'] {
    const reviewTexts = reviews.map(r => r.text);
    
    return {
      ageGroups: SmartPlaceParser.extractAgeGroups(reviewTexts),
      interests: SmartPlaceParser.extractVisitPurpose(reviewTexts),
      visitPatterns: SmartPlaceParser.analyzePopularTimes(reviews)
    };
  }

  /**
   * 분위기 분석
   */
  private analyzeAtmosphere(
    reviews: Array<{ text: string }>
  ): StoreProfile['atmosphere'] {
    const reviewTexts = reviews.map(r => r.text).join(' ');
    
    // 스타일 분석
    const styles: string[] = [];
    const stylePatterns = [
      { pattern: /모던|현대적|세련/, style: '모던' },
      { pattern: /아늑|편안|따뜻/, style: '아늑한' },
      { pattern: /캐주얼|편한|부담없/, style: '캐주얼' },
      { pattern: /고급|럭셔리|프리미엄/, style: '고급스러운' },
      { pattern: /전통|한옥|고풍/, style: '전통적인' },
      { pattern: /힙|트렌디|인스타/, style: '트렌디한' }
    ];
    
    stylePatterns.forEach(({ pattern, style }) => {
      if (pattern.test(reviewTexts)) {
        styles.push(style);
      }
    });
    
    // 소음 레벨 분석
    let noise: 'quiet' | 'moderate' | 'lively' = 'moderate';
    if (reviewTexts.includes('조용') || reviewTexts.includes('조용한')) {
      noise = 'quiet';
    } else if (reviewTexts.includes('시끄럽') || reviewTexts.includes('활기')) {
      noise = 'lively';
    }
    
    // 적합한 용도
    const suitable = SmartPlaceParser.extractVisitPurpose(reviews.map(r => r.text));
    
    return {
      style: styles.length > 0 ? styles : ['일반적인'],
      noise,
      suitable
    };
  }

  /**
   * 강점 분석
   */
  private analyzeStrengths(data: RawSmartPlaceData): StoreProfile['strengths'] {
    // 인기 메뉴 추출 (리뷰에서 자주 언급된 메뉴)
    const menuHighlights = this.extractPopularMenus(data);
    
    // 서비스 특징 추출
    const serviceFeatures = this.extractServiceFeatures(data.reviews);
    
    // 차별화 포인트 추출
    const uniquePoints = this.extractUniquePoints(data);
    
    return {
      menuHighlights,
      serviceFeatures,
      uniquePoints
    };
  }

  /**
   * 인기 메뉴 추출
   */
  private extractPopularMenus(data: RawSmartPlaceData): string[] {
    const menuMentions: Record<string, number> = {};
    
    // 리뷰에서 메뉴명 언급 횟수 계산
    data.menuInfo.forEach(menu => {
      const menuName = menu.name;
      let count = 0;
      
      data.reviews.forEach(review => {
        if (review.text.includes(menuName)) {
          count++;
        }
      });
      
      if (count > 0) {
        menuMentions[menuName] = count;
      }
    });
    
    // 상위 3개 메뉴 반환
    return Object.entries(menuMentions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([menu]) => menu);
  }

  /**
   * 서비스 특징 추출
   */
  private extractServiceFeatures(reviews: Array<{ text: string }>): string[] {
    const features = new Set<string>();
    const reviewText = reviews.map(r => r.text).join(' ');
    
    const featurePatterns = [
      { pattern: /친절/, feature: '친절한 서비스' },
      { pattern: /빠른|빨리/, feature: '빠른 서비스' },
      { pattern: /포장|테이크아웃/, feature: '포장 가능' },
      { pattern: /배달/, feature: '배달 가능' },
      { pattern: /주차/, feature: '주차 가능' },
      { pattern: /예약/, feature: '예약 가능' },
      { pattern: /24시|새벽/, feature: '24시간/심야 영업' },
      { pattern: /와이파이|wifi/i, feature: '와이파이' }
    ];
    
    featurePatterns.forEach(({ pattern, feature }) => {
      if (pattern.test(reviewText)) {
        features.add(feature);
      }
    });
    
    return Array.from(features);
  }

  /**
   * 차별화 포인트 추출
   */
  private extractUniquePoints(data: RawSmartPlaceData): string[] {
    const points = new Set<string>();
    const reviewText = data.reviews.map(r => r.text).join(' ');
    
    const uniquePatterns = [
      { pattern: /수제|홈메이드|직접/, point: '수제' },
      { pattern: /특제|시그니처|비법/, point: '시그니처 메뉴' },
      { pattern: /인스타|포토/, point: '인스타그래머블' },
      { pattern: /뷰|전망|루프탑/, point: '전망' },
      { pattern: /무한리필|리필/, point: '무한리필' },
      { pattern: /유기농|친환경/, point: '친환경 재료' },
      { pattern: /미슐랭|맛집인증/, point: '인증 맛집' }
    ];
    
    uniquePatterns.forEach(({ pattern, point }) => {
      if (pattern.test(reviewText)) {
        points.add(point);
      }
    });
    
    return Array.from(points);
  }

  /**
   * 감성 분석
   */
  private analyzeSentiment(
    reviews: Array<{ text: string; rating: number }>
  ): StoreProfile['sentiment'] {
    let totalScore = 0;
    const aspects = {
      taste: 0,
      service: 0,
      atmosphere: 0,
      value: 0,
      cleanliness: 0
    };
    
    const aspectCounts = { ...aspects };
    
    reviews.forEach(review => {
      const sentiment = SmartPlaceParser.extractSentimentKeywords(review.text);
      const baseScore = (review.rating / 5) * 100;
      
      // 긍정/부정 키워드로 점수 조정
      const adjustment = 
        (sentiment.positive.length * 5) - 
        (sentiment.negative.length * 10);
      
      const score = Math.max(0, Math.min(100, baseScore + adjustment));
      totalScore += score;
      
      // 각 측면별 점수 계산
      if (review.text.includes('맛') || review.text.includes('음식')) {
        aspects.taste += score;
        aspectCounts.taste++;
      }
      if (review.text.includes('서비스') || review.text.includes('직원')) {
        aspects.service += score;
        aspectCounts.service++;
      }
      if (review.text.includes('분위기') || review.text.includes('인테리어')) {
        aspects.atmosphere += score;
        aspectCounts.atmosphere++;
      }
      if (review.text.includes('가격') || review.text.includes('가성비')) {
        aspects.value += score;
        aspectCounts.value++;
      }
      if (review.text.includes('청결') || review.text.includes('깨끗')) {
        aspects.cleanliness += score;
        aspectCounts.cleanliness++;
      }
    });
    
    // 평균 계산
    const averageScore = reviews.length > 0 ? totalScore / reviews.length : 50;
    
    Object.keys(aspects).forEach(key => {
      const aspect = key as keyof typeof aspects;
      if (aspectCounts[aspect] > 0) {
        aspects[aspect] = Math.round(aspects[aspect] / aspectCounts[aspect]);
      } else {
        aspects[aspect] = Math.round(averageScore);
      }
    });
    
    return {
      overall: averageScore >= 70 ? 'positive' : averageScore >= 40 ? 'neutral' : 'negative',
      score: Math.round(averageScore),
      aspects
    };
  }

  /**
   * 키워드 추출
   */
  private extractKeywords(data: RawSmartPlaceData): StoreProfile['keywords'] {
    // 메뉴 키워드
    const menuKeywords = data.menuInfo
      .slice(0, 5)
      .map(item => item.name.split(' ')[0])
      .filter((v, i, a) => a.indexOf(v) === i);
    
    // 경험 키워드
    const experienceKeywords = new Set<string>();
    const reviewText = data.reviews.map(r => r.text).join(' ');
    
    const experiencePatterns = [
      '맛있다', '분위기좋다', '친절하다', '깨끗하다',
      '가성비좋다', '추천한다', '재방문의사', '만족'
    ];
    
    experiencePatterns.forEach(keyword => {
      if (reviewText.includes(keyword)) {
        experienceKeywords.add(keyword);
      }
    });
    
    // 해시태그 생성
    const hashtags = this.generateHashtags(data);
    
    return {
      menu: menuKeywords,
      experience: Array.from(experienceKeywords),
      hashtags
    };
  }

  /**
   * 해시태그 생성
   */
  private generateHashtags(data: RawSmartPlaceData): string[] {
    const hashtags: string[] = [];
    
    // 지역 + 카테고리
    const location = SmartPlaceParser.parseAddress(data.basicInfo.address);
    hashtags.push(`#${location.district}${data.basicInfo.category}`);
    hashtags.push(`#${location.district}맛집`);
    
    // 카테고리
    const category = SmartPlaceParser.normalizeCategory(data.basicInfo.category);
    hashtags.push(`#${category.primary}`);
    
    // 특징
    if (data.reviews.some(r => r.text.includes('데이트'))) {
      hashtags.push('#데이트맛집');
    }
    
    return hashtags.slice(0, 5);
  }

  /**
   * 데이터 품질 평가
   */
  private assessDataQuality(data: RawSmartPlaceData): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // 기본 정보 완성도
    if (data.basicInfo.name) score += 10;
    if (data.basicInfo.category) score += 10;
    if (data.basicInfo.address) score += 10;
    if (data.basicInfo.businessHours) score += 5;
    
    // 메뉴 정보
    if (data.menuInfo.length > 0) score += 15;
    if (data.menuInfo.length > 5) score += 10;
    
    // 리뷰 정보
    if (data.reviews.length > 0) score += 15;
    if (data.reviews.length > 10) score += 10;
    
    // 이미지 정보
    if (data.images.main) score += 5;
    if (data.images.interior.length > 0) score += 5;
    if (data.images.menu.length > 0) score += 5;
    
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * 기본 감성 분석 결과
   */
  private getDefaultSentiment(): StoreProfile['sentiment'] {
    return {
      overall: 'neutral',
      score: 50,
      aspects: {
        taste: 50,
        service: 50,
        atmosphere: 50,
        value: 50,
        cleanliness: 50
      }
    };
  }
}