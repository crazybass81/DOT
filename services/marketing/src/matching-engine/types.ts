// 네이버 스마트플레이스 데이터 타입
export interface SmartPlaceData {
  // 기본 정보
  name: string;
  category: string;
  address: string;
  phoneNumber: string;
  url: string;
  placeId: string;
  
  // 영업 정보
  businessHours: {
    [day: string]: { 
      open: string; 
      close: string; 
      breakTime?: { start: string; end: string; };
      lastOrder?: string;
    };
  };
  
  // 메뉴/상품 정보
  menuItems: Array<{
    name: string;
    price: number;
    description: string;
    imageUrl: string;
    isPopular?: boolean;
    isRecommended?: boolean;
  }>;
  
  // 리뷰 데이터
  reviews: Array<{
    rating: number;
    text: string;
    date: Date;
    keywords: string[];
    images?: string[];
    visitType?: string; // 방문, 배달, 포장
    helpfulCount?: number;
  }>;
  
  // 통계 정보
  statistics: {
    averageRating: number;
    totalReviews: number;
    visitorReviews: number;
    blogReviews: number;
    bookmarkCount?: number;
  };
  
  // 이미지
  images: {
    main: string;
    interior: string[];
    menu: string[];
    atmosphere: string[];
    exterior?: string[];
  };
  
  // 추가 정보
  features?: string[]; // 주차, 와이파이, 반려동물, 예약, 단체석 등
  hashtags?: string[];
  description?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    blog?: string;
  };
}

// 가게 프로필 (분석된 데이터)
export interface StoreProfile {
  // 기본 식별자
  storeId: string;
  storeName: string;
  sourceUrl: string;
  analyzedAt: Date;
  
  // 카테고리 분석
  primaryCategory: string;
  secondaryCategories: string[];
  cuisineType?: string; // 한식, 중식, 일식, 양식 등
  
  // 위치 분석
  location: {
    fullAddress: string;
    city: string;
    district: string;
    neighborhood: string;
    nearbyLandmarks: string[];
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    businessArea?: string; // 상권 분석
  };
  
  // 가격대 분석
  priceAnalysis: {
    range: { min: number; max: number; };
    level: 'budget' | 'moderate' | 'premium' | 'luxury';
    averageSpending: number;
    pricePerPerson?: number;
  };
  
  // 타겟 고객층 분석
  targetDemographics: {
    ageGroups: string[];
    primaryGender?: 'male' | 'female' | 'neutral';
    interests: string[];
    visitPatterns: string[];
    occasions: string[]; // 데이트, 가족모임, 회식, 혼밥 등
  };
  
  // 분위기 분석
  atmosphere: {
    style: string[];
    noise: 'quiet' | 'moderate' | 'lively';
    suitable: string[];
    ambience?: string[];
    musicType?: string;
  };
  
  // 강점 분석
  strengths: {
    menuHighlights: string[];
    signatureItems?: string[];
    serviceFeatures: string[];
    uniquePoints: string[];
    competitiveAdvantages?: string[];
  };
  
  // 감성 분석
  sentiment: {
    overall: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
    trend: 'improving' | 'stable' | 'declining';
    aspects: {
      taste: number;
      service: number;
      atmosphere: number;
      value: number;
      cleanliness: number;
      portion?: number;
      waiting?: number;
    };
  };
  
  // 키워드 추출
  keywords: {
    menu: string[];
    experience: string[];
    hashtags: string[];
    trending?: string[];
    negative?: string[]; // 개선이 필요한 부분
  };
  
  // 마케팅 포텐셜
  marketingPotential: {
    instagrammability: number; // 0-100
    contentOpportunities: string[];
    promotionIdeas: string[];
    targetChannels: string[];
  };
  
  // 경쟁 분석
  competitiveAnalysis?: {
    nearbyCompetitors: number;
    marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
    differentiators: string[];
  };
}

// 크리에이터 정보
export interface Creator {
  // 기본 정보
  creatorId: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'blog';
  
  // 채널 통계
  statistics: {
    subscribers: number;
    totalViews: number;
    totalVideos: number;
    avgViews: number;
    avgLikes: number;
    avgComments: number;
    engagementRate: number;
    growthRate?: number; // 월간 성장률
  };
  
  // 콘텐츠 분석
  content: {
    primaryCategory: string;
    categories: string[];
    contentStyle: 'review' | 'mukbang' | 'vlog' | 'shorts' | 'documentary' | 'entertainment';
    productionQuality: 'professional' | 'semi-pro' | 'casual';
    uploadFrequency: string; // 주 n회
    averageDuration?: number; // 평균 영상 길이
    language: string[];
  };
  
  // 오디언스 분석
  audience: {
    demographics: {
      ageRange: string[];
      primaryGender?: 'male' | 'female' | 'mixed';
      geoLocation: string[];
    };
    interests: string[];
    peakViewingTimes?: string[];
  };
  
  // 활동 지역
  coverage: {
    primaryRegions: string[];
    frequentLocations: string[];
    travelFrequency?: string;
  };
  
  // 협업 이력
  collaboration: {
    brandDeals: number;
    restaurantReviews: number;
    preferredBrands?: string[];
    avgSponsorshipRate?: number;
    previousPartners?: string[];
  };
  
  // 연락처 정보
  contact?: {
    email?: string;
    businessEmail?: string;
    agency?: string;
    preferredContactMethod?: string;
  };
  
  // 최근 활동
  recentActivity: {
    lastUpload: Date;
    recentTopics: string[];
    trendingVideos?: Array<{
      title: string;
      views: number;
      uploadDate: Date;
    }>;
  };
}

// 매칭 기준
export interface MatchingCriteria {
  // 카테고리 매칭 (30%)
  categoryMatch: {
    exact: boolean;
    related: number;
    relevanceScore: number;
    matchedCategories: string[];
    score: number;
  };
  
  // 지역 매칭 (20%)
  locationMatch: {
    sameDistrict: boolean;
    sameCity: boolean;
    distance?: number; // km
    coverage: string[];
    frequencyInArea: number;
    score: number;
  };
  
  // 타겟층 매칭 (25%)
  audienceMatch: {
    ageOverlap: number;
    interestOverlap: number;
    genderMatch: boolean;
    occasionMatch: string[];
    score: number;
  };
  
  // 콘텐츠 스타일 매칭 (15%)
  styleMatch: {
    contentType: string;
    production: string;
    atmosphereFit: number;
    brandFit: number;
    score: number;
  };
  
  // 영향력 지수 (10%)
  influence: {
    subscribers: number;
    avgViews: number;
    engagement: number;
    growth: number;
    authorityScore: number;
    score: number;
  };
  
  // 추가 보너스 점수
  bonus?: {
    recentActivity: number; // 최근 활동성
    localExpertise: number; // 지역 전문성
    trendAlignment: number; // 트렌드 부합도
    previousSuccess: number; // 이전 협업 성공률
    score: number;
  };
}

// 매칭 결과
export interface MatchingResult {
  creator: Creator;
  matchScore: number;
  matchDetails: MatchingCriteria;
  confidence: 'high' | 'medium' | 'low';
  
  // 매칭 근거
  reasoning: {
    strengths: string[];
    opportunities: string[];
    risks?: string[];
  };
  
  // 협업 제안
  collaboration: {
    suggestedCampaignType: string;
    estimatedReach: number;
    expectedEngagement: number;
    recommendedBudget?: {
      min: number;
      max: number;
    };
  };
  
  // 맞춤 템플릿 정보
  template: {
    approach: 'professional' | 'casual' | 'friendly';
    keyPoints: string[];
    personalizedHooks: string[];
    callToAction: string;
  };
}

// 매칭 옵션
export interface MatchingOptions {
  // 필터 옵션
  filters?: {
    minSubscribers?: number;
    maxSubscribers?: number;
    minEngagementRate?: number;
    contentStyle?: string[];
    excludeCategories?: string[];
    requiredLanguages?: string[];
  };
  
  // 검색 옵션
  search?: {
    maxResults?: number;
    searchRadius?: number; // km
    includeNearbyAreas?: boolean;
    prioritizeLocal?: boolean;
  };
  
  // 가중치 커스터마이징
  weights?: {
    category?: number;
    location?: number;
    audience?: number;
    style?: number;
    influence?: number;
  };
  
  // 고급 옵션
  advanced?: {
    includeInactive?: boolean; // 비활성 크리에이터 포함
    includeNewCreators?: boolean; // 신규 크리에이터 포함
    includeMicroInfluencers?: boolean; // 마이크로 인플루언서 포함
    useAIRecommendation?: boolean;
  };
}

// 스크래핑 상태
export interface ScrapingStatus {
  status: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  message?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// 캐시 데이터
export interface CachedData {
  url: string;
  data: SmartPlaceData | StoreProfile;
  cachedAt: Date;
  expiresAt: Date;
  version: string;
}

// API 응답 타입들
export interface AnalyzeResponse {
  success: boolean;
  storeProfile: StoreProfile;
  analyzedAt: Date;
  processingTime: number;
  confidence: number;
}

export interface MatchResponse {
  success: boolean;
  results: MatchingResult[];
  totalFound: number;
  searchQueries: string[];
  processingTime: number;
}

export interface EmailTemplateResponse {
  success: boolean;
  template: string;
  subject: string;
  personalization: {
    mentionPoints: string[];
    commonInterests: string[];
    proposalType: string;
    estimatedResponseRate: number;
  };
}