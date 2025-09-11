'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  Target
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

interface QRActivity {
  id: string;
  qrCodeId: string;
  timestamp: Date;
  action: 'checkin' | 'checkout' | 'scan';
  location?: { latitude: number; longitude: number };
  success: boolean;
  error?: string;
}

interface RealTimeStats {
  totalScans: number;
  successfulScans: number;
  activeQRs: number;
  recentActivity: number;
}

interface QRActivityMonitorProps {
  activities: QRActivity[];
  qrCodes: QRCodeRecord[];
  stats: RealTimeStats;
}

export const QRActivityMonitor: React.FC<QRActivityMonitorProps> = ({
  activities,
  qrCodes,
  stats
}) => {
  const [timeFilter, setTimeFilter] = useState<'1h' | '24h' | '7d' | '30d' | 'all'>('24h');
  const [actionFilter, setActionFilter] = useState<'all' | 'checkin' | 'checkout' | 'scan'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  // 시간 필터에 따른 활동 필터링
  const filteredActivities = useMemo(() => {
    const now = new Date();
    let cutoffTime: Date;
    
    switch (timeFilter) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(0);
    }

    return activities.filter(activity => {
      const timeMatch = activity.timestamp >= cutoffTime;
      const actionMatch = actionFilter === 'all' || activity.action === actionFilter;
      const statusMatch = statusFilter === 'all' || 
                         (statusFilter === 'success' ? activity.success : !activity.success);
      
      return timeMatch && actionMatch && statusMatch;
    });
  }, [activities, timeFilter, actionFilter, statusFilter]);

  // 시간대별 활동 통계 (최근 24시간)
  const hourlyStats = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - i, 0, 0, 0);
      return {
        hour: hour.getHours(),
        timestamp: hour,
        activities: 0,
        successful: 0
      };
    }).reverse();

    filteredActivities.forEach(activity => {
      const activityHour = activity.timestamp.getHours();
      const hourData = hours.find(h => h.hour === activityHour);
      if (hourData) {
        hourData.activities++;
        if (activity.success) hourData.successful++;
      }
    });

    return hours;
  }, [filteredActivities]);

  // QR 코드별 사용 통계
  const qrUsageStats = useMemo(() => {
    const usageMap = new Map<string, { name: string; count: number; lastUsed: Date | null }>();
    
    qrCodes.forEach(qr => {
      usageMap.set(qr.id, {
        name: qr.name,
        count: 0,
        lastUsed: null
      });
    });

    filteredActivities.forEach(activity => {
      const qr = qrCodes.find(q => q.id === activity.qrCodeId);
      if (qr && activity.success) {
        const current = usageMap.get(qr.id) || { name: qr.name, count: 0, lastUsed: null };
        current.count++;
        if (!current.lastUsed || activity.timestamp > current.lastUsed) {
          current.lastUsed = activity.timestamp;
        }
        usageMap.set(qr.id, current);
      }
    });

    return Array.from(usageMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredActivities, qrCodes]);

  // QR 코드 이름 찾기
  const getQRCodeName = (qrCodeId: string) => {
    const qr = qrCodes.find(q => q.id === qrCodeId);
    return qr ? qr.name : '알 수 없음';
  };

  // 성공률 계산
  const successRate = filteredActivities.length > 0 
    ? Math.round((filteredActivities.filter(a => a.success).length / filteredActivities.length) * 100)
    : 0;

  // CSV 다운로드
  const downloadCSV = () => {
    const csvData = [
      ['시간', 'QR코드', '액션', '성공여부', '위치', '오류'],
      ...filteredActivities.map(activity => [
        activity.timestamp.toLocaleString('ko-KR'),
        getQRCodeName(activity.qrCodeId),
        activity.action,
        activity.success ? '성공' : '실패',
        activity.location ? `${activity.location.latitude}, ${activity.location.longitude}` : '',
        activity.error || ''
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `qr-activity-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 모니터링 헤더 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="w-5 h-5 text-orange-400" />
                실시간 QR 활동 모니터링
              </CardTitle>
              <CardDescription className="text-slate-300">
                QR 코드 스캔 활동을 실시간으로 추적하고 분석합니다
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                CSV 다운로드
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 실시간 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">성공률</p>
                <p className="text-2xl font-bold text-green-400">{successRate}%</p>
              </div>
              <Target className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">필터된 활동</p>
                <p className="text-2xl font-bold text-blue-400">{filteredActivities.length}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">활성 QR</p>
                <p className="text-2xl font-bold text-purple-400">{stats.activeQRs}</p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">시간당 평균</p>
                <p className="text-2xl font-bold text-orange-400">
                  {timeFilter === '24h' ? Math.round(filteredActivities.length / 24) : 
                   timeFilter === '1h' ? filteredActivities.length :
                   Math.round(filteredActivities.length / (timeFilter === '7d' ? 168 : 720))}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 컨트롤 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">시간 범위</label>
              <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">최근 1시간</SelectItem>
                  <SelectItem value="24h">최근 24시간</SelectItem>
                  <SelectItem value="7d">최근 7일</SelectItem>
                  <SelectItem value="30d">최근 30일</SelectItem>
                  <SelectItem value="all">전체</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">액션 타입</label>
              <Select value={actionFilter} onValueChange={(value: any) => setActionFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="checkin">출근</SelectItem>
                  <SelectItem value="checkout">퇴근</SelectItem>
                  <SelectItem value="scan">스캔</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">상태</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="success">성공</SelectItem>
                  <SelectItem value="failed">실패</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 시간대별 활동 차트 */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">시간대별 활동</CardTitle>
            <CardDescription className="text-slate-300">
              최근 24시간 QR 스캔 활동 패턴
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hourlyStats.slice(-12).map((hour, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-12">
                    {hour.hour.toString().padStart(2, '0')}:00
                  </span>
                  <div className="flex-1 bg-slate-800 rounded-full h-4 relative">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${hour.activities > 0 ? Math.max((hour.activities / Math.max(...hourlyStats.map(h => h.activities))) * 100, 5) : 0}%` 
                      }}
                    />
                    <span className="absolute right-2 top-0 text-xs text-white leading-4">
                      {hour.activities}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* QR 코드별 사용 통계 */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">QR 코드별 사용량</CardTitle>
            <CardDescription className="text-slate-300">
              가장 많이 사용된 QR 코드 Top 10
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {qrUsageStats.map((qr, index) => (
                <div key={qr.id} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-6">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white truncate">{qr.name}</span>
                      <span className="text-sm text-slate-300">{qr.count}회</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-2 mt-1">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${qr.count > 0 ? Math.max((qr.count / Math.max(...qrUsageStats.map(q => q.count))) * 100, 5) : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {qrUsageStats.length === 0 && (
                <p className="text-center text-slate-400 py-4">사용 데이터가 없습니다</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 활동 목록 */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">최근 활동 기록</CardTitle>
          <CardDescription className="text-slate-300">
            실시간 QR 스캔 활동 내역 ({filteredActivities.length}건)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredActivities.slice(0, 50).map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {activity.success ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {getQRCodeName(activity.qrCodeId)}
                      </span>
                      <Badge variant={activity.action === 'checkin' ? 'default' : 'secondary'}>
                        {activity.action === 'checkin' ? '출근' : 
                         activity.action === 'checkout' ? '퇴근' : '스캔'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.timestamp.toLocaleString('ko-KR')}
                      </span>
                      {activity.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {activity.location.latitude.toFixed(4)}, {activity.location.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                    
                    {activity.error && (
                      <p className="text-sm text-red-400 mt-1">{activity.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredActivities.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                선택한 필터 조건에 맞는 활동이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};