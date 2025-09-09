import { FC } from 'react';

interface OrganizationStatsDashboardProps {
  organizationId: string;
}

export const OrganizationStatsDashboard: FC<OrganizationStatsDashboardProps> = ({ organizationId }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">조직 통계 대시보드</h2>
      <p className="text-gray-600">조직 ID: {organizationId}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">총 직원 수</h3>
          <div className="text-3xl font-bold text-blue-600">-</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">오늘 출석률</h3>
          <div className="text-3xl font-bold text-green-600">-</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">이번 달 평균 출석률</h3>
          <div className="text-3xl font-bold text-purple-600">-</div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationStatsDashboard;