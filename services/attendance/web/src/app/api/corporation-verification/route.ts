import { NextRequest, NextResponse } from 'next/server';

// 법원 법인등기 API 또는 NICE 평가정보 등의 API 연동
// 실제 환경에서는 환경변수로 API 키를 관리해야 함
const CORP_API_URL = process.env.CORPORATION_API_URL;
const CORP_API_KEY = process.env.CORPORATION_API_KEY;

interface CorporationVerificationRequest {
  corporationRegistrationNumber: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CorporationVerificationRequest = await request.json();
    const { corporationRegistrationNumber } = body;

    if (!corporationRegistrationNumber) {
      return NextResponse.json(
        { success: false, message: '법인등록번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 법인등록번호 형식 정리
    const cleanNumber = corporationRegistrationNumber.replace(/[-]/g, '');
    
    if (cleanNumber.length !== 13) {
      return NextResponse.json(
        { success: false, message: '올바른 법인등록번호 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 개발 환경에서는 Mock 데이터 반환
    if (process.env.NODE_ENV === 'development' || !CORP_API_KEY) {
      const mockData = getMockCorporationData(cleanNumber);
      return NextResponse.json(mockData);
    }

    // 실제 법인등기 API 호출 (예시)
    try {
      const response = await fetch(`${CORP_API_URL}/corporation/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CORP_API_KEY}`
        },
        body: JSON.stringify({
          corporationNumber: cleanNumber
        })
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return NextResponse.json({
          success: true,
          businessName: data.corporationName,
          representativeName: data.representativeName,
          status: data.status,
          details: {
            establishmentDate: data.establishmentDate,
            address: data.address,
            businessType: data.businessType
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          message: data.message || '법인 정보를 찾을 수 없습니다.'
        });
      }
    } catch (apiError) {
      console.error('Corporation API error:', apiError);
      throw apiError;
    }

  } catch (error) {
    console.error('Corporation verification API error:', error);
    return NextResponse.json(
      { success: false, message: '법인등록번호 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 개발용 Mock 데이터
function getMockCorporationData(corporationNumber: string) {
  const mockCorporations: Record<string, any> = {
    '1234567890123': {
      success: true,
      businessName: '테스트 주식회사',
      representativeName: '김대표',
      status: 'active',
      details: {
        establishmentDate: '20200101',
        address: '서울특별시 강남구 테헤란로 123',
        businessType: '소프트웨어 개발업'
      }
    },
    '1111111111111': {
      success: false,
      message: '유효하지 않은 법인등록번호입니다.'
    },
    '9999999999999': {
      success: false,
      message: '해산된 법인입니다.',
      details: {
        status: 'dissolved',
        dissolutionDate: '20231201'
      }
    }
  };

  return mockCorporations[corporationNumber] || {
    success: false,
    message: '해당 법인등록번호를 찾을 수 없습니다.'
  };
}