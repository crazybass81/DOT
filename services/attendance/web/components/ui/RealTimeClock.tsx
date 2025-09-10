/**
 * Real-Time Clock Component
 * GitHub 스타일 실시간 시계 컴포넌트 - 한국 표준시(KST) 기준
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface RealTimeClockProps {
  className?: string;
  showIcon?: boolean;
  showSeconds?: boolean;
  format?: '12h' | '24h';
}

export default function RealTimeClock({ 
  className = '',
  showIcon = true,
  showSeconds = true,
  format = '24h'
}: RealTimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // 즉시 현재 시간으로 설정
    setCurrentTime(new Date());
    
    // 매초마다 업데이트
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date): string => {
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: format === '12h' ? 'numeric' : '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: format === '12h'
    });
  };

  const formatTimeOnly = (date: Date): string => {
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: format === '12h' ? 'numeric' : '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: format === '12h'
    });
  };

  const formatDateOnly = (date: Date): string => {
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className={`text-center ${className}`} data-testid="real-time-clock">
      {/* 시간 표시 - GitHub 스타일 큰 폰트 */}
      <div className="flex items-center justify-center gap-3 mb-2">
        {showIcon && (
          <Clock className="w-8 h-8 text-primary-600" />
        )}
        <div className="text-4xl md:text-5xl font-bold text-gray-900 font-mono tracking-tight">
          {formatTimeOnly(currentTime)}
        </div>
      </div>
      
      {/* 날짜 표시 */}
      <div className="text-lg md:text-xl text-gray-600 font-medium">
        {formatDateOnly(currentTime)}
      </div>

      {/* 시간대 정보 */}
      <div className="text-sm text-gray-400 mt-1">
        한국 표준시 (KST)
      </div>
    </div>
  );
}

// 시계 성능 최적화를 위한 HOC
export const OptimizedRealTimeClock = React.memo(RealTimeClock);

// 한국어 날짜/시간 유틸리티 함수들
export const koreanTimeUtils = {
  formatKoreanDateTime: (date: Date): string => {
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  },

  formatKoreanTime: (date: Date): string => {
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  },

  formatKoreanDate: (date: Date): string => {
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  },

  isKoreanWeekend: (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }
};