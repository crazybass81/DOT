/**
 * Browser Scraper - 실제 브라우저로 페이지 렌더링 후 스크래핑
 * Playwright를 사용한 완전한 브라우저 자동화
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { RawSmartPlaceData } from '@/types/smartplace';

export class BrowserScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async initialize(): Promise<void> {
    console.log('🚀 Launching browser...');
    this.browser = await chromium.launch({
      headless: true, // 서버 환경에서는 headless 모드 사용
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ]
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      permissions: ['geolocation'],
      geolocation: { latitude: 37.5665, longitude: 126.9780 }, // 서울
    });
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  /**
   * 페이지 완전 스크래핑
   */
  async scrapeFromUrl(url: string): Promise<RawSmartPlaceData> {
    if (!this.context) await this.initialize();
    
    const page = await this.context!.newPage();
    
    try {
      console.log('📍 Navigating to:', url);
      
      // 페이지 이동
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // 초기 로딩 대기
      await page.waitForTimeout(3000);
      
      // 팝업 닫기 (있을 경우)
      try {
        const closeButton = page.locator('button:has-text("닫기"), button:has-text("취소"), [class*="close"]');
        if (await closeButton.count() > 0) {
          await closeButton.first().click();
          console.log('Closed popup');
        }
      } catch {}
      
      // iframe 처리
      const frames = page.frames();
      console.log(`Found ${frames.length} frames`);
      
      let targetFrame = page;
      
      // entryIframe 찾기 (네이버 플레이스는 종종 iframe 사용)
      for (const frame of frames) {
        if (frame.url().includes('place') || frame.name() === 'entryIframe') {
          targetFrame = frame;
          console.log('Using iframe:', frame.url());
          break;
        }
      }
      
      // 가게 이름 대기 및 추출
      console.log('Waiting for store name...');
      const nameSelectors = [
        'span.GHAhO',     // 2024 네이버 플레이스
        'span.Fc1rA',     
        '.name_wrap',
        '.biz_name',
        'h2.place_name',
        '[class*="place_name"]',
        'h1'
      ];
      
      let storeName = '';
      for (const selector of nameSelectors) {
        try {
          await targetFrame.waitForSelector(selector, { timeout: 5000 });
          const element = targetFrame.locator(selector).first();
          if (await element.count() > 0) {
            storeName = await element.textContent() || '';
            if (storeName && storeName.length > 0) {
              console.log(`Found store name with ${selector}:`, storeName);
              break;
            }
          }
        } catch {
          console.log(`Selector ${selector} not found, trying next...`);
        }
      }
      
      // 카테고리 추출
      console.log('Extracting category...');
      const categorySelectors = [
        'span.lnJFt',
        'span.DJJvD', 
        '.category',
        '[class*="category"]'
      ];
      
      let category = '';
      for (const selector of categorySelectors) {
        try {
          const element = targetFrame.locator(selector).first();
          if (await element.count() > 0) {
            category = await element.textContent() || '';
            if (category) break;
          }
        } catch {}
      }
      
      // 주소 추출
      console.log('Extracting address...');
      const addressSelectors = [
        'span.IH7VW',
        'span.LDgIH',
        '.addr',
        '[class*="address"]'
      ];
      
      let address = '';
      for (const selector of addressSelectors) {
        try {
          const element = targetFrame.locator(selector).first();
          if (await element.count() > 0) {
            address = await element.textContent() || '';
            if (address) break;
          }
        } catch {}
      }
      
      // 전화번호 추출
      console.log('Extracting phone...');
      const phoneSelectors = [
        'span.xlx7Q',
        '.phone',
        '[class*="phone"]',
        '[class*="tel"]'
      ];
      
      let phone = '';
      for (const selector of phoneSelectors) {
        try {
          const element = targetFrame.locator(selector).first();
          if (await element.count() > 0) {
            phone = await element.textContent() || '';
            if (phone) break;
          }
        } catch {}
      }
      
      // 영업시간 클릭해서 펼치기
      try {
        const timeButton = targetFrame.locator('a:has-text("영업시간"), button:has-text("영업시간")').first();
        if (await timeButton.count() > 0) {
          await timeButton.click();
          await page.waitForTimeout(1000);
        }
      } catch {}
      
      // 영업시간 추출
      let businessHours = '';
      try {
        const hoursElement = targetFrame.locator('.time_operation, [class*="business_hours"], [class*="time"]').first();
        if (await hoursElement.count() > 0) {
          businessHours = await hoursElement.textContent() || '';
        }
      } catch {}
      
      // 스크린샷 저장 (디버깅용)
      await page.screenshot({ 
        path: `/tmp/scraped-page-${Date.now()}.png`,
        fullPage: true 
      });
      
      // 메뉴 탭 클릭 시도
      let menuInfo: any[] = [];
      try {
        const menuTab = targetFrame.locator('a:has-text("메뉴"), button:has-text("메뉴")').first();
        if (await menuTab.count() > 0) {
          await menuTab.click();
          await page.waitForTimeout(2000);
          
          // 메뉴 항목 추출
          const menuItems = await targetFrame.locator('.menu_item, li[class*="menu"], [class*="menuItem"]').all();
          for (const item of menuItems.slice(0, 10)) {
            try {
              const name = await item.locator('.name, [class*="name"]').textContent() || '';
              const price = await item.locator('.price, [class*="price"]').textContent() || '';
              if (name) {
                menuInfo.push({ name: name.trim(), price: price.trim() });
              }
            } catch {}
          }
        }
      } catch {
        console.log('Menu tab not found or clickable');
      }
      
      // 리뷰 탭 클릭 시도
      let reviews: any[] = [];
      try {
        const reviewTab = targetFrame.locator('a:has-text("리뷰"), button:has-text("리뷰")').first();
        if (await reviewTab.count() > 0) {
          await reviewTab.click();
          await page.waitForTimeout(2000);
          
          // 리뷰 추출
          const reviewElements = await targetFrame.locator('.review_item, [class*="review"]').all();
          for (const review of reviewElements.slice(0, 5)) {
            try {
              const text = await review.locator('.review_text, [class*="content"]').textContent() || '';
              const rating = await review.locator('[class*="rating"]').textContent() || '';
              if (text) {
                reviews.push({
                  text: text.trim(),
                  rating: parseFloat(rating) || 4.0,
                  date: new Date().toISOString()
                });
              }
            } catch {}
          }
        }
      } catch {
        console.log('Review tab not found or clickable');
      }
      
      // 통계 정보
      let statistics = {
        averageRating: 4.0,
        totalReviews: reviews.length * 20, // 추정치
        visitorReviews: reviews.length * 15,
        blogReviews: reviews.length * 5
      };
      
      try {
        const ratingElement = targetFrame.locator('.rating_score, [class*="rating"]').first();
        if (await ratingElement.count() > 0) {
          const ratingText = await ratingElement.textContent() || '';
          const rating = parseFloat(ratingText);
          if (rating) statistics.averageRating = rating;
        }
      } catch {}
      
      // 이미지 URL 추출
      let mainImage = '';
      try {
        const imgElement = targetFrame.locator('img[class*="place"], img[alt*="사진"]').first();
        if (await imgElement.count() > 0) {
          mainImage = await imgElement.getAttribute('src') || '';
        }
      } catch {}
      
      const result: RawSmartPlaceData = {
        basicInfo: {
          name: storeName || '알 수 없는 가게',
          category: category || '기타',
          address: address || '주소 정보 없음',
          phoneNumber: phone || undefined,
          businessHours: businessHours || undefined,
          description: `${category} - ${address}`
        },
        menuInfo,
        reviews,
        statistics,
        images: {
          main: mainImage || undefined,
          interior: [],
          menu: [],
          exterior: []
        }
      };
      
      console.log('✅ Browser scraping completed:', result.basicInfo.name);
      return result;
      
    } catch (error) {
      console.error('❌ Browser scraping error:', error);
      
      // 폴백 데이터
      return {
        basicInfo: {
          name: '스크래핑 실패',
          category: '기타',
          address: '주소 정보 없음',
          phoneNumber: undefined,
          businessHours: undefined,
          description: undefined
        },
        menuInfo: [],
        reviews: [],
        statistics: {
          averageRating: 0,
          totalReviews: 0,
          visitorReviews: 0,
          blogReviews: 0
        },
        images: {
          main: undefined,
          interior: [],
          menu: [],
          exterior: []
        }
      };
    } finally {
      await page.close();
    }
  }
}

// 싱글톤 인스턴스
export const browserScraper = new BrowserScraper();