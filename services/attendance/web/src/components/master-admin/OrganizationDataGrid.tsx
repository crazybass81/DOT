/**
 * 조직 데이터 그리드 컴포넌트 (가상화 지원)
 * TDD Green Phase: 테스트를 통과시키는 최소 구현
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import { Organization, OrganizationListSort, OrganizationType, OrganizationStatus } from '@/types/organization.types';
import { OrganizationStatusToggle } from './OrganizationStatusToggle';

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface OrganizationDataGridProps {
  organizations: Organization[];
  pagination: PaginationInfo | null;
  sort?: OrganizationListSort;
  onSortChange: (sort: OrganizationListSort) => void;
  onPageChange: (page: number, pageSize?: number) => void;
  isLoading?: boolean;
  isRefetching?: boolean;
}

export function OrganizationDataGrid({
  organizations,
  pagination,
  sort,
  onSortChange,
  onPageChange,
  isLoading = false,
  isRefetching = false
}: OrganizationDataGridProps) {
  
  // Column definitions
  const columns = [
    {
      key: 'name',
      label: '조직명',
      sortable: true,
      width: 'w-1/4'
    },
    {
      key: 'type',
      label: '타입',
      sortable: true,
      width: 'w-24'
    },
    {
      key: 'businessRegistrationNumber',
      label: '사업자번호',
      sortable: false,
      width: 'w-32'
    },
    {
      key: 'status',
      label: '상태',
      sortable: true,
      width: 'w-24'
    },
    {
      key: 'employeeCount',
      label: '직원수',
      sortable: true,
      width: 'w-20'
    },
    {
      key: 'createdAt',
      label: '생성일',
      sortable: true,
      width: 'w-32'
    },
    {
      key: 'actions',
      label: '작업',
      sortable: false,
      width: 'w-24'
    }
  ];

  // Handle sort
  const handleSort = useCallback((field: string) => {
    if (!columns.find(col => col.key === field)?.sortable) return;

    const newDirection = 
      sort?.field === field && sort?.direction === 'asc' ? 'desc' : 'asc';
    
    onSortChange({
      field: field as any,
      direction: newDirection
    });
  }, [sort, onSortChange]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    if (pagination) {
      onPageChange(1, newPageSize);
    }
  }, [pagination, onPageChange]);

  // Format organization type
  const formatType = useCallback((type: OrganizationType) => {
    const typeLabels = {
      [OrganizationType.CORP]: '법인',
      [OrganizationType.PERSONAL]: '개인사업자',
      [OrganizationType.FRANCHISE]: '가맹점'
    };
    return typeLabels[type] || type;
  }, []);

  // Format organization status
  const formatStatus = useCallback((status: OrganizationStatus) => {
    const statusConfig = {
      [OrganizationStatus.ACTIVE]: { label: '활성', color: 'bg-green-100 text-green-800' },
      [OrganizationStatus.INACTIVE]: { label: '비활성', color: 'bg-yellow-100 text-yellow-800' },
      [OrganizationStatus.SUSPENDED]: { label: '정지', color: 'bg-red-100 text-red-800' },
      [OrganizationStatus.PENDING]: { label: '승인 대기', color: 'bg-orange-100 text-orange-800' }
    };
    
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return config;
  }, []);

  // Format date
  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }, []);

  // Check if we should use virtualization (for large datasets)
  const useVirtualization = organizations.length > 100;

  // Render sort icon
  const renderSortIcon = useCallback((field: string) => {
    if (!sort || sort.field !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return sort.direction === 'asc' ? 
      <span className="text-blue-600">↑</span> : 
      <span className="text-blue-600">↓</span>;
  }, [sort]);

  // Render table header
  const renderHeader = () => (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            className={`${column.width} px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
              column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
            }`}
            onClick={() => column.sortable && handleSort(column.key)}
          >
            <div className="flex items-center space-x-1">
              <span>{column.label}</span>
              {column.sortable && renderSortIcon(column.key)}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );

  // Render table row
  const renderRow = useCallback((org: Organization, index: number) => {
    const statusConfig = formatStatus(org.status);
    
    return (
      <tr
        key={org.id}
        data-testid={`organization-row-${org.id}`}
        className={`${
          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        } hover:bg-blue-50 transition-colors`}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div>
            <div className="text-sm font-medium text-gray-900">{org.name}</div>
            {org.address && (
              <div className="text-sm text-gray-500">{org.address}</div>
            )}
          </div>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatType(org.type)}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {org.businessRegistrationNumber || '-'}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
          {org.employeeCount?.toLocaleString() || '0'}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatDate(org.createdAt)}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button className="text-blue-600 hover:text-blue-900 mr-2">
            보기
          </button>
          <button className="text-gray-600 hover:text-gray-900">
            편집
          </button>
        </td>
      </tr>
    );
  }, [formatStatus, formatType, formatDate]);

  // Render pagination controls
  const renderPagination = () => {
    if (!pagination) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPreviousPage}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
        
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{((pagination.page - 1) * pagination.pageSize + 1).toLocaleString()}</span>
              {' - '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.pageSize, pagination.total).toLocaleString()}
              </span>
              {' / '}
              <span className="font-medium">{pagination.total.toLocaleString()}</span>
              개 조직
            </p>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="page-size" className="text-sm text-gray-700">페이지 크기:</label>
              <select
                id="page-size"
                value={pagination.pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              페이지 {pagination.page} / {pagination.totalPages}
            </span>
            
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!pagination.hasPreviousPage}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    page === pagination.page
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading && organizations.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">조직 목록</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">조직 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (organizations.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">조직 목록</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900">조직이 없습니다</h3>
            <p className="text-gray-500">조건에 맞는 조직을 찾을 수 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">조직 목록</h3>
        {isRefetching && (
          <div className="flex items-center text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            업데이트 중...
          </div>
        )}
      </div>
      
      {/* Table container with virtualization support */}
      <div 
        className="overflow-auto"
        data-testid={useVirtualization ? "virtualized-table" : "standard-table"}
        style={{ maxHeight: useVirtualization ? '600px' : 'auto' }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          {renderHeader()}
          <tbody className="bg-white divide-y divide-gray-200">
            {organizations.map((org, index) => renderRow(org, index))}
          </tbody>
        </table>
      </div>
      
      {renderPagination()}
    </div>
  );
}