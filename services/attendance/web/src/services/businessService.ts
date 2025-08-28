import { apiService } from './apiService';

interface BusinessLocation {
  lat: number;
  lng: number;
  name: string;
  address: string;
  radius: number; // 허용 거리 반경 (미터)
}

interface BusinessInfo {
  businessId: string;
  name: string;
  locations: BusinessLocation[];
  checkInRadius: number; // 기본 체크인 허용 거리
  workingHours: {
    start: string;
    end: string;
  };
}

class BusinessService {
  private businessInfo: BusinessInfo | null = null;

  /**
   * 비즈니스 정보 가져오기
   */
  async getBusinessInfo(): Promise<BusinessInfo> {
    try {
      // 캐시된 정보가 있으면 반환
      if (this.businessInfo) {
        return this.businessInfo;
      }

      // API에서 비즈니스 정보 가져오기 (현재는 목업 데이터)
      // 실제 서울 지역 사업장 좌표 사용
      const mockBusinessInfo: BusinessInfo = {
        businessId: 'biz-001',
        name: '테크놀로지 컴퍼니',
        locations: [
          {
            lat: 37.5006, // 강남역 인근
            lng: 127.0364,
            name: '강남 본사',
            address: '서울시 강남구 테헤란로 152 (역삼동)',
            radius: 100 // 100미터 이내
          },
          {
            lat: 37.4019, // 판교역 인근
            lng: 127.1082,
            name: '판교 테크센터',
            address: '경기도 성남시 분당구 판교역로 235',
            radius: 150
          },
          {
            lat: 37.5251, // 여의도 금융센터
            lng: 126.9255,
            name: '여의도 지사',
            address: '서울시 영등포구 국제금융로 10',
            radius: 100
          },
          {
            lat: 37.5662, // 서울시청
            lng: 126.9779,
            name: '시청 사무소',
            address: '서울시 중구 세종대로 110',
            radius: 100
          },
          {
            lat: 37.4401, // 태평역
            lng: 127.1276,
            name: '태평역점',
            address: '경기도 성남시 수정구 태평동 수정로 지하 171',
            radius: 150
          }
        ],
        checkInRadius: 100, // 기본 100미터
        workingHours: {
          start: '09:00',
          end: '18:00'
        }
      };

      this.businessInfo = mockBusinessInfo;
      
      // localStorage에도 저장 (오프라인 지원)
      localStorage.setItem('businessInfo', JSON.stringify(mockBusinessInfo));
      
      return mockBusinessInfo;
    } catch (error) {
      console.error('Failed to fetch business info:', error);
      
      // localStorage에서 가져오기 시도
      const cached = localStorage.getItem('businessInfo');
      if (cached) {
        this.businessInfo = JSON.parse(cached);
        return this.businessInfo!;
      }
      
      throw new Error('비즈니스 정보를 불러올 수 없습니다');
    }
  }

  /**
   * 가장 가까운 비즈니스 위치 찾기
   */
  async getNearestLocation(userLocation: { lat: number; lng: number }): Promise<BusinessLocation | null> {
    const businessInfo = await this.getBusinessInfo();
    
    if (!businessInfo.locations || businessInfo.locations.length === 0) {
      return null;
    }

    let nearestLocation: BusinessLocation | null = null;
    let minDistance = Infinity;

    for (const location of businessInfo.locations) {
      const distance = this.calculateDistance(userLocation, location);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location;
      }
    }

    return nearestLocation;
  }

  /**
   * 체크인 가능 여부 확인
   */
  async canCheckIn(userLocation: { lat: number; lng: number }): Promise<{
    allowed: boolean;
    location?: BusinessLocation;
    distance?: number;
    message: string;
  }> {
    try {
      const nearestLocation = await this.getNearestLocation(userLocation);
      
      if (!nearestLocation) {
        return {
          allowed: false,
          message: '등록된 사업장 위치가 없습니다'
        };
      }

      const distance = this.calculateDistance(userLocation, nearestLocation);
      const allowedRadius = nearestLocation.radius || 100;

      if (distance <= allowedRadius) {
        return {
          allowed: true,
          location: nearestLocation,
          distance: Math.round(distance),
          message: `${nearestLocation.name}에서 체크인 가능합니다`
        };
      } else {
        return {
          allowed: false,
          location: nearestLocation,
          distance: Math.round(distance),
          message: `사업장에서 ${Math.round(distance)}m 떨어져 있습니다. ${allowedRadius}m 이내로 접근해주세요.`
        };
      }
    } catch (error) {
      console.error('Check-in validation error:', error);
      return {
        allowed: false,
        message: '위치 확인 중 오류가 발생했습니다'
      };
    }
  }

  /**
   * 두 지점 간의 거리 계산 (Haversine formula)
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위
  }

  /**
   * 비즈니스 정보 초기화
   */
  clearCache() {
    this.businessInfo = null;
    localStorage.removeItem('businessInfo');
  }
}

export const businessService = new BusinessService();