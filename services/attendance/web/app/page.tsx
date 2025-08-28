'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';

export default function Home() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [error, setError] = useState('');

  // Start camera
  const startCamera = async () => {
    try {
      if (!videoRef.current) return;
      
      // Initialize QR Scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          // QR code detected - redirect to QR handler
          const encodedData = encodeURIComponent(result.data);
          router.push(`/qr/${encodedData}`);
        },
        {
          preferredCamera: 'environment', // Use back camera on mobile
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );
      
      await qrScannerRef.current.start();
      setCameraPermission('granted');
      setScanning(true);
      setError('');
    } catch (err) {
      console.error('Camera error:', err);
      setCameraPermission('denied');
      setError('카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setScanning(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900">
          DOT 근태관리 시스템
        </h1>
        <p className="text-lg md:text-xl mb-8 text-gray-700">
          QR 코드를 스캔하여 간편하게 출퇴근하세요
        </p>
        
        {/* QR Scanner */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            {!scanning && cameraPermission !== 'denied' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <button
                    onClick={startCamera}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105"
                  >
                    QR 스캔 시작
                  </button>
                  <p className="text-sm text-gray-600 mt-3">
                    사업장 QR 코드를 스캔하세요
                  </p>
                </div>
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!scanning ? 'hidden' : ''}`}
            />
            
            {scanning && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Scanning overlay */}
                <div className="absolute inset-0 border-2 border-blue-500 opacity-50">
                  <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-white"></div>
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-white"></div>
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-white"></div>
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-white"></div>
                </div>
                
                {/* Scanning animation */}
                <div className="absolute inset-x-0 top-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
                
                {/* Instructions */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <p className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm">
                    QR 코드를 화면 중앙에 맞춰주세요
                  </p>
                </div>
              </div>
            )}
          </div>

          {scanning && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">QR 코드를 인식 중입니다...</p>
              <button
                onClick={stopCamera}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 bg-red-50 rounded-lg hover:bg-red-100"
              >
                스캔 중지
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Admin Link */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium shadow-lg transition-all transform hover:scale-105"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">⚙️</span>
              <span>관리자 로그인</span>
            </div>
          </button>
        </div>

        {/* Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-3">📱</div>
            <h3 className="font-semibold text-gray-900 mb-2">1단계</h3>
            <p className="text-sm text-gray-600">
              사업장에 도착하여 입구의 QR 코드를 찾으세요
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-3">📷</div>
            <h3 className="font-semibold text-gray-900 mb-2">2단계</h3>
            <p className="text-sm text-gray-600">
              위의 'QR 스캔 시작' 버튼을 눌러 카메라를 활성화하세요
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-semibold text-gray-900 mb-2">3단계</h3>
            <p className="text-sm text-gray-600">
              QR 코드를 스캔하면 자동으로 출퇴근 처리됩니다
            </p>
          </div>
        </div>

        {/* Business Locations */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 mb-2">등록된 사업장</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['강남 본사', '판교 테크센터', '여의도 지사', '시청 사무소', '태평역점'].map((location) => (
              <span key={location} className="px-3 py-1 bg-white rounded-full text-xs text-gray-600 shadow-sm">
                {location}
              </span>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="mt-8 bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>💡 안내사항</strong>
          </p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• QR 코드 스캔 후 GPS로 위치가 자동 확인됩니다</li>
            <li>• 사업장 반경 내에서만 출퇴근 처리가 가능합니다</li>
            <li>• 별도의 로그인 없이 QR 스캔만으로 이용할 수 있습니다</li>
          </ul>
        </div>
      </div>
    </main>
  );
}