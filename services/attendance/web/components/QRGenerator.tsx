'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, QrCode, RefreshCcw, User, Building2, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { generateEmployeeQR, generateOrganizationQR, QREmployeeData, QROrganizationData } from '../lib/qr-utils';

interface QRGeneratorProps {
  className?: string;
  onQRGenerated?: (qrData: QREmployeeData | QROrganizationData, qrImage: string) => void;
}

interface EmployeeForm {
  employeeId: string;
  organizationId: string;
  name: string;
  position: string;
}

interface OrganizationForm {
  organizationId: string;
  name: string;
  latitude: string;
  longitude: string;
  radius: string;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ className = '' }) => {
  const [qrType, setQrType] = useState<'employee' | 'organization'>('employee');
  const [qrImage, setQrImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  // 직원용 폼 상태
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>({
    employeeId: '',
    organizationId: '',
    name: '',
    position: ''
  });

  // 조직용 폼 상태
  const [organizationForm, setOrganizationForm] = useState<OrganizationForm>({
    organizationId: '',
    name: '',
    latitude: '',
    longitude: '',
    radius: '100' // 기본 100미터
  });

  // 현재 위치 가져오기
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('브라우저에서 위치 서비스를 지원하지 않습니다');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrganizationForm(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setError('');
      },
      (error) => {
        let message = '위치 정보를 가져올 수 없습니다';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = '위치 권한이 거부되었습니다';
            break;
          case error.POSITION_UNAVAILABLE:
            message = '위치 정보를 사용할 수 없습니다';
            break;
          case error.TIMEOUT:
            message = '위치 정보 요청이 시간 초과되었습니다';
            break;
        }
        setError(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // 직원 QR 코드 생성
  const generateEmployeeQRCode = useCallback(async () => {
    const { employeeId, organizationId, name, position } = employeeForm;
    
    if (!employeeId.trim() || !organizationId.trim() || !name.trim() || !position.trim()) {
      setError('모든 필드를 입력해주세요');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const qrDataUrl = await generateEmployeeQR(employeeId, organizationId, name, position);
      setQrImage(qrDataUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'QR 코드 생성 중 오류가 발생했습니다';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [employeeForm]);

  // 조직 QR 코드 생성
  const generateOrganizationQRCode = useCallback(async () => {
    const { organizationId, name, latitude, longitude, radius } = organizationForm;
    
    if (!organizationId.trim() || !name.trim() || !latitude.trim() || !longitude.trim() || !radius.trim()) {
      setError('모든 필드를 입력해주세요');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius);

    if (isNaN(lat) || isNaN(lng) || isNaN(rad) || rad <= 0) {
      setError('올바른 좌표와 반경을 입력해주세요');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const qrDataUrl = await generateOrganizationQR(
        organizationId,
        name,
        { latitude: lat, longitude: lng, radius: rad }
      );
      setQrImage(qrDataUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'QR 코드 생성 중 오류가 발생했습니다';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [organizationForm]);

  // QR 코드 생성 실행
  const handleGenerate = useCallback(() => {
    if (qrType === 'employee') {
      generateEmployeeQRCode();
    } else {
      generateOrganizationQRCode();
    }
  }, [qrType, generateEmployeeQRCode, generateOrganizationQRCode]);

  // QR 코드 다운로드
  const downloadQR = useCallback(() => {
    if (!qrImage) return;

    const link = document.createElement('a');
    link.download = `qr-${qrType}-${Date.now()}.png`;
    link.href = qrImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrImage, qrType]);

  // QR 코드 새로고침 (재생성)
  const refreshQR = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  return (
    <Card className={`w-full max-w-2xl mx-auto backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <QrCode className="w-5 h-5 text-blue-400" />
          QR 코드 생성기
        </CardTitle>
        <CardDescription className="text-slate-300">
          출근/퇴근용 QR 코드를 생성합니다
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* QR 타입 선택 */}
        <div className="space-y-2">
          <Label htmlFor="qr-type">QR 코드 유형</Label>
          <Select value={qrType} onValueChange={(value: 'employee' | 'organization') => {
            setQrType(value);
            setQrImage('');
            setError('');
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  직원용 QR 코드
                </div>
              </SelectItem>
              <SelectItem value="organization">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  조직/장소용 QR 코드
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 직원용 폼 */}
        {qrType === 'employee' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee-id">직원 ID</Label>
                <Input
                  id="employee-id"
                  value={employeeForm.employeeId}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, employeeId: e.target.value }))}
                  placeholder="예: EMP001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization-id">조직 ID</Label>
                <Input
                  id="organization-id"
                  value={employeeForm.organizationId}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, organizationId: e.target.value }))}
                  placeholder="예: ORG001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee-name">이름</Label>
                <Input
                  id="employee-name"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 홍길동"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-position">직급/역할</Label>
                <Input
                  id="employee-position"
                  value={employeeForm.position}
                  onChange={(e) => setEmployeeForm(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="예: 매니저"
                />
              </div>
            </div>
          </div>
        )}

        {/* 조직용 폼 */}
        {qrType === 'organization' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-id">조직 ID</Label>
                <Input
                  id="org-id"
                  value={organizationForm.organizationId}
                  onChange={(e) => setOrganizationForm(prev => ({ ...prev, organizationId: e.target.value }))}
                  placeholder="예: ORG001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-name">조직/장소명</Label>
                <Input
                  id="org-name"
                  value={organizationForm.name}
                  onChange={(e) => setOrganizationForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 본사 사무실"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>위치 정보</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  현재 위치 가져오기
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">위도</Label>
                  <Input
                    id="latitude"
                    value={organizationForm.latitude}
                    onChange={(e) => setOrganizationForm(prev => ({ ...prev, latitude: e.target.value }))}
                    placeholder="37.123456"
                    type="number"
                    step="0.000001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">경도</Label>
                  <Input
                    id="longitude"
                    value={organizationForm.longitude}
                    onChange={(e) => setOrganizationForm(prev => ({ ...prev, longitude: e.target.value }))}
                    placeholder="127.123456"
                    type="number"
                    step="0.000001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radius">허용 반경(m)</Label>
                  <Input
                    id="radius"
                    value={organizationForm.radius}
                    onChange={(e) => setOrganizationForm(prev => ({ ...prev, radius: e.target.value }))}
                    placeholder="100"
                    type="number"
                    min="1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 표시 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 생성 버튼 */}
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
              QR 코드 생성 중...
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4 mr-2" />
              QR 코드 생성
            </>
          )}
        </Button>

        {/* 생성된 QR 코드 표시 */}
        {qrImage && (
          <div className="space-y-4 text-center">
            <div className="bg-white p-4 rounded-lg inline-block shadow-sm border">
              <img 
                src={qrImage} 
                alt="생성된 QR 코드" 
                className="mx-auto"
              />
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button onClick={downloadQR} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                다운로드
              </Button>
              <Button onClick={refreshQR} variant="outline">
                <RefreshCcw className="w-4 h-4 mr-2" />
                새로 생성
              </Button>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>
                {qrType === 'employee' 
                  ? `직원: ${employeeForm.name} (${employeeForm.position})` 
                  : `장소: ${organizationForm.name} (반경 ${organizationForm.radius}m)`
                }
              </p>
              <p>생성 시간: {new Date().toLocaleString('ko-KR')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};