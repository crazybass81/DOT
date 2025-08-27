/**
 * OAuth-based Analysis API
 * Uses user's Google account for YouTube API quota
 * Combined with server Google Maps API key for places
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { z } from 'zod';
import { GooglePlacesService } from '@/lib/google/places-service';
import { YouTubeOAuthService } from '@/lib/google/youtube-oauth-service';
import { ProposalGenerator } from '@/lib/proposal/proposal-generator';

// Request schema
const requestSchema = z.object({
  input: z.string().min(1, 'Input is required'),
  type: z.enum(['url', 'search']).default('search'),
});

// 매칭 점수 계산 - 개선된 로직
function calculateMatchScore(
  place: any,
  channel: any
): number {
  let score = 0;
  
  // 카테고리 매칭 (40%) - 더 넓은 매칭
  const placeCategory = place.category?.toLowerCase() || '';
  const channelDesc = channel.description?.toLowerCase() || '';
  const channelTitle = channel.title?.toLowerCase() || '';
  const combined = `${channelDesc} ${channelTitle}`;
  
  // 음식 관련 키워드들 - 더 많은 키워드 추가
  const foodKeywords = ['먹방', '맛집', '음식', '리뷰', 'food', '요리', '푸드', '브이로그', 'vlog', '일상', '먹스타그램', '먹부림', '맛스타그램', '푸디', 'foodie', '미식', 'restaurant', '레스토랑', '식당', '먹거리'];
  const cafeKeywords = ['카페', '디저트', 'coffee', '베이커리', '브런치', '커피', '케이크', '빵', 'dessert', '카페투어'];
  
  let categoryMatch = false;
  
  // 음식점 매칭
  if (placeCategory.includes('음식') || placeCategory.includes('restaurant') || placeCategory.includes('기타')) {
    for (const keyword of foodKeywords) {
      if (combined.includes(keyword)) {
        categoryMatch = true;
        break;
      }
    }
    if (categoryMatch) score += 40;
  }
  
  // 카페 매칭
  if (placeCategory.includes('카페') || placeCategory.includes('cafe')) {
    for (const keyword of cafeKeywords) {
      if (combined.includes(keyword)) {
        categoryMatch = true;
        break;
      }
    }
    if (categoryMatch) score += 40;
  }
  
  // 일반 음식 콘텐츠도 부분 점수
  if (!categoryMatch) {
    for (const keyword of foodKeywords) {
      if (combined.includes(keyword)) {
        score += 30; // 부분 점수 증가
        break;
      }
    }
  }
  
  // 추가 보너스: 여러 키워드 매칭 시
  let keywordCount = 0;
  for (const keyword of [...foodKeywords, ...cafeKeywords]) {
    if (combined.includes(keyword)) {
      keywordCount++;
    }
  }
  if (keywordCount > 2) score += 10; // 여러 키워드 매칭 보너스
  
  // 구독자 수 (20%)
  const subscribers = parseInt(channel.statistics?.subscriberCount || '0');
  if (subscribers > 1000000) score += 20;
  else if (subscribers > 100000) score += 15;
  else if (subscribers > 10000) score += 10;
  else if (subscribers > 1000) score += 5;
  else if (subscribers > 100) score += 3;
  
  // 활성도 (20%)
  const videoCount = parseInt(channel.statistics?.videoCount || '0');
  if (videoCount > 500) score += 20;
  else if (videoCount > 100) score += 15;
  else if (videoCount > 50) score += 10;
  else if (videoCount > 10) score += 5;
  else score += 2;
  
  // 지역/언어 매칭 (20%)
  if (channel.country === 'KR') score += 10;
  if (combined.includes('한국') || combined.includes('korea')) score += 5;
  if (combined.includes(place.address?.split(' ')[0] || '')) score += 5;
  
  return Math.min(score, 100);
}

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: '로그인이 필요합니다. Google 계정으로 로그인해주세요.' },
        { status: 401 }
      );
    }
    
    // Request validation
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: '잘못된 요청 형식', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { input, type } = validation.data;
    
    console.log('🚀 OAuth-based analysis starting:', { input, type });
    
    // Step 1: Get place information
    const placesService = new GooglePlacesService();
    let placeData;
    
    if (type === 'url' && input.includes('google.com/maps')) {
      // Extract place ID from URL
      const placeId = placesService.extractPlaceId(input);
      if (placeId) {
        placeData = await placesService.getPlaceDetails(placeId);
      } else {
        // Fallback to search
        const results = await placesService.searchPlace(input);
        placeData = results[0];
      }
    } else {
      // Text search
      const results = await placesService.searchPlace(input);
      placeData = results[0];
    }
    
    if (!placeData) {
      return NextResponse.json(
        { error: '장소를 찾을 수 없습니다. 다른 검색어를 시도해주세요.' },
        { status: 404 }
      );
    }
    
    // Step 2: Extract store profile
    const storeProfile = {
      name: placeData.name,
      category: placesService.mapPlaceTypeToCategory(placeData.types || []),
      address: placeData.formatted_address,
      phone: placeData.formatted_phone_number,
      website: placeData.website,
      rating: placeData.rating,
      reviewCount: placeData.user_ratings_total,
      priceLevel: placesService.getPriceLevelText(placeData.price_level),
      location: placeData.geometry?.location,
      businessStatus: placeData.business_status,
      keywords: [
        placeData.name,
        ...placeData.types?.slice(0, 3) || [],
      ].filter(Boolean),
    };
    
    // Step 3: Search YouTube creators using user's OAuth token
    const youtubeService = new YouTubeOAuthService(session.accessToken);
    
    // Search queries based on store profile - API 호출 최적화 (할당량 절약)
    const searchQueries = [
      `${storeProfile.category} 맛집 유튜버`,  // 가장 관련성 높은 검색어
      '맛집 먹방 유튜버',  // 일반적인 푸드 크리에이터
      `${storeProfile.address.split(' ')[0]} 맛집`, // 지역 기반
    ];
    
    const allChannels = new Map();
    
    let successfulSearches = 0;
    let failedSearches = 0;
    
    for (const query of searchQueries) {
      try {
        console.log(`🔍 Searching YouTube for: "${query}"`);
        const channels = await youtubeService.searchChannels(query, {
          maxResults: 50,  // 더 많은 결과를 한 번에
          regionCode: 'KR',
        });
        
        if (channels && channels.length > 0) {
          successfulSearches++;
          console.log(`✅ Found ${channels.length} channels for "${query}"`);
        }
        
        // De-duplicate channels
        for (const channel of channels) {
          if (!allChannels.has(channel.id)) {
            const matchScore = calculateMatchScore(storeProfile, channel);
            allChannels.set(channel.id, {
              ...channel,
              matchScore,
            });
            console.log(`📊 Channel "${channel.title}" - Match Score: ${matchScore}%`);
          }
        }
      } catch (error: any) {
        failedSearches++;
        console.error(`❌ Search failed for query "${query}":`, error.message);
        
        // If quota exceeded, stop searching
        if (error.message?.includes('quotaExceeded')) {
          console.error('⚠️ YouTube quota exceeded, stopping search');
          break;
        }
      }
    }
    
    console.log(`📈 Search Summary: ${successfulSearches} successful, ${failedSearches} failed, ${allChannels.size} unique channels found`);
    
    // Sort by match score
    const sortedCreators = Array.from(allChannels.values())
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);
    
    // If no creators found, try a generic search as fallback
    if (sortedCreators.length === 0) {
      console.log('⚠️ No creators found with specific queries, trying generic search...');
      try {
        const genericChannels = await youtubeService.searchChannels('맛집 유튜버', {
          maxResults: 20,
          regionCode: 'KR',
        });
        
        for (const channel of genericChannels) {
          const matchScore = calculateMatchScore(storeProfile, channel);
          sortedCreators.push({
            ...channel,
            matchScore,
          });
        }
        
        sortedCreators.sort((a, b) => b.matchScore - a.matchScore);
        console.log(`📊 Added ${genericChannels.length} creators from generic search`);
      } catch (error) {
        console.error('Generic search also failed:', error);
      }
    }
    
    // Step 4: Calculate quota usage
    const quotaUsed = youtubeService.calculateQuotaCost('search', searchQueries.length) +
                     youtubeService.calculateQuotaCost('details', allChannels.size);
    
    const quotaInfo = youtubeService.estimateRemainingQuota(
      (session.quotaInfo?.youtube.used || 0) + quotaUsed
    );
    
    // Step 5: Generate proposals for top creators
    const proposalGenerator = new ProposalGenerator();
    
    // Format response with proposals
    const response = {
      success: true,
      store: storeProfile,
      creators: sortedCreators.map(creator => {
        // 제안서 생성
        const proposal = proposalGenerator.generateEmailProposal({
          store: {
            name: storeProfile.name,
            category: storeProfile.category,
            address: storeProfile.address,
          },
          creator: {
            name: creator.title,
            subscribers: creator.statistics?.subscriberCount || '0',
            email: creator.businessEmail,
            category: creator.topicCategories?.[0],
          },
          matchScore: creator.matchScore,
        });
        
        return {
          id: creator.id,
          name: creator.title,
          description: creator.description?.substring(0, 200),
          thumbnail: creator.thumbnails.medium || creator.thumbnails.default,
          subscribers: creator.statistics?.subscriberCount || '0',
          videoCount: creator.statistics?.videoCount || '0',
          viewCount: creator.statistics?.viewCount || '0',
          matchScore: creator.matchScore,
          matchReasons: [
            creator.matchScore >= 80 ? '높은 관련성' : '보통 관련성',
            parseInt(creator.statistics?.subscriberCount || '0') > 100000 ? '대형 채널' : '성장 채널',
          ],
          businessEmail: creator.businessEmail,
          socialLinks: creator.socialLinks,
          recentVideos: creator.recentVideos,
          proposal: proposal,
        };
      }),
      quotaUsage: {
        used: quotaUsed,
        remaining: quotaInfo.remaining,
        canSearchMore: quotaInfo.canSearch,
        dailyLimit: 10000,
      },
      analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`✅ Analysis complete: Found ${sortedCreators.length} creators`);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Analysis error:', error);
    
    // Check for quota exceeded
    if (error.message?.includes('quotaExceeded')) {
      return NextResponse.json(
        { 
          error: '일일 API 할당량을 초과했습니다. 내일 다시 시도해주세요.',
          resetTime: new Date().setHours(24, 0, 0, 0),
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        error: '분석 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET - Session check endpoint
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    authenticated: true,
    user: {
      name: session.user?.name,
      email: session.user?.email,
      image: session.user?.image,
    },
    quotaInfo: session.quotaInfo,
  });
}