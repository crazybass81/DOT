'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuthService } from '@/src/services/supabaseAuthService';
import { useUserManagement } from '@/hooks/useUserManagement';
import { UserDataGrid } from '@/components/master-admin/UserDataGrid';
import { UserSearchFilters } from '@/components/master-admin/UserSearchFilters';
import { UserDetailModal } from '@/components/master-admin/UserDetailModal';
import { UserActivitySummary } from '@/components/master-admin/UserActivitySummary';

export function UserManagementPage() {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const {
    users,
    loading,
    error,
    totalCount,
    searchQuery,
    filters,
    pagination,
    hasNextPage,
    searchUsers,
    setFilters,
    loadMore,
    reset,
    refresh,
  } = useUserManagement();

  // 권한 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await supabaseAuthService.getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // MASTER_ADMIN 권한 확인 로직 필요
        // 실제로는 사용자 역할을 확인하는 API 호출이 필요
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedUserId(null);
  };

  const handleRetry = () => {
    reset();
    refresh();
  };

  // 로딩 상태
  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
            <p className="text-gray-600 mt-2">전체 시스템 사용자 조회 및 관리</p>
          </div>
          
          <div data-testid="user-list-skeleton" className="space-y-4">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="w-20 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">오류가 발생했습니다</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 빈 상태
  if (!loading && users.length === 0) {
    const isEmpty = !searchQuery && Object.keys(filters).length === 0;
    const hasSearchOrFilter = searchQuery || Object.keys(filters).length > 0;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
            <p className="text-gray-600 mt-2">전체 시스템 사용자 조회 및 관리</p>
          </div>

          <UserSearchFilters />

          <div className="bg-white rounded-lg shadow-md p-8 text-center mt-8">
            <div data-testid={isEmpty ? "empty-users-illustration" : "no-search-results"} 
                 className="w-24 h-24 mx-auto mb-4 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            
            {isEmpty ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">등록된 사용자가 없습니다</h3>
                <p className="text-gray-600">시스템에 등록된 사용자가 없습니다.</p>
              </>
            ) : hasSearchOrFilter && searchQuery ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
                <p className="text-gray-600 mb-4">
                  '<span className="font-medium">{searchQuery}</span>'에 대한 검색 결과가 없습니다.
                </p>
                <button
                  onClick={() => {
                    searchUsers('');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  검색 초기화
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">필터 조건에 맞는 사용자가 없습니다</h3>
                <p className="text-gray-600 mb-4">설정한 필터 조건에 맞는 사용자가 없습니다.</p>
                <button
                  onClick={() => {
                    setFilters({});
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  필터 초기화
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 메인 렌더링
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
              <p className="text-gray-600 mt-1">전체 시스템 사용자 조회 및 관리</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <UserActivitySummary totalUsers={totalCount} />
              <button
                onClick={refresh}
                disabled={loading}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? '새로고침 중...' : '새로고침'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 및 필터 */}
        <div className="mb-6">
          <UserSearchFilters />
        </div>

        {/* 사용자 데이터 그리드 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                사용자 목록
                <span className="ml-2 text-sm text-gray-500">
                  ({totalCount.toLocaleString()}명)
                </span>
              </h2>
              
              {searchQuery && (
                <div className="text-sm text-gray-600">
                  '<span className="font-medium">{searchQuery}</span>' 검색 결과
                </div>
              )}
            </div>
          </div>

          <UserDataGrid
            users={users}
            totalCount={totalCount}
            loading={loading}
            hasNextPage={hasNextPage}
            onUserSelect={handleUserSelect}
            onLoadMore={loadMore}
          />
        </div>
      </div>

      {/* 사용자 상세 모달 */}
      <UserDetailModal
        userId={selectedUserId}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default UserManagementPage;