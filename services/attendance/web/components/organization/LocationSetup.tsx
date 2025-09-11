/**
 * GPS 위치 설정 컴포넌트
 * GitHub 스타일 UI/UX 패턴 적용
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface WorkLocation {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
  location_type: 'main' | 'branch' | 'remote' | 'temporary';
  is_active: boolean;
}

interface LocationSetupProps {
  organizationId: string;
  existingLocations?: WorkLocation[];
  onLocationsUpdate?: (locations: WorkLocation[]) => void;
  className?: string;
}

export default function LocationSetup({
  organizationId,
  existingLocations = [],
  onLocationsUpdate,
  className = ''
}: LocationSetupProps) {
  const [locations, setLocations] = useState<WorkLocation[]>(existingLocations);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 새 위치 추가 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState<Partial<WorkLocation>>({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    allowed_radius_meters: 100,
    location_type: 'main',
    is_active: true
  });

  useEffect(() => {
    if (existingLocations.length > 0) {
      setLocations(existingLocations);
    }
  }, [existingLocations]);

  // 현재 위치 가져오기
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        try {
          // 역방향 지오코딩으로 주소 가져오기
          const address = await reverseGeocode(location.latitude, location.longitude);
          setCurrentLocation({ ...location, address });
          setNewLocation(prev => ({
            ...prev,
            latitude: location.latitude,
            longitude: location.longitude,
            address: address
          }));
        } catch (error) {
          setCurrentLocation(location);
          setNewLocation(prev => ({
            ...prev,
            latitude: location.latitude,
            longitude: location.longitude
          }));
        }

        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage = '위치를 가져올 수 없습니다.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 접근 권한이 거부되었습니다.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 요청 시간이 초과되었습니다.';
            break;
        }
        setError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // 역방향 지오코딩 (Google Maps API 대신 간단한 예시)
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // 실제 구현에서는 Google Maps API 또는 Kakao Map API 사용
    // 여기서는 간단한 예시만 제공
    return `위도: ${lat.toFixed(6)}, 경도: ${lng.toFixed(6)}`;
  };

  // 주소 검색 (지오코딩)
  const searchLocation = async () => {
    if (!searchAddress.trim()) {
      setError('검색할 주소를 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // 실제 구현에서는 Google Maps API 또는 Kakao Map API 사용
      // 여기서는 간단한 예시만 제공
      const mockLocation = {
        latitude: 37.5665 + (Math.random() - 0.5) * 0.01,
        longitude: 126.9780 + (Math.random() - 0.5) * 0.01,
        address: searchAddress
      };

      setCurrentLocation(mockLocation);
      setNewLocation(prev => ({
        ...prev,
        latitude: mockLocation.latitude,
        longitude: mockLocation.longitude,
        address: mockLocation.address
      }));
    } catch (error) {
      setError('주소를 찾을 수 없습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  // 위치 추가
  const addLocation = async () => {
    if (!newLocation.name?.trim()) {
      setError('사업장 이름을 입력해주세요.');
      return;
    }

    if (!newLocation.address?.trim()) {
      setError('주소를 입력해주세요.');
      return;
    }

    if (!newLocation.latitude || !newLocation.longitude) {
      setError('위치 좌표를 설정해주세요.');
      return;
    }

    try {
      const locationData = {
        organization_id: organizationId,
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        allowed_radius_meters: newLocation.allowed_radius_meters || 100,
        location_type: newLocation.location_type || 'main',
        is_active: true
      };

      const response = await fetch(`/api/organization/${organizationId}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(locationData)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '위치 추가에 실패했습니다.');
      }

      const result = await response.json();
      const updatedLocations = [...locations, result.data];
      setLocations(updatedLocations);
      onLocationsUpdate?.(updatedLocations);

      // 폼 초기화
      setNewLocation({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        allowed_radius_meters: 100,
        location_type: 'main',
        is_active: true
      });
      setCurrentLocation(null);
      setShowAddForm(false);
      setSuccess('사업장 위치가 추가되었습니다.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '위치 추가에 실패했습니다.';
      setError(errorMessage);
    }
  };

  // 위치 삭제
  const removeLocation = async (locationId: string) => {
    try {
      const response = await fetch(`/api/organization/${organizationId}/locations/${locationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '위치 삭제에 실패했습니다.');
      }

      const updatedLocations = locations.filter(loc => loc.id !== locationId);
      setLocations(updatedLocations);
      onLocationsUpdate?.(updatedLocations);
      setSuccess('사업장 위치가 삭제되었습니다.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '위치 삭제에 실패했습니다.';
      setError(errorMessage);
    }
  };

  const locationTypeLabels = {
    main: '본사',
    branch: '지점',
    remote: '원격',
    temporary: '임시'
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 font-korean">
            사업장 위치 설정
          </h3>
          <p className="text-gray-600 text-sm font-korean">
            출퇴근 관리를 위한 사업장 위치를 설정하세요.
          </p>
        </div>

        {/* 기존 위치 목록 */}
        {locations.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3 font-korean">
              등록된 사업장 ({locations.length}개)
            </h4>
            <div className="space-y-3">
              {locations.map((location, index) => (
                <div key={location.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="font-medium text-gray-900 font-korean">{location.name}</h5>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-korean">
                          {locationTypeLabels[location.location_type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 font-korean">{location.address}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>위도: {location.latitude.toFixed(6)}</span>
                        <span>경도: {location.longitude.toFixed(6)}</span>
                        <span>반경: {location.allowed_radius_meters}m</span>
                      </div>
                    </div>
                    {location.id && (
                      <button
                        onClick={() => removeLocation(location.id!)}
                        className="ml-3 p-1 text-red-600 hover:text-red-800"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 새 위치 추가 버튼/폼 */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 font-korean"
          >
            <Plus className="w-5 h-5" />
            <span>새 사업장 위치 추가</span>
          </button>
        ) : (
          <div className="space-y-6">
            {/* 위치 검색 */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 font-korean">
                위치 설정
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 현재 위치 가져오기 */}
                <div>
                  <button
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-korean"
                  >
                    {isGettingLocation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>위치 확인 중...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        <span>현재 위치 사용</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 주소 검색 */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="주소 검색"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchLocation();
                      }
                    }}
                  />
                  <button
                    onClick={searchLocation}
                    disabled={isSearching}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 현재 선택된 위치 표시 */}
              {currentLocation && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 font-korean">선택된 위치</span>
                  </div>
                  <p className="text-sm text-green-700 font-korean">{currentLocation.address}</p>
                  <p className="text-xs text-green-600">
                    위도: {currentLocation.latitude.toFixed(6)}, 경도: {currentLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            {/* 사업장 정보 입력 */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 font-korean">
                사업장 정보
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                    사업장 이름 *
                  </label>
                  <input
                    type="text"
                    value={newLocation.name || ''}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 본사, 강남점"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                    사업장 타입
                  </label>
                  <select
                    value={newLocation.location_type || 'main'}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, location_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="main">본사</option>
                    <option value="branch">지점</option>
                    <option value="remote">원격</option>
                    <option value="temporary">임시</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                  주소 *
                </label>
                <input
                  type="text"
                  value={newLocation.address || ''}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="사업장 주소"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                  출퇴근 허용 반경 (미터)
                </label>
                <input
                  type="number"
                  value={newLocation.allowed_radius_meters || 100}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, allowed_radius_meters: parseInt(e.target.value) || 100 }))}
                  min="10"
                  max="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1 font-korean">
                  이 반경 내에서만 출퇴근이 가능합니다. (10m ~ 1000m)
                </p>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setCurrentLocation(null);
                  setNewLocation({
                    name: '',
                    address: '',
                    latitude: 0,
                    longitude: 0,
                    allowed_radius_meters: 100,
                    location_type: 'main',
                    is_active: true
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-korean"
              >
                취소
              </button>
              <button
                onClick={addLocation}
                disabled={!newLocation.name?.trim() || !newLocation.address?.trim() || !currentLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-korean"
              >
                <Check className="w-4 h-4" />
                <span>위치 추가</span>
              </button>
            </div>
          </div>
        )}

        {/* 메시지 */}
        {error && (
          <div className="mt-4 flex items-center space-x-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span className="font-korean">{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center space-x-2 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            <span className="font-korean">{success}</span>
          </div>
        )}
      </div>
    </div>
  );
}