/**
 * 조직 통계 컴포넌트
 * TDD Green Phase: 테스트를 통과시키는 최소 구현
 */

'use client';

import React from 'react';
import { OrganizationStats as StatsType, OrganizationType } from '@/types/organization.types';

interface OrganizationStatsProps {
  stats: StatsType;
}

export function OrganizationStats({ stats }: OrganizationStatsProps) {
  const statCards = [
    {
      title: '전체 조직',
      value: stats.totalOrganizations.toLocaleString(),
      icon: '🏢',
      color: 'bg-blue-500'
    },
    {
      title: '활성 조직',
      value: stats.activeOrganizations.toLocaleString(),
      icon: '✅',
      color: 'bg-green-500'
    },
    {
      title: '비활성 조직',
      value: stats.inactiveOrganizations.toLocaleString(),
      icon: '⏸️',
      color: 'bg-yellow-500'
    },
    {
      title: '승인 대기',
      value: stats.pendingOrganizations.toLocaleString(),
      icon: '⏳',
      color: 'bg-orange-500'
    },
    {
      title: '전체 직원',
      value: stats.totalEmployees.toLocaleString(),
      icon: '👥',
      color: 'bg-purple-500'
    },
    {
      title: '신규 조직 (7일)',
      value: stats.recentCreations.toLocaleString(),
      icon: '🆕',
      color: 'bg-indigo-500'
    }
  ];

  const typeLabels = {
    [OrganizationType.CORP]: '법인',
    [OrganizationType.PERSONAL]: '개인사업자',
    [OrganizationType.FRANCHISE]: '가맹점'
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center text-white text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Organization by Type */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">조직 타입별 분포</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(stats.organizationsByType).map(([type, count]) => {
            const percentage = stats.totalOrganizations > 0 
              ? ((count / stats.totalOrganizations) * 100).toFixed(1)
              : '0.0';

            return (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {count.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  {typeLabels[type as OrganizationType]} ({percentage}%)
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Health Indicators */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">시스템 상태</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">
              {stats.activeOrganizations / stats.totalOrganizations >= 0.8 ? '🟢' : 
               stats.activeOrganizations / stats.totalOrganizations >= 0.6 ? '🟡' : '🔴'}
            </div>
            <div>
              <p className="text-sm text-gray-600">활성화 비율</p>
              <p className="font-medium">
                {stats.totalOrganizations > 0 
                  ? ((stats.activeOrganizations / stats.totalOrganizations) * 100).toFixed(1)
                  : '0.0'
                }%
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="text-2xl mr-3">
              {stats.pendingOrganizations === 0 ? '🟢' : 
               stats.pendingOrganizations <= 5 ? '🟡' : '🔴'}
            </div>
            <div>
              <p className="text-sm text-gray-600">대기 조직</p>
              <p className="font-medium">{stats.pendingOrganizations}개</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="text-2xl mr-3">
              {stats.totalEmployees > 1000 ? '🟢' : 
               stats.totalEmployees > 100 ? '🟡' : '🔴'}
            </div>
            <div>
              <p className="text-sm text-gray-600">평균 직원수</p>
              <p className="font-medium">
                {stats.totalOrganizations > 0 
                  ? Math.round(stats.totalEmployees / stats.totalOrganizations)
                  : 0
                }명
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="text-2xl mr-3">
              {stats.recentCreations >= 10 ? '🟢' : 
               stats.recentCreations >= 5 ? '🟡' : '🔴'}
            </div>
            <div>
              <p className="text-sm text-gray-600">성장률</p>
              <p className="font-medium">
                {stats.recentCreations > 0 ? '증가' : '정체'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}