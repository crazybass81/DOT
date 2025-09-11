'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Activity, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Download,
  TrendingUp,
  Users,
  Calendar,
  Zap,
  Eye,
  ExternalLink
} from 'lucide-react';

interface QRActivity {
  id: string;
  qrCodeId: string;
  qrCodeName: string;
  scannedBy: string;
  scannedAt: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  result: 'success' | 'failed' | 'blocked';
  reason?: string;
  attendanceType?: 'checkin' | 'checkout';
}

interface QRActivityMonitorProps {
  activities: QRActivity[];
}

export const QRActivityMonitor: React.FC<QRActivityMonitorProps> = ({ activities }) => {
  const [filteredActivities, setFilteredActivities] = useState<QRActivity[]>(activities);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState<'all' | 'success' | 'failed' | 'blocked'>('all');
  const [filterAttendance, setFilterAttendance] = useState<'all' | 'checkin' | 'checkout'>('all');
  const [isLive, setIsLive] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<QRActivity | null>(null);

  // 실시간 업데이트 시뮬레이션
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        // 실제로는 WebSocket이나 Server-Sent Events를 사용
        console.log('실시간 업데이트 확인 중...');
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isLive]);

  // 필터링 로직
  useEffect(() => {
    let filtered = activities;

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(activity => 
        activity.scannedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.qrCodeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 결과 필터
    if (filterResult !== 'all') {
      filtered = filtered.filter(activity => activity.result === filterResult);
    }

    // 출퇴근 유형 필터
    if (filterAttendance !== 'all') {
      filtered = filtered.filter(activity => activity.attendanceType === filterAttendance);
    }

    // 최신순 정렬
    filtered.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());

    setFilteredActivities(filtered);
  }, [activities, searchTerm, filterResult, filterAttendance]);

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'blocked':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'success':
        return 'border-green-400 bg-green-400/10';
      case 'failed':
        return 'border-red-400 bg-red-400/10';
      case 'blocked':
        return 'border-yellow-400 bg-yellow-400/10';
      default:
        return 'border-slate-400 bg-slate-400/10';
    }
  };

  const exportActivities = () => {
    const csvContent = [
      ['시간', '사용자', 'QR 코드', '결과', '출퇴근 유형', '위치', '사유'].join(','),
      ...filteredActivities.map(activity => [
        new Date(activity.scannedAt).toLocaleString('ko-KR'),
        activity.scannedBy,
        activity.qrCodeName,
        activity.result,
        activity.attendanceType || '',
        activity.location?.address || '',
        activity.reason || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `qr-activity-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = {
    total: activities.length,
    success: activities.filter(a => a.result === 'success').length,
    failed: activities.filter(a => a.result === 'failed').length,
    blocked: activities.filter(a => a.result === 'blocked').length,
    todayTotal: activities.filter(a => {
      const today = new Date();
      const activityDate = new Date(a.scannedAt);
      return activityDate.toDateString() === today.toDateString();
    }).length
  };

  return (
    <div className="space-y-6">
      {/* 통계 대시보드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">총 활동</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">성공</p>
                <p className="text-2xl font-bold text-green-400">{stats.success}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">실패</p>
                <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">차단</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.blocked}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">오늘</p>
                <p className="text-2xl font-bold text-purple-400">{stats.todayTotal}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="사용자명 또는 QR 코드명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-slate-400"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterResult} onValueChange={(value: any) => setFilterResult(value)}>
                <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 결과</SelectItem>
                  <SelectItem value="success">성공</SelectItem>
                  <SelectItem value="failed">실패</SelectItem>
                  <SelectItem value="blocked">차단</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAttendance} onValueChange={(value: any) => setFilterAttendance(value)}>
                <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="checkin">출근</SelectItem>
                  <SelectItem value="checkout">퇴근</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setIsLive(!isLive)}
                className={isLive ? 'bg-green-500/20 border-green-500' : ''}
              >
                {isLive ? (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    실시간
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    일시정지
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={exportActivities}>
                <Download className="w-4 h-4 mr-2" />
                내보내기
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 실시간 활동 로그 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="w-5 h-5 text-blue-400" />
                실시간 QR 활동 로그
                {isLive && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400 text-sm">LIVE</span>
                  </div>
                )}
              </CardTitle>
              <CardDescription className="text-slate-300">
                QR 코드 스캔 활동을 실시간으로 모니터링합니다 ({filteredActivities.length}개 결과)
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 mx-auto mb-4 text-slate-400 opacity-50" />
              <p className="text-slate-400">
                {searchTerm || filterResult !== 'all' || filterAttendance !== 'all' 
                  ? '필터 조건에 맞는 활동이 없습니다' 
                  : '아직 QR 활동이 없습니다'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className={`
                    p-4 rounded-lg border transition-all cursor-pointer hover:shadow-lg
                    ${getResultColor(activity.result)}
                  `}
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getResultIcon(activity.result)}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-white">{activity.scannedBy}</span>
                          <span className="text-slate-300">스캔함</span>
                          <Badge variant="outline" className="text-xs">
                            {activity.qrCodeName}
                          </Badge>
                          {activity.attendanceType && (
                            <Badge 
                              variant={activity.attendanceType === 'checkin' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {activity.attendanceType === 'checkin' ? '출근' : '퇴근'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-300">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(activity.scannedAt).toLocaleString('ko-KR')}
                          </div>
                          
                          {activity.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {activity.location.address || `${activity.location.latitude.toFixed(4)}, ${activity.location.longitude.toFixed(4)}`}
                            </div>
                          )}
                        </div>

                        {activity.reason && (
                          <div className="text-sm text-red-300 bg-red-500/10 px-2 py-1 rounded">
                            <span className="font-medium">사유:</span> {activity.reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={activity.result === 'success' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {activity.result === 'success' ? '성공' : 
                         activity.result === 'failed' ? '실패' : '차단'}
                      </Badge>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActivity(activity);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 활동 상세 모달 (향후 구현) */}
      {selectedActivity && (
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <span>활동 상세</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedActivity(null)}
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-300">사용자:</span>
                <span className="ml-2 text-white">{selectedActivity.scannedBy}</span>
              </div>
              <div>
                <span className="text-slate-300">QR 코드:</span>
                <span className="ml-2 text-white">{selectedActivity.qrCodeName}</span>
              </div>
              <div>
                <span className="text-slate-300">시간:</span>
                <span className="ml-2 text-white">{new Date(selectedActivity.scannedAt).toLocaleString('ko-KR')}</span>
              </div>
              <div>
                <span className="text-slate-300">결과:</span>
                <Badge 
                  variant={selectedActivity.result === 'success' ? 'default' : 'destructive'}
                  className="ml-2 text-xs"
                >
                  {selectedActivity.result === 'success' ? '성공' : 
                   selectedActivity.result === 'failed' ? '실패' : '차단'}
                </Badge>
              </div>
              {selectedActivity.attendanceType && (
                <div>
                  <span className="text-slate-300">출퇴근:</span>
                  <span className="ml-2 text-white">
                    {selectedActivity.attendanceType === 'checkin' ? '출근' : '퇴근'}
                  </span>
                </div>
              )}
              {selectedActivity.location && (
                <div className="md:col-span-2">
                  <span className="text-slate-300">위치:</span>
                  <span className="ml-2 text-white">
                    {selectedActivity.location.address || 
                     `위도: ${selectedActivity.location.latitude}, 경도: ${selectedActivity.location.longitude}`}
                  </span>
                </div>
              )}
              {selectedActivity.reason && (
                <div className="md:col-span-2">
                  <span className="text-slate-300">사유:</span>
                  <span className="ml-2 text-red-300">{selectedActivity.reason}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};