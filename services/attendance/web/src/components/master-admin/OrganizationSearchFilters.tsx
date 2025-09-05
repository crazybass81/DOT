/**
 * 조직 검색 및 필터 컴포넌트
 * TDD Green Phase: 테스트를 통과시키는 최소 구현
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { OrganizationListFilters, OrganizationType, OrganizationStatus } from '@/types/organization.types';

interface OrganizationSearchFiltersProps {
  filters: OrganizationListFilters;
  onFiltersChange: (filters: Partial<OrganizationListFilters>) => void;
  isLoading?: boolean;
}

export function OrganizationSearchFilters({
  filters,
  onFiltersChange,
  isLoading = false
}: OrganizationSearchFiltersProps) {
  // Local state for form inputs
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [employeeRangeValue, setEmployeeRangeValue] = useState(
    filters.employeeCountRange ? 
    `${filters.employeeCountRange.min || ''}-${filters.employeeCountRange.max || ''}` : 
    ''
  );

  // Status options
  const statusOptions = [
    { value: OrganizationStatus.ACTIVE, label: '활성', color: 'text-green-600' },
    { value: OrganizationStatus.INACTIVE, label: '비활성', color: 'text-yellow-600' },
    { value: OrganizationStatus.SUSPENDED, label: '정지', color: 'text-red-600' },
    { value: OrganizationStatus.PENDING, label: '승인 대기', color: 'text-orange-600' }
  ];

  // Type options
  const typeOptions = [
    { value: OrganizationType.CORP, label: '법인' },
    { value: OrganizationType.PERSONAL, label: '개인사업자' },
    { value: OrganizationType.FRANCHISE, label: '가맹점' }
  ];

  // Quick filter presets
  const quickFilters = [
    {
      label: '활성만',
      filters: { status: [OrganizationStatus.ACTIVE] }
    },
    {
      label: '법인만',
      filters: { type: [OrganizationType.CORP] }
    },
    {
      label: '승인 대기',
      filters: { status: [OrganizationStatus.PENDING] }
    },
    {
      label: '대기업 (50명+)',
      filters: { employeeCountRange: { min: 50 } }
    }
  ];

  // Handle search
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({
      search: searchValue.trim() || undefined
    });
  }, [searchValue, onFiltersChange]);

  // Handle status filter change
  const handleStatusChange = useCallback((status: OrganizationStatus, checked: boolean) => {
    const currentStatus = filters.status || [];
    const newStatus = checked
      ? [...currentStatus, status]
      : currentStatus.filter(s => s !== status);
    
    onFiltersChange({
      status: newStatus.length > 0 ? newStatus : undefined
    });
  }, [filters.status, onFiltersChange]);

  // Handle type filter change
  const handleTypeChange = useCallback((type: OrganizationType, checked: boolean) => {
    const currentTypes = filters.type || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    onFiltersChange({
      type: newTypes.length > 0 ? newTypes : undefined
    });
  }, [filters.type, onFiltersChange]);

  // Handle employee count range change
  const handleEmployeeRangeChange = useCallback((value: string) => {
    setEmployeeRangeValue(value);
    
    if (!value.trim()) {
      onFiltersChange({
        employeeCountRange: undefined
      });
      return;
    }

    const parts = value.split('-');
    const min = parts[0]?.trim() ? parseInt(parts[0].trim(), 10) : undefined;
    const max = parts[1]?.trim() ? parseInt(parts[1].trim(), 10) : undefined;

    if (min !== undefined || max !== undefined) {
      onFiltersChange({
        employeeCountRange: { min, max }
      });
    }
  }, [onFiltersChange]);

  // Handle quick filter
  const handleQuickFilter = useCallback((quickFilter: typeof quickFilters[0]) => {
    onFiltersChange(quickFilter.filters);
  }, [onFiltersChange]);

  // Handle clear all filters
  const handleClearAll = useCallback(() => {
    setSearchValue('');
    setEmployeeRangeValue('');
    onFiltersChange({
      search: undefined,
      status: undefined,
      type: undefined,
      employeeCountRange: undefined,
      dateRange: undefined
    });
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      (filters.status && filters.status.length > 0) ||
      (filters.type && filters.type.length > 0) ||
      filters.employeeCountRange ||
      filters.dateRange
    );
  }, [filters]);

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="space-y-6">
        {/* Search Bar */}
        <div>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="조직명 또는 사업자번호로 검색"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading}
            >
              검색
            </button>
          </form>
        </div>

        {/* Quick Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            빠른 필터
          </label>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((quickFilter) => (
              <button
                key={quickFilter.label}
                onClick={() => handleQuickFilter(quickFilter)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                {quickFilter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태
            </label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(option.value) || false}
                    onChange={(e) => handleStatusChange(option.value, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <span className={`ml-2 text-sm ${option.color}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              조직 타입
            </label>
            <div className="space-y-2">
              {typeOptions.map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.type?.includes(option.value) || false}
                    onChange={(e) => handleTypeChange(option.value, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Employee Count Range */}
          <div>
            <label htmlFor="employee-range" className="block text-sm font-medium text-gray-700 mb-2">
              직원수
            </label>
            <input
              id="employee-range"
              type="text"
              placeholder="예: 10-50"
              value={employeeRangeValue}
              onChange={(e) => handleEmployeeRangeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              범위 형식: 최소-최대 (예: 10-50)
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading || !hasActiveFilters}
            >
              필터 초기화
            </button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">적용된 필터:</h4>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  검색: {filters.search}
                  <button
                    onClick={() => onFiltersChange({ search: undefined })}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.status?.map(status => (
                <span key={status} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  상태: {statusOptions.find(opt => opt.value === status)?.label}
                  <button
                    onClick={() => handleStatusChange(status, false)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              {filters.type?.map(type => (
                <span key={type} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  타입: {typeOptions.find(opt => opt.value === type)?.label}
                  <button
                    onClick={() => handleTypeChange(type, false)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              {filters.employeeCountRange && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                  직원수: {filters.employeeCountRange.min || '0'}-{filters.employeeCountRange.max || '∞'}
                  <button
                    onClick={() => onFiltersChange({ employeeCountRange: undefined })}
                    className="ml-2 text-yellow-600 hover:text-yellow-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}