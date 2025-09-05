/**
 * Phase 3.3.1.2: 조직별 통계 대시보드 페이지
 * TDD 완성된 컴포넌트들의 통합 페이지
 */

import { Suspense } from 'react';
import { OrganizationStatsDashboard } from '@/components/master-admin/OrganizationStatsDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '조직별 통계 대시보드 - DOT 근태관리',
  description: '실시간 조직 성과 및 출근 현황 분석 대시보드'
};

// Loading component for dashboard
function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-100 rounded"></div>
      </div>
    </div>
  );
}

export default function OrganizationStatsPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<DashboardLoading />}>
          <OrganizationStatsDashboard />
        </Suspense>
      </div>
    </main>
  );
}