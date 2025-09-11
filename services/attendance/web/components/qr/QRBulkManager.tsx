'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Layers, 
  Power, 
  PowerOff, 
  Trash2, 
  Download, 
  Upload, 
  FileText, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Building2,
  Clock,
  Eye,
  Edit
} from 'lucide-react';
import { QRData } from '../../lib/qr-utils';

interface QRCodeItem {
  id: string;
  name: string;
  type: 'employee' | 'organization' | 'temporary';
  data: QRData;
  imageUrl: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  scanCount: number;
  lastUsed?: Date;
  customization?: {
    logoUrl?: string;
    primaryColor?: string;
    backgroundColor?: string;
  };
}

interface QRBulkManagerProps {
  qrCodes: QRCodeItem[];
  selectedQRCodes: string[];
  onSelectionChange: (selected: string[]) => void;
  onBulkAction: (action: 'activate' | 'deactivate' | 'delete', qrIds: string[]) => void;
}

export const QRBulkManager: React.FC<QRBulkManagerProps> = ({
  qrCodes,
  selectedQRCodes,
  onSelectionChange,
  onBulkAction
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: 'activate' | 'deactivate' | 'delete';
    qrIds: string[];
  } | null>(null);

  const selectedQRs = qrCodes.filter(qr => selectedQRCodes.includes(qr.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(qrCodes.map(qr => qr.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectByType = (type: 'employee' | 'organization' | 'temporary') => {
    const typeQRs = qrCodes.filter(qr => qr.type === type).map(qr => qr.id);
    const newSelection = [...new Set([...selectedQRCodes, ...typeQRs])];
    onSelectionChange(newSelection);
  };

  const handleSelectByStatus = (isActive: boolean) => {
    const statusQRs = qrCodes.filter(qr => qr.isActive === isActive).map(qr => qr.id);
    const newSelection = [...new Set([...selectedQRCodes, ...statusQRs])];
    onSelectionChange(newSelection);
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedQRCodes.length === 0) return;

    setConfirmAction({ action, qrIds: selectedQRCodes });
  };

  const confirmBulkAction = async () => {
    if (!confirmAction) return;

    setIsProcessing(true);
    try {
      await onBulkAction(confirmAction.action, confirmAction.qrIds);
      setConfirmAction(null);
      onSelectionChange([]);
    } catch (error) {
      console.error('일괄 작업 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportSelectedQRs = () => {
    const selectedData = selectedQRs.map(qr => ({
      이름: qr.name,
      유형: qr.type === 'employee' ? '직원용' : qr.type === 'organization' ? '조직용' : '임시용',
      상태: qr.isActive ? '활성' : '비활성',
      스캔수: qr.scanCount,
      생성일: qr.createdAt.toLocaleDateString('ko-KR'),
      만료일: qr.expiresAt.toLocaleDateString('ko-KR'),
      최근사용: qr.lastUsed ? qr.lastUsed.toLocaleDateString('ko-KR') : '사용 안됨'
    }));

    const csvContent = [
      Object.keys(selectedData[0] || {}).join(','),
      ...selectedData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `qr-codes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadSelectedQRs = () => {
    selectedQRs.forEach((qr, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `${qr.name}-${qr.id}.png`;
        link.href = qr.imageUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 100); // 100ms 간격으로 다운로드
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'employee':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'organization':
        return <Building2 className="w-4 h-4 text-green-400" />;
      case 'temporary':
        return <Clock className="w-4 h-4 text-purple-400" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const typeStats = {
    employee: qrCodes.filter(qr => qr.type === 'employee').length,
    organization: qrCodes.filter(qr => qr.type === 'organization').length,
    temporary: qrCodes.filter(qr => qr.type === 'temporary').length,
    active: qrCodes.filter(qr => qr.isActive).length,
    inactive: qrCodes.filter(qr => !qr.isActive).length
  };

  return (
    <div className="space-y-6">
      {/* 선택 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">선택된 QR</p>
                <p className="text-2xl font-bold text-white">{selectedQRCodes.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">직원용</p>
                <p className="text-2xl font-bold text-blue-400">{typeStats.employee}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">조직용</p>
                <p className="text-2xl font-bold text-green-400">{typeStats.organization}</p>
              </div>
              <Building2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">임시용</p>
                <p className="text-2xl font-bold text-purple-400">{typeStats.temporary}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">활성/비활성</p>
                <p className="text-lg font-bold text-white">{typeStats.active}/{typeStats.inactive}</p>
              </div>
              <Power className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 일괄 선택 도구 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-purple-400" />
            일괄 선택 도구
          </CardTitle>
          <CardDescription className="text-slate-300">
            QR 코드를 쉽게 선택하고 관리할 수 있습니다
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll(true)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              전체 선택
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange([])}
            >
              <XCircle className="w-4 h-4 mr-2" />
              선택 해제
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectByType('employee')}
            >
              <Users className="w-4 h-4 mr-2" />
              직원용 선택
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectByType('organization')}
            >
              <Building2 className="w-4 h-4 mr-2" />
              조직용 선택
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectByType('temporary')}
            >
              <Clock className="w-4 h-4 mr-2" />
              임시용 선택
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectByStatus(true)}
            >
              <Power className="w-4 h-4 mr-2" />
              활성 선택
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectByStatus(false)}
            >
              <PowerOff className="w-4 h-4 mr-2" />
              비활성 선택
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 일괄 작업 패널 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-purple-400" />
            일괄 작업 ({selectedQRCodes.length}개 선택)
          </CardTitle>
          <CardDescription className="text-slate-300">
            선택된 QR 코드에 대해 일괄 작업을 수행합니다
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {selectedQRCodes.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="w-16 h-16 mx-auto mb-4 text-slate-400 opacity-50" />
              <p className="text-slate-400">QR 코드를 선택하여 일괄 작업을 시작하세요</p>
            </div>
          ) : (
            <>
              {/* 선택된 QR 코드 미리보기 */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="font-medium text-white mb-3">선택된 QR 코드</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                  {selectedQRs.map(qr => (
                    <div key={qr.id} className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/10">
                      <div className="w-12 h-12 bg-white rounded border border-white/20 flex-shrink-0">
                        <img 
                          src={qr.imageUrl} 
                          alt={qr.name}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{qr.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getTypeIcon(qr.type)}
                          <Badge 
                            variant={qr.isActive ? 'default' : 'destructive'} 
                            className="text-xs"
                          >
                            {qr.isActive ? '활성' : '비활성'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 일괄 작업 버튼 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Button
                  onClick={() => handleBulkAction('activate')}
                  disabled={isProcessing || selectedQRs.every(qr => qr.isActive)}
                  className="flex items-center gap-2"
                >
                  <Power className="w-4 h-4" />
                  활성화
                </Button>

                <Button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={isProcessing || selectedQRs.every(qr => !qr.isActive)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <PowerOff className="w-4 h-4" />
                  비활성화
                </Button>

                <Button
                  onClick={downloadSelectedQRs}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </Button>

                <Button
                  onClick={exportSelectedQRs}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  내보내기
                </Button>

                <Button
                  onClick={() => handleBulkAction('delete')}
                  disabled={isProcessing}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 확인 대화상자 */}
      {confirmAction && (
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl border-2 border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              작업 확인
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{confirmAction.qrIds.length}개</strong>의 QR 코드에 대해 
                <strong className="ml-1">
                  {confirmAction.action === 'activate' ? '활성화' :
                   confirmAction.action === 'deactivate' ? '비활성화' : '삭제'}
                </strong> 
                작업을 수행하시겠습니까?
                {confirmAction.action === 'delete' && (
                  <span className="block mt-2 text-red-400">
                    ⚠️ 삭제된 QR 코드는 복구할 수 없습니다.
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmAction(null)}
                disabled={isProcessing}
              >
                취소
              </Button>
              <Button
                onClick={confirmBulkAction}
                disabled={isProcessing}
                variant={confirmAction.action === 'delete' ? 'destructive' : 'default'}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    확인
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 일괄 가져오기/내보내기 도구 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Upload className="w-5 h-5 text-green-400" />
            가져오기/내보내기
          </CardTitle>
          <CardDescription className="text-slate-300">
            QR 코드 데이터를 CSV 파일로 가져오거나 내보냅니다
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-white">QR 코드 가져오기</h4>
              <p className="text-sm text-slate-300">
                CSV 파일에서 QR 코드 정보를 일괄 가져옵니다
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  CSV 업로드
                </Button>
                <Button variant="ghost" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  템플릿 다운로드
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-white">QR 코드 내보내기</h4>
              <p className="text-sm text-slate-300">
                모든 QR 코드 정보를 CSV 파일로 내보냅니다
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    onSelectionChange(qrCodes.map(qr => qr.id));
                    setTimeout(exportSelectedQRs, 100);
                  }}
                >
                  <Download className="w-4 h-4" />
                  전체 내보내기
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled={selectedQRCodes.length === 0}
                  onClick={exportSelectedQRs}
                >
                  선택 내보내기
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};