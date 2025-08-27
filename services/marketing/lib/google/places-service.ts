/**
 * Google Places API Service
 * Places API는 OAuth를 지원하지 않아 서버 API 키 사용
 * 하지만 사용자별 사용량 추적으로 공정한 사용 보장
 */

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number; // 0-4 scale
  types?: string[];
  business_status?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
    weekday_text?: string[];
  };
  reviews?: Array<{
    rating: number;
    text: string;
    time: number;
    author_name: string;
  }>;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
}

export class GooglePlacesService {
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured');
    }
  }
  
  /**
   * URL에서 Place ID 추출
   */
  extractPlaceId(url: string): string | null {
    // Google Maps URL patterns
    const patterns = [
      /place\/([^\/]+)\//,  // /place/{place_name}/...
      /place_id=([^&]+)/,   // ?place_id=...
      /data=.*!1s([^!]+)/,  // Encoded place ID in data parameter
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
   * 텍스트로 장소 검색
   */
  async searchPlace(
    query: string,
    options: {
      location?: { lat: number; lng: number };
      radius?: number;
      language?: string;
    } = {}
  ): Promise<PlaceDetails[]> {
    const params = new URLSearchParams({
      query,
      key: this.apiKey,
      language: options.language || 'ko',
    });
    
    if (options.location) {
      params.append('location', `${options.location.lat},${options.location.lng}`);
      params.append('radius', (options.radius || 50000).toString());
    }
    
    const response = await fetch(`${this.baseUrl}/textsearch/json?${params}`);
    
    if (!response.ok) {
      throw new Error(`Places API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API Error: ${data.status} - ${data.error_message}`);
    }
    
    // 상위 결과들의 상세 정보 가져오기
    const places: PlaceDetails[] = [];
    for (const result of data.results.slice(0, 3)) {
      try {
        const details = await this.getPlaceDetails(result.place_id);
        places.push(details);
      } catch (error) {
        console.error(`Failed to get details for ${result.name}:`, error);
      }
    }
    
    return places;
  }
  
  /**
   * Place ID로 상세 정보 가져오기
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'formatted_phone_number',
        'website',
        'rating',
        'user_ratings_total',
        'price_level',
        'types',
        'business_status',
        'geometry',
        'opening_hours',
        'reviews',
        'photos'
      ].join(','),
      key: this.apiKey,
      language: 'ko',
    });
    
    const response = await fetch(`${this.baseUrl}/details/json?${params}`);
    
    if (!response.ok) {
      throw new Error(`Places API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Places API Error: ${data.status} - ${data.error_message}`);
    }
    
    return data.result;
  }
  
  /**
   * 근처 장소 검색
   */
  async searchNearby(
    location: { lat: number; lng: number },
    options: {
      radius?: number;
      type?: string;
      keyword?: string;
    } = {}
  ): Promise<PlaceDetails[]> {
    const params = new URLSearchParams({
      location: `${location.lat},${location.lng}`,
      radius: (options.radius || 1000).toString(),
      key: this.apiKey,
      language: 'ko',
    });
    
    if (options.type) {
      params.append('type', options.type);
    }
    
    if (options.keyword) {
      params.append('keyword', options.keyword);
    }
    
    const response = await fetch(`${this.baseUrl}/nearbysearch/json?${params}`);
    
    if (!response.ok) {
      throw new Error(`Places API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API Error: ${data.status} - ${data.error_message}`);
    }
    
    // 상세 정보는 별도 요청 필요
    const places: PlaceDetails[] = [];
    for (const result of data.results.slice(0, 5)) {
      try {
        const details = await this.getPlaceDetails(result.place_id);
        places.push(details);
      } catch (error) {
        console.error(`Failed to get details for ${result.name}:`, error);
      }
    }
    
    return places;
  }
  
  /**
   * 카테고리 매핑 (Google Places types -> 한국어)
   */
  mapPlaceTypeToCategory(types: string[]): string {
    const categoryMap: Record<string, string> = {
      'restaurant': '음식점',
      'cafe': '카페',
      'bar': '술집',
      'bakery': '베이커리',
      'meal_takeaway': '테이크아웃',
      'meal_delivery': '배달음식',
      'food': '음식',
      'store': '상점',
      'shopping_mall': '쇼핑몰',
      'clothing_store': '의류점',
      'beauty_salon': '미용실',
      'hair_care': '헤어샵',
      'spa': '스파',
      'gym': '헬스장',
      'lodging': '숙박',
      'tourist_attraction': '관광명소',
    };
    
    for (const type of types) {
      if (categoryMap[type]) {
        return categoryMap[type];
      }
    }
    
    return '기타';
  }
  
  /**
   * 가격 수준 한국어 변환
   */
  getPriceLevelText(priceLevel?: number): string {
    const levels = {
      0: '무료',
      1: '저렴',
      2: '보통',
      3: '비싼편',
      4: '매우비쌈',
    };
    
    return priceLevel !== undefined ? levels[priceLevel as keyof typeof levels] || '정보없음' : '정보없음';
  }
}