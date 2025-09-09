// 사업자등록번호 검증 서비스
export interface BusinessVerificationResult {
  isValid: boolean;
  businessName?: string;
  representativeName?: string;
  status?: string;
  error?: string;
}

export class BusinessVerificationService {
  /**
   * 사업자등록번호 검증 서비스
   * 파일명: business-verification.service.ts (kebab-case)
   * 클래스명: BusinessVerificationService (PascalCase)
   */
  /**
   * 사업자등록번호 검증
   * @param registrationNumber 사업자등록번호 (하이픈 포함/미포함 모두 지원)
   */
  static async verifyBusinessRegistration(registrationNumber: string): Promise<BusinessVerificationResult> {
    // 기본적인 포맷 검증
    const cleanNumber = registrationNumber.replace(/[-]/g, '');
    
    if (cleanNumber.length !== 10) {
      return {
        isValid: false,
        error: '사업자등록번호는 10자리여야 합니다.'
      };
    }

    if (!/^\d{10}$/.test(cleanNumber)) {
      return {
        isValid: false,
        error: '사업자등록번호는 숫자만 입력 가능합니다.'
      };
    }

    // 체크섬 검증 (사업자등록번호 검증 알고리즘)
    const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanNumber[i]) * weights[i];
    }

    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;

    if (checkDigit !== parseInt(cleanNumber[9])) {
      return {
        isValid: false,
        error: '유효하지 않은 사업자등록번호입니다.'
      };
    }

    try {
      // 국세청 사업자 상태조회 API 연동
      const response = await fetch('/api/business-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessRegistrationNumber: cleanNumber
        })
      });

      if (!response.ok) {
        throw new Error('API 요청 실패');
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          isValid: true,
          businessName: data.businessName,
          representativeName: data.representativeName,
          status: data.status
        };
      } else {
        return {
          isValid: false,
          error: data.message || '사업자등록번호를 찾을 수 없습니다.'
        };
      }
    } catch (error) {
      console.error('Business verification error:', error);
      return {
        isValid: false,
        error: '사업자등록번호 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 법인등록번호 검증
   * @param registrationNumber 법인등록번호
   */
  static async verifyCorporationRegistration(registrationNumber: string): Promise<BusinessVerificationResult> {
    // 기본적인 포맷 검증
    const cleanNumber = registrationNumber.replace(/[-]/g, '');
    
    if (cleanNumber.length !== 13) {
      return {
        isValid: false,
        error: '법인등록번호는 13자리여야 합니다.'
      };
    }

    if (!/^\d{13}$/.test(cleanNumber)) {
      return {
        isValid: false,
        error: '법인등록번호는 숫자만 입력 가능합니다.'
      };
    }

    try {
      // 법원 법인등기 API 연동 (또는 NICE 평가정보 등)
      const response = await fetch('/api/corporation-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          corporationRegistrationNumber: cleanNumber
        })
      });

      if (!response.ok) {
        throw new Error('API 요청 실패');
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          isValid: true,
          businessName: data.businessName,
          representativeName: data.representativeName,
          status: data.status
        };
      } else {
        return {
          isValid: false,
          error: data.message || '법인등록번호를 찾을 수 없습니다.'
        };
      }
    } catch (error) {
      console.error('Corporation verification error:', error);
      return {
        isValid: false,
        error: '법인등록번호 조회 중 오류가 발생했습니다.'
      };
    }
  }
};