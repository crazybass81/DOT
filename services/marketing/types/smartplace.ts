/**
 * SmartPlace 관련 타입 정의
 */

// 네이버 스마트플레이스에서 수집한 원시 데이터
export interface RawSmartPlaceData {
  basicInfo: {
    name: string;
    category: string;
    address: string;
    phoneNumber?: string;
    businessHours?: string;
    description?: string;
  };
  
  menuInfo: Array<{
    name: string;
    price: string;
    description?: string;
    imageUrl?: string;
  }>;
  
  reviews: Array<{
    rating: number;
    text: string;
    date: string;
    visitedDate?: string;
    keywords?: string[];
  }>;
  
  statistics: {
    averageRating: number;
    totalReviews: number;
    visitorReviews: number;
    blogReviews: number;
  };
  
  images: {
    main?: string;
    interior: string[];
    menu: string[];
    exterior: string[];
  };
  
  scrapedAt: Date;
}

// 분석된 가게 프로필
export interface StoreProfile {
  // 기본 정보
  name: string;
  url: string;
  
  // 카테고리 분석
  primaryCategory: string;
  secondaryCategories: string[];
  
  // 위치 분석
  location: {
    fullAddress: string;
    city: string;
    district: string;
    neighborhood?: string;
    nearbyLandmarks?: string[];
  };
  
  // 가격대 분석
  priceAnalysis: {
    range: { min: number; max: number };
    level: 'budget' | 'moderate' | 'premium' | 'luxury';
    averageSpending: number;
  };
  
  // 타겟 고객층 분석 (리뷰 기반)
  targetDemographics: {
    ageGroups: string[];       // ["20대", "30대"]
    interests: string[];       // ["데이트", "모임", "혼술"]
    visitPatterns: string[];   // ["저녁", "주말", "심야"]
  };
  
  // 분위기 분석
  atmosphere: {
    style: string[];           // ["모던", "캐주얼", "아늑한"]
    noise: 'quiet' | 'moderate' | 'lively';
    suitable: string[];        // ["데이트", "가족모임", "회식"]
  };
  
  // 강점 분석
  strengths: {
    menuHighlights: string[];  // 인기 메뉴
    serviceFeatures: string[]; // 서비스 특징
    uniquePoints: string[];    // 차별화 포인트
  };
  
  // 감성 분석
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number; // 0-100
    aspects: {
      taste: number;
      service: number;
      atmosphere: number;
      value: number;
      cleanliness: number;
    };
  };
  
  // 키워드 추출
  keywords: {
    menu: string[];
    experience: string[];
    hashtags: string[];
  };
  
  // 메타데이터
  metadata: {
    totalReviews: number;
    averageRating: number;
    lastAnalyzed: Date;
    dataQuality: 'high' | 'medium' | 'low';
  };
}

// 스크래핑 옵션
export interface ScrapeOptions {
  includeReviews?: boolean;
  maxReviews?: number;
  includeImages?: boolean;
  includeMenu?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

// 분석 옵션
export interface AnalysisOptions {
  deepAnalysis?: boolean;
  sentimentAnalysis?: boolean;
  demographicAnalysis?: boolean;
  keywordExtraction?: boolean;
}