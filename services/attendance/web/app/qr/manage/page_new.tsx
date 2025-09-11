'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QRGenerator } from '../../../components/QRGenerator';
import { QRScanner } from '../../../components/QRScanner';
import { QRManagementDashboard } from '../../../components/QRManagementDashboard';
import { QRActivityMonitor } from '../../../components/QRActivityMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { QrCode, Scan, FileText, Settings, BarChart3, Activity, Plus, Trash2, RefreshCw } from 'lucide-react';
import { QRValidationResult, QRData } from '../../../lib/qr-utils';

// 인터페이스 정의
interface QRCodeRecord {
  id: string;
  type: 'employee' | 'organization' | 'temporary';
  name: string;
  data: QRData;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  isActive: boolean;
  expiresAt?: Date;
}

interface QRActivity {
  id: string;
  qrCodeId: string;
  timestamp: Date;
  action: 'checkin' | 'checkout' | 'scan';
  location?: { latitude: number; longitude: number };
  success: boolean;
  error?: string;
}

export default function QRManagePage() {
  // 상태 관리
  const [scanResult, setScanResult] = useState<QRValidationResult | null>(null);
  const [scanError, setScanError] = useState<string>('');
  const [qrCodes, setQrCodes] = useState<QRCodeRecord[]>([]);
  const [activities, setActivities] = useState<QRActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [realTimeStats, setRealTimeStats] = useState({
    totalScans: 0,
    successfulScans: 0,
    activeQRs: 0,
    recentActivity: 0
  });

  // QR 코드 생성 성공 핸들러
  const handleQRGenerated = useCallback((qrData: QRData, qrImage: string) => {
    const newRecord: QRCodeRecord = {
      id: `qr_${Date.now()}`,
      type: qrData.type as 'employee' | 'organization',
      name: qrData.type === 'employee' ? (qrData as any).name : (qrData as any).name,
      data: qrData,
      createdAt: new Date(),
      usageCount: 0,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료
    };
    
    setQrCodes(prev => [newRecord, ...prev]);
    updateStats();
  }, []);

  // QR 스캔 성공 핸들러
  const handleScanSuccess = useCallback((result: QRValidationResult) => {
    setScanResult(result);
    setScanError('');
    
    // 활동 기록 추가
    const activity: QRActivity = {
      id: `activity_${Date.now()}`,
      qrCodeId: result.data ? `qr_${result.data.timestamp}` : 'unknown',
      timestamp: new Date(),
      action: result.attendanceType || 'scan',
      success: result.valid,
      error: result.error
    };
    
    setActivities(prev => [activity, ...prev.slice(0, 99)]); // 최대 100개 유지
    
    // QR 코드 사용 횟수 업데이트
    if (result.valid && result.data) {
      setQrCodes(prev => prev.map(qr => {
        if (qr.data.timestamp === result.data!.timestamp) {
          return {
            ...qr,
            lastUsed: new Date(),
            usageCount: qr.usageCount + 1
          };
        }
        return qr;
      }));
    }
    
    updateStats();
    console.log('QR 스캔 성공:', result);
  }, []);

  // QR 스캔 에러 핸들러
  const handleScanError = useCallback((error: string) => {
    setScanError(error);
    setScanResult(null);
    
    // 실패 활동 기록
    const activity: QRActivity = {
      id: `activity_${Date.now()}`,
      qrCodeId: 'unknown',
      timestamp: new Date(),
      action: 'scan',
      success: false,
      error
    };
    
    setActivities(prev => [activity, ...prev.slice(0, 99)]);
    updateStats();
    console.error('QR 스캔 실패:', error);
  }, []);

  // 통계 업데이트
  const updateStats = useCallback(() => {
    const totalScans = activities.length;
    const successfulScans = activities.filter(a => a.success).length;
    const activeQRs = qrCodes.filter(qr => qr.isActive && (!qr.expiresAt || qr.expiresAt > new Date())).length;
    const recentActivity = activities.filter(a => 
      new Date().getTime() - a.timestamp.getTime() < 60 * 60 * 1000 // 1시간 이내
    ).length;
    
    setRealTimeStats({
      totalScans,
      successfulScans,
      activeQRs,
      recentActivity
    });
  }, [activities, qrCodes]);

  // QR 코드 삭제
  const deleteQRCode = useCallback((id: string) => {
    setQrCodes(prev => prev.filter(qr => qr.id !== id));
    updateStats();
  }, [updateStats]);

  // QR 코드 활성화/비활성화
  const toggleQRCode = useCallback((id: string) => {
    setQrCodes(prev => prev.map(qr => 
      qr.id === id ? { ...qr, isActive: !qr.isActive } : qr
    ));
    updateStats();
  }, [updateStats]);

  // 결과 초기화
  const clearResults = useCallback(() => {
    setScanResult(null);
    setScanError('');
  }, []);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    updateStats();
  }, [updateStats]);

  // 실시간 통계 업데이트 (5초마다)
  useEffect(() => {
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [updateStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 relative overflow-hidden">
      {/* 배경 애니메이션 요소들 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 페이지 헤더 */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl text-white">
              <QrCode className="w-8 h-8 text-blue-400" />
              QR 코드 통합 관리 시스템
            </CardTitle>
            <CardDescription className="text-lg text-slate-300">
              QR 코드 생성, 스캔, 관리 및 실시간 모니터링
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 실시간 통계 대시보드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">총 스캔</p>
                  <p className="text-2xl font-bold text-white">{realTimeStats.totalScans}</p>
                </div>
                <QrCode className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">성공률</p>
                  <p className="text-2xl font-bold text-green-400">
                    {realTimeStats.totalScans > 0 
                      ? Math.round((realTimeStats.successfulScans / realTimeStats.totalScans) * 100)
                      : 0}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">활성 QR</p>
                  <p className="text-2xl font-bold text-purple-400">{realTimeStats.activeQRs}</p>
                </div>
                <Settings className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">최근 활동</p>
                  <p className="text-2xl font-bold text-orange-400">{realTimeStats.recentActivity}</p>
                </div>
                <Activity className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 메인 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl mx-auto backdrop-blur-lg bg-white/10 border-white/20">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              생성
            </TabsTrigger>
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              스캔
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              관리
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              모니터링
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              가이드
            </TabsTrigger>
          </TabsList>

          {/* QR 코드 생성 탭 */}
          <TabsContent value="generate" className="space-y-6">
            <QRGenerator onQRGenerated={handleQRGenerated} />
          </TabsContent>

          {/* QR 코드 스캔 탭 */}
          <TabsContent value="scan" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 스캐너 */}
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scan className="w-5 h-5" />
                    QR 코드 실시간 스캐너
                  </CardTitle>
                  <CardDescription>
                    QR 코드를 스캔하여 출퇴근 처리
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onScanError={handleScanError}
                    enabled={true}
                  />
                  {scanError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertDescription>{scanError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* 스캔 결과 */}
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
                <CardHeader>
                  <CardTitle>실시간 스캔 결과</CardTitle>
                  <CardDescription>
                    QR 코드 검증 및 출퇴근 처리 결과
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scanResult ? (
                    <div className="space-y-4">
                      <Alert className={scanResult.valid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">검증 상태:</span>
                              <Badge variant={scanResult.valid ? "default" : "destructive"}>
                                {scanResult.valid ? '✅ 유효' : '❌ 무효'}
                              </Badge>
                            </div>
                            {scanResult.error && (
                              <div className="text-red-600">
                                <span className="font-semibold">오류:</span> {scanResult.error}
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>

                      {scanResult.data && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold mb-2">QR 코드 정보:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">타입:</span> {scanResult.data.type}
                            </div>
                            <div>
                              <span className="font-medium">생성시간:</span> {new Date(scanResult.data.timestamp).toLocaleString('ko-KR')}
                            </div>
                            {scanResult.data.type === 'employee' && (
                              <>
                                <div>
                                  <span className="font-medium">직원ID:</span> {(scanResult.data as any).employeeId}
                                </div>
                                <div>
                                  <span className="font-medium">이름:</span> {(scanResult.data as any).name}
                                </div>
                              </>
                            )}
                            {scanResult.data.type === 'organization' && (
                              <>
                                <div>
                                  <span className="font-medium">조직ID:</span> {(scanResult.data as any).organizationId}
                                </div>
                                <div>
                                  <span className="font-medium">위치:</span> {(scanResult.data as any).name}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {scanResult.attendanceType && (
                        <div className="text-sm">
                          <span className="font-semibold">출퇴근 타입:</span> 
                          <Badge className="ml-2">
                            {scanResult.attendanceType === 'checkin' ? '출근' : '퇴근'}
                          </Badge>
                        </div>
                      )}

                      {scanResult.locationMatch !== undefined && (
                        <div className="text-sm">
                          <span className="font-semibold">위치 검증:</span>{' '}
                          <Badge variant={scanResult.locationMatch ? "default" : "secondary"}>
                            {scanResult.locationMatch ? '✅ 통과' : '⚠️ 미검증'}
                          </Badge>
                        </div>
                      )}

                      <Button onClick={clearResults} variant="outline" className="w-full">
                        결과 지우기
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      QR 코드를 스캔하면 결과가 여기에 표시됩니다
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* QR 관리 탭 */}
          <TabsContent value="manage" className="space-y-6">
            <QRManagementDashboard 
              qrCodes={qrCodes}
              onDelete={deleteQRCode}
              onToggle={toggleQRCode}
              onRefresh={updateStats}
            />
          </TabsContent>

          {/* 활동 모니터링 탭 */}
          <TabsContent value="monitor" className="space-y-6">
            <QRActivityMonitor 
              activities={activities}
              qrCodes={qrCodes}
              stats={realTimeStats}
            />
          </TabsContent>

          {/* 가이드 탭 */}
          <TabsContent value="docs" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="w-5 h-5 text-blue-400" />
                    QR 코드 유형
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-semibold text-blue-600">직원용 QR 코드</h4>
                      <p className="text-sm text-slate-300 mt-1">
                        개별 직원이 소지하는 QR 코드입니다. 위치 제한 없이 어디서든 출퇴근 가능합니다.
                      </p>
                      <div className="text-xs text-slate-400 mt-2">
                        • 직원 ID, 이름, 직급 정보 포함<br />
                        • 24시간 유효<br />
                        • GPS 위치는 참고용으로만 사용
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <h4 className="font-semibold text-green-600">조직/장소용 QR 코드</h4>
                      <p className="text-sm text-slate-300 mt-1">
                        특정 장소에 부착된 QR 코드입니다. 지정된 반경 내에서만 출퇴근 가능합니다.
                      </p>
                      <div className="text-xs text-slate-400 mt-2">
                        • 조직 ID, 장소명, GPS 좌표 포함<br />
                        • 허용 반경 설정 가능 (기본 100m)<br />
                        • 위치 검증 필수
                      </div>
                    </div>

                    <div className="border rounded-lg p-3">
                      <h4 className="font-semibold text-purple-600">임시 QR 코드</h4>
                      <p className="text-sm text-slate-300 mt-1">
                        특정 이벤트나 임시 근무용 QR 코드입니다. 사용 시간이 제한됩니다.
                      </p>
                      <div className="text-xs text-slate-400 mt-2">
                        • 이벤트 ID, 유효 시간 설정<br />
                        • 사용 횟수 제한 가능<br />
                        • 자동 만료 기능
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white">새로운 기능</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-purple-600">1. 실시간 모니터링</h4>
                      <p className="text-sm text-slate-300 mt-1">
                        QR 코드 사용 현황을 실시간으로 모니터링하고 통계를 확인할 수 있습니다.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-purple-600">2. QR 코드 관리</h4>
                      <p className="text-sm text-slate-300 mt-1">
                        생성된 QR 코드를 관리하고, 활성화/비활성화, 삭제가 가능합니다.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-purple-600">3. 고급 스캔 시스템</h4>
                      <p className="text-sm text-slate-300 mt-1">
                        모바일 카메라 최적화와 이미지 파일 업로드 스캔을 지원합니다.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-purple-600">4. 활동 기록</h4>
                      <p className="text-sm text-slate-300 mt-1">
                        모든 QR 스캔 활동이 기록되고 분석 데이터를 제공합니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">보안 및 성능</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-600">보안 강화</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• AES 암호화 데이터 보호</li>
                      <li>• 24시간 자동 만료</li>
                      <li>• 위치 기반 접근 제어</li>
                      <li>• 중복 스캔 방지</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-600">성능 최적화</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• 실시간 QR 검출</li>
                      <li>• 모바일 카메라 최적화</li>
                      <li>• 빠른 이미지 처리</li>
                      <li>• 백그라운드 스캔</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-600">관리 기능</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• 실시간 사용 통계</li>
                      <li>• QR 코드 수명 관리</li>
                      <li>• 활동 기록 추적</li>
                      <li>• 일괄 관리 도구</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}