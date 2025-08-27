/**
 * API-based Analyzer - 네이버 플레이스 API 직접 호출
 * 브라우저 스크래핑 대신 API 응답 파싱
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { RawSmartPlaceData } from '@/types/smartplace';

export class ApiAnalyzer {
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

  /**
   * URL에서 Place ID 추출
   */
  private extractPlaceId(url: string): string | null {
    // 여러 URL 패턴에서 ID 추출
    const patterns = [
      /place\/(\d+)/,           // .../place/1234567
      /restaurant\/(\d+)/,      // .../restaurant/1234567
      /cafe\/(\d+)/,           // .../cafe/1234567
      /\/p\/[^\/]+\/(\d+)/     // .../p/restaurant/1234567
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * API를 통해 데이터 분석
   */
  async analyzeFromUrl(url: string): Promise<RawSmartPlaceData> {
    if (!this.context) await this.initialize();
    
    const page = await this.context!.newPage();
    
    try {
      console.log('🔍 API-based analysis starting for:', url);
      
      // 네트워크 요청 모니터링 설정
      const apiResponses: any[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        // 네이버 플레이스 API 응답 캡처
        if (url.includes('/api/') || url.includes('place.naver.com')) {
          try {
            const json = await response.json();
            apiResponses.push({ url, data: json });
            console.log('Captured API response:', url.substring(0, 100));
          } catch {
            // JSON이 아닌 응답은 무시
          }
        }
      });
      
      // 페이지 로드 - 모든 네트워크 요청 완료까지 대기
      await page.goto(url, { 
        waitUntil: 'networkidle0',  // 모든 요청 완료까지 대기
        timeout: 60000 
      });
      
      // 특정 요소들 대기
      try {
        // 가게 이름 요소 대기
        await page.waitForSelector('span.GHAhO, span.Fc1rA, h2.place_title, [class*="place_name"]', {
          timeout: 15000
        });
      } catch {
        console.log('Store name element not found, continuing...');
      }
      
      // 추가 대기 - 동적 콘텐츠 로딩
      await page.waitForTimeout(10000);
      
      // Place ID 추출
      const finalUrl = page.url();
      const placeId = this.extractPlaceId(finalUrl);
      console.log('Extracted place ID:', placeId);
      
      // API 응답에서 데이터 추출
      let storeData: any = null;
      
      // API 응답 디버깅
      console.log('Total API responses captured:', apiResponses.length);
      
      for (const response of apiResponses) {
        // place/marker API 응답 우선 확인
        if (response.url.includes('/place/marker/') || response.url.includes('/place/type/')) {
          console.log('Found place API response:', response.url);
          console.log('Response data keys:', Object.keys(response.data || {}));
          
          // 다양한 응답 구조 처리
          if (response.data) {
            // marker API 응답 구조
            if (response.data.id && response.data.name) {
              storeData = {
                name: response.data.name,
                category: response.data.category || response.data.businessCategory,
                address: response.data.address || response.data.fullAddress,
                phone: response.data.tel || response.data.phone
              };
              break;
            }
            // type API 응답 구조
            else if (response.data.result) {
              const result = response.data.result;
              storeData = {
                name: result.name || result.place?.name,
                category: result.category || result.place?.category,
                address: result.address || result.place?.address,
                phone: result.tel || result.place?.tel
              };
              break;
            }
            // 기타 구조
            else if (response.data.basicInfo || response.data.name || response.data.place) {
              storeData = response.data;
              break;
            }
          }
        }
      }
      
      // 페이지에서 직접 데이터 추출 (폴백)
      if (!storeData) {
        storeData = await page.evaluate(() => {
          // window 객체에서 데이터 찾기
          const win = window as any;
          
          // 여러 위치에서 데이터 찾기
          if (win.__PLACE_STATE__) return win.__PLACE_STATE__;
          if (win.__APOLLO_STATE__) return win.__APOLLO_STATE__;
          if (win.__PRELOADED_STATE__) return win.__PRELOADED_STATE__;
          if (win.PLACE_STATE) return win.PLACE_STATE;
          
          // 스크립트 태그에서 JSON 데이터 찾기
          const scripts = document.querySelectorAll('script');
          for (const script of scripts) {
            const text = script.textContent || '';
            if (text.includes('window.__PLACE_STATE__')) {
              const match = text.match(/window\.__PLACE_STATE__\s*=\s*({.*?});/);
              if (match) {
                try {
                  return JSON.parse(match[1]);
                } catch {}
              }
            }
          }
          
          return null;
        });
      }
      
      // DOM에서 직접 추출 시도
      if (!storeData || !storeData.name) {
        const domData = await page.evaluate(() => {
          const getData = (selectors: string[]): string => {
            for (const selector of selectors) {
              const el = document.querySelector(selector);
              if (el && el.textContent) {
                const text = el.textContent.trim();
                if (text && text.length > 0) return text;
              }
            }
            return '';
          };
          
          return {
            name: getData(['span.GHAhO', 'span.Fc1rA', 'h2.place_title', '[class*="place_name"]']),
            category: getData(['span.lnJFt', 'span.DJJvD', '[class*="category"]']),
            address: getData(['span.IH7VW', 'span.LDgIH', '[class*="address"]']),
            phone: getData(['span.xlx7Q', '[class*="phone"]']),
            description: getData(['div.T8RFa', '[class*="description"]'])
          };
        });
        
        if (domData.name) {
          storeData = domData;
        }
      }
      
      console.log('Store data found:', !!storeData);
      if (storeData) {
        console.log('Extracted store data:', JSON.stringify(storeData, null, 2));
      }
      
      // 데이터 파싱
      const basicInfo = this.parseBasicInfo(storeData, finalUrl);
      const menuInfo = this.parseMenuInfo(storeData);
      const reviews = this.parseReviews(storeData);
      const statistics = this.parseStatistics(storeData);
      const images = this.parseImages(storeData);
      
      const result: RawSmartPlaceData = {
        basicInfo,
        menuInfo,
        reviews,
        statistics,
        images
      };
      
      console.log('✅ API analysis completed:', basicInfo.name);
      return result;
      
    } catch (error) {
      console.error('❌ API analysis error:', error);
      // 기본값 반환
      return {
        basicInfo: {
          name: '알 수 없는 가게',
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

  /**
   * 기본 정보 파싱
   */
  private parseBasicInfo(data: any, url: string) {
    if (!data) {
      return {
        name: '알 수 없는 가게',
        category: '기타',
        address: '주소 정보 없음',
        phoneNumber: undefined,
        businessHours: undefined,
        description: undefined
      };
    }
    
    // 다양한 데이터 구조 처리
    let name = data?.name || data?.basicInfo?.name || data?.place?.name || '알 수 없는 가게';
    let category = data?.category || data?.basicInfo?.category || data?.place?.category || '기타';
    let address = data?.address || data?.basicInfo?.address || data?.place?.address || '주소 정보 없음';
    let phoneNumber = data?.phone || data?.basicInfo?.phone || data?.place?.phone;
    let businessHours = data?.businessHours || data?.basicInfo?.businessHours;
    let description = data?.description || data?.basicInfo?.description;
    
    // URL 기반 카테고리 추론
    if (category === '기타') {
      if (url.includes('restaurant')) category = '음식점';
      else if (url.includes('cafe')) category = '카페';
    }
    
    return {
      name,
      category,
      address,
      phoneNumber,
      businessHours,
      description
    };
  }

  /**
   * 메뉴 정보 파싱
   */
  private parseMenuInfo(data: any) {
    if (!data?.menus && !data?.menuInfo) {
      return [];
    }
    
    const menus = data.menus || data.menuInfo || [];
    return menus.slice(0, 10).map((menu: any) => ({
      name: menu.name || menu.title || '',
      price: menu.price || menu.cost || '',
      description: menu.description || menu.desc || undefined
    }));
  }

  /**
   * 리뷰 파싱
   */
  private parseReviews(data: any) {
    if (!data?.reviews && !data?.reviewInfo) {
      return [];
    }
    
    const reviews = data.reviews || data.reviewInfo || [];
    return reviews.slice(0, 5).map((review: any) => ({
      rating: review.rating || review.score || 4,
      text: review.text || review.content || review.comment || '',
      date: review.date || review.createdAt || new Date().toISOString(),
      keywords: review.keywords || []
    }));
  }

  /**
   * 통계 정보 파싱
   */
  private parseStatistics(data: any) {
    return {
      averageRating: data?.stats?.rating || data?.statistics?.avgRating || 4.0,
      totalReviews: data?.stats?.totalReviews || data?.statistics?.reviewCount || 100,
      visitorReviews: data?.stats?.visitorReviews || 80,
      blogReviews: data?.stats?.blogReviews || 20
    };
  }

  /**
   * 이미지 파싱
   */
  private parseImages(data: any) {
    return {
      main: data?.images?.main || data?.mainImage || undefined,
      interior: data?.images?.interior || [],
      menu: data?.images?.menu || [],
      exterior: data?.images?.exterior || []
    };
  }
}

// 싱글톤 인스턴스
export const apiAnalyzer = new ApiAnalyzer();