/**
 * 네이버 검색 API 서비스
 * 공식 네이버 Open API를 사용한 지역 검색
 */

export interface NaverSearchResult {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

export class NaverSearchAPI {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    // 환경변수에서 API 키 가져오기
    this.clientId = process.env.NAVER_CLIENT_ID || '';
    this.clientSecret = process.env.NAVER_CLIENT_SECRET || '';
  }

  /**
   * 지역 검색 API
   */
  async searchLocal(query: string, display: number = 5): Promise<NaverSearchResult[]> {
    if (!this.clientId || !this.clientSecret) {
      console.warn('Naver API credentials not configured');
      return [];
    }

    try {
      const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}`;
      
      const response = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret
        }
      });

      if (!response.ok) {
        console.error('Naver API error:', response.status);
        return [];
      }

      const data = await response.json();
      return data.items || [];
      
    } catch (error) {
      console.error('Failed to search via Naver API:', error);
      return [];
    }
  }

  /**
   * 검색 결과를 플레이스 정보로 변환
   */
  convertToPlaceInfo(searchResult: NaverSearchResult) {
    // HTML 태그 제거
    const cleanTitle = searchResult.title.replace(/<[^>]*>/g, '');
    
    return {
      name: cleanTitle,
      category: searchResult.category,
      address: searchResult.address || searchResult.roadAddress,
      phone: searchResult.telephone,
      description: searchResult.description,
      coordinates: {
        x: searchResult.mapx,
        y: searchResult.mapy
      }
    };
  }

  /**
   * 가게 이름으로 정보 검색
   */
  async findStore(storeName: string, location?: string) {
    const query = location ? `${storeName} ${location}` : storeName;
    const results = await this.searchLocal(query, 1);
    
    if (results.length > 0) {
      return this.convertToPlaceInfo(results[0]);
    }
    
    return null;
  }
}

// 싱글톤 인스턴스
export const naverSearchAPI = new NaverSearchAPI();