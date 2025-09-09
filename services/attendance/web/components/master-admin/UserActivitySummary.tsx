import React from 'react';
import { Users, TrendingUp, Clock, UserCheck } from 'lucide-react';

interface UserActivitySummaryProps {
  totalUsers: number;
  activeUsers: number;
  recentLogins: number;
  averageSessionTime: number;
  loading?: boolean;
  className?: string;
}

export function UserActivitySummary({
  totalUsers,
  activeUsers,
  recentLogins,
  averageSessionTime,
  loading = false,
  className = ""
}: UserActivitySummaryProps) {
  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">사용자 활동 현황</h3>
        <Users className="h-5 w-5 text-primary-500" />
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">{totalUsers}</div>
          <div className="text-sm text-gray-600">총 사용자</div>
        </div>
        
        <div className="text-center p-3 bg-success-50 rounded-lg">
          <div className="text-2xl font-bold text-success-600">{activeUsers}</div>
          <div className="text-sm text-gray-600">활성 사용자</div>
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm text-gray-600">
            <UserCheck className="h-4 w-4 mr-2" />
            최근 로그인
          </div>
          <span className="font-semibold text-gray-900">{recentLogins}명</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            평균 세션 시간
          </div>
          <span className="font-semibold text-gray-900">{formatTime(averageSessionTime)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center text-sm text-gray-600">
            <TrendingUp className="h-4 w-4 mr-2" />
            활성률
          </div>
          <span className="font-semibold text-gray-900">{activeRate}%</span>
        </div>
      </div>
      
      {/* Activity Rate Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>활성률</span>
          <span>{activeRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${activeRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}