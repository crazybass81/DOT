'use client';

import React, { useState } from 'react';
import { QRGenerator } from '../../../components/QRGenerator';
import { QRScanner } from '../../../components/QRScanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { QrCode, Scan, FileText, Settings } from 'lucide-react';
import { QRValidationResult } from '../../../lib/qr-utils';

export default function QRManagePage() {
  const [scanResult, setScanResult] = useState<QRValidationResult | null>(null);
  const [scanError, setScanError] = useState<string>('');

  const handleScanSuccess = (result: QRValidationResult) => {
    setScanResult(result);
    setScanError('');
    console.log('QR 스캔 성공:', result);
  };

  const handleScanError = (error: string) => {
    setScanError(error);
    setScanResult(null);
    console.error('QR 스캔 실패:', error);
  };

  const clearResults = () => {
    setScanResult(null);
    setScanError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 페이지 헤더 */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl">
              <QrCode className="w-8 h-8 text-blue-600" />
              QR 코드 관리 시스템
            </CardTitle>
            <CardDescription className="text-lg">
              출퇴근용 QR 코드 생성 및 테스트 도구
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 메인 탭 */}
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              생성
            </TabsTrigger>
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              스캔
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              가이드
            </TabsTrigger>
          </TabsList>

          {/* QR 코드 생성 탭 */}
          <TabsContent value="generate" className="space-y-6">
            <QRGenerator />
          </TabsContent>

          {/* QR 코드 스캔 탭 */}
          <TabsContent value="scan" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 스캐너 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scan className="w-5 h-5" />
                    QR 코드 테스트 스캐너
                  </CardTitle>
                  <CardDescription>
                    생성된 QR 코드를 테스트해보세요
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
              <Card>
                <CardHeader>
                  <CardTitle>스캔 결과</CardTitle>
                  <CardDescription>
                    QR 코드 검증 및 데이터 확인
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
                              <span className={scanResult.valid ? "text-green-600" : "text-red-600"}>
                                {scanResult.valid ? '✅ 유효' : '❌ 무효'}
                              </span>
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
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                            {JSON.stringify(scanResult.data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {scanResult.attendanceType && (
                        <div className="text-sm">
                          <span className="font-semibold">출퇴근 타입:</span> {scanResult.attendanceType}
                        </div>
                      )}

                      {scanResult.locationMatch !== undefined && (
                        <div className="text-sm">
                          <span className="font-semibold">위치 검증:</span>{' '}
                          <span className={scanResult.locationMatch ? "text-green-600" : "text-yellow-600"}>
                            {scanResult.locationMatch ? '✅ 통과' : '⚠️ 미검증'}
                          </span>
                        </div>
                      )}

                      <Button onClick={clearResults} variant="outline" className="w-full">
                        결과 지우기
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      QR 코드를 스캔하면 결과가 여기에 표시됩니다
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 가이드 탭 */}
          <TabsContent value="docs" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    QR 코드 유형
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-semibold text-blue-600">직원용 QR 코드</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        개별 직원이 소지하는 QR 코드입니다. 위치 제한 없이 어디서든 출퇴근 가능합니다.
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        • 직원 ID, 이름, 직급 정보 포함<br />
                        • 24시간 유효<br />
                        • GPS 위치는 참고용으로만 사용
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <h4 className="font-semibold text-green-600">조직/장소용 QR 코드</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        특정 장소에 부착된 QR 코드입니다. 지정된 반경 내에서만 출퇴근 가능합니다.
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        • 조직 ID, 장소명, GPS 좌표 포함<br />
                        • 허용 반경 설정 가능 (기본 100m)<br />
                        • 위치 검증 필수
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>사용 방법</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-purple-600">1. QR 코드 생성</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        '생성' 탭에서 직원용 또는 조직용 QR 코드를 만들 수 있습니다.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-purple-600">2. QR 코드 배치</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        직원용: 직원 개인에게 제공 (모바일 지갑 등)<br />
                        조직용: 사무실 입구, 작업장 등에 부착
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-purple-600">3. 출퇴근 처리</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        모바일에서 QR 코드를 스캔하여 즉시 출퇴근 처리됩니다.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-purple-600">4. 관리 및 모니터링</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        대시보드에서 출퇴근 기록을 실시간으로 확인할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>보안 기능</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-600">암호화</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• AES 암호화를 통한 데이터 보호</li>
                      <li>• 복호화 불가능한 QR 코드는 거부</li>
                      <li>• 서버에서만 복호화 키 관리</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-600">검증</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 24시간 후 자동 만료</li>
                      <li>• GPS 위치 기반 접근 제어</li>
                      <li>• 중복 스캔 방지</li>
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