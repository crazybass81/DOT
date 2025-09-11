'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Trash2, 
  Power, 
  PowerOff, 
  RefreshCw, 
  Search, 
  Filter,
  Download,
  QrCode,
  Clock,
  MapPin,
  User,
  Building2,
  Calendar
} from 'lucide-react';
import { QRData } from '../lib/qr-utils';

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

interface QRManagementDashboardProps {
  qrCodes: QRCodeRecord[];
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onRefresh: () => void;
}

export const QRManagementDashboard: React.FC<QRManagementDashboardProps> = ({
  qrCodes,
  onDelete,
  onToggle,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'employee' | 'organization' | 'temporary'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'used' | 'usage'>('created');

  // 필터링 및 정렬된 QR 코드 목록
  const filteredAndSortedQRCodes = useMemo(() => {
    let filtered = qrCodes.filter(qr => {
      // 검색어 필터
      const matchesSearch = qr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           qr.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 타입 필터
      const matchesType = typeFilter === 'all' || qr.type === typeFilter;
      
      // 상태 필터
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = qr.isActive && (!qr.expiresAt || qr.expiresAt > new Date());
      } else if (statusFilter === 'inactive') {
        matchesStatus = !qr.isActive;
      } else if (statusFilter === 'expired') {
        matchesStatus = qr.expiresAt ? qr.expiresAt <= new Date() : false;
      }
      
      return matchesSearch && matchesType && matchesStatus;
    });

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'used':
          return (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0);
        case 'usage':
          return b.usageCount - a.usageCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [qrCodes, searchTerm, typeFilter, statusFilter, sortBy]);

  // QR 코드 상태 확인
  const getQRStatus = (qr: QRCodeRecord) => {
    if (!qr.isActive) return 'inactive';
    if (qr.expiresAt && qr.expiresAt <= new Date()) return 'expired';
    return 'active';
  };

  // QR 코드 다운로드 (이미지 재생성)
  const downloadQRCode = async (qr: QRCodeRecord) => {
    try {
      // QR 코드 이미지를 다시 생성하여 다운로드
      const { generateEmployeeQR, generateOrganizationQR } = await import('../lib/qr-utils');
      
      let qrDataUrl: string;
      if (qr.type === 'employee') {
        const empData = qr.data as any;
        qrDataUrl = await generateEmployeeQR(
          empData.employeeId,
          empData.organizationId,
          empData.name,
          empData.position
        );
      } else {
        const orgData = qr.data as any;
        qrDataUrl = await generateOrganizationQR(
          orgData.organizationId,
          orgData.name,
          orgData.location
        );
      }

      // 다운로드 링크 생성
      const link = document.createElement('a');
      link.download = `qr-${qr.type}-${qr.name}-${Date.now()}.png`;
      link.href = qrDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('QR 코드 다운로드 실패:', error);
    }
  };

  // 모든 비활성 QR 코드 삭제
  const deleteInactiveQRCodes = () => {
    const inactiveIds = qrCodes
      .filter(qr => !qr.isActive || (qr.expiresAt && qr.expiresAt <= new Date()))
      .map(qr => qr.id);
    
    inactiveIds.forEach(id => onDelete(id));
  };

  return (
    <div className="space-y-6">
      {/* 관리 헤더 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <QrCode className="w-5 h-5 text-blue-400" />
                QR 코드 관리 대시보드
              </CardTitle>
              <CardDescription className="text-slate-300">
                생성된 QR 코드를 관리하고 모니터링하세요
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </Button>
              <Button 
                onClick={deleteInactiveQRCodes} 
                variant="destructive" 
                size="sm"
                disabled={qrCodes.filter(qr => !qr.isActive || (qr.expiresAt && qr.expiresAt <= new Date())).length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                비활성 삭제
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 필터 및 검색 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 검색 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="이름 또는 ID로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 타입 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">타입</label>
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="employee">직원용</SelectItem>
                  <SelectItem value="organization">조직용</SelectItem>
                  <SelectItem value="temporary">임시용</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 상태 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">상태</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                  <SelectItem value="expired">만료됨</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 정렬 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">정렬</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">생성일순</SelectItem>
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="used">최근사용순</SelectItem>
                  <SelectItem value="usage">사용횟수순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR 코드 목록 */}
      <div className="space-y-4">
        {filteredAndSortedQRCodes.length === 0 ? (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="p-8 text-center">
              <QrCode className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-300">
                {qrCodes.length === 0 
                  ? "생성된 QR 코드가 없습니다."
                  : "필터 조건에 맞는 QR 코드가 없습니다."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAndSortedQRCodes.map((qr) => {
              const status = getQRStatus(qr);
              return (
                <Card 
                  key={qr.id} 
                  className={`backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl ${
                    status === 'expired' ? 'opacity-60' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      {/* QR 정보 */}
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {qr.type === 'employee' ? (
                            <User className="w-8 h-8 text-blue-400" />
                          ) : qr.type === 'organization' ? (
                            <Building2 className="w-8 h-8 text-green-400" />
                          ) : (
                            <Clock className="w-8 h-8 text-purple-400" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{qr.name}</h3>
                            <Badge 
                              variant={status === 'active' ? 'default' : status === 'inactive' ? 'secondary' : 'destructive'}
                            >
                              {status === 'active' ? '활성' : status === 'inactive' ? '비활성' : '만료됨'}
                            </Badge>
                            <Badge variant="outline">
                              {qr.type === 'employee' ? '직원용' : qr.type === 'organization' ? '조직용' : '임시용'}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-slate-300 space-y-1">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                생성: {qr.createdAt.toLocaleDateString('ko-KR')}
                              </span>
                              {qr.lastUsed && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  최근사용: {qr.lastUsed.toLocaleDateString('ko-KR')}
                                </span>
                              )}
                              <span>사용횟수: {qr.usageCount}회</span>
                            </div>
                            
                            {qr.expiresAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                만료: {qr.expiresAt.toLocaleString('ko-KR')}
                              </div>
                            )}
                            
                            {qr.type === 'organization' && (qr.data as any).location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                위치: {(qr.data as any).location.latitude.toFixed(4)}, {(qr.data as any).location.longitude.toFixed(4)} 
                                (반경 {(qr.data as any).location.radius}m)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadQRCode(qr)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant={qr.isActive ? "secondary" : "default"}
                          size="sm"
                          onClick={() => onToggle(qr.id)}
                        >
                          {qr.isActive ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(qr.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 통계 요약 */}
      {qrCodes.length > 0 && (
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{qrCodes.length}</p>
                <p className="text-sm text-slate-300">총 QR 코드</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {qrCodes.filter(qr => getQRStatus(qr) === 'active').length}
                </p>
                <p className="text-sm text-slate-300">활성 상태</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">
                  {qrCodes.reduce((sum, qr) => sum + qr.usageCount, 0)}
                </p>
                <p className="text-sm text-slate-300">총 사용 횟수</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">
                  {qrCodes.filter(qr => getQRStatus(qr) === 'expired').length}
                </p>
                <p className="text-sm text-slate-300">만료된 QR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};