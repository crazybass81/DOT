/**
 * SmartPlace Scraper
 * 네이버 스마트플레이스 페이지에서 가게 정보를 수집
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { 
  RawSmartPlaceData, 
  ScrapeOptions 
} from '@/types/smartplace';

export class SmartPlaceScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private readonly DEFAULT_OPTIONS: ScrapeOptions = {
    includeReviews: true,
    maxReviews: 50,
    includeImages: true,
    includeMenu: true,
    timeout: 30000,
    retryAttempts: 3
  };

  /**
   * 브라우저 초기화
   */
  async initialize(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul'
      });
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw new Error('브라우저 초기화 실패');
    }
  }

  /**
   * 브라우저 종료
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 가게 정보 스크래핑
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
      // URL 처리 - 단축 URL을 전체 URL로 변환
      let finalUrl = url;
      
      // naver.me 단축 URL인 경우 리다이렉트 따라가기
      if (url.includes('naver.me')) {
        console.log('Processing short URL:', url);
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: opts.timeout 
        });
        await page.waitForTimeout(2000);
        finalUrl = page.url();
        console.log('Redirected to:', finalUrl);
      }
      
      // 실제 장소 페이지로 이동
      if (!finalUrl.includes('pcmap.place.naver.com') && !finalUrl.includes('map.place.naver.com')) {
        // URL에서 place ID 추출 시도
        const placeIdMatch = finalUrl.match(/place\/([0-9]+)/);
        if (placeIdMatch) {
          finalUrl = `https://pcmap.place.naver.com/restaurant/${placeIdMatch[1]}/home`;
          console.log('Constructed place URL:', finalUrl);
        }
      }
      
      // 페이지 로드
      await page.goto(finalUrl, { 
        waitUntil: 'networkidle',
        timeout: opts.timeout 
      });
      
      // 페이지 완전 로드 대기
      await page.waitForTimeout(3000);

      // 기본 정보 추출
      const basicInfo = await this.extractBasicInfo(page);
      
      // 메뉴 정보 추출
      const menuInfo = opts.includeMenu 
        ? await this.extractMenuInfo(page) 
        : [];
      
      // 리뷰 정보 추출
      const reviews = opts.includeReviews 
        ? await this.extractReviews(page, opts.maxReviews!) 
        : [];
      
      // 통계 정보 추출
      const statistics = await this.extractStatistics(page);
      
      // 이미지 추출
      const images = opts.includeImages 
        ? await this.extractImages(page) 
        : { main: undefined, interior: [], menu: [], exterior: [] };

      return {
        basicInfo,
        menuInfo,
        reviews,
        statistics,
        images,
        scrapedAt: new Date()
      };
    } catch (error) {
      console.error('Scraping failed:', error);
      throw new Error(`스크래핑 실패: ${error}`);
    } finally {
      await page.close();
    }
  }

  /**
   * 기본 정보 추출
   */
  private async extractBasicInfo(page: Page) {
    try {
      // 새로운 셀렉터 시도 - 네이버 플레이스 2024 버전
      let name = '';
      let category = '';
      let address = '';
      let phoneNumber: string | undefined;
      let businessHours: string | undefined;
      let description: string | undefined;
      
      // 가게 이름 - 여러 셀렉터 시도
      const nameSelectors = [
        'span.GHAhO',
        'span.Fc1rA',
        'h2.place_title',
        '[class*="place_name"]',
        '.name'
      ];
      
      for (const selector of nameSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            name = await element.textContent() || '';
            if (name) break;
          }
        } catch (e) {
          // 다음 셀렉터 시도
        }
      }
      
      // 카테고리
      const categorySelectors = [
        'span.lnJFt', 
        'span.DJJvD',
        '[class*="category"]',
        '.category'
      ];
      
      for (const selector of categorySelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            category = await element.textContent() || '';
            if (category) break;
          }
        } catch (e) {
          // 다음 셀렉터 시도
        }
      }
      
      // 주소
      const addressSelectors = [
        'span.IH7VW',
        'span.LDgIH', 
        '[class*="address"]',
        '.addr'
      ];
      
      for (const selector of addressSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            address = await element.textContent() || '';
            if (address) break;
          }
        } catch (e) {
          // 다음 셀렉터 시도
        }
      }
      
      // 전화번호
      const phoneSelectors = [
        'span.xlx7Q',
        '[class*="phone"]',
        '.tel'
      ];
      
      for (const selector of phoneSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            phoneNumber = await element.textContent() || undefined;
            if (phoneNumber) break;
          }
        } catch (e) {
          // 다음 셀렉터 시도
        }
      }
      
      // 영업시간
      businessHours = await this.extractBusinessHours(page);
      
      // 설명
      const descSelectors = [
        'div.T8RFa',
        '[class*="description"]',
        '.desc'
      ];
      
      for (const selector of descSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            description = await element.textContent() || undefined;
            if (description) break;
          }
        } catch (e) {
          // 다음 셀렉터 시도
        }
      }

      console.log('Extracted basic info:', { name, category, address });

      return {
        name: name.trim(),
        category: category.trim(),
        address: address.trim(),
        phoneNumber: phoneNumber?.trim(),
        businessHours,
        description: description?.trim()
      };
    } catch (error) {
      console.error('Failed to extract basic info:', error);
      return {
        name: '',
        category: '',
        address: '',
        phoneNumber: undefined,
        businessHours: undefined,
        description: undefined
      };
    }
  }

  /**
   * 영업시간 추출
   */
  private async extractBusinessHours(page: Page): Promise<string | undefined> {
    try {
      // 영업시간 섹션 클릭
      const timeButton = page.locator('a:has-text("영업시간")').first();
      if (await timeButton.count() > 0) {
        await timeButton.click();
        await page.waitForTimeout(500);
        
        const hoursText = await page.textContent('div.w9QyJ') || '';
        return hoursText.trim();
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 메뉴 정보 추출
   */
  private async extractMenuInfo(page: Page) {
    const menuItems = [];
    
    try {
      // 메뉴 탭으로 이동
      const menuTab = page.locator('a:has-text("메뉴")').first();
      if (await menuTab.count() > 0) {
        await menuTab.click();
        await page.waitForTimeout(1000);
        
        // 메뉴 아이템 추출
        const menuElements = await page.locator('li.E2jtL').all();
        
        for (const element of menuElements.slice(0, 20)) {
          const name = await element.locator('span.lPzHi').textContent() || '';
          const price = await element.locator('div._3qFuX').textContent() || '';
          const description = await element.locator('div.CLSES').textContent() || undefined;
          
          // 이미지 URL 추출
          let imageUrl: string | undefined;
          const imgElement = element.locator('img').first();
          if (await imgElement.count() > 0) {
            imageUrl = await imgElement.getAttribute('src') || undefined;
          }
          
          menuItems.push({
            name: name.trim(),
            price: price.trim(),
            description: description?.trim(),
            imageUrl
          });
        }
      }
    } catch (error) {
      console.error('Failed to extract menu info:', error);
    }
    
    return menuItems;
  }

  /**
   * 리뷰 정보 추출
   */
  private async extractReviews(page: Page, maxReviews: number) {
    const reviews = [];
    
    try {
      // 리뷰 탭으로 이동
      const reviewTab = page.locator('a:has-text("리뷰")').first();
      if (await reviewTab.count() > 0) {
        await reviewTab.click();
        await page.waitForTimeout(1000);
        
        // 리뷰 로드 (스크롤하여 더 많은 리뷰 로드)
        let previousCount = 0;
        let currentCount = await page.locator('li.pui__X35jYm').count();
        
        while (currentCount < maxReviews && currentCount > previousCount) {
          previousCount = currentCount;
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1000);
          currentCount = await page.locator('li.pui__X35jYm').count();
        }
        
        // 리뷰 추출
        const reviewElements = await page.locator('li.pui__X35jYm').all();
        
        for (const element of reviewElements.slice(0, maxReviews)) {
          try {
            // 별점
            const ratingText = await element.locator('span.pui__bMWJiy').textContent() || '0';
            const rating = parseInt(ratingText.replace(/[^0-9]/g, '')) || 0;
            
            // 리뷰 텍스트
            const text = await element.locator('a.pui__xtsQN-').textContent() || '';
            
            // 날짜
            const dateElement = element.locator('time span').first();
            const date = await dateElement.textContent() || '';
            
            // 방문 날짜
            const visitDateElement = element.locator('span:has-text("방문일")');
            let visitedDate: string | undefined;
            if (await visitDateElement.count() > 0) {
              visitedDate = await visitDateElement.textContent() || undefined;
            }
            
            // 키워드 추출
            const keywords = await this.extractReviewKeywords(element);
            
            reviews.push({
              rating,
              text: text.trim(),
              date: date.trim(),
              visitedDate: visitedDate?.trim(),
              keywords
            });
          } catch (error) {
            console.error('Failed to extract individual review:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to extract reviews:', error);
    }
    
    return reviews;
  }

  /**
   * 리뷰 키워드 추출
   */
  private async extractReviewKeywords(reviewElement: any): Promise<string[]> {
    const keywords: string[] = [];
    
    try {
      const keywordElements = await reviewElement.locator('span.pui__gN83LA').all();
      for (const element of keywordElements) {
        const keyword = await element.textContent();
        if (keyword) {
          keywords.push(keyword.trim());
        }
      }
    } catch {
      // 키워드가 없을 수 있음
    }
    
    return keywords;
  }

  /**
   * 통계 정보 추출
   */
  private async extractStatistics(page: Page) {
    try {
      // 평균 별점
      const ratingText = await page.textContent('span.PXMot') || '0';
      const averageRating = parseFloat(ratingText) || 0;
      
      // 리뷰 개수
      const reviewCountText = await page.textContent('span.place_bluelink') || '0';
      const totalReviews = parseInt(reviewCountText.replace(/[^0-9]/g, '')) || 0;
      
      // 방문자 리뷰와 블로그 리뷰 구분
      let visitorReviews = 0;
      let blogReviews = 0;
      
      const reviewTabs = await page.locator('a.place_bluelink').all();
      for (const tab of reviewTabs) {
        const text = await tab.textContent() || '';
        if (text.includes('방문자')) {
          visitorReviews = parseInt(text.replace(/[^0-9]/g, '')) || 0;
        } else if (text.includes('블로그')) {
          blogReviews = parseInt(text.replace(/[^0-9]/g, '')) || 0;
        }
      }
      
      return {
        averageRating,
        totalReviews,
        visitorReviews,
        blogReviews
      };
    } catch (error) {
      console.error('Failed to extract statistics:', error);
      return {
        averageRating: 0,
        totalReviews: 0,
        visitorReviews: 0,
        blogReviews: 0
      };
    }
  }

  /**
   * 이미지 추출
   */
  private async extractImages(page: Page) {
    const images = {
      main: undefined as string | undefined,
      interior: [] as string[],
      menu: [] as string[],
      exterior: [] as string[]
    };
    
    try {
      // 메인 이미지
      const mainImage = page.locator('div.K0PDV img').first();
      if (await mainImage.count() > 0) {
        images.main = await mainImage.getAttribute('src') || undefined;
      }
      
      // 사진 탭으로 이동
      const photoTab = page.locator('a:has-text("사진")').first();
      if (await photoTab.count() > 0) {
        await photoTab.click();
        await page.waitForTimeout(1000);
        
        // 각 카테고리별 이미지 수집
        const categories = ['내부', '메뉴', '외부'];
        for (const category of categories) {
          const categoryTab = page.locator(`button:has-text("${category}")`).first();
          if (await categoryTab.count() > 0) {
            await categoryTab.click();
            await page.waitForTimeout(500);
            
            const imageElements = await page.locator('img.K0PDV').all();
            const imageUrls = [];
            
            for (const element of imageElements.slice(0, 5)) {
              const src = await element.getAttribute('src');
              if (src) {
                imageUrls.push(src);
              }
            }
            
            if (category === '내부') images.interior = imageUrls;
            else if (category === '메뉴') images.menu = imageUrls;
            else if (category === '외부') images.exterior = imageUrls;
          }
        }
      }
    } catch (error) {
      console.error('Failed to extract images:', error);
    }
    
    return images;
  }

  /**
   * URL 유효성 검증
   */
  static validateUrl(url: string): boolean {
    // naver.me 단축 URL도 지원
    const patterns = [
      /map\.naver\.com.*place/,
      /map\.naver\.com\/p\//,  // 새로운 네이버 플레이스 URL 형식
      /pcmap\.place\.naver\.com/,
      /m\.place\.naver\.com/,
      /naver\.me/  // 네이버 단축 URL 지원
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }
}

// 싱글톤 인스턴스
let scraperInstance: SmartPlaceScraper | null = null;

export async function getScraperInstance(): Promise<SmartPlaceScraper> {
  if (!scraperInstance) {
    scraperInstance = new SmartPlaceScraper();
    await scraperInstance.initialize();
  }
  return scraperInstance;
}