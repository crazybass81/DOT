import { NextRequest, NextResponse } from 'next/server';

// 국세청 사업자 상태조회 API 연동
// 실제 환경에서는 환경변수로 API 키를 관리해야 함
const NTS_API_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status';
const NTS_SERVICE_KEY = process.env.NTS_SERVICE_KEY;

interface BusinessVerificationRequest {
  businessRegistrationNumber: string;
}

interface NTSResponse {
  data: Array<{
    b_no: string;           // 사업자등록번호
    b_stt: string;          // 사업자상태
    b_stt_cd: string;       // 사업자상태코드
    tax_type: string;       // 과세유형
    tax_type_cd: string;    // 과세유형코드
    end_dt: string;         // 폐업일자
    utcc_yn: string;        // 단위과세전환여부
    tax_type_change_dt: string; // 과세유형전환일자
    invoice_apply_dt: string;   // 세금계산서발급사업자신청일자
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: BusinessVerificationRequest = await request.json();
    const { businessRegistrationNumber } = body;

    if (!businessRegistrationNumber) {
      return NextResponse.json(
        { success: false, message: '사업자등록번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 사업자등록번호 형식 정리
    const cleanNumber = businessRegistrationNumber.replace(/[-]/g, '');
    
    if (cleanNumber.length !== 10) {
      return NextResponse.json(
        { success: false, message: '올바른 사업자등록번호 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 개발 환경에서는 Mock 데이터 반환
    if (process.env.NODE_ENV === 'development' || !NTS_SERVICE_KEY) {
      // Mock 응답
      const mockData = getMockBusinessData(cleanNumber);
      return NextResponse.json(mockData);
    }

    // 국세청 API 호출
    const queryParams = new URLSearchParams({
      serviceKey: NTS_SERVICE_KEY,
      b_no: cleanNumber
    });

    const response = await fetch(`${NTS_API_URL}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data: NTSResponse = await response.json();
    
    if (data.data && data.data.length > 0) {
      const businessData = data.data[0];
      
      // 사업자 상태 확인
      const isActive = businessData.b_stt_cd === '01'; // 01: 계속사업자
      
      if (isActive) {
        return NextResponse.json({
          success: true,
          businessName: '조회된 사업체명', // 실제로는 별도 API에서 가져와야 함
          representativeName: '조회된 대표자명', // 실제로는 별도 API에서 가져와야 함
          status: 'active',
          details: {
            businessStatus: businessData.b_stt,
            taxType: businessData.tax_type,
            endDate: businessData.end_dt
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `사업자 상태: ${businessData.b_stt}`,
          details: {
            businessStatus: businessData.b_stt,
            endDate: businessData.end_dt
          }
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        message: '해당 사업자등록번호를 찾을 수 없습니다.'
      });
    }

  } catch (error) {
    console.error('Business verification API error:', error);
    return NextResponse.json(
      { success: false, message: '사업자등록번호 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 개발용 Mock 데이터
function getMockBusinessData(businessNumber: string) {
  const mockBusinesses: Record<string, any> = {
    '1234567890': {
      success: true,
      businessName: '테스트 사업체',
      representativeName: '홍길동',
      status: 'active'
    },
    '1111111111': {
      success: false,
      message: '유효하지 않은 사업자등록번호입니다.'
    },
    '9999999999': {
      success: false,
      message: '폐업한 사업체입니다.',
      details: {
        businessStatus: '폐업',
        endDate: '20231201'
      }
    }
  };

  return mockBusinesses[businessNumber] || {
    success: false,
    message: '해당 사업자등록번호를 찾을 수 없습니다.'
  };
}