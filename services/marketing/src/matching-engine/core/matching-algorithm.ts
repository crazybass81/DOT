import {
  StoreProfile,
  Creator,
  MatchingCriteria,
  MatchingResult,
  MatchingOptions,
} from '../types';

export class MatchingAlgorithm {
  private readonly DEFAULT_WEIGHTS = {
    category: 0.30,
    location: 0.20,
    audience: 0.25,
    style: 0.15,
    influence: 0.10,
  };

  calculateMatchScore(
    store: StoreProfile,
    creator: Creator,
    options?: MatchingOptions
  ): MatchingResult {
    const weights = options?.weights || this.DEFAULT_WEIGHTS;
    
    const criteria: MatchingCriteria = {
      categoryMatch: this.calculateCategoryMatch(store, creator),
      locationMatch: this.calculateLocationMatch(store, creator),
      audienceMatch: this.calculateAudienceMatch(store, creator),
      styleMatch: this.calculateStyleMatch(store, creator),
      influence: this.calculateInfluenceScore(creator),
      bonus: this.calculateBonusScore(store, creator),
    };

    const matchScore = this.calculateWeightedScore(criteria, weights);
    const confidence = this.determineConfidence(matchScore, criteria);
    const reasoning = this.generateReasoning(store, creator, criteria);
    const collaboration = this.generateCollaborationSuggestion(store, creator, matchScore);
    const template = this.generateTemplateRecommendation(store, creator, matchScore);

    return {
      creator,
      matchScore,
      matchDetails: criteria,
      confidence,
      reasoning,
      collaboration,
      template,
    };
  }

  private calculateCategoryMatch(
    store: StoreProfile,
    creator: Creator
  ): MatchingCriteria['categoryMatch'] {
    const storeCategories = [
      store.primaryCategory,
      ...store.secondaryCategories,
    ].map(c => c.toLowerCase());

    const creatorCategories = [
      creator.content.primaryCategory,
      ...creator.content.categories,
    ].map(c => c.toLowerCase());

    const exact = storeCategories.some(sc => creatorCategories.includes(sc));
    const related = this.calculateCategorySimilarity(storeCategories, creatorCategories);
    const foodKeywords = ['음식', '맛집', '푸드', '먹방', '리뷰', 'food', 'restaurant'];
    const hasRelevantContent = creatorCategories.some(cat =>
      foodKeywords.some(keyword => cat.includes(keyword))
    );

    const relevanceScore = exact ? 100 : related * 100;
    const matchedCategories = storeCategories.filter(sc =>
      creatorCategories.some(cc => this.areCategoriesRelated(sc, cc))
    );

    return {
      exact,
      related,
      relevanceScore,
      matchedCategories,
      score: exact ? 100 : Math.min(100, relevanceScore + (hasRelevantContent ? 20 : 0)),
    };
  }

  private calculateLocationMatch(
    store: StoreProfile,
    creator: Creator
  ): MatchingCriteria['locationMatch'] {
    const storeLocation = store.location;
    const creatorRegions = creator.coverage.primaryRegions;
    const creatorLocations = creator.coverage.frequentLocations;

    const sameCity = creatorRegions.some(region =>
      region.includes(storeLocation.city)
    );
    
    const sameDistrict = creatorLocations.some(location =>
      location.includes(storeLocation.district)
    );

    const frequencyInArea = this.calculateAreaFrequency(storeLocation, creatorLocations);

    let score = 0;
    if (sameDistrict) score = 100;
    else if (sameCity) score = 70;
    else if (this.isNearbyArea(storeLocation, creatorRegions)) score = 40;
    else score = 20;

    return {
      sameDistrict,
      sameCity,
      coverage: creatorRegions,
      frequencyInArea,
      score,
    };
  }

  private calculateAudienceMatch(
    store: StoreProfile,
    creator: Creator
  ): MatchingCriteria['audienceMatch'] {
    const storeAudience = store.targetDemographics;
    const creatorAudience = creator.audience;

    const ageOverlap = this.calculateArrayOverlap(
      storeAudience.ageGroups,
      creatorAudience.demographics.ageRange
    );

    const interestOverlap = this.calculateArrayOverlap(
      storeAudience.interests,
      creatorAudience.interests
    );

    const genderMatch = this.checkGenderMatch(
      storeAudience.primaryGender,
      creatorAudience.demographics.primaryGender
    );

    const occasionMatch = storeAudience.occasions.filter(occasion =>
      this.isOccasionRelevant(occasion, creator.content.categories)
    );

    const score = (ageOverlap * 0.3 + interestOverlap * 0.4 + 
                  (genderMatch ? 20 : 0) + occasionMatch.length * 10);

    return {
      ageOverlap,
      interestOverlap,
      genderMatch,
      occasionMatch,
      score: Math.min(100, score),
    };
  }

  private calculateStyleMatch(
    store: StoreProfile,
    creator: Creator
  ): MatchingCriteria['styleMatch'] {
    const contentStyle = creator.content.contentStyle;
    const production = creator.content.productionQuality;
    const atmosphereFit = this.calculateAtmosphereFit(store.atmosphere, creator.content);
    const brandFit = this.calculateBrandFit(store.marketingPotential, creator.content);

    return {
      contentType: contentStyle,
      production,
      atmosphereFit,
      brandFit,
      score: (atmosphereFit * 0.5 + brandFit * 0.5),
    };
  }

  private calculateInfluenceScore(creator: Creator): MatchingCriteria['influence'] {
    const stats = creator.statistics;
    const subscriberScore = Math.min(100, Math.log10(stats.subscribers + 1) * 20);
    const viewScore = Math.min(100, Math.log10(stats.avgViews + 1) * 20);
    const engagementScore = Math.min(100, stats.engagementRate * 10);
    const growthScore = Math.min(100, (stats.growthRate || 0) * 100);
    const authorityScore = this.calculateAuthorityScore(creator);

    const score = (
      subscriberScore * 0.2 +
      viewScore * 0.2 +
      engagementScore * 0.3 +
      growthScore * 0.1 +
      authorityScore * 0.2
    );

    return {
      subscribers: stats.subscribers,
      avgViews: stats.avgViews,
      engagement: stats.engagementRate,
      growth: stats.growthRate || 0,
      authorityScore,
      score: Math.min(100, score),
    };
  }

  private calculateBonusScore(
    store: StoreProfile,
    creator: Creator
  ): MatchingCriteria['bonus'] {
    const now = new Date();
    const lastUpload = new Date(creator.recentActivity.lastUpload);
    const daysSinceUpload = Math.floor(
      (now.getTime() - lastUpload.getTime()) / (1000 * 60 * 60 * 24)
    );

    const recentActivity = daysSinceUpload <= 7 ? 100 :
                          daysSinceUpload <= 30 ? 70 :
                          daysSinceUpload <= 90 ? 40 : 10;

    const localExpertise = this.calculateLocalExpertise(store, creator);
    const trendAlignment = this.calculateTrendAlignment(store, creator);
    const previousSuccess = creator.collaboration.brandDeals > 10 ? 80 :
                           creator.collaboration.brandDeals > 5 ? 60 :
                           creator.collaboration.brandDeals > 0 ? 40 : 20;

    const score = (
      recentActivity * 0.3 +
      localExpertise * 0.3 +
      trendAlignment * 0.2 +
      previousSuccess * 0.2
    );

    return {
      recentActivity,
      localExpertise,
      trendAlignment,
      previousSuccess,
      score: Math.min(100, score),
    };
  }

  private calculateWeightedScore(
    criteria: MatchingCriteria,
    weights: MatchingOptions['weights']
  ): number {
    const w = weights || this.DEFAULT_WEIGHTS;
    
    let totalScore = 
      criteria.categoryMatch.score * w.category! +
      criteria.locationMatch.score * w.location! +
      criteria.audienceMatch.score * w.audience! +
      criteria.styleMatch.score * w.style! +
      criteria.influence.score * w.influence!;

    if (criteria.bonus) {
      totalScore += criteria.bonus.score * 0.05;
    }

    return Math.min(100, Math.round(totalScore));
  }

  private determineConfidence(
    score: number,
    criteria: MatchingCriteria
  ): 'high' | 'medium' | 'low' {
    if (score >= 80 && criteria.categoryMatch.exact) return 'high';
    if (score >= 60 && criteria.locationMatch.sameCity) return 'medium';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private generateReasoning(
    store: StoreProfile,
    creator: Creator,
    criteria: MatchingCriteria
  ): MatchingResult['reasoning'] {
    const strengths: string[] = [];
    const opportunities: string[] = [];
    const risks: string[] = [];

    if (criteria.categoryMatch.exact) {
      strengths.push(`정확한 카테고리 매칭: ${store.primaryCategory} 전문 크리에이터`);
    }
    if (criteria.locationMatch.sameDistrict) {
      strengths.push(`같은 지역 활동: ${store.location.district} 지역 전문성`);
    }
    if (criteria.audienceMatch.score > 80) {
      strengths.push(`높은 타겟층 일치도: ${criteria.audienceMatch.score}%`);
    }
    if (criteria.influence.engagement > 5) {
      strengths.push(`우수한 참여율: ${criteria.influence.engagement}%`);
    }

    if (creator.statistics.growthRate && creator.statistics.growthRate > 0.1) {
      opportunities.push(`빠른 성장세: 월 ${(creator.statistics.growthRate * 100).toFixed(1)}% 성장`);
    }
    if (criteria.bonus?.trendAlignment > 70) {
      opportunities.push('현재 트렌드와 높은 부합도');
    }

    if (criteria.bonus?.recentActivity < 50) {
      risks.push('최근 활동 빈도 낮음');
    }
    if (!criteria.categoryMatch.exact && criteria.categoryMatch.score < 50) {
      risks.push('카테고리 전문성 부족');
    }

    return { strengths, opportunities, risks };
  }

  private generateCollaborationSuggestion(
    store: StoreProfile,
    creator: Creator,
    matchScore: number
  ): MatchingResult['collaboration'] {
    let campaignType = '맛집 리뷰';
    let estimatedReach = creator.statistics.avgViews;
    let expectedEngagement = creator.statistics.avgViews * (creator.statistics.engagementRate / 100);

    if (matchScore >= 80) {
      campaignType = '브랜드 앰배서더 프로그램';
      estimatedReach *= 1.5;
    } else if (matchScore >= 60) {
      campaignType = '단독 리뷰 콘텐츠';
    } else {
      campaignType = '방문 체험 리뷰';
    }

    const recommendedBudget = this.calculateRecommendedBudget(
      creator.statistics.subscribers,
      creator.statistics.engagementRate
    );

    return {
      suggestedCampaignType: campaignType,
      estimatedReach: Math.round(estimatedReach),
      expectedEngagement: Math.round(expectedEngagement),
      recommendedBudget,
    };
  }

  private generateTemplateRecommendation(
    store: StoreProfile,
    creator: Creator,
    matchScore: number
  ): MatchingResult['template'] {
    const approach = matchScore >= 70 ? 'professional' :
                    matchScore >= 40 ? 'friendly' : 'casual';

    const keyPoints = [
      `${store.storeName}의 특별함을 소개`,
      `${store.strengths.menuHighlights.join(', ')} 강점 강조`,
    ];

    const personalizedHooks = [
      `${creator.channelName}님의 ${creator.content.primaryCategory} 콘텐츠 팬입니다`,
    ];

    if (creator.recentActivity.recentTopics && creator.recentActivity.recentTopics.length > 0) {
      personalizedHooks.push(`특히 ${creator.recentActivity.recentTopics[0]} 콘텐츠가 인상적이었습니다`);
    }

    const callToAction = matchScore >= 60
      ? '협업 제안을 드리고 싶습니다'
      : '한 번 방문해주시면 감사하겠습니다';

    return {
      approach,
      keyPoints,
      personalizedHooks,
      callToAction,
    };
  }

  private calculateCategorySimilarity(cat1: string[], cat2: string[]): number {
    const intersection = cat1.filter(c => cat2.includes(c));
    const union = [...new Set([...cat1, ...cat2])];
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  private areCategoriesRelated(cat1: string, cat2: string): boolean {
    const relatedTerms: Record<string, string[]> = {
      '치킨': ['음식', '맛집', '푸드', '먹방', '리뷰'],
      '한식': ['음식', '맛집', '푸드', '전통', '리뷰'],
      '카페': ['디저트', '커피', '음료', '브런치', '분위기'],
    };

    return cat1 === cat2 || 
           relatedTerms[cat1]?.includes(cat2) || 
           relatedTerms[cat2]?.includes(cat1) || false;
  }

  private calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;
    const intersection = arr1.filter(item => arr2.includes(item));
    return (intersection.length / Math.max(arr1.length, arr2.length)) * 100;
  }

  private checkGenderMatch(
    storeGender?: 'male' | 'female' | 'neutral',
    creatorGender?: 'male' | 'female' | 'mixed'
  ): boolean {
    if (!storeGender || !creatorGender) return true;
    if (storeGender === 'neutral' || creatorGender === 'mixed') return true;
    return storeGender === creatorGender;
  }

  private calculateAreaFrequency(
    storeLocation: StoreProfile['location'],
    creatorLocations: string[]
  ): number {
    const mentions = creatorLocations.filter(loc =>
      loc.includes(storeLocation.district) || loc.includes(storeLocation.neighborhood)
    );
    return Math.min(100, mentions.length * 20);
  }

  private isNearbyArea(
    storeLocation: StoreProfile['location'],
    regions: string[]
  ): boolean {
    const nearbyDistricts: Record<string, string[]> = {
      '강남구': ['서초구', '송파구', '강동구'],
      '종로구': ['중구', '성북구', '서대문구'],
      '마포구': ['서대문구', '용산구', '은평구'],
    };

    return regions.some(region => 
      nearbyDistricts[storeLocation.district]?.some(nearby => region.includes(nearby))
    );
  }

  private isOccasionRelevant(occasion: string, categories: string[]): boolean {
    const occasionMap: Record<string, string[]> = {
      '데이트': ['로맨틱', '분위기', '커플', '데이트'],
      '가족모임': ['가족', '패밀리', '모임', '단체'],
      '회식': ['회식', '술', '안주', '단체'],
    };

    return categories.some(cat => 
      occasionMap[occasion]?.some(keyword => cat.includes(keyword))
    );
  }

  private calculateAtmosphereFit(
    atmosphere: StoreProfile['atmosphere'],
    content: Creator['content']
  ): number {
    const styleMap: Record<string, number> = {
      'professional': atmosphere.style.includes('모던') ? 90 : 60,
      'semi-pro': 80,
      'casual': atmosphere.style.includes('캐주얼') ? 90 : 70,
    };

    return styleMap[content.productionQuality] || 50;
  }

  private calculateBrandFit(
    marketing: StoreProfile['marketingPotential'],
    content: Creator['content']
  ): number {
    if (marketing.instagrammability > 80 && content.contentStyle === 'vlog') return 90;
    if (marketing.contentOpportunities.includes('리뷰') && content.contentStyle === 'review') return 95;
    return 70;
  }

  private calculateAuthorityScore(creator: Creator): number {
    const factors = [
      creator.collaboration.brandDeals > 10 ? 30 : 15,
      creator.statistics.totalVideos > 100 ? 20 : 10,
      creator.statistics.engagementRate > 5 ? 25 : 10,
      creator.content.productionQuality === 'professional' ? 25 : 15,
    ];
    return factors.reduce((a, b) => a + b, 0);
  }

  private calculateLocalExpertise(store: StoreProfile, creator: Creator): number {
    const locationMentions = creator.coverage.frequentLocations.filter(loc =>
      loc.includes(store.location.district)
    ).length;
    
    return Math.min(100, locationMentions * 25);
  }

  private calculateTrendAlignment(store: StoreProfile, creator: Creator): number {
    const trendKeywords = ['숏폼', '릴스', 'shorts', 'MZ', '힙한', '핫플'];
    const creatorTrends = creator.recentActivity.recentTopics.filter(topic =>
      trendKeywords.some(keyword => topic.toLowerCase().includes(keyword))
    );
    
    return Math.min(100, creatorTrends.length * 30);
  }

  private calculateRecommendedBudget(
    subscribers: number,
    engagementRate: number
  ): { min: number; max: number } {
    const baseRate = subscribers < 10000 ? 500000 :
                    subscribers < 50000 ? 1000000 :
                    subscribers < 100000 ? 2000000 :
                    subscribers < 500000 ? 5000000 : 10000000;

    const engagementMultiplier = engagementRate > 10 ? 1.5 :
                                 engagementRate > 5 ? 1.2 : 1;

    return {
      min: Math.round(baseRate * 0.7 * engagementMultiplier),
      max: Math.round(baseRate * 1.3 * engagementMultiplier),
    };
  }
}