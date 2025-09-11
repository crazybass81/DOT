'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { 
  MoreVertical, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff,
  Users,
  Building2,
  Clock,
  MapPin,
  Scan,
  Calendar,
  TrendingUp,
  Share2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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

interface QRGalleryProps {
  qrCodes: QRCodeItem[];
  selectedQRCodes: string[];
  onSelectionChange: (selected: string[]) => void;
  onStatusChange: (qrId: string, isActive: boolean) => void;
  onDelete: (qrId: string) => void;
  isLoading?: boolean;
}

export const QRGallery: React.FC<QRGalleryProps> = ({
  qrCodes,
  selectedQRCodes,
  onSelectionChange,
  onStatusChange,
  onDelete,
  isLoading = false
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(qrCodes.map(qr => qr.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectQR = (qrId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedQRCodes, qrId]);
    } else {
      onSelectionChange(selectedQRCodes.filter(id => id !== qrId));
    }
  };

  const downloadQR = (qr: QRCodeItem) => {
    const link = document.createElement('a');
    link.download = `${qr.name}-${qr.id}.png`;
    link.href = qr.imageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async (qr: QRCodeItem) => {
    try {
      await navigator.clipboard.writeText(qr.imageUrl);
      // TODO: Show toast notification
      console.log('QR 코드 링크가 클립보드에 복사되었습니다');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'employee':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'organization':
        return <Building2 className="w-5 h-5 text-green-400" />;
      case 'temporary':
        return <Clock className="w-5 h-5 text-purple-400" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const getStatusColor = (qr: QRCodeItem) => {
    if (!qr.isActive) return 'bg-red-500';
    if (qr.type === 'temporary' && new Date() > qr.expiresAt) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const isExpired = (qr: QRCodeItem) => {
    return new Date() > qr.expiresAt;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="backdrop-blur-xl bg-white/10 border-white/20 animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="w-full h-48 bg-white/10 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (qrCodes.length === 0) {
    return (
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto bg-white/10 rounded-full flex items-center justify-center">
              <Users className="w-12 h-12 text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">QR 코드가 없습니다</h3>
              <p className="text-slate-300">
                QR 생성 마법사를 사용하여 첫 번째 QR 코드를 만들어보세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 갤러리 헤더 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedQRCodes.length === qrCodes.length && qrCodes.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm text-white">
                  전체 선택 ({selectedQRCodes.length}/{qrCodes.length})
                </label>
              </div>
              {selectedQRCodes.length > 0 && (
                <Badge variant="secondary">
                  {selectedQRCodes.length}개 선택됨
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? '목록형' : '격자형'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR 코드 갤러리 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl hover:shadow-3xl transition-all group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedQRCodes.includes(qr.id)}
                      onCheckedChange={(checked) => handleSelectQR(qr.id, checked as boolean)}
                    />
                    <div className="flex items-center gap-2">
                      {getTypeIcon(qr.type)}
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(qr)}`} />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => downloadQR(qr)}>
                        <Download className="w-4 h-4 mr-2" />
                        다운로드
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyToClipboard(qr)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        링크 복사
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        상세보기
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        편집
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onStatusChange(qr.id, !qr.isActive)}>
                        {qr.isActive ? (
                          <>
                            <PowerOff className="w-4 h-4 mr-2" />
                            비활성화
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-2" />
                            활성화
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(qr.id)} 
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <CardTitle className="text-lg text-white truncate">{qr.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant={qr.isActive && !isExpired(qr) ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {!qr.isActive ? '비활성' : isExpired(qr) ? '만료됨' : '활성'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {qr.type === 'employee' ? '직원용' :
                       qr.type === 'organization' ? '조직용' : '임시용'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* QR 코드 이미지 */}
                <div className="relative">
                  <div className="bg-white p-4 rounded-lg border border-white/20">
                    <img 
                      src={qr.imageUrl} 
                      alt={qr.name}
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white group-hover:opacity-100 opacity-0 transition-opacity"
                      onClick={() => downloadQR(qr)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 통계 정보 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-slate-400" />
                    <span className="text-white">{qr.scanCount.toLocaleString()}</span>
                    <span className="text-slate-300">스캔</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">
                      {qr.lastUsed 
                        ? new Date(qr.lastUsed).toLocaleDateString('ko-KR')
                        : '사용 안됨'
                      }
                    </span>
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="text-xs text-slate-300 space-y-1">
                  {qr.type === 'employee' && 'employeeId' in qr.data && (
                    <>
                      <div>직원 ID: {qr.data.employeeId}</div>
                      {'position' in qr.data && <div>직급: {qr.data.position}</div>}
                    </>
                  )}
                  {(qr.type === 'organization' || qr.type === 'temporary') && 'location' in qr.data && (
                    <>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        반경 {qr.data.location.radius}m
                      </div>
                      {qr.type === 'temporary' && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          만료: {qr.expiresAt.toLocaleDateString('ko-KR')}
                        </div>
                      )}
                    </>
                  )}
                  <div>생성: {qr.createdAt.toLocaleDateString('ko-KR')}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* 목록 형태 */
        <div className="space-y-3">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className="backdrop-blur-xl bg-white/10 border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedQRCodes.includes(qr.id)}
                      onCheckedChange={(checked) => handleSelectQR(qr.id, checked as boolean)}
                    />
                    
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-white rounded border border-white/20 flex-shrink-0">
                        <img 
                          src={qr.imageUrl} 
                          alt={qr.name}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(qr.type)}
                          <h3 className="font-medium text-white">{qr.name}</h3>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(qr)}`} />
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {qr.type === 'employee' ? '직원용' :
                             qr.type === 'organization' ? '조직용' : '임시용'}
                          </Badge>
                          <span className="text-slate-300">
                            {qr.scanCount.toLocaleString()} 스캔
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-300">
                            {qr.createdAt.toLocaleDateString('ko-KR')} 생성
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={qr.isActive && !isExpired(qr) ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {!qr.isActive ? '비활성' : isExpired(qr) ? '만료됨' : '활성'}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => downloadQR(qr)}>
                          <Download className="w-4 h-4 mr-2" />
                          다운로드
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(qr)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          링크 복사
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          상세보기
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          편집
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onStatusChange(qr.id, !qr.isActive)}>
                          {qr.isActive ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-2" />
                              비활성화
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2" />
                              활성화
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(qr.id)} 
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};