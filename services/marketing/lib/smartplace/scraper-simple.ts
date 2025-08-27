/**
 * 간단한 SmartPlace 스크래퍼 - MVP용
 * 실제 네이버 플레이스 페이지에서 데이터 추출
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';

export interface SimpleStoreData {
  name: string;
  category: string;
  address: string;
  phoneNumber?: string;
  description?: string;
  imageUrl?: string;
  url: string;
}

export class SimpleSmartPlaceScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      locale: 'ko-KR'
    });
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  async scrapeStore(url: string): Promise<SimpleStoreData> {
    if (!this.context) await this.initialize();
    
    const page = await this.context!.newPage();
    
    try {
      console.log('📍 Navigating to:', url);
      
      // 페이지 이동
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // 페이지 로드 대기
      await page.waitForTimeout(3000);
      
      // 제목에서 가게 이름 추출
      const title = await page.title();
      const name = title.split(' - ')[0].trim() || '알 수 없는 가게';
      
      // 메타 태그에서 정보 추출
      const metaInfo = await page.evaluate(() => {
        const getMetaContent = (property: string): string => {
          const meta = document.querySelector(`meta[property="${property}"]`);
          return meta?.getAttribute('content') || '';
        };
        
        const ogTitle = getMetaContent('og:title');
        const ogDescription = getMetaContent('og:description');
        const ogImage = getMetaContent('og:image');
        
        // 설명에서 주소 추출 시도
        let address = '';
        if (ogDescription) {
          // 주소 패턴: "서울 강남구..." 형식
          const addrMatch = ogDescription.match(/([가-힣]+\s+[가-힣]+구\s+[가-힣0-9\s]+)/);
          if (addrMatch) {
            address = addrMatch[0].trim();
          }
        }
        
        // 카테고리 추출
        let category = '';
        if (ogDescription) {
          // 첫 번째 줄이 보통 카테고리
          const lines = ogDescription.split('\n');
          if (lines[0] && !lines[0].includes('구')) {
            category = lines[0].trim();
          }
        }
        
        return {
          name: ogTitle.split(' - ')[0].trim(),
          description: ogDescription,
          imageUrl: ogImage,
          address,
          category
        };
      });
      
      // URL에서 카테고리 추측
      let category = metaInfo.category;
      if (!category) {
        if (url.includes('/restaurant/')) {
          category = '음식점';
        } else if (url.includes('/cafe/')) {
          category = '카페';
        } else if (url.includes('/place/')) {
          category = '장소';
        } else {
          category = '기타';
        }
      }
      
      // 전화번호 추출 시도 (선택적)
      let phoneNumber: string | undefined;
      try {
        phoneNumber = await page.evaluate(() => {
          const desc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
          const phoneMatch = desc.match(/\d{2,4}-\d{3,4}-\d{4}/);
          return phoneMatch ? phoneMatch[0] : undefined;
        });
      } catch (e) {
        // 전화번호 없어도 됨
      }
      
      const result: SimpleStoreData = {
        name: metaInfo.name || name,
        category: category,
        address: metaInfo.address || '주소 정보 없음',
        phoneNumber,
        description: metaInfo.description,
        imageUrl: metaInfo.imageUrl,
        url
      };
      
      console.log('✅ Scraped data:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Scraping error:', error);
      // 최소한의 데이터라도 반환
      return {
        name: 'Unknown Store',
        category: '기타',
        address: '주소 정보 없음',
        url
      };
    } finally {
      await page.close();
    }
  }
}

// 싱글톤 인스턴스
export const simpleScraper = new SimpleSmartPlaceScraper();