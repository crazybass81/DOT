/**
 * Permission Dashboard UI Components
 * RBAC visualization and control interface for ID-ROLE-PAPER system
 * 
 * Features:
 * - Permission matrix visualization for roles and resources
 * - Individual and bulk permission checking
 * - Role-based access control visualization
 * - Permission assignment and management
 * - Business context permission analysis
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import {
  RoleType,
  Permission,
  UnifiedIdentity,
  BusinessRegistration,
  IdentityWithContext,
  IdType
} from '../../types/id-role-paper';

// API client for permission operations
class PermissionApiClient {
  private baseUrl = '/api/permissions';

  async checkPermission(params: {
    identityId: string;
    resource: string;
    action: string;
    businessContext?: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Permission check failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async checkBulkPermissions(requests: {
    identityId: string;
    resource: string;
    action: string;
    businessContext?: string;
  }[]): Promise<{
    identityId: string;
    resource: string;
    action: string;
    businessContext?: string;
    allowed: boolean;
    reason?: string;
  }[]> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!response.ok) {
      throw new Error(`Bulk permission check failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  // Get available identities for permission checking
  async getAvailableIdentities(): Promise<UnifiedIdentity[]> {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/identity?isVerified=true&isActive=true&limit=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available identities');
    }

    const result = await response.json();
    return result.data || [];
  }

  // Get identity with full context
  async getIdentityWithContext(identityId: string): Promise<IdentityWithContext> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/identity/${identityId}/context`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch identity context');
    }

    const result = await response.json();
    return result.data;
  }

  // Get available businesses for business context
  async getAvailableBusinesses(): Promise<BusinessRegistration[]> {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/business?isActive=true&verificationStatus=verified&limit=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available businesses');
    }

    const result = await response.json();
    return result.data || [];
  }
}

const permissionApi = new PermissionApiClient();

// Permission resources and actions configuration
const RESOURCE_CONFIG = {
  profile: {
    name: '프로필',
    actions: ['read', 'update'],
    description: '사용자 프로필 관리'
  },
  attendance: {
    name: '출근',
    actions: ['create', 'read', 'update', 'delete'],
    description: '출근 기록 관리',
    requiresBusinessContext: true
  },
  team: {
    name: '팀 관리',
    actions: ['read', 'manage'],
    description: '팀 관리 및 조회',
    requiresBusinessContext: true
  },
  business: {
    name: '사업자 관리',
    actions: ['read', 'manage'],
    description: '사업자 정보 관리',
    requiresBusinessContext: true
  },
  employees: {
    name: '직원 관리',
    actions: ['read', 'manage'],
    description: '직원 채용 및 관리',
    requiresBusinessContext: true
  },
  reports: {
    name: '보고서',
    actions: ['read', 'manage'],
    description: '보고서 조회 및 생성',
    requiresBusinessContext: true
  },
  papers: {
    name: '문서',
    actions: ['read', 'create', 'update', 'delete'],
    description: '문서 관리',
    requiresBusinessContext: true
  }
};

const ROLE_HIERARCHY = {
  [RoleType.SEEKER]: 0,
  [RoleType.WORKER]: 1,
  [RoleType.SUPERVISOR]: 2,
  [RoleType.MANAGER]: 3,
  [RoleType.OWNER]: 4,
  [RoleType.FRANCHISEE]: 4,
  [RoleType.FRANCHISOR]: 5
};

// Permission Checker Component
interface PermissionCheckerProps {
  onPermissionResult: (result: any) => void;
}

const PermissionChecker: React.FC<PermissionCheckerProps> = ({ onPermissionResult }) => {
  const [identityId, setIdentityId] = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [businessContext, setBusinessContext] = useState('');
  const [availableIdentities, setAvailableIdentities] = useState<UnifiedIdentity[]>([]);
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableData();
  }, []);

  const loadAvailableData = async () => {
    try {
      const [identities, businesses] = await Promise.all([
        permissionApi.getAvailableIdentities(),
        permissionApi.getAvailableBusinesses()
      ]);
      setAvailableIdentities(identities);
      setAvailableBusinesses(businesses);
    } catch (err) {
      setError('Failed to load available data');
    }
  };

  const handleCheck = async () => {
    if (!identityId || !resource || !action) {
      setError('신원, 리소스, 액션을 모두 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await permissionApi.checkPermission({
        identityId,
        resource,
        action,
        businessContext: businessContext || undefined
      });
      
      onPermissionResult({
        ...result,
        identityId,
        resource,
        action,
        businessContext
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission check failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedIdentity = availableIdentities.find(i => i.id === identityId);
  const resourceConfig = RESOURCE_CONFIG[resource as keyof typeof RESOURCE_CONFIG];

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">권한 확인</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">신원 선택 *</label>
          <select
            value={identityId}
            onChange={(e) => setIdentityId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">신원을 선택하세요</option>
            {availableIdentities.map((identity) => (
              <option key={identity.id} value={identity.id}>
                {identity.fullName} ({identity.email}) - {identity.idType === IdType.PERSONAL ? '개인' : '법인'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">리소스 *</label>
          <select
            value={resource}
            onChange={(e) => {
              setResource(e.target.value);
              setAction(''); // Reset action when resource changes
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">리소스를 선택하세요</option>
            {Object.entries(RESOURCE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name} - {config.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">액션 *</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            disabled={!resource}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">액션을 선택하세요</option>
            {resourceConfig?.actions.map((actionOption) => (
              <option key={actionOption} value={actionOption}>
                {actionOption}
              </option>
            ))}
          </select>
        </div>

        {resourceConfig?.requiresBusinessContext && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">사업자 컨텍스트</label>
            <select
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 (전역 권한)</option>
              {availableBusinesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.businessName} ({business.registrationNumber})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">선택하지 않으면 전역 권한을 확인합니다.</p>
          </div>
        )}
      </div>

      {selectedIdentity && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-700">
            <strong>선택된 신원:</strong> {selectedIdentity.fullName} ({selectedIdentity.email})
          </p>
          <p className="text-sm text-gray-700">
            <strong>신원 타입:</strong> {selectedIdentity.idType === IdType.PERSONAL ? '개인' : '법인'}
          </p>
          <p className="text-sm text-gray-700">
            <strong>인증 상태:</strong> {selectedIdentity.isVerified ? '인증됨' : '미인증'}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <button
        onClick={handleCheck}
        disabled={loading || !identityId || !resource || !action}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '확인 중...' : '권한 확인'}
      </button>
    </div>
  );
};

// Permission Result Display Component
interface PermissionResultProps {
  result: {
    allowed: boolean;
    reason?: string;
    identityId: string;
    resource: string;
    action: string;
    businessContext?: string;
  } | null;
  identities: UnifiedIdentity[];
  businesses: BusinessRegistration[];
}

const PermissionResult: React.FC<PermissionResultProps> = ({ result, identities, businesses }) => {
  if (!result) {
    return (
      <div className="bg-white p-6 rounded-lg border text-center text-gray-500">
        권한을 확인하세요.
      </div>
    );
  }

  const identity = identities.find(i => i.id === result.identityId);
  const business = businesses.find(b => b.id === result.businessContext);
  const resourceConfig = RESOURCE_CONFIG[result.resource as keyof typeof RESOURCE_CONFIG];

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">권한 확인 결과</h3>
      
      {/* Permission Status */}
      <div className="mb-4 p-4 rounded-md" style={{ backgroundColor: result.allowed ? '#f0f9ff' : '#fef2f2', borderColor: result.allowed ? '#3b82f6' : '#ef4444' }}>
        <div className="flex items-center space-x-3">
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            result.allowed 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {result.allowed ? '권한 허용' : '권한 거부'}
          </span>
          {result.reason && (
            <span className="text-sm text-gray-600">
              사유: {result.reason}
            </span>
          )}
        </div>
      </div>

      {/* Request Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">신원</label>
          <p className="text-lg">{identity?.fullName || result.identityId}</p>
          {identity && (
            <p className="text-sm text-gray-500">{identity.email} - {identity.idType === IdType.PERSONAL ? '개인' : '법인'}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">리소스</label>
          <p className="text-lg">{resourceConfig?.name || result.resource}</p>
          <p className="text-sm text-gray-500">{resourceConfig?.description}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">액션</label>
          <p className="text-lg font-mono bg-gray-100 px-2 py-1 rounded">{result.action}</p>
        </div>
        {result.businessContext && (
          <div>
            <label className="block text-sm font-medium text-gray-500">사업자 컨텍스트</label>
            <p className="text-lg">{business?.businessName || result.businessContext}</p>
            {business && (
              <p className="text-sm text-gray-500">{business.registrationNumber}</p>
            )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-sm text-gray-500 border-t pt-2">
        확인 시간: {new Date().toLocaleString('ko-KR')}
      </div>
    </div>
  );
};

// Role Matrix Visualization Component
interface RoleMatrixProps {
  identityContext: IdentityWithContext | null;
}

const RoleMatrix: React.FC<RoleMatrixProps> = ({ identityContext }) => {
  if (!identityContext) {
    return (
      <div className="bg-white p-6 rounded-lg border text-center text-gray-500">
        신원을 선택하여 역할 정보를 확인하세요.
      </div>
    );
  }

  const { identity, computedRoles, primaryRole, availableRoles, permissions } = identityContext;

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

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">역할 매트릭스</h3>
      
      {/* Identity Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-medium">{identity.fullName}</h4>
            <p className="text-gray-600">{identity.email}</p>
            <p className="text-sm text-gray-500">{identity.idType === IdType.PERSONAL ? '개인' : '법인'} 신원</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(primaryRole)}`}>
              주요 역할: {primaryRole}
            </span>
          </div>
        </div>
      </div>

      {/* Available Roles */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3">보유 역할</h4>
        <div className="flex flex-wrap gap-2">
          {availableRoles.map((role, index) => (
            <span key={index} className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(role)}`}>
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Computed Roles with Context */}
      {computedRoles.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-3">계산된 역할 상세</h4>
          <div className="space-y-2">
            {computedRoles.map((role, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(role.role)}`}>
                    {role.role}
                  </span>
                  {role.businessContextId && (
                    <span className="text-sm text-gray-600">
                      사업자: {role.businessContextId}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  계산일: {new Date(role.computedAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permission Matrix */}
      <div>
        <h4 className="text-md font-semibold mb-3">권한 매트릭스</h4>
        {permissions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">설정된 권한이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    리소스
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사업자 컨텍스트
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map((permission, index) => {
                  const resourceConfig = RESOURCE_CONFIG[permission.resource as keyof typeof RESOURCE_CONFIG];
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{resourceConfig?.name || permission.resource}</div>
                          {resourceConfig?.description && (
                            <div className="text-gray-500 text-xs">{resourceConfig.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {permission.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {permission.businessContext ? '필요' : '불필요'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Bulk Permission Checker Component
interface BulkPermissionCheckerProps {
  onBulkResult: (results: any[]) => void;
}

const BulkPermissionChecker: React.FC<BulkPermissionCheckerProps> = ({ onBulkResult }) => {
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [businessContext, setBusinessContext] = useState('');
  const [availableIdentities, setAvailableIdentities] = useState<UnifiedIdentity[]>([]);
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableData();
  }, []);

  const loadAvailableData = async () => {
    try {
      const [identities, businesses] = await Promise.all([
        permissionApi.getAvailableIdentities(),
        permissionApi.getAvailableBusinesses()
      ]);
      setAvailableIdentities(identities);
      setAvailableBusinesses(businesses);
    } catch (err) {
      setError('Failed to load available data');
    }
  };

  const handleBulkCheck = async () => {
    if (selectedIdentities.length === 0 || selectedResources.length === 0 || selectedActions.length === 0) {
      setError('최소 하나의 신원, 리소스, 액션을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Generate all combinations
      const requests = [];
      for (const identityId of selectedIdentities) {
        for (const resource of selectedResources) {
          for (const action of selectedActions) {
            requests.push({
              identityId,
              resource,
              action,
              businessContext: businessContext || undefined
            });
          }
        }
      }
      
      const results = await permissionApi.checkBulkPermissions(requests);
      onBulkResult(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk permission check failed');
    } finally {
      setLoading(false);
    }
  };

  const handleIdentityToggle = (identityId: string) => {
    setSelectedIdentities(prev => 
      prev.includes(identityId) 
        ? prev.filter(id => id !== identityId)
        : [...prev, identityId]
    );
  };

  const handleResourceToggle = (resource: string) => {
    setSelectedResources(prev => {
      const newSelected = prev.includes(resource) 
        ? prev.filter(r => r !== resource)
        : [...prev, resource];
      
      // Reset actions when resources change
      if (newSelected.length !== prev.length) {
        setSelectedActions([]);
      }
      
      return newSelected;
    });
  };

  const handleActionToggle = (action: string) => {
    setSelectedActions(prev => 
      prev.includes(action) 
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  // Get available actions based on selected resources
  const availableActions = selectedResources.length > 0 
    ? Array.from(new Set(selectedResources.flatMap(resource => 
        RESOURCE_CONFIG[resource as keyof typeof RESOURCE_CONFIG]?.actions || []
      )))
    : [];

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">대량 권한 확인</h3>
      
      {/* Identity Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">신원 선택 ({selectedIdentities.length}개 선택됨)</label>
        <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
          {availableIdentities.map((identity) => (
            <label key={identity.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={selectedIdentities.includes(identity.id)}
                onChange={() => handleIdentityToggle(identity.id)}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="text-sm">
                {identity.fullName} ({identity.email}) - {identity.idType === IdType.PERSONAL ? '개인' : '법인'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Resource Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">리소스 선택 ({selectedResources.length}개 선택됨)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Object.entries(RESOURCE_CONFIG).map(([resource, config]) => (
            <label key={resource} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={selectedResources.includes(resource)}
                onChange={() => handleResourceToggle(resource)}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="text-sm">
                {config.name} - {config.description}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Action Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">액션 선택 ({selectedActions.length}개 선택됨)</label>
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => (
            <label key={action} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded border">
              <input
                type="checkbox"
                checked={selectedActions.includes(action)}
                onChange={() => handleActionToggle(action)}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="text-sm font-mono">{action}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Business Context */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">사업자 컨텍스트</label>
        <select
          value={businessContext}
          onChange={(e) => setBusinessContext(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 (전역 권한)</option>
          {availableBusinesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.businessName} ({business.registrationNumber})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <button
        onClick={handleBulkCheck}
        disabled={loading || selectedIdentities.length === 0 || selectedResources.length === 0 || selectedActions.length === 0}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '확인 중...' : `대량 권한 확인 (${selectedIdentities.length * selectedResources.length * selectedActions.length}개)`}
      </button>
    </div>
  );
};

// Bulk Results Display Component
interface BulkResultsProps {
  results: any[];
  identities: UnifiedIdentity[];
  businesses: BusinessRegistration[];
}

const BulkResults: React.FC<BulkResultsProps> = ({ results, identities, businesses }) => {
  const [filter, setFilter] = useState<'all' | 'allowed' | 'denied'>('all');
  const [sortBy, setSortBy] = useState<'identity' | 'resource' | 'result'>('identity');

  if (!results || results.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border text-center text-gray-500">
        대량 권한 확인 결과가 없습니다.
      </div>
    );
  }

  const filteredResults = results.filter(result => {
    if (filter === 'allowed') return result.allowed;
    if (filter === 'denied') return !result.allowed;
    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'identity':
        const identityA = identities.find(i => i.id === a.identityId)?.fullName || a.identityId;
        const identityB = identities.find(i => i.id === b.identityId)?.fullName || b.identityId;
        return identityA.localeCompare(identityB);
      case 'resource':
        return a.resource.localeCompare(b.resource);
      case 'result':
        return a.allowed === b.allowed ? 0 : a.allowed ? -1 : 1;
      default:
        return 0;
    }
  });

  const allowedCount = results.filter(r => r.allowed).length;
  const deniedCount = results.filter(r => !r.allowed).length;

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-6 py-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">대량 권한 확인 결과</h3>
          <div className="flex space-x-2">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              허용: {allowedCount}
            </span>
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              거부: {deniedCount}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">필터</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'allowed' | 'denied')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 ({results.length}개)</option>
              <option value="allowed">허용만 ({allowedCount}개)</option>
              <option value="denied">거부만 ({deniedCount}개)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">정렬</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'identity' | 'resource' | 'result')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="identity">신원별</option>
              <option value="resource">리소스별</option>
              <option value="result">결과별</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <div className="divide-y divide-gray-200">
          {sortedResults.map((result, index) => {
            const identity = identities.find(i => i.id === result.identityId);
            const business = businesses.find(b => b.id === result.businessContext);
            const resourceConfig = RESOURCE_CONFIG[result.resource as keyof typeof RESOURCE_CONFIG];
            
            return (
              <div key={index} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.allowed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.allowed ? '허용' : '거부'}
                      </span>
                      <span className="text-sm font-medium">
                        {identity?.fullName || result.identityId}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        {resourceConfig?.name || result.resource} → {result.action}
                      </span>
                      {result.businessContext && business && (
                        <span>
                          사업자: {business.businessName}
                        </span>
                      )}
                    </div>
                  </div>
                  {result.reason && (
                    <div className="text-sm text-gray-500">
                      {result.reason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Main Permission Dashboard Component
export const PermissionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'check' | 'bulk' | 'matrix'>('check');
  const [permissionResult, setPermissionResult] = useState(null);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [selectedIdentityForMatrix, setSelectedIdentityForMatrix] = useState('');
  const [identityContext, setIdentityContext] = useState<IdentityWithContext | null>(null);
  const [availableIdentities, setAvailableIdentities] = useState<UnifiedIdentity[]>([]);
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableData();
  }, []);

  useEffect(() => {
    if (selectedIdentityForMatrix) {
      loadIdentityContext();
    } else {
      setIdentityContext(null);
    }
  }, [selectedIdentityForMatrix]);

  const loadAvailableData = async () => {
    try {
      const [identities, businesses] = await Promise.all([
        permissionApi.getAvailableIdentities(),
        permissionApi.getAvailableBusinesses()
      ]);
      setAvailableIdentities(identities);
      setAvailableBusinesses(businesses);
    } catch (err) {
      console.error('Failed to load available data:', err);
    }
  };

  const loadIdentityContext = async () => {
    if (!selectedIdentityForMatrix) return;
    
    try {
      setLoading(true);
      const context = await permissionApi.getIdentityWithContext(selectedIdentityForMatrix);
      setIdentityContext(context);
    } catch (err) {
      console.error('Failed to load identity context:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'check', name: '개별 권한 확인', description: '하나의 신원에 대한 권한 확인' },
    { id: 'bulk', name: '대량 권한 확인', description: '여러 신원에 대한 대량 권한 확인' },
    { id: 'matrix', name: '역할 매트릭스', description: '신원의 역할과 권한 관계 시각화' }
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">권한 대시보드</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div>
                <div>{tab.name}</div>
                <div className="text-xs text-gray-400 mt-1">{tab.description}</div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'check' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PermissionChecker onPermissionResult={setPermissionResult} />
          <PermissionResult 
            result={permissionResult} 
            identities={availableIdentities} 
            businesses={availableBusinesses} 
          />
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="space-y-6">
          <BulkPermissionChecker onBulkResult={setBulkResults} />
          <BulkResults 
            results={bulkResults} 
            identities={availableIdentities} 
            businesses={availableBusinesses} 
          />
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* Identity Selector for Matrix */}
          <div className="bg-white p-6 rounded-lg border">
            <label className="block text-sm font-medium text-gray-700 mb-2">역할 매트릭스를 볼 신원 선택</label>
            <select
              value={selectedIdentityForMatrix}
              onChange={(e) => setSelectedIdentityForMatrix(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">신원을 선택하세요</option>
              {availableIdentities.map((identity) => (
                <option key={identity.id} value={identity.id}>
                  {identity.fullName} ({identity.email}) - {identity.idType === IdType.PERSONAL ? '개인' : '법인'}
                </option>
              ))}
            </select>
          </div>
          
          {loading ? (
            <div className="bg-white p-8 rounded-lg border text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">로딩 중...</p>
            </div>
          ) : (
            <RoleMatrix identityContext={identityContext} />
          )}
        </div>
      )}
    </div>
  );
};

export default PermissionDashboard;
