'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GeolocationPosition } from '@/lib/services/location-verification';

export default function SetupPage() {
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [businessLocation, setBusinessLocation] = useState<GeolocationPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Load saved business location
    const saved = localStorage.getItem('businessLocation');
    if (saved) {
      setBusinessLocation(JSON.parse(saved));
    }
  }, []);

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          (error) => {
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });

      setCurrentLocation(position);
      setMessage('현재 위치를 가져왔습니다');
    } catch (err) {
      setError('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const setAsBusinessLocation = () => {
    if (!currentLocation) {
      setError('먼저 현재 위치를 가져와주세요');
      return;
    }

    localStorage.setItem('businessLocation', JSON.stringify(currentLocation));
    setBusinessLocation(currentLocation);
    setMessage('사업장 위치가 설정되었습니다');
    
    setTimeout(() => setMessage(''), 3000);
  };

  const resetBusinessLocation = () => {
    localStorage.removeItem('businessLocation');
    setBusinessLocation(null);
    setMessage('사업장 위치가 초기화되었습니다');
    
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            사업장 위치 설정
          </h1>
          <p className="text-gray-600">
            테스트를 위한 사업장 위치 설정 페이지입니다
          </p>
        </header>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Current Location Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">현재 위치</h2>
              
              {currentLocation ? (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">위도: {currentLocation.lat.toFixed(6)}</p>
                  <p className="text-sm text-gray-600">경도: {currentLocation.lng.toFixed(6)}</p>
                  {currentLocation.accuracy && (
                    <p className="text-sm text-gray-600">정확도: {currentLocation.accuracy.toFixed(0)}m</p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-center text-gray-500">
                  위치 정보가 없습니다
                </div>
              )}

              <button
                onClick={getCurrentLocation}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:bg-gray-400"
              >
                {isLoading ? '위치 가져오는 중...' : '현재 위치 가져오기'}
              </button>
            </div>

            {/* Business Location Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">사업장 위치</h2>
              
              {businessLocation ? (
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">위도: {businessLocation.lat.toFixed(6)}</p>
                  <p className="text-sm text-gray-600">경도: {businessLocation.lng.toFixed(6)}</p>
                  <p className="text-sm text-green-600 font-medium mt-2">✓ 사업장 위치가 설정되어 있습니다</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-center text-gray-500">
                  사업장 위치가 설정되지 않았습니다
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={setAsBusinessLocation}
                  disabled={!currentLocation}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:bg-gray-400"
                >
                  현재 위치를 사업장으로 설정
                </button>
                
                <button
                  onClick={resetBusinessLocation}
                  disabled={!businessLocation}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:bg-gray-400"
                >
                  초기화
                </button>
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
                {message}
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Info */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">사용 방법</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. "현재 위치 가져오기" 버튼을 클릭하여 현재 위치를 확인합니다</li>
                <li>2. "현재 위치를 사업장으로 설정" 버튼을 클릭합니다</li>
                <li>3. 이제 출퇴근 체크시 현재 위치 기준으로 50m 반경 내에서만 출근이 가능합니다</li>
              </ol>
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ 주의: 이 설정은 브라우저에 저장되며, 테스트 용도로만 사용됩니다.
                  실제 운영시에는 데이터베이스에서 사업장 위치를 관리해야 합니다.
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-6 flex justify-center">
              <Link 
                href="/attendance"
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                출퇴근 페이지로 이동
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}