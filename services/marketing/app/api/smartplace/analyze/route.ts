/**
 * SmartPlace Analysis API
 * POST /api/smartplace/analyze
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SmartPlaceScraper, getScraperInstance } from '@/lib/smartplace/scraper';
import { SmartPlaceAnalyzer } from '@/lib/smartplace/analyzer';
import { ValidationError, handleError } from '@/lib/errors';

// 요청 스키마
const requestSchema = z.object({
  url: z.string().url('올바른 URL 형식이 아닙니다'),
  options: z.object({
    includeReviews: z.boolean().optional(),
    maxReviews: z.number().min(1).max(100).optional(),
    includeImages: z.boolean().optional(),
    deepAnalysis: z.boolean().optional()
  }).optional()
});

// 캐시 저장소 (임시 - 추후 Redis로 교체)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

export async function POST(request: NextRequest) {
  try {
    // 요청 검증
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: '잘못된 요청 형식',
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }
    
    const { url, options = {} } = validation.data;
    
    // URL 유효성 검증
    if (!SmartPlaceScraper.validateUrl(url)) {
      return NextResponse.json(
        { 
          error: '네이버 스마트플레이스 URL이 아닙니다',
          message: '올바른 네이버 플레이스 URL을 입력해주세요' 
        },
        { status: 400 }
      );
    }
    
    // 캐시 확인
    const cacheKey = `smartplace:${url}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for:', url);
      return NextResponse.json({
        ...cached.data,
        cached: true
      });
    }
    
    console.log('Starting analysis for:', url);
    
    // 스크래핑 시작
    let scraper: SmartPlaceScraper | null = null;
    
    try {
      scraper = await getScraperInstance();
      
      // 데이터 수집
      console.log('Scraping data...');
      const rawData = await scraper.scrapeStore(url, {
        includeReviews: options.includeReviews ?? true,
        maxReviews: options.maxReviews ?? 30,
        includeImages: options.includeImages ?? true,
        includeMenu: true
      });
      
      // 데이터 분석
      console.log('Analyzing data...');
      const analyzer = new SmartPlaceAnalyzer();
      const storeProfile = await analyzer.analyzeStore(
        rawData,
        url,
        {
          deepAnalysis: options.deepAnalysis ?? true,
          sentimentAnalysis: true,
          demographicAnalysis: true,
          keywordExtraction: true
        }
      );
      
      // 결과 캐싱
      const result = {
        success: true,
        storeProfile,
        rawData: process.env.NODE_ENV === 'development' ? rawData : undefined,
        analyzedAt: new Date().toISOString()
      };
      
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      console.log('Analysis completed successfully');
      
      return NextResponse.json(result);
      
    } catch (scrapingError: any) {
      console.error('Scraping/Analysis error:', scrapingError);
      
      // 스크래핑 실패 시 재시도
      if (scrapingError.message?.includes('timeout')) {
        return NextResponse.json(
          { 
            error: '페이지 로딩 시간 초과',
            message: '네트워크 상태를 확인하고 다시 시도해주세요',
            details: scrapingError.message
          },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { 
          error: '분석 실패',
          message: '데이터를 수집하는 중 오류가 발생했습니다',
          details: scrapingError.message 
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('API error:', error);
    const handledError = handleError(error);
    
    return NextResponse.json(
      { 
        error: handledError.message,
        statusCode: handledError.statusCode,
        timestamp: handledError.timestamp
      },
      { status: handledError.statusCode }
    );
  }
}

// GET 메서드 - 캐시 상태 확인
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({
      cacheSize: cache.size,
      message: 'Provide ?url=... to check specific cache'
    });
  }
  
  const cacheKey = `smartplace:${url}`;
  const cached = cache.get(cacheKey);
  
  return NextResponse.json({
    cached: !!cached,
    timestamp: cached?.timestamp,
    age: cached ? Date.now() - cached.timestamp : null
  });
}