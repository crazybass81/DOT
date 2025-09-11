'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Wand2, 
  User, 
  Building2, 
  Clock, 
  MapPin, 
  Palette, 
  Image, 
  Download,
  RefreshCw,
  Check,
  ChevronRight,
  ChevronLeft,
  Upload
} from 'lucide-react';
import { generateEmployeeQR, generateOrganizationQR, QRData } from '../../lib/qr-utils';

interface QRGenerationWizardProps {
  onQRGenerated: (qrCode: any) => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: WizardStep[] = [
  {
    id: 'type',
    title: 'QR 유형 선택',
    description: '생성할 QR 코드의 유형을 선택하세요',
    icon: <Wand2 className="w-5 h-5" />
  },
  {
    id: 'details',
    title: '세부 정보',
    description: 'QR 코드에 포함될 정보를 입력하세요',
    icon: <User className="w-5 h-5" />
  },
  {
    id: 'customization',
    title: '커스터마이징',
    description: 'QR 코드의 디자인을 커스터마이징하세요',
    icon: <Palette className="w-5 h-5" />
  },
  {
    id: 'preview',
    title: '미리보기 및 생성',
    description: 'QR 코드를 미리보고 최종 생성하세요',
    icon: <Check className="w-5 h-5" />
  }
];

export const QRGenerationWizard: React.FC<QRGenerationWizardProps> = ({ onQRGenerated }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [qrType, setQrType] = useState<'employee' | 'organization' | 'temporary'>('employee');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');
  const [generatedQR, setGeneratedQR] = useState<string>('');

  // 폼 데이터 상태
  const [employeeData, setEmployeeData] = useState({
    employeeId: '',
    organizationId: '',
    name: '',
    position: ''
  });

  const [organizationData, setOrganizationData] = useState({
    organizationId: '',
    name: '',
    latitude: '',
    longitude: '',
    radius: '100',
    description: ''
  });

  const [temporaryData, setTemporaryData] = useState({
    organizationId: '',
    name: '',
    latitude: '',
    longitude: '',
    radius: '50',
    expiresIn: '24', // 시간
    description: '',
    eventType: 'meeting'
  });

  const [customization, setCustomization] = useState({
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    logoUrl: '',
    borderRadius: '8',
    size: '300'
  });

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('브라우저에서 위치 서비스를 지원하지 않습니다');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        
        if (qrType === 'organization') {
          setOrganizationData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        } else if (qrType === 'temporary') {
          setTemporaryData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        }
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
      }
    );
  }, [qrType]);

  const generateQRCode = useCallback(async () => {
    setIsGenerating(true);
    setError('');

    try {
      let qrDataUrl = '';
      let qrData: QRData;

      if (qrType === 'employee') {
        const { employeeId, organizationId, name, position } = employeeData;
        if (!employeeId || !organizationId || !name || !position) {
          throw new Error('모든 필드를 입력해주세요');
        }
        qrDataUrl = await generateEmployeeQR(employeeId, organizationId, name, position);
        qrData = {
          employeeId,
          organizationId,
          name,
          position,
          type: 'employee',
          timestamp: Date.now()
        };
      } else {
        const data = qrType === 'organization' ? organizationData : temporaryData;
        const { organizationId, name, latitude, longitude, radius } = data;
        
        if (!organizationId || !name || !latitude || !longitude) {
          throw new Error('모든 필수 필드를 입력해주세요');
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = parseInt(radius);

        if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
          throw new Error('올바른 좌표와 반경을 입력해주세요');
        }

        qrDataUrl = await generateOrganizationQR(organizationId, name, { latitude: lat, longitude: lng, radius: rad });
        qrData = {
          organizationId,
          name,
          location: { latitude: lat, longitude: lng, radius: rad },
          type: 'organization',
          timestamp: Date.now()
        };
      }

      setGeneratedQR(qrDataUrl);

      // QR 코드 객체 생성 및 콜백 호출
      const qrCodeItem = {
        id: Date.now().toString(),
        name: qrType === 'employee' ? employeeData.name : 
              qrType === 'organization' ? organizationData.name : temporaryData.name,
        type: qrType,
        data: qrData,
        imageUrl: qrDataUrl,
        createdAt: new Date(),
        expiresAt: qrType === 'temporary' 
          ? new Date(Date.now() + parseInt(temporaryData.expiresIn) * 60 * 60 * 1000)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1년
        isActive: true,
        scanCount: 0,
        customization
      };

      onQRGenerated(qrCodeItem);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'QR 코드 생성 중 오류가 발생했습니다';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [qrType, employeeData, organizationData, temporaryData, customization, onQRGenerated]);

  const downloadQR = useCallback(() => {
    if (!generatedQR) return;
    
    const link = document.createElement('a');
    link.download = `qr-${qrType}-${Date.now()}.png`;
    link.href = generatedQR;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedQR, qrType]);

  const resetWizard = () => {
    setCurrentStep(0);
    setGeneratedQR('');
    setError('');
    setEmployeeData({
      employeeId: '',
      organizationId: '',
      name: '',
      position: ''
    });
    setOrganizationData({
      organizationId: '',
      name: '',
      latitude: '',
      longitude: '',
      radius: '100',
      description: ''
    });
    setTemporaryData({
      organizationId: '',
      name: '',
      latitude: '',
      longitude: '',
      radius: '50',
      expiresIn: '24',
      description: '',
      eventType: 'meeting'
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return qrType !== '';
      case 1:
        if (qrType === 'employee') {
          return employeeData.employeeId && employeeData.organizationId && 
                 employeeData.name && employeeData.position;
        } else {
          const data = qrType === 'organization' ? organizationData : temporaryData;
          return data.organizationId && data.name && data.latitude && data.longitude;
        }
      case 2:
        return true; // 커스터마이징은 선택사항
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Wand2 className="w-6 h-6 text-purple-400" />
          QR 코드 생성 마법사
        </CardTitle>
        <CardDescription className="text-slate-300">
          단계별 가이드를 따라 완벽한 QR 코드를 생성하세요
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 진행 단계 표시 */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${index <= currentStep 
                  ? 'bg-purple-500 border-purple-500 text-white' 
                  : 'bg-white/10 border-white/30 text-slate-400'}
              `}>
                {index < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-12 h-0.5 mx-2 transition-all
                  ${index < currentStep ? 'bg-purple-500' : 'bg-white/20'}
                `} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            {steps[currentStep].title}
          </h3>
          <p className="text-slate-300">
            {steps[currentStep].description}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 단계별 콘텐츠 */}
        <div className="min-h-[400px]">
          {/* 1단계: QR 유형 선택 */}
          {currentStep === 0 && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card 
                className={`cursor-pointer transition-all border-2 ${
                  qrType === 'employee' 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setQrType('employee')}
              >
                <CardContent className="p-6 text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                  <h4 className="font-semibold text-white mb-2">직원용 QR</h4>
                  <p className="text-sm text-slate-300">
                    개별 직원이 소지하는 QR 코드입니다. 위치 제한 없이 어디서든 사용 가능합니다.
                  </p>
                  <Badge variant="outline" className="mt-3">
                    개인용
                  </Badge>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all border-2 ${
                  qrType === 'organization' 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setQrType('organization')}
              >
                <CardContent className="p-6 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                  <h4 className="font-semibold text-white mb-2">조직/장소용 QR</h4>
                  <p className="text-sm text-slate-300">
                    특정 장소에 부착된 QR 코드입니다. 지정된 반경 내에서만 사용 가능합니다.
                  </p>
                  <Badge variant="outline" className="mt-3">
                    위치 기반
                  </Badge>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all border-2 ${
                  qrType === 'temporary' 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setQrType('temporary')}
              >
                <CardContent className="p-6 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                  <h4 className="font-semibold text-white mb-2">임시 이벤트 QR</h4>
                  <p className="text-sm text-slate-300">
                    특정 기간 동안만 유효한 임시 QR 코드입니다. 이벤트나 회의용으로 사용합니다.
                  </p>
                  <Badge variant="outline" className="mt-3">
                    시간 제한
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2단계: 세부 정보 입력 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {qrType === 'employee' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emp-id" className="text-white">직원 ID *</Label>
                    <Input
                      id="emp-id"
                      value={employeeData.employeeId}
                      onChange={(e) => setEmployeeData(prev => ({...prev, employeeId: e.target.value}))}
                      placeholder="EMP001"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-id" className="text-white">조직 ID *</Label>
                    <Input
                      id="org-id"
                      value={employeeData.organizationId}
                      onChange={(e) => setEmployeeData(prev => ({...prev, organizationId: e.target.value}))}
                      placeholder="ORG001"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-name" className="text-white">이름 *</Label>
                    <Input
                      id="emp-name"
                      value={employeeData.name}
                      onChange={(e) => setEmployeeData(prev => ({...prev, name: e.target.value}))}
                      placeholder="홍길동"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-position" className="text-white">직급/역할 *</Label>
                    <Input
                      id="emp-position"
                      value={employeeData.position}
                      onChange={(e) => setEmployeeData(prev => ({...prev, position: e.target.value}))}
                      placeholder="매니저"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              )}

              {(qrType === 'organization' || qrType === 'temporary') && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loc-org-id" className="text-white">조직 ID *</Label>
                      <Input
                        id="loc-org-id"
                        value={qrType === 'organization' ? organizationData.organizationId : temporaryData.organizationId}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (qrType === 'organization') {
                            setOrganizationData(prev => ({...prev, organizationId: value}));
                          } else {
                            setTemporaryData(prev => ({...prev, organizationId: value}));
                          }
                        }}
                        placeholder="ORG001"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc-name" className="text-white">장소명/이벤트명 *</Label>
                      <Input
                        id="loc-name"
                        value={qrType === 'organization' ? organizationData.name : temporaryData.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (qrType === 'organization') {
                            setOrganizationData(prev => ({...prev, name: value}));
                          } else {
                            setTemporaryData(prev => ({...prev, name: value}));
                          }
                        }}
                        placeholder={qrType === 'organization' ? '본사 사무실' : '신년회 이벤트'}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-white">위치 정보 *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={getCurrentLocation}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        현재 위치
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="latitude" className="text-white">위도</Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="0.000001"
                          value={qrType === 'organization' ? organizationData.latitude : temporaryData.latitude}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (qrType === 'organization') {
                              setOrganizationData(prev => ({...prev, latitude: value}));
                            } else {
                              setTemporaryData(prev => ({...prev, latitude: value}));
                            }
                          }}
                          placeholder="37.123456"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longitude" className="text-white">경도</Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="0.000001"
                          value={qrType === 'organization' ? organizationData.longitude : temporaryData.longitude}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (qrType === 'organization') {
                              setOrganizationData(prev => ({...prev, longitude: value}));
                            } else {
                              setTemporaryData(prev => ({...prev, longitude: value}));
                            }
                          }}
                          placeholder="127.123456"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="radius" className="text-white">허용 반경(m)</Label>
                        <Input
                          id="radius"
                          type="number"
                          min="1"
                          value={qrType === 'organization' ? organizationData.radius : temporaryData.radius}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (qrType === 'organization') {
                              setOrganizationData(prev => ({...prev, radius: value}));
                            } else {
                              setTemporaryData(prev => ({...prev, radius: value}));
                            }
                          }}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {qrType === 'temporary' && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expires-in" className="text-white">유효 시간 (시간)</Label>
                        <Select 
                          value={temporaryData.expiresIn} 
                          onValueChange={(value) => setTemporaryData(prev => ({...prev, expiresIn: value}))}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1시간</SelectItem>
                            <SelectItem value="3">3시간</SelectItem>
                            <SelectItem value="6">6시간</SelectItem>
                            <SelectItem value="12">12시간</SelectItem>
                            <SelectItem value="24">24시간</SelectItem>
                            <SelectItem value="72">3일</SelectItem>
                            <SelectItem value="168">1주일</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-type" className="text-white">이벤트 유형</Label>
                        <Select 
                          value={temporaryData.eventType} 
                          onValueChange={(value) => setTemporaryData(prev => ({...prev, eventType: value}))}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="meeting">회의</SelectItem>
                            <SelectItem value="event">이벤트</SelectItem>
                            <SelectItem value="training">교육</SelectItem>
                            <SelectItem value="conference">컨퍼런스</SelectItem>
                            <SelectItem value="other">기타</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3단계: 커스터마이징 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">색상 설정</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="primary-color" className="text-white">메인 색상</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="primary-color"
                          type="color"
                          value={customization.primaryColor}
                          onChange={(e) => setCustomization(prev => ({...prev, primaryColor: e.target.value}))}
                          className="w-16 h-10 bg-white/10 border-white/20"
                        />
                        <Input
                          value={customization.primaryColor}
                          onChange={(e) => setCustomization(prev => ({...prev, primaryColor: e.target.value}))}
                          placeholder="#3b82f6"
                          className="flex-1 bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bg-color" className="text-white">배경 색상</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="bg-color"
                          type="color"
                          value={customization.backgroundColor}
                          onChange={(e) => setCustomization(prev => ({...prev, backgroundColor: e.target.value}))}
                          className="w-16 h-10 bg-white/10 border-white/20"
                        />
                        <Input
                          value={customization.backgroundColor}
                          onChange={(e) => setCustomization(prev => ({...prev, backgroundColor: e.target.value}))}
                          placeholder="#ffffff"
                          className="flex-1 bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-white">스타일 설정</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="qr-size" className="text-white">크기 (픽셀)</Label>
                      <Select 
                        value={customization.size} 
                        onValueChange={(value) => setCustomization(prev => ({...prev, size: value}))}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="200">200x200</SelectItem>
                          <SelectItem value="300">300x300</SelectItem>
                          <SelectItem value="400">400x400</SelectItem>
                          <SelectItem value="500">500x500</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="border-radius" className="text-white">모서리 둥글기</Label>
                      <Select 
                        value={customization.borderRadius} 
                        onValueChange={(value) => setCustomization(prev => ({...prev, borderRadius: value}))}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">각진 모서리</SelectItem>
                          <SelectItem value="8">약간 둥글게</SelectItem>
                          <SelectItem value="16">둥글게</SelectItem>
                          <SelectItem value="32">많이 둥글게</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="logo-upload" className="text-white">로고 이미지 (선택사항)</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    이미지 업로드
                  </Button>
                  {customization.logoUrl && (
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">로고 업로드됨</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  PNG, JPG 형식을 지원합니다. 최적 크기: 100x100px
                </p>
              </div>
            </div>
          )}

          {/* 4단계: 미리보기 및 생성 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">QR 코드 미리보기</h4>
                  <div className="bg-white/10 border border-white/20 rounded-lg p-6 text-center">
                    {generatedQR ? (
                      <div className="space-y-4">
                        <img 
                          src={generatedQR} 
                          alt="Generated QR Code" 
                          className="mx-auto border border-white/20 rounded-lg"
                          style={{ 
                            width: `${customization.size}px`, 
                            height: `${customization.size}px`,
                            borderRadius: `${customization.borderRadius}px`
                          }}
                        />
                        <div className="flex gap-2 justify-center">
                          <Button onClick={downloadQR} className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            다운로드
                          </Button>
                          <Button onClick={resetWizard} variant="outline">
                            새로 만들기
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12">
                        <QrCode className="w-24 h-24 mx-auto mb-4 text-slate-400 opacity-50" />
                        <p className="text-slate-400">QR 코드를 생성하려면 아래 버튼을 클릭하세요</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-white">QR 코드 정보</h4>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-300">유형:</span>
                      <Badge variant="outline">
                        {qrType === 'employee' ? '직원용' : 
                         qrType === 'organization' ? '조직용' : '임시용'}
                      </Badge>
                    </div>
                    
                    {qrType === 'employee' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-300">이름:</span>
                          <span className="text-white">{employeeData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">직급:</span>
                          <span className="text-white">{employeeData.position}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">직원 ID:</span>
                          <span className="text-white">{employeeData.employeeId}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-300">장소명:</span>
                          <span className="text-white">
                            {qrType === 'organization' ? organizationData.name : temporaryData.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">허용 반경:</span>
                          <span className="text-white">
                            {qrType === 'organization' ? organizationData.radius : temporaryData.radius}m
                          </span>
                        </div>
                        {qrType === 'temporary' && (
                          <div className="flex justify-between">
                            <span className="text-slate-300">유효 기간:</span>
                            <span className="text-white">{temporaryData.expiresIn}시간</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-slate-300">생성 시간:</span>
                      <span className="text-white">{new Date().toLocaleString('ko-KR')}</span>
                    </div>
                  </div>

                  {!generatedQR && (
                    <Button 
                      onClick={generateQRCode}
                      disabled={isGenerating}
                      className="w-full"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          QR 코드 생성 중...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          QR 코드 생성하기
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 네비게이션 버튼 */}
        {!generatedQR && (
          <div className="flex justify-between pt-6 border-t border-white/20">
            <Button 
              onClick={prevStep} 
              disabled={currentStep === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              이전 단계
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">
                {currentStep + 1} / {steps.length}
              </span>
            </div>
            
            <Button 
              onClick={nextStep} 
              disabled={currentStep === steps.length - 1 || !canProceed()}
              className="flex items-center gap-2"
            >
              다음 단계
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};