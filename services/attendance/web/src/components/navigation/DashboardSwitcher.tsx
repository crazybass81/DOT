'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getDashboardSwitcherOptions, getUserRoleSummary } from '../../utils/smart-routing';
import { MultiRoleUser } from '../../types/multi-role';

interface DashboardSwitcherProps {
  user: MultiRoleUser;
  currentOrganizationId?: string;
  onDashboardChange?: (dashboardPath: string, organizationId: string) => void;
}

const DashboardSwitcher: React.FC<DashboardSwitcherProps> = ({
  user,
  currentOrganizationId,
  onDashboardChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleSummary = getUserRoleSummary(user);
  const switcherOptions = getDashboardSwitcherOptions(user);

  // 현재 대시보드 정보 결정
  const getCurrentDashboardInfo = () => {
    for (const org of switcherOptions) {
      for (const dashboard of org.dashboards) {
        if (pathname.startsWith(dashboard.path)) {
          return {
            dashboard,
            organizationName: org.organizationName,
            organizationId: org.organizationId
          };
        }
      }
    }
    return null;
  };

  const currentInfo = getCurrentDashboardInfo();

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 검색 필터링
  const filteredOptions = switcherOptions.map(org => ({
    ...org,
    dashboards: org.dashboards.filter(dashboard => 
      dashboard.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.organizationName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(org => org.dashboards.length > 0);

  // 대시보드 변경 핸들러
  const handleDashboardChange = (dashboardPath: string, organizationId: string) => {
    setIsOpen(false);
    setSearchQuery('');
    
    if (onDashboardChange) {
      onDashboardChange(dashboardPath, organizationId);
    }
    
    router.push(dashboardPath);
    
    // 선택한 대시보드를 localStorage에 저장
    try {
      localStorage.setItem(
        `user-preferences-${user.id}`,
        JSON.stringify({
          lastAccessedDashboard: dashboardPath,
          lastOrganizationId: organizationId
        })
      );
    } catch (error) {
      console.error('Error saving dashboard preference:', error);
    }
  };

  // 단일 역할 사용자는 스위처 표시하지 않음
  if (roleSummary.totalActiveRoles <= 1 || switcherOptions.length === 0) {
    return null;
  }

  return (
    <div className="dashboard-switcher" ref={dropdownRef}>
      {/* 현재 대시보드 버튼 */}
      <button
        className="current-dashboard-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="current-dashboard-info">
          <div className="dashboard-name">
            {currentInfo?.dashboard.label || '대시보드'}
          </div>
          <div className="organization-name">
            {currentInfo?.organizationName || '전체 조직'}
          </div>
        </div>
        <div className="dashboard-switcher-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`chevron-icon ${isOpen ? 'rotated' : ''}`}
          >
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="dashboard-switcher-dropdown">
          <div className="dropdown-header">
            <h3>대시보드 선택</h3>
            <div className="user-role-summary">
              {roleSummary.totalOrganizations}개 조직, {roleSummary.totalActiveRoles}개 역할
            </div>
          </div>

          {/* 검색 입력 */}
          {switcherOptions.length > 3 && (
            <div className="search-container">
              <input
                type="text"
                placeholder="대시보드 또는 조직 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          )}

          {/* 대시보드 옵션 목록 */}
          <div className="dashboard-options">
            {filteredOptions.length === 0 ? (
              <div className="no-results">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredOptions.map((org) => (
                <div key={org.organizationId} className="organization-group">
                  <div className="organization-header">
                    <h4>{org.organizationName}</h4>
                    <span className="dashboard-count">
                      {org.dashboards.length}개 대시보드
                    </span>
                  </div>
                  
                  <div className="dashboard-list">
                    {org.dashboards.map((dashboard) => {
                      const isActive = currentInfo?.dashboard.path === dashboard.path && 
                                      currentInfo?.organizationId === org.organizationId;
                      
                      return (
                        <button
                          key={`${org.organizationId}-${dashboard.roleType}`}
                          className={`dashboard-option ${isActive ? 'active' : ''}`}
                          onClick={() => handleDashboardChange(dashboard.path, org.organizationId)}
                        >
                          <div className="dashboard-option-content">
                            <div className="dashboard-label">
                              {dashboard.label}
                            </div>
                            <div className="role-badge">
                              {dashboard.roleType}
                            </div>
                          </div>
                          {isActive && (
                            <div className="active-indicator">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20,6 9,17 4,12"></polyline>
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 전체 대시보드 링크 */}
          <div className="dropdown-footer">
            <button
              className="all-dashboards-link"
              onClick={() => handleDashboardChange('/dashboard', '')}
            >
              전체 대시보드 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSwitcher;

// 스타일 정의
const switcherStyles = `
.dashboard-switcher {
  position: relative;
  display: inline-block;
}

.current-dashboard-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
}

.current-dashboard-button:hover {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.1);
}

.current-dashboard-info {
  flex: 1;
  text-align: left;
}

.dashboard-name {
  font-weight: 600;
  color: #212529;
  font-size: 0.875rem;
}

.organization-name {
  color: #6c757d;
  font-size: 0.75rem;
  margin-top: 0.125rem;
}

.dashboard-switcher-icon {
  color: #6c757d;
  transition: transform 0.2s;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.dashboard-switcher-dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
  min-width: 300px;
}

.dropdown-header {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.dropdown-header h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #212529;
}

.user-role-summary {
  color: #6c757d;
  font-size: 0.75rem;
}

.search-container {
  padding: 0.75rem;
  border-bottom: 1px solid #e9ecef;
}

.search-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.1);
}

.dashboard-options {
  max-height: 250px;
  overflow-y: auto;
}

.organization-group {
  border-bottom: 1px solid #f8f9fa;
}

.organization-group:last-child {
  border-bottom: none;
}

.organization-header {
  padding: 0.75rem 1rem 0.5rem;
  background-color: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.organization-header h4 {
  margin: 0;
  font-size: 0.875rem;
  color: #495057;
}

.dashboard-count {
  font-size: 0.75rem;
  color: #6c757d;
}

.dashboard-list {
  padding: 0.25rem 0;
}

.dashboard-option {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dashboard-option:hover {
  background-color: #f8f9fa;
}

.dashboard-option.active {
  background-color: #e3f2fd;
  color: #0d47a1;
}

.dashboard-option-content {
  flex: 1;
  text-align: left;
}

.dashboard-label {
  font-weight: 500;
  margin-bottom: 0.125rem;
}

.role-badge {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background-color: #e9ecef;
  color: #495057;
  border-radius: 12px;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
}

.dashboard-option.active .role-badge {
  background-color: #bbdefb;
  color: #0d47a1;
}

.active-indicator {
  color: #007bff;
  margin-left: 0.5rem;
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
  font-style: italic;
}

.dropdown-footer {
  padding: 0.75rem;
  border-top: 1px solid #e9ecef;
  background-color: #f8f9fa;
}

.all-dashboards-link {
  width: 100%;
  padding: 0.5rem;
  background: none;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  color: #007bff;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.all-dashboards-link:hover {
  background-color: white;
  border-color: #007bff;
}
`;

// 스타일 주입
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = switcherStyles;
  document.head.appendChild(styleElement);
}