/**
 * 마스터 어드민 조직 목록 페이지
 * TDD Green Phase: 테스트를 통과시키는 최소 구현
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useOrganizationList } from '@/hooks/useOrganizationList';
import { OrganizationDataGrid } from './OrganizationDataGrid';
import { OrganizationSearchFilters } from './OrganizationSearchFilters';
import { OrganizationStats } from './OrganizationStats';
import { RoleType } from '@/types/multi-role';
import { OrganizationListFilters, OrganizationListSort } from '@/types/organization.types';

export function OrganizationListPage() {
  // Auth guard - MASTER_ADMIN 권한 필수
  const { user, loading: authLoading, hasPermission } = useAuthGuard();
  
  // Check master admin permission
  const isMasterAdmin = user?.isMasterAdmin || false;
  const hasAccess = hasPermission && isMasterAdmin;

  // Organization list hook
  const {
    organizations,
    stats,
    pagination,
    isLoading,
    isFetching,
    isError,
    error,
    currentParams,
    updateFilters,
    updateSort,
    updatePagination,
    refresh
  } = useOrganizationList();

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">인증 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
          <p className="text-gray-600">
            이 페이지에 접근하려면 마스터 어드민 권한이 필요합니다.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError && error) {
    const isPermissionError = error.message.includes('permission') || 
                            error.message.includes('권한') ||
                            error.message.includes('Insufficient permissions');

    if (isPermissionError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
            <p className="text-gray-600">
              {error.message}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">조직 목록을 불러오는데 실패했습니다</h1>
          <p className="text-gray-600 mb-4">
            {error.message}
          </p>
          <button
            onClick={refresh}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // Loading state for initial load
  if (isLoading && organizations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">조직 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">조직 관리</h1>
          <p className="mt-2 text-gray-600">
            시스템 내 모든 조직을 관리하고 모니터링할 수 있습니다.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-8">
            <OrganizationStats stats={stats} />
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6">
          <OrganizationSearchFilters
            filters={currentParams.filters || {}}
            onFiltersChange={updateFilters}
            isLoading={isFetching}
          />
        </div>

        {/* Data Grid */}
        <div className="bg-white shadow rounded-lg">
          <OrganizationDataGrid
            organizations={organizations}
            pagination={pagination}
            sort={currentParams.sort}
            onSortChange={updateSort}
            onPageChange={updatePagination}
            isLoading={isFetching}
            isRefetching={isFetching && organizations.length > 0}
          />
        </div>

        {/* Loading overlay for refetch */}
        {isFetching && organizations.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg px-6 py-4 shadow-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-900">데이터 업데이트 중...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}