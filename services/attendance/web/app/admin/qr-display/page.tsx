'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { qrCodeService } from '@/src/services/qrCodeService';
import { businessService } from '@/src/services/businessService';
import { multiRoleAuthService } from "@/src/services/multiRoleAuthService";
import { userService } from '@/src/services/userService';

export default function QRDisplayPage() {
  const router = useRouter();
  const [qrData, setQrData] = useState<string>('');
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [locationInfo, setLocationInfo] = useState<any>(null);
  // const [timeRemaining, setTimeRemaining] = useState(300); // 자동 갱신 제거
  const [loading, setLoading] = useState(true);

  // Check authentication and admin rights
  useEffect(() => {
    const checkAuth = () => {
      if (!userService.isAuthenticated()) {
        router.push('/login');
        return;
      }

      const user = userService.getCurrentUser();
      if (!user || !userService.isAdmin()) {
        alert('관리자 권한이 필요합니다');
        router.push('/attendance');
        return;
      }
    };

    checkAuth();
  }, [router]);

  // Generate QR code
  const generateNewQR = async () => {
    try {
      setLoading(true);
      
      // Get business info
      const businessInfo = await businessService.getBusinessInfo();
      const location = businessInfo.locations[0]; // Use first location
      
      if (!location) {
        throw new Error('사업장 위치가 설정되지 않았습니다');
      }

      // Generate QR URL - 카메라 스캔 시 바로 이동할 URL
      const qrUrl = qrCodeService.generateQRCodeURL(
        businessInfo.businessId,
        location.name
      );
      setQrData(qrUrl);
      
      // Generate QR image URL - URL을 QR 코드로 변환
      const imageUrl = qrCodeService.generateQRImageURL(qrUrl, 300);
      setQrImageUrl(imageUrl);
      
      setLocationInfo(location);
      // setTimeRemaining(300); // 자동 갱신 제거
    } catch (error) {
      console.error('QR generation error:', error);
      alert('QR 코드 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Initial QR generation
  useEffect(() => {
    generateNewQR();
  }, []);

  // 자동 갱신 타이머 제거
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setTimeRemaining(prev => {
  //       if (prev <= 1) {
  //         generateNewQR();
  //         return 300;
  //       }
  //       return prev - 1;
  //     });
  //   }, 1000);

  //   return () => clearInterval(timer);
  // }, []);

  // formatTime 함수 제거 (자동 갱신 제거로 불필요)

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `qr-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">QR 코드 출퇴근</h1>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">QR 코드 생성 중...</p>
          </div>
        ) : (
          <>
            {/* QR Code Display */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">
                  직원 출퇴근 QR 코드
                </h2>

                {/* QR Code Image */}
                <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg">
                  {qrImageUrl && (
                    <img 
                      src={qrImageUrl} 
                      alt="QR Code" 
                      className="w-64 h-64 md:w-80 md:h-80"
                    />
                  )}
                </div>

                {/* Location Info */}
                {locationInfo && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">사업장 정보</h3>
                    <p className="text-sm text-gray-600">
                      {locationInfo.name} | {locationInfo.address}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      체크인 허용 반경: {locationInfo.radius}m
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={generateNewQR}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    새로고침
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    인쇄
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    다운로드
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">사용 방법</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 직원들이 <strong>모바일 기기</strong>에서 이 QR 코드를 스캔하여 출퇴근 기록</li>
                <li>• 필요시 '새로고침' 버튼으로 QR 코드 재생성</li>
                <li>• 사업장 입구에 인쇄하여 게시 가능</li>
                <li>• 신규 직원은 QR 스캔 후 자동으로 등록 페이지로 이동</li>
              </ul>
              
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ QR 스캔 기능은 모바일 전용입니다. 웹에서는 관리 기능만 제공됩니다.
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-4 bg-yellow-50 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-2">보안 안내</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• QR 코드는 재발급 전까지 계속 유효합니다</li>
                <li>• 각 QR 코드는 고유 서명으로 보호됩니다</li>
                <li>• 보안이 필요한 경우 새로고침으로 즉시 재발급 가능</li>
              </ul>
            </div>
          </>
        )}
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}