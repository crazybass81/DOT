'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface GitHubStyleClockProps {
  className?: string;
  showSeconds?: boolean;
  showDate?: boolean;
}

export default function GitHubStyleClock({ 
  className = '', 
  showSeconds = true, 
  showDate = true 
}: GitHubStyleClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' }),
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className={`text-center ${className}`}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-2">
          <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-1">현재 시간</p>
        </div>
        <div className="text-5xl md:text-6xl font-mono font-bold text-gray-900 mb-2">
          {formatTime(currentTime)}
        </div>
        {showDate && (
          <p className="text-lg text-gray-600">
            {formatDate(currentTime)}
          </p>
        )}
      </div>
    </div>
  );
}