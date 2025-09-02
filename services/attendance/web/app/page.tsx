'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { Building2, QrCode, Shield, Users, CheckCircle, AlertCircle, MapPin, Clock, LogIn } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      if (!videoRef.current) return;
      
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          // QR code detected - redirect to QR handler
          const encodedData = encodeURIComponent(result.data);
          router.push(`/qr/${encodedData}`);
        },
        {
          preferredCamera: 'environment',
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
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">DOT 근태관리</h1>
                <p className="text-xs text-gray-500">Smart Attendance System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {currentTime.toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500">
                  {currentTime.toLocaleTimeString('ko-KR')}
                </p>
              </div>
              
              <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">관리자</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              간편한 출퇴근 관리
            </h2>
            <p className="text-lg md:text-xl text-gray-600">
              QR 코드 스캔 한 번으로 출퇴근을 기록하세요
            </p>
          </div>

          {/* QR Scanner Card */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-8 h-8" />
                    <div>
                      <h3 className="text-xl font-semibold">QR 스캐너</h3>
                      <p className="text-sm opacity-90">사업장 QR 코드를 스캔하세요</p>
                    </div>
                  </div>
                  {scanning && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm">스캔 중</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                  {!scanning && cameraPermission !== 'denied' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <QrCode className="w-12 h-12 text-white" />
                        </div>
                        <button
                          onClick={startCamera}
                          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105"
                        >
                          QR 스캔 시작
                        </button>
                        <p className="text-sm text-gray-400 mt-3">
                          카메라 권한이 필요합니다
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
                      <div className="absolute inset-0">
                        <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                        <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                        <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                        <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                      </div>
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
                    </div>
                  )}
                </div>

                {scanning && (
                  <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      QR 코드를 인식 중입니다...
                    </p>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2 text-sm text-red-600 hover:text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      스캔 중지
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">1. 사업장 도착</h3>
              <p className="text-sm text-gray-600">
                등록된 사업장에 도착하여 입구의 QR 코드를 찾으세요
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <QrCode className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">2. QR 스캔</h3>
              <p className="text-sm text-gray-600">
                'QR 스캔 시작' 버튼을 눌러 QR 코드를 스캔하세요
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">3. 자동 기록</h3>
              <p className="text-sm text-gray-600">
                출퇴근이 자동으로 기록되고 확인 메시지가 표시됩니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">시스템 특징</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">보안 인증</h4>
              <p className="text-xs text-gray-600">Supabase 기반 안전한 인증</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">위치 확인</h4>
              <p className="text-xs text-gray-600">GPS 기반 자동 위치 검증</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">실시간 기록</h4>
              <p className="text-xs text-gray-600">즉시 출퇴근 시간 저장</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">통합 관리</h4>
              <p className="text-xs text-gray-600">전 직원 근태 중앙 관리</p>
            </div>
          </div>
        </div>
      </section>

      {/* Business Locations */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">등록된 사업장</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {['강남 본사', '판교 테크센터', '여의도 지사', '부산 지점', '대구 사무소'].map((location) => (
              <div key={location} className="px-4 py-2 bg-white rounded-full shadow-md flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">{location}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-600 mb-2">
            © 2024 DOT Attendance System. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Powered by Supabase • Secured by Row Level Security
          </p>
        </div>
      </footer>
    </main>
  );
}