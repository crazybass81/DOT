/**
 * Main Analysis API - Simplified MVP
 * POST /api/analyze
 * 
 * Accepts SmartPlace URL and returns YouTube creator matches
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SmartPlaceScraper, getScraperInstance } from '@/lib/smartplace/scraper';
import { SmartPlaceAnalyzer } from '@/lib/smartplace/analyzer';
import { BrowserScraper } from '@/lib/smartplace/browser-scraper';
import { ValidationError, handleError } from '@/lib/errors';
import { YouTubeCreatorMatcher } from '@/lib/matching/creator-matcher';
import { AnalysisStorage, AnalysisResult } from '@/lib/storage/analysis-storage';

// Request schema
const requestSchema = z.object({
  url: z.string().url('올바른 URL 형식이 아닙니다'),
  options: z.object({
    includeReviews: z.boolean().optional(),
    maxReviews: z.number().min(1).max(100).optional(),
    deepAnalysis: z.boolean().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request
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
    
    // Validate SmartPlace URL
    if (!SmartPlaceScraper.validateUrl(url)) {
      return NextResponse.json(
        { 
          error: '네이버 스마트플레이스 URL이 아닙니다',
          message: '올바른 네이버 플레이스 URL을 입력해주세요' 
        },
        { status: 400 }
      );
    }
    
    console.log('🚀 Starting analysis for:', url);
    
    // Step 1: Browser-based Scraping of SmartPlace data
    let rawData;
    const browserScraper = new BrowserScraper();
    
    try {
      console.log('🌐 Starting browser-based scraping...');
      
      // 브라우저 기반 스크래핑 사용
      rawData = await browserScraper.scrapeFromUrl(url);
      
      // Step 2: Analyze store data
      console.log('🔍 Analyzing store profile...');
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
      
      // Step 3: Find matching YouTube creators
      console.log('🎯 Finding matching creators...');
      const matcher = new YouTubeCreatorMatcher();
      const creatorMatches = await matcher.findMatches(storeProfile, {
        maxResults: 20,
        minScore: 60
      });
      
      // Step 4: Generate analysis ID and store result
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result: AnalysisResult = {
        analysisId,
        storeProfile: {
          name: storeProfile.name,
          category: storeProfile.primaryCategory,
          location: storeProfile.location,
          priceLevel: storeProfile.priceAnalysis.level,
          keywords: storeProfile.keywords,
          sentiment: storeProfile.sentiment
        },
        creatorMatches: creatorMatches.map(match => ({
          channelId: match.channelId,
          channelName: match.channelName,
          subscriberCount: match.subscriberCount,
          category: match.category,
          location: match.location,
          matchScore: match.matchScore,
          matchReasons: match.matchReasons,
          engagementScore: match.engagementScore,
          recentPerformance: match.recentPerformance
        })),
        summary: {
          totalMatches: creatorMatches.length,
          avgMatchScore: creatorMatches.length > 0 
            ? Math.round(creatorMatches.reduce((sum, m) => sum + m.matchScore, 0) / creatorMatches.length)
            : 0,
          topCategories: [...new Set(creatorMatches.map(m => m.category))].slice(0, 3)
        },
        processingTime: Date.now() - startTime,
        analyzedAt: new Date().toISOString()
      };
      
      // Store result for later retrieval
      AnalysisStorage.store(result);
      
      console.log(`✅ Analysis completed in ${Date.now() - startTime}ms`);
      
      return NextResponse.json({
        success: true,
        ...result
      });
      
    } catch (scrapingError: any) {
      console.error('❌ Scraping/Analysis error:', scrapingError);
      
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
    } finally {
      // Cleanup browser
      await browserScraper.close();
    }
    
  } catch (error: any) {
    console.error('❌ API error:', error);
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

// GET method - Health check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    service: 'DOT Marketing Analysis API',
    version: '1.0.0',
    endpoints: {
      analyze: 'POST /api/analyze',
      results: 'GET /api/results/[id]'
    },
    timestamp: new Date().toISOString()
  });
}
