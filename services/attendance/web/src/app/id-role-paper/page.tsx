/**
 * ID-ROLE-PAPER System Main Dashboard
 * Unified dashboard for identity, business, paper, and permission management
 * 
 * Features:
 * - Navigation between all system modules
 * - System overview and statistics
 * - Quick access to common operations
 * - Role-based dashboard customization
 */

'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../../contexts/AuthContext';
import { RoleType, IdentityWithContext } from '../../../types/id-role-paper';
import Navigation from '../../../components/common/Navigation';

// Lazy load components for better performance
const IdentityManagement = dynamic(() => import('../../../components/id-role-paper/IdentityManagement'), {
  loading: () => <div className="p-8 text-center">신원 관리 로딩 중...</div>
});

const BusinessRegistrationManagement = dynamic(() => import('../../../components/id-role-paper/BusinessRegistration'), {
  loading: () => <div className="p-8 text-center">사업자 관리 로딩 중...</div>
});

const PaperManagement = dynamic(() => import('../../../components/id-role-paper/PaperManagement'), {
  loading: () => <div className="p-8 text-center">문서 관리 로딩 중...</div>
});

const PermissionDashboard = dynamic(() => import('../../../components/id-role-paper/PermissionDashboard'), {
  loading: () => <div className="p-8 text-center">권한 대시보드 로딩 중...</div>
});

type ModuleType = 'dashboard' | 'identity' | 'business' | 'papers' | 'permissions';

interface DashboardStats {
  identitiesCount: number;
  businessesCount: number;
  papersCount: number;
  activePermissions: number;
}

const IDRolePaperDashboard: React.FC = () => {
  const { user, identity, loading, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && activeModule === 'dashboard') {
      loadDashboardStats();
    }
  }, [user, activeModule]);

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Load stats from various endpoints
      const [identitiesRes, businessesRes, papersRes] = await Promise.all([
        fetch('/api/identity?limit=1', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch('/api/business?limit=1', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch('/api/papers?limit=1', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
      ]);

      const [identitiesData, businessesData, papersData] = await Promise.all([
        identitiesRes.ok ? identitiesRes.json() : { data: [] },
        businessesRes.ok ? businessesRes.json() : { data: [] },
        papersRes.ok ? papersRes.json() : { data: [] }
      ]);

      setStats({
        identitiesCount: identitiesData.data?.length || 0,
        businessesCount: businessesData.data?.length || 0,
        papersCount: papersData.data?.length || 0,
        activePermissions: identity?.permissions?.length || 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const getAvailableModules = (): { id: ModuleType; name: string; description: string; icon: string; disabled?: boolean }[] => {
    const modules = [
      {
        id: 'dashboard' as ModuleType,
        name: '대시보드',
        description: '시스템 개요 및 통계',
        icon: '📊'
      },
      {
        id: 'identity' as ModuleType,
        name: '신원 관리',
        description: '개인/법인 신원 관리',
        icon: '👤'
      },
      {
        id: 'business' as ModuleType,
        name: '사업자 관리',
        description: '사업자 등록 및 관리',
        icon: '🏢'
      },
      {
        id: 'papers' as ModuleType,
        name: '문서 관리',
        description: '문서 라이프사이클 관리',
        icon: '📄'
      },
      {
        id: 'permissions' as ModuleType,
        name: '권한 관리',
        description: 'RBAC 시각화 및 제어',
        icon: '🔐'
      }
    ];

    return modules;
  };

  const getRoleColor = (role: RoleType): string => {
    const colors = {
      [RoleType.SEEKER]: 'bg-gray-100 text-gray-800',
      [RoleType.WORKER]: 'bg-blue-100 text-blue-800',
      [RoleType.SUPERVISOR]: 'bg-green-100 text-green-800',
      [RoleType.MANAGER]: 'bg-yellow-100 text-yellow-800',
      [RoleType.OWNER]: 'bg-purple-100 text-purple-800',
      [RoleType.FRANCHISEE]: 'bg-indigo-100 text-indigo-800',
      [RoleType.FRANCHISOR]: 'bg-red-100 text-red-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const renderDashboardOverview = () => {
    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ID-ROLE-PAPER 시스템에 오신 것을 환영합니다
              </h2>
              {user && (
                <div className="space-y-1">
                  <p className="text-gray-600">사용자: {user.email}</p>
                  {identity && (
                    <>
                      <p className="text-gray-600">신원: {identity.identity.fullName}</p>
                      {identity.primaryRole && (
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(identity.primaryRole)}`}>
                          주요 역할: {identity.primaryRole}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingStats ? (
            <div className="col-span-full p-8 text-center text-gray-500">
              통계 로딩 중...
            </div>
          ) : error ? (
            <div className="col-span-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          ) : stats ? (
            <>
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">👤</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.identitiesCount}</p>
                    <p className="text-gray-600">등록된 신원</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🏢</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.businessesCount}</p>
                    <p className="text-gray-600">등록된 사업자</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">📄</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.papersCount}</p>
                    <p className="text-gray-600">관리 문서</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🔐</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.activePermissions}</p>
                    <p className="text-gray-600">활성 권한</p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">빠른 작업</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getAvailableModules().filter(m => m.id !== 'dashboard').map((module) => (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                disabled={module.disabled}
                className="p-4 text-left bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="text-2xl mb-2">{module.icon}</div>
                <div className="font-medium">{module.name}</div>
                <div className="text-sm text-gray-600">{module.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Role Information */}
        {identity && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">내 역할 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">보유 역할</label>
                <div className="flex flex-wrap gap-2">
                  {identity.availableRoles.map((role, index) => (
                    <span key={index} className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(role)}`}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">활성 권한</label>
                <div className="text-sm text-gray-600">
                  {identity.permissions.length}개의 권한이 활성화되어 있습니다.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">시스템 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <p className="text-gray-600">ID-ROLE-PAPER 시스템에 접근하려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  const availableModules = getAvailableModules();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeModule === 'dashboard' && renderDashboardOverview()}
        {activeModule === 'identity' && <IdentityManagement />}
        {activeModule === 'business' && <BusinessRegistrationManagement />}
        {activeModule === 'papers' && <PaperManagement />}
        {activeModule === 'permissions' && <PermissionDashboard />}
      </main>
    </div>
  );
};

export default IDRolePaperDashboard;
