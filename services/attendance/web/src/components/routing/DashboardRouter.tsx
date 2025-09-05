'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { smartRouter, getUserRoleSummary } from '../../utils/smart-routing';
import { MultiRoleUser } from '../../types/multi-role';

interface DashboardRouterProps {
  user: MultiRoleUser;
  organizationId?: string;
  children?: React.ReactNode;
  onRoutingDecision?: (defaultPath: string, availablePaths: string[]) => void;
}

interface UserPreferences {
  preferredRoleType?: string;
  lastAccessedDashboard?: string;
  autoRedirect?: boolean;
}

const DashboardRouter: React.FC<DashboardRouterProps> = ({
  user,
  organizationId,
  children,
  onRoutingDecision
}) => {
  const router = useRouter();
  const [isRouting, setIsRouting] = useState(true);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  // 사용자 선호도 로드
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        // localStorage에서 사용자 선호도 로드
        const saved = localStorage.getItem(`user-preferences-${user.id}`);
        if (saved) {
          setUserPreferences(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    if (user?.id) {
      loadUserPreferences();
    }
  }, [user?.id]);

  // 스마트 라우팅 실행
  useEffect(() => {
    if (!user) return;

    const performRouting = async () => {
      try {
        setIsRouting(true);

        const routingResult = smartRouter(
          user,
          organizationId,
          userPreferences.lastAccessedDashboard,
          { preferredRoleType: userPreferences.preferredRoleType as any }
        );

        const { defaultPath, availablePaths, hasMultipleRoles, totalRoles } = routingResult;

        // 라우팅 결정 콜백 실행
        if (onRoutingDecision) {
          onRoutingDecision(defaultPath, availablePaths.map(p => p.path));
        }

        // 멀티 역할 사용자이고 자동 리다이렉트가 비활성화된 경우 선택 화면 표시
        if (hasMultipleRoles && !userPreferences.autoRedirect) {
          setShowRoleSelector(true);
          setIsRouting(false);
          return;
        }

        // 추천 경로가 있으면 우선 사용
        const targetPath = routingResult.suggestedPath || defaultPath;

        // 현재 경로와 다른 경우에만 리다이렉트
        if (window.location.pathname !== targetPath) {
          router.replace(targetPath);
        }

        // 마지막 접속 대시보드 저장
        await saveLastAccessedDashboard(targetPath);

        setIsRouting(false);
      } catch (error) {
        console.error('Routing error:', error);
        router.replace('/dashboard'); // fallback
        setIsRouting(false);
      }
    };

    performRouting();
  }, [user, organizationId, userPreferences, router, onRoutingDecision]);

  // 마지막 접속 대시보드 저장
  const saveLastAccessedDashboard = async (dashboardPath: string) => {
    try {
      const newPreferences = {
        ...userPreferences,
        lastAccessedDashboard: dashboardPath
      };

      localStorage.setItem(
        `user-preferences-${user.id}`,
        JSON.stringify(newPreferences)
      );

      setUserPreferences(newPreferences);
    } catch (error) {
      console.error('Error saving last accessed dashboard:', error);
    }
  };

  // 역할 선택 핸들러
  const handleRoleSelection = async (selectedPath: string) => {
    setShowRoleSelector(false);
    setIsRouting(true);

    await saveLastAccessedDashboard(selectedPath);
    router.replace(selectedPath);
    setIsRouting(false);
  };

  // 자동 리다이렉트 설정 변경
  const handleAutoRedirectChange = (autoRedirect: boolean) => {
    const newPreferences = {
      ...userPreferences,
      autoRedirect
    };

    localStorage.setItem(
      `user-preferences-${user.id}`,
      JSON.stringify(newPreferences)
    );

    setUserPreferences(newPreferences);
  };

  // 로딩 화면
  if (isRouting) {
    return (
      <div className="dashboard-router-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>대시보드를 준비하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 역할 선택 화면
  if (showRoleSelector) {
    const routingResult = smartRouter(user, organizationId);
    const roleSummary = getUserRoleSummary(user);

    return (
      <div className="role-selector-container">
        <div className="role-selector-modal">
          <h2>대시보드 선택</h2>
          <p>
            {user.name}님은 {roleSummary.totalActiveRoles}개의 역할을 가지고 있습니다.
            사용할 대시보드를 선택해주세요.
          </p>

          <div className="role-options">
            {routingResult.availablePaths.map((dashboard) => (
              <button
                key={dashboard.path}
                className="role-option-button"
                onClick={() => handleRoleSelection(dashboard.path)}
              >
                <div className="role-option-content">
                  <h3>{dashboard.label}</h3>
                  <span className="role-type">{dashboard.roleType}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="auto-redirect-option">
            <label>
              <input
                type="checkbox"
                checked={userPreferences.autoRedirect || false}
                onChange={(e) => handleAutoRedirectChange(e.target.checked)}
              />
              다음부터 자동으로 최고 권한 대시보드로 이동
            </label>
          </div>

          <div className="role-selector-actions">
            <button
              className="default-dashboard-button"
              onClick={() => handleRoleSelection(routingResult.defaultPath)}
            >
              기본 대시보드 사용 ({routingResult.defaultPath})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 정상적인 경우 children 렌더링
  return <>{children}</>;
};

export default DashboardRouter;

// 스타일을 위한 CSS (실제로는 별도 CSS 파일이나 styled-components 사용)
const styles = `
.dashboard-router-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f8f9fa;
}

.loading-container {
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e9ecef;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.role-selector-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.role-selector-modal {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.role-options {
  display: grid;
  gap: 1rem;
  margin: 1.5rem 0;
}

.role-option-button {
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.role-option-button:hover {
  border-color: #007bff;
  background-color: #f8f9ff;
}

.role-option-content h3 {
  margin: 0 0 0.5rem 0;
  color: #212529;
}

.role-type {
  color: #6c757d;
  font-size: 0.875rem;
}

.auto-redirect-option {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.role-selector-actions {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.default-dashboard-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.default-dashboard-button:hover {
  background-color: #5a6268;
}
`;

// 스타일 주입 (실제 프로젝트에서는 적절한 방법 사용)
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}