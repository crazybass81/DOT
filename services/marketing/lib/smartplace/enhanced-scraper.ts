/**
 * Enhanced SmartPlace Scraper with Direct Evaluation
 * 직접 평가 방식을 사용한 강화된 스크래퍼
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { 
  RawSmartPlaceData, 
  ScrapeOptions 
} from '@/types/smartplace';

// 브라우저 내부에서 실행될 데이터 추출 함수
interface WindowWithNaverData extends Window {
  __PLACE_STATE__?: any;
  __APOLLO_STATE__?: any;
  PLACE_STATE?: any;
  placeData?: any;
}

export class EnhancedSmartPlaceScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private debugMode: boolean = false;
  
  private readonly DEFAULT_OPTIONS: ScrapeOptions = {
    includeReviews: true,
    maxReviews: 30,
    includeImages: true,
    includeMenu: true,
    timeout: 30000,
    retryAttempts: 3
  };

  constructor(debug: boolean = false) {
    this.debugMode = debug;
  }

  /**
   * 브라우저 초기화
   */
  async initialize(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: !this.debugMode, // 디버그 모드에서는 브라우저 표시
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security', // CORS 우회
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
        // 추가 권한 설정
        permissions: ['geolocation'],
        bypassCSP: true // CSP 우회
      });
      
      // 콘솔 메시지 캡처 (디버깅용)
      if (this.debugMode) {
        this.context.on('console', msg => {
          console.log('Browser console:', msg.text());
        });
      }
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw new Error('브라우저 초기화 실패');
    }
  }

  /**
   * 브라우저 종료
   */
  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  /**
   * 스마트플레이스 데이터 스크래핑
   */
  async scrapeStore(
    url: string, 
    options: ScrapeOptions = {}
  ): Promise<RawSmartPlaceData> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (!this.context) {
      await this.initialize();
    }

    const page = await this.context!.newPage();
    page.setDefaultTimeout(opts.timeout!);

    try {
      // URL 처리 및 페이지 로드
      const finalUrl = await this.navigateToStore(page, url, opts.timeout!);
      console.log('Final URL:', finalUrl);
      
      // 페이지가 완전히 로드될 때까지 대기
      await page.waitForTimeout(3000);
      
      // 디버그 모드: 스크린샷 저장
      if (this.debugMode) {
        await page.screenshot({ path: 'debug-screenshot.png' });
        console.log('Debug screenshot saved');
      }
      
      // 1단계: 직접 평가로 모든 가능한 데이터 추출
      const extractedData = await this.extractAllDataWithEval(page);
      
      // 2단계: 메타데이터 및 구조화된 데이터 추출
      const metaData = await this.extractMetaData(page);
      
      // 3단계: 동적 데이터 추출 (필요시 버튼 클릭 등)
      const dynamicData = await this.extractDynamicData(page, opts);
      
      // 4단계: 데이터 병합 및 정규화
      const mergedData = this.mergeExtractedData(
        extractedData,
        metaData,
        dynamicData
      );
      
      return mergedData;
      
    } catch (error) {
      console.error('Scraping failed:', error);
      
      // 디버그 정보 수집
      if (this.debugMode) {
        await this.collectDebugInfo(page);
      }
      
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * URL 처리 및 네비게이션
   */
  private async navigateToStore(
    page: Page, 
    url: string, 
    timeout: number
  ): Promise<string> {
    // 단축 URL 처리
    if (url.includes('naver.me')) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForTimeout(2000);
      url = page.url();
    }
    
    // PC 버전 URL로 변환
    if (url.includes('m.place.naver.com') || url.includes('map.naver.com')) {
      const placeIdMatch = url.match(/(\d{8,})/);
      if (placeIdMatch) {
        url = `https://pcmap.place.naver.com/restaurant/${placeIdMatch[1]}/home`;
      }
    }
    
    // 최종 페이지 로드
    await page.goto(url, { waitUntil: 'networkidle', timeout });
    
    return page.url();
  }

  /**
   * 직접 평가를 통한 전체 데이터 추출
   */
  private async extractAllDataWithEval(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const data: any = {
        basicInfo: {},
        menuInfo: [],
        reviews: [],
        statistics: {},
        images: {},
        raw: {} // 원시 데이터 저장
      };
      
      try {
        // 1. Window 객체에서 Naver 데이터 찾기
        const win = window as WindowWithNaverData;
        
        // 가능한 전역 변수들
        const possibleDataSources = [
          win.__PLACE_STATE__,
          win.__APOLLO_STATE__,
          win.PLACE_STATE,
          win.placeData,
          (win as any).apollo?.cache?.data?.data,
          (win as any).__NEXT_DATA__?.props?.pageProps
        ];
        
        for (const source of possibleDataSources) {
          if (source) {
            data.raw.globalData = source;
            console.log('Found global data source');
            break;
          }
        }
        
        // 2. React/Next.js 컴포넌트에서 데이터 추출
        const reactRoot = document.querySelector('#__next') || 
                         document.querySelector('#root') ||
                         document.querySelector('[data-reactroot]');
        
        if (reactRoot) {
          // React Fiber 노드 접근 시도
          const reactFiberKey = Object.keys(reactRoot).find(
            key => key.startsWith('__react')
          );
          
          if (reactFiberKey) {
            const fiber = (reactRoot as any)[reactFiberKey];
            if (fiber?.memoizedProps) {
              data.raw.reactProps = fiber.memoizedProps;
            }
          }
        }
        
        // 3. Meta 태그에서 정보 추출
        const metaTags: any = {};
        document.querySelectorAll('meta').forEach(meta => {
          const property = meta.getAttribute('property') || meta.getAttribute('name');
          const content = meta.getAttribute('content');
          if (property && content) {
            metaTags[property] = content;
            
            // Open Graph 데이터 처리
            if (property.includes('og:title')) {
              data.basicInfo.name = content;
            }
            if (property.includes('description')) {
              data.basicInfo.description = content;
            }
            if (property.includes('image')) {
              data.images.main = content;
            }
          }
        });
        data.raw.metaTags = metaTags;
        
        // 4. JSON-LD 구조화된 데이터 추출
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        const jsonLdData: any[] = [];
        
        jsonLdScripts.forEach(script => {
          try {
            const json = JSON.parse(script.textContent || '{}');
            jsonLdData.push(json);
            
            // Restaurant 스키마 처리
            if (json['@type'] === 'Restaurant' || json['@type']?.includes('Restaurant')) {
              data.basicInfo.name = data.basicInfo.name || json.name;
              data.basicInfo.telephone = json.telephone;
              data.basicInfo.address = json.address?.streetAddress || json.address;
              data.basicInfo.priceRange = json.priceRange;
              
              if (json.aggregateRating) {
                data.statistics.averageRating = json.aggregateRating.ratingValue;
                data.statistics.totalReviews = json.aggregateRating.reviewCount;
              }
            }
          } catch (e) {
            console.error('Failed to parse JSON-LD:', e);
          }
        });
        data.raw.jsonLd = jsonLdData;
        
        // 5. DOM에서 텍스트 기반 추출 (fallback)
        const textPatterns = {
          name: ['h1', 'h2', '[class*="name"]', '[class*="title"]'],
          category: ['[class*="category"]', '[class*="type"]'],
          address: ['[class*="address"]', '[class*="location"]', '[class*="addr"]'],
          phone: ['[class*="phone"]', '[class*="tel"]', '[class*="contact"]'],
          rating: ['[class*="rating"]', '[class*="score"]', '[class*="star"]']
        };
        
        for (const [key, selectors] of Object.entries(textPatterns)) {
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              const texts = Array.from(elements)
                .slice(0, 3)
                .map(el => el.textContent?.trim())
                .filter(Boolean);
              
              if (texts.length > 0) {
                data.basicInfo[key] = data.basicInfo[key] || texts[0];
              }
            }
          }
        }
        
        // 6. 이미지 추출
        const images = document.querySelectorAll('img');
        const imageUrls: string[] = [];
        
        images.forEach(img => {
          const src = img.src || img.dataset.src;
          if (src && src.includes('pstatic') && !src.includes('icon')) {
            imageUrls.push(src);
          }
        });
        
        data.images.all = imageUrls.slice(0, 20);
        
        // 7. 네트워크 요청에서 API 데이터 찾기 (Performance API 사용)
        const apiCalls = performance.getEntriesByType('resource')
          .filter(entry => entry.name.includes('api') || entry.name.includes('graphql'));
        
        data.raw.apiCalls = apiCalls.map(entry => entry.name);
        
      } catch (error) {
        console.error('Error in data extraction:', error);
        data.error = error instanceof Error ? error.toString() : String(error);
      }
      
      return data;
    });
  }

  /**
   * 메타데이터 추출
   */
  private async extractMetaData(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const meta: any = {};
      
      // Open Graph
      document.querySelectorAll('meta[property^="og:"]').forEach(el => {
        const property = el.getAttribute('property')?.replace('og:', '');
        const content = el.getAttribute('content');
        if (property && content) {
          meta[property] = content;
        }
      });
      
      // Twitter Card
      document.querySelectorAll('meta[name^="twitter:"]').forEach(el => {
        const name = el.getAttribute('name')?.replace('twitter:', '');
        const content = el.getAttribute('content');
        if (name && content) {
          meta[`twitter_${name}`] = content;
        }
      });
      
      // 일반 메타
      meta.description = document.querySelector('meta[name="description"]')?.getAttribute('content');
      meta.keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content');
      
      return meta;
    });
  }

  /**
   * 동적 데이터 추출 (클릭 이벤트 등)
   */
  private async extractDynamicData(
    page: Page, 
    options: ScrapeOptions
  ): Promise<any> {
    const dynamicData: any = {
      menuItems: [],
      reviews: []
    };
    
    try {
      // 메뉴 탭 클릭 시도
      if (options.includeMenu) {
        const menuTabSelectors = ['a:has-text("메뉴")', 'button:has-text("메뉴")'];
        for (const selector of menuTabSelectors) {
          try {
            await page.click(selector, { timeout: 2000 });
            await page.waitForTimeout(1000);
            
            // 메뉴 데이터 추출
            dynamicData.menuItems = await page.evaluate(() => {
              const items: any[] = [];
              document.querySelectorAll('[class*="menu_item"], [class*="menuItem"]').forEach(el => {
                const name = el.querySelector('[class*="name"]')?.textContent;
                const price = el.querySelector('[class*="price"]')?.textContent;
                if (name) {
                  items.push({ name: name.trim(), price: price?.trim() });
                }
              });
              return items;
            });
            
            if (dynamicData.menuItems.length > 0) break;
          } catch (e) {
            // 다음 셀렉터 시도
          }
        }
      }
      
      // 리뷰 탭 클릭 시도
      if (options.includeReviews) {
        const reviewTabSelectors = ['a:has-text("리뷰")', 'button:has-text("리뷰")'];
        for (const selector of reviewTabSelectors) {
          try {
            await page.click(selector, { timeout: 2000 });
            await page.waitForTimeout(1000);
            
            // 리뷰 데이터 추출
            dynamicData.reviews = await page.evaluate(() => {
              const reviews: any[] = [];
              document.querySelectorAll('[class*="review"], [class*="Review"]').forEach((el, index) => {
                if (index >= 10) return; // 최대 10개
                
                const rating = el.querySelector('[class*="rating"], [class*="star"]')?.textContent;
                const text = el.querySelector('[class*="text"], [class*="content"]')?.textContent;
                const date = el.querySelector('[class*="date"], time')?.textContent;
                
                if (text) {
                  reviews.push({
                    rating: parseFloat(rating || '0'),
                    text: text.trim(),
                    date: date?.trim()
                  });
                }
              });
              return reviews;
            });
            
            if (dynamicData.reviews.length > 0) break;
          } catch (e) {
            // 다음 셀렉터 시도
          }
        }
      }
    } catch (error) {
      console.error('Failed to extract dynamic data:', error);
    }
    
    return dynamicData;
  }

  /**
   * 추출된 데이터 병합
   */
  private mergeExtractedData(
    evalData: any,
    metaData: any,
    dynamicData: any
  ): RawSmartPlaceData {
    // 기본 정보 병합
    const basicInfo = {
      name: evalData.basicInfo.name || metaData.title || '',
      category: evalData.basicInfo.category || '',
      address: evalData.basicInfo.address || metaData.description || '',
      phoneNumber: evalData.basicInfo.telephone || evalData.basicInfo.phone,
      businessHours: evalData.basicInfo.businessHours,
      description: evalData.basicInfo.description || metaData.description
    };
    
    // 메뉴 정보 병합
    const menuInfo = [
      ...evalData.menuInfo,
      ...dynamicData.menuItems
    ].slice(0, 20);
    
    // 리뷰 병합
    const reviews = [
      ...evalData.reviews,
      ...dynamicData.reviews
    ].slice(0, 30);
    
    // 통계 정보
    const statistics = {
      averageRating: parseFloat(evalData.statistics.averageRating || '0'),
      totalReviews: parseInt(evalData.statistics.totalReviews || '0'),
      visitorReviews: 0,
      blogReviews: 0
    };
    
    // 이미지 정보
    const images = {
      main: evalData.images.main || metaData.image,
      interior: evalData.images.all?.slice(0, 5) || [],
      menu: evalData.images.all?.slice(5, 10) || [],
      exterior: evalData.images.all?.slice(10, 15) || []
    };
    
    return {
      basicInfo,
      menuInfo,
      reviews,
      statistics,
      images,
      scrapedAt: new Date()
    };
  }

  /**
   * 디버그 정보 수집
   */
  private async collectDebugInfo(page: Page): Promise<void> {
    console.log('\n=== DEBUG INFO ===');
    
    // 현재 URL
    console.log('Current URL:', page.url());
    
    // 페이지 타이틀
    console.log('Page title:', await page.title());
    
    // 콘솔 로그
    const consoleLogs = await page.evaluate(() => {
      return {
        windowKeys: Object.keys(window),
        hasReact: !!(window as any).React || !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
        hasNext: !!(window as any).__NEXT_DATA__,
        documentReady: document.readyState,
        bodyClasses: document.body.className
      };
    });
    
    console.log('Page info:', consoleLogs);
    console.log('==================\n');
  }

  /**
   * URL 유효성 검증
   */
  static validateUrl(url: string): boolean {
    const patterns = [
      /naver\.me/,
      /place\.naver\.com/,
      /map\.naver\.com.*place/,
      /pcmap\.place\.naver\.com/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }
}

// 싱글톤 인스턴스
let enhancedScraperInstance: EnhancedSmartPlaceScraper | null = null;

export async function getEnhancedScraperInstance(debug: boolean = false): Promise<EnhancedSmartPlaceScraper> {
  if (!enhancedScraperInstance) {
    enhancedScraperInstance = new EnhancedSmartPlaceScraper(debug);
    await enhancedScraperInstance.initialize();
  }
  return enhancedScraperInstance;
}