/**
 * Phase 3.3.1.2: 조직별 통계 대시보드 - 전체 통계 요약 컴포넌트
 * 🟢 GREEN: Magic MCP 기반 현대적 UI 구현
 */

'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Users, UserCheck, AlertTriangle, Clock } from 'lucide-react';

interface OverviewData {
  totalEmployees: number;
  activeUsers: number;
  averageAttendanceRate: number;
  alertsToday: number;
  currentlyPresent: number;
  monthlyTrend: number;
}

interface OrganizationStatsOverviewProps {
  data: OverviewData | null;
  loading?: boolean;
}

export function OrganizationStatsOverview({ data, loading }: OrganizationStatsOverviewProps) {
  if (loading || !data) {
    return (
      <div data-testid="stats-loading" className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: '총 직원 수',
      value: data.totalEmployees.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      trend: null
    },
    {
      title: '활성 사용자',
      value: data.activeUsers.toLocaleString(),
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      trend: data.monthlyTrend > 0 ? 'up' : data.monthlyTrend < 0 ? 'down' : null,
      trendValue: Math.abs(data.monthlyTrend)
    },
    {
      title: '평균 출근율',
      value: `${data.averageAttendanceRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      trend: data.averageAttendanceRate >= 90 ? 'up' : data.averageAttendanceRate >= 80 ? null : 'down'
    },
    {
      title: '오늘 알림',
      value: data.alertsToday.toString(),
      icon: AlertTriangle,
      color: data.alertsToday > 20 ? 'text-red-600' : data.alertsToday > 10 ? 'text-yellow-600' : 'text-green-600',
      bgColor: data.alertsToday > 20 ? 'bg-red-50' : data.alertsToday > 10 ? 'bg-yellow-50' : 'bg-green-50',
      iconBg: data.alertsToday > 20 ? 'bg-red-100' : data.alertsToday > 10 ? 'bg-yellow-100' : 'bg-green-100',
    },
    {
      title: '현재 출근 중',
      value: data.currentlyPresent.toString(),
      icon: Clock,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      subtitle: '명'
    },
    {
      title: '월간 성장률',
      value: `${data.monthlyTrend > 0 ? '+' : ''}${data.monthlyTrend}%`,
      icon: data.monthlyTrend >= 0 ? TrendingUp : TrendingDown,
      color: data.monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: data.monthlyTrend >= 0 ? 'bg-green-50' : 'bg-red-50',
      iconBg: data.monthlyTrend >= 0 ? 'bg-green-100' : 'bg-red-100',
      trend: data.monthlyTrend > 0 ? 'up' : data.monthlyTrend < 0 ? 'down' : null,
      trendValue: Math.abs(data.monthlyTrend)
    }
  ];

  return (
    <div data-testid="stats-overview" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        
        return (
          <div
            key={card.title}
            className={`${card.bgColor} rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <div className="flex items-baseline space-x-2">
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </p>
                  {card.subtitle && (
                    <span className="text-sm text-gray-500">{card.subtitle}</span>
                  )}
                </div>
                
                {card.trend && card.trendValue && (
                  <div className="flex items-center mt-2">
                    {card.trend === 'up' ? (
                      <TrendingUp 
                        data-testid="trend-up" 
                        className="w-4 h-4 text-green-500 mr-1" 
                      />
                    ) : (
                      <TrendingDown 
                        data-testid="trend-down" 
                        className="w-4 h-4 text-red-500 mr-1" 
                      />
                    )}
                    <span className={`text-sm font-medium ${
                      card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {card.trend === 'up' ? '+' : '-'}{card.trendValue}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className={`${card.iconBg} p-3 rounded-xl`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}