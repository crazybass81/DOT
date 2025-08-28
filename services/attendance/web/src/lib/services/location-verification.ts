export interface GeolocationPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface LocationVerificationResult {
  valid: boolean;
  distance: number;
  message: string;
}

export interface BusinessHours {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export class LocationVerification {
  private readonly EARTH_RADIUS_KM = 6371;

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(pos1: GeolocationPosition, pos2: GeolocationPosition): number {
    // Handle same location
    if (pos1.lat === pos2.lat && pos1.lng === pos2.lng) {
      return 0;
    }

    const dLat = this.toRad(pos2.lat - pos1.lat);
    const dLon = this.toRad(pos2.lng - pos1.lng);

    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(pos1.lat)) * 
      Math.cos(this.toRad(pos2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c * 1000; // Return in meters
  }

  /**
   * Verify if user is within allowed radius of business location
   */
  async verifyLocation(
    userLocation: GeolocationPosition,
    businessLocation: GeolocationPosition,
    allowedRadius: number = 50 // Default 50 meters
  ): Promise<LocationVerificationResult> {
    try {
      // Check for invalid coordinates
      if (
        isNaN(userLocation.lat) || 
        isNaN(userLocation.lng) || 
        isNaN(businessLocation.lat) || 
        isNaN(businessLocation.lng)
      ) {
        return {
          valid: false,
          distance: -1,
          message: '위치 확인 실패'
        };
      }

      const distance = this.calculateDistance(userLocation, businessLocation);
      const valid = distance <= allowedRadius;

      return {
        valid,
        distance: Math.round(distance),
        message: valid 
          ? '위치 확인 완료' 
          : `사업장에서 ${Math.round(distance)}m 떨어져 있습니다`
      };
    } catch (error) {
      return {
        valid: false,
        distance: -1,
        message: '위치 확인 실패'
      };
    }
  }

  /**
   * Check if current time is within business hours
   */
  isWithinBusinessHours(businessHours: BusinessHours, currentTime: Date = new Date()): boolean {
    const current = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    const [startHour, startMin] = businessHours.start.split(':').map(Number);
    const [endHour, endMin] = businessHours.end.split(':').map(Number);
    
    const start = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;

    // Handle overnight shifts (e.g., 22:00 - 06:00)
    if (end < start) {
      return current >= start || current <= end;
    }

    return current >= start && current <= end;
  }

  /**
   * Get current location using browser's Geolocation API
   */
  async getCurrentLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let errorMessage: string;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 권한이 거부되었습니다';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보를 사용할 수 없습니다';
              break;
            case error.TIMEOUT:
              errorMessage = '위치 정보 요청 시간이 초과되었습니다';
              break;
            default:
              errorMessage = '알 수 없는 오류가 발생했습니다';
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }
}