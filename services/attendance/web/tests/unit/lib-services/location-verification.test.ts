import { LocationVerification } from '../../../src/lib/services/location-verification';

describe('LocationVerification', () => {
  let locationService: LocationVerification;

  beforeEach(() => {
    locationService = new LocationVerification();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // 서울역 좌표
      const point1 = { lat: 37.5547, lng: 126.9707 };
      // 강남역 좌표
      const point2 = { lat: 37.4979, lng: 127.0276 };
      
      const distance = locationService.calculateDistance(point1, point2);
      
      // 실제 거리는 약 8km, 오차 범위 200m 허용
      expect(distance).toBeGreaterThan(7900);
      expect(distance).toBeLessThan(8200);
    });

    it('should return 0 for same location', () => {
      const point = { lat: 37.5547, lng: 126.9707 };
      
      const distance = locationService.calculateDistance(point, point);
      
      expect(distance).toBe(0);
    });
  });

  describe('verifyLocation', () => {
    it('should return valid when user is within allowed radius', async () => {
      const userLocation = { lat: 37.5547, lng: 126.9707, accuracy: 10 };
      const businessLocation = { lat: 37.5548, lng: 126.9708 };
      const allowedRadius = 50;
      
      const result = await locationService.verifyLocation(
        userLocation,
        businessLocation,
        allowedRadius
      );
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('위치 확인 완료');
      expect(result.distance).toBeLessThanOrEqual(allowedRadius);
    });

    it('should return invalid when user is outside allowed radius', async () => {
      const userLocation = { lat: 37.5547, lng: 126.9707, accuracy: 10 };
      const businessLocation = { lat: 37.5557, lng: 126.9717 };
      const allowedRadius = 50;
      
      const result = await locationService.verifyLocation(
        userLocation,
        businessLocation,
        allowedRadius
      );
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('떨어져 있습니다');
      expect(result.distance).toBeGreaterThan(allowedRadius);
    });

    it('should handle location verification errors gracefully', async () => {
      const userLocation = { lat: NaN, lng: 126.9707, accuracy: 10 };
      const businessLocation = { lat: 37.5557, lng: 126.9717 };
      
      const result = await locationService.verifyLocation(
        userLocation,
        businessLocation
      );
      
      expect(result.valid).toBe(false);
      expect(result.distance).toBe(-1);
      expect(result.message).toBe('위치 확인 실패');
    });
  });

  describe('isWithinBusinessHours', () => {
    it('should return true during business hours', () => {
      const businessHours = {
        start: '09:00',
        end: '18:00'
      };
      
      // 오후 2시
      const testDate = new Date();
      testDate.setHours(14, 0, 0, 0);
      
      const result = locationService.isWithinBusinessHours(businessHours, testDate);
      
      expect(result).toBe(true);
    });

    it('should return false outside business hours', () => {
      const businessHours = {
        start: '09:00',
        end: '18:00'
      };
      
      // 오후 10시
      const testDate = new Date();
      testDate.setHours(22, 0, 0, 0);
      
      const result = locationService.isWithinBusinessHours(businessHours, testDate);
      
      expect(result).toBe(false);
    });
  });
});