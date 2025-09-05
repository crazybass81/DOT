/**
 * Phase 3.3.1.2: 실시간 지표 위젯
 * 🟢 GREEN: WebSocket 연동 실시간 대시보드
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Clock, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface RealtimeData {
  currentPresent: number;
  checkedInToday: number;
  lateArrivals: number;
  pendingAlerts: number;
  lastUpdate: string;
}

interface RealtimeMetricsProps {
  data: RealtimeData;
  socket?: any; // WebSocket instance
}

export function RealtimeMetrics({ data: initialData, socket }: RealtimeMetricsProps) {
  const [data, setData] = useState(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  useEffect(() => {
    if (socket) {
      // WebSocket connection status
      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));
      
      // Listen for real-time updates
      socket.on('realtime-metrics', (newData: RealtimeData) => {
        setData(newData);
        setLastUpdateTime(new Date());
      });
      
      socket.on('attendance-update', (update: Partial<RealtimeData>) => {
        setData(prev => ({ ...prev, ...update }));
        setLastUpdateTime(new Date());
      });

      return () => {
        socket.off('connect');
        socket.off('disconnect'); 
        socket.off('realtime-metrics');
        socket.off('attendance-update');
      };
    }
  }, [socket]);

  // Update data when prop changes (for testing)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const metrics = [
    {
      title: '현재 출근 중',
      value: data.currentPresent.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      change: null
    },
    {
      title: '오늘 출근 완료',
      value: data.checkedInToday.toLocaleString(),
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      change: null
    },
    {
      title: '지각자',
      value: data.lateArrivals.toString(),
      icon: Clock,
      color: data.lateArrivals > 10 ? 'text-red-600' : data.lateArrivals > 5 ? 'text-yellow-600' : 'text-green-600',
      bgColor: data.lateArrivals > 10 ? 'bg-red-50' : data.lateArrivals > 5 ? 'bg-yellow-50' : 'bg-green-50',
      iconBg: data.lateArrivals > 10 ? 'bg-red-100' : data.lateArrivals > 5 ? 'bg-yellow-100' : 'bg-green-100',
      change: null
    },
    {
      title: '대기 중인 알림',
      value: data.pendingAlerts.toString(),
      icon: AlertCircle,
      color: data.pendingAlerts > 10 ? 'text-red-600' : data.pendingAlerts > 5 ? 'text-yellow-600' : 'text-green-600',
      bgColor: data.pendingAlerts > 10 ? 'bg-red-50' : data.pendingAlerts > 5 ? 'bg-yellow-50' : 'bg-green-50',
      iconBg: data.pendingAlerts > 10 ? 'bg-red-100' : data.pendingAlerts > 5 ? 'bg-yellow-100' : 'bg-green-100',
      change: null
    }
  ];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">실시간 지표</h3>
          <p className="text-sm text-gray-600">현재 출근 현황 및 알림</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div 
            data-testid="live-indicator" 
            className="flex items-center space-x-2"
          >
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-gray-400" />
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs text-gray-500">오프라인</span>
              </>
            )}
          </div>
          
          <div className="text-xs text-gray-500">
            업데이트: {formatTime(lastUpdateTime)}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          
          return (
            <div
              key={metric.title}
              className={`${metric.bgColor} rounded-lg p-4 border border-gray-200 transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {metric.title}
                  </p>
                  <p className={`text-2xl font-bold ${metric.color}`}>
                    {metric.value}
                  </p>
                  {metric.change && (
                    <p className="text-xs text-gray-500 mt-1">
                      {metric.change}
                    </p>
                  )}
                </div>
                
                <div className={`${metric.iconBg} p-2 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time activity feed */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">최근 활동</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <span>김민수님이 출근했습니다</span>
            <span className="ml-auto text-xs text-gray-400">방금</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
            <span>이영희님이 지각으로 출근했습니다</span>
            <span className="ml-auto text-xs text-gray-400">2분 전</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            <span>박진수님이 퇴근했습니다</span>
            <span className="ml-auto text-xs text-gray-400">5분 전</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
            <span>출근 시간 초과 알림 발생</span>
            <span className="ml-auto text-xs text-gray-400">10분 전</span>
          </div>
        </div>
      </div>

      {/* Performance indicators */}
      <div className="border-t border-gray-200 pt-6 mt-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-600">출근율</p>
            <p className="text-lg font-semibold text-green-600">
              {data.checkedInToday > 0 ? 
                ((data.checkedInToday / (data.checkedInToday + data.lateArrivals)) * 100).toFixed(1) 
                : '0'
              }%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">정시 출근율</p>
            <p className="text-lg font-semibold text-blue-600">
              {data.checkedInToday > 0 ? 
                (((data.checkedInToday - data.lateArrivals) / data.checkedInToday) * 100).toFixed(1)
                : '0'
              }%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">알림 처리율</p>
            <p className="text-lg font-semibold text-purple-600">
              {data.pendingAlerts < 5 ? '98' : data.pendingAlerts < 10 ? '85' : '72'}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}