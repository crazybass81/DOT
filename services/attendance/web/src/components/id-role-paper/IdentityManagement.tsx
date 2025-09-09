/**
 * Identity Management UI Components
 * Personal and Corporate identity management with role context
 * 
 * Features:
 * - Personal/Corporate identity creation and editing
 * - Identity verification workflow
 * - Role context display and management
 * - Search and filtering capabilities
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import {
  IdType,
  RoleType,
  UnifiedIdentity,
  IdentityWithContext,
  CreateIdentityRequest,
  UpdateIdentityRequest
} from '../../types/id-role-paper';

// API client for identity operations
class IdentityApiClient {
  private baseUrl = '/api/identity';

  async searchIdentities(params: {
    emailPattern?: string;
    fullNamePattern?: string;
    idType?: IdType;
    isVerified?: boolean;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
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
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getIdentityWithContext(identityId: string): Promise<IdentityWithContext> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${identityId}/context`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get identity context: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async createIdentity(request: CreateIdentityRequest): Promise<UnifiedIdentity> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create identity');
    }

    const result = await response.json();
    return result.data;
  }

  async updateIdentity(identityId: string, request: UpdateIdentityRequest): Promise<UnifiedIdentity> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${identityId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update identity');
    }

    const result = await response.json();
    return result.data;
  }

  async verifyIdentity(identityId: string, verified: boolean, verificationData?: any): Promise<UnifiedIdentity> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${identityId}/verify`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ verified, verificationData })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify identity');
    }

    const result = await response.json();
    return result.data;
  }

  async deactivateIdentity(identityId: string): Promise<UnifiedIdentity> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${identityId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to deactivate identity');
    }

    const result = await response.json();
    return result.data;
  }
}

const identityApi = new IdentityApiClient();

// Identity Search and List Component
interface IdentityListProps {
  onSelectIdentity: (identity: UnifiedIdentity) => void;
  onCreateIdentity: () => void;
}

export const IdentityList: React.FC<IdentityListProps> = ({ onSelectIdentity, onCreateIdentity }) => {
  const [identities, setIdentities] = useState<UnifiedIdentity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    emailPattern: '',
    fullNamePattern: '',
    idType: '' as '' | IdType,
    isVerified: '' as '' | 'true' | 'false',
    isActive: 'true' as '' | 'true' | 'false'
  });
  const [error, setError] = useState<string | null>(null);

  const loadIdentities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = { limit: 50 };
      if (searchParams.emailPattern) params.emailPattern = searchParams.emailPattern;
      if (searchParams.fullNamePattern) params.fullNamePattern = searchParams.fullNamePattern;
      if (searchParams.idType) params.idType = searchParams.idType;
      if (searchParams.isVerified) params.isVerified = searchParams.isVerified === 'true';
      if (searchParams.isActive) params.isActive = searchParams.isActive === 'true';

      const result = await identityApi.searchIdentities(params);
      setIdentities(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load identities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdentities();
  }, []);

  const handleSearch = () => {
    loadIdentities();
  };

  const getStatusBadge = (identity: UnifiedIdentity) => {
    const badges = [];
    
    if (identity.isVerified) {
      badges.push(<span key="verified" className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">인증됨</span>);
    } else {
      badges.push(<span key="unverified" className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">미인증</span>);
    }
    
    if (!identity.isActive) {
      badges.push(<span key="inactive" className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">비활성</span>);
    }

    badges.push(
      <span key="type" className={`px-2 py-1 rounded-full text-xs font-medium ${
        identity.idType === IdType.PERSONAL 
          ? 'bg-blue-100 text-blue-800' 
          : 'bg-purple-100 text-purple-800'
      }`}>
        {identity.idType === IdType.PERSONAL ? '개인' : '법인'}
      </span>
    );

    return badges;
  };

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">신원 검색</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
            <input
              type="email"
              value={searchParams.emailPattern}
              onChange={(e) => setSearchParams(prev => ({ ...prev, emailPattern: e.target.value }))}
              placeholder="이메일 주소..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
            <input
              type="text"
              value={searchParams.fullNamePattern}
              onChange={(e) => setSearchParams(prev => ({ ...prev, fullNamePattern: e.target.value }))}
              placeholder="이름..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">신원 타입</label>
            <select
              value={searchParams.idType}
              onChange={(e) => setSearchParams(prev => ({ ...prev, idType: e.target.value as '' | IdType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 타입</option>
              <option value={IdType.PERSONAL}>개인</option>
              <option value={IdType.CORPORATE}>법인</option>
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={searchParams.isVerified === 'true'}
                onChange={(e) => setSearchParams(prev => ({ 
                  ...prev, 
                  isVerified: e.target.checked ? 'true' : '' 
                }))}
                className="mr-2"
              />
              인증된 신원만
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={searchParams.isActive === 'true'}
                onChange={(e) => setSearchParams(prev => ({ 
                  ...prev, 
                  isActive: e.target.checked ? 'true' : '' 
                }))}
                className="mr-2"
              />
              활성화된 신원만
            </label>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '검색 중...' : '검색'}
            </button>
            <button
              onClick={onCreateIdentity}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              신원 생성
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Identity List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">신원 목록 ({identities.length}개)</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            로딩 중...
          </div>
        ) : identities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            검색 결과가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {identities.map((identity) => (
              <div
                key={identity.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectIdentity(identity)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium">{identity.fullName}</h4>
                      <div className="flex space-x-2">
                        {getStatusBadge(identity)}
                      </div>
                    </div>
                    <p className="text-gray-600 mb-1">{identity.email}</p>
                    {identity.phone && (
                      <p className="text-gray-500 text-sm">{identity.phone}</p>
                    )}
                    {identity.idNumber && (
                      <p className="text-gray-500 text-sm">ID: {identity.idNumber}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>생성: {new Date(identity.createdAt).toLocaleDateString('ko-KR')}</p>
                    {identity.updatedAt && identity.updatedAt !== identity.createdAt && (
                      <p>수정: {new Date(identity.updatedAt).toLocaleDateString('ko-KR')}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Identity Form Component
interface IdentityFormProps {
  identity?: UnifiedIdentity;
  onSave: (identity: UnifiedIdentity) => void;
  onCancel: () => void;
}

export const IdentityForm: React.FC<IdentityFormProps> = ({ identity, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    idType: identity?.idType || IdType.PERSONAL,
    email: identity?.email || '',
    fullName: identity?.fullName || '',
    phone: identity?.phone || '',
    birthDate: identity?.birthDate ? new Date(identity.birthDate).toISOString().split('T')[0] : '',
    idNumber: identity?.idNumber || '',
    linkedPersonalId: identity?.linkedPersonalId || '',
    profileData: identity?.profileData || {}
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [availablePersonalIds, setAvailablePersonalIds] = useState<UnifiedIdentity[]>([]);

  // Load personal identities for Corporate ID linking
  useEffect(() => {
    if (formData.idType === IdType.CORPORATE) {
      loadPersonalIdentities();
    }
  }, [formData.idType]);

  const loadPersonalIdentities = async () => {
    try {
      const result = await identityApi.searchIdentities({
        idType: IdType.PERSONAL,
        isVerified: true,
        isActive: true,
        limit: 100
      });
      setAvailablePersonalIds(result.data || []);
    } catch (err) {
      console.error('Failed to load personal identities:', err);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = '이메일은 필수입니다';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (!formData.fullName || formData.fullName.length < 2) {
      newErrors.fullName = '이름은 최소 2자 이상이어야 합니다';
    }

    if (formData.phone && !/^010-\d{4}-\d{4}$/.test(formData.phone)) {
      newErrors.phone = '전화번호는 010-0000-0000 형식이어야 합니다';
    }

    if (formData.idType === IdType.CORPORATE && !formData.linkedPersonalId) {
      newErrors.linkedPersonalId = '법인 신원은 연결된 개인 신원이 필요합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const request = {
        idType: formData.idType,
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone || undefined,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
        idNumber: formData.idNumber || undefined,
        linkedPersonalId: formData.linkedPersonalId || undefined,
        profileData: formData.profileData
      };

      let result: UnifiedIdentity;
      if (identity) {
        // Update existing identity
        const updateRequest: UpdateIdentityRequest = {
          fullName: request.fullName,
          phone: request.phone,
          birthDate: request.birthDate,
          profileData: request.profileData
        };
        result = await identityApi.updateIdentity(identity.id, updateRequest);
      } else {
        // Create new identity
        const createRequest: CreateIdentityRequest = {
          ...request,
          authUserId: 'temp-auth-user' // This should come from current auth context
        };
        result = await identityApi.createIdentity(createRequest);
      }

      onSave(result);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to save identity' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ID Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">신원 타입</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="idType"
              value={IdType.PERSONAL}
              checked={formData.idType === IdType.PERSONAL}
              onChange={(e) => setFormData(prev => ({ ...prev, idType: e.target.value as IdType }))}
              disabled={!!identity} // Cannot change type for existing identity
              className="mr-2"
            />
            개인
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="idType"
              value={IdType.CORPORATE}
              checked={formData.idType === IdType.CORPORATE}
              onChange={(e) => setFormData(prev => ({ ...prev, idType: e.target.value as IdType }))}
              disabled={!!identity} // Cannot change type for existing identity
              className="mr-2"
            />
            법인
          </label>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">이메일 *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={!!identity} // Cannot change email for existing identity
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.fullName ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="010-0000-0000"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">생년월일</label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {formData.idType === IdType.PERSONAL ? '주민번호/여권번호' : '사업자등록번호'}
        </label>
        <input
          type="text"
          value={formData.idNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
          placeholder={formData.idType === IdType.PERSONAL ? '000000-0000000' : '000-00-00000'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Corporate-specific fields */}
      {formData.idType === IdType.CORPORATE && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">연결된 개인 신원 *</label>
          <select
            value={formData.linkedPersonalId}
            onChange={(e) => setFormData(prev => ({ ...prev, linkedPersonalId: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.linkedPersonalId ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">개인 신원을 선택하세요</option>
            {availablePersonalIds.map((personal) => (
              <option key={personal.id} value={personal.id}>
                {personal.fullName} ({personal.email})
              </option>
            ))}
          </select>
          {errors.linkedPersonalId && <p className="text-red-500 text-sm mt-1">{errors.linkedPersonalId}</p>}
        </div>
      )}

      {/* Error Display */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {errors.submit}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '저장 중...' : (identity ? '수정' : '생성')}
        </button>
      </div>
    </form>
  );
};

// Identity Detail Component with Role Context
interface IdentityDetailProps {
  identityId: string;
  onEdit: (identity: UnifiedIdentity) => void;
  onClose: () => void;
}

export const IdentityDetail: React.FC<IdentityDetailProps> = ({ identityId, onEdit, onClose }) => {
  const [identityContext, setIdentityContext] = useState<IdentityWithContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    loadIdentityContext();
  }, [identityId]);

  const loadIdentityContext = async () => {
    try {
      setLoading(true);
      setError(null);
      const context = await identityApi.getIdentityWithContext(identityId);
      setIdentityContext(context);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load identity');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationToggle = async () => {
    if (!identityContext) return;

    try {
      setVerifyLoading(true);
      const newVerifiedStatus = !identityContext.identity.isVerified;
      const updated = await identityApi.verifyIdentity(
        identityId, 
        newVerifiedStatus,
        newVerifiedStatus ? { verifiedAt: new Date(), verifiedBy: 'admin' } : undefined
      );
      
      setIdentityContext(prev => prev ? {
        ...prev,
        identity: updated
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update verification');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!identityContext || !confirm('정말로 이 신원을 비활성화하시겠습니까?')) return;

    try {
      await identityApi.deactivateIdentity(identityId);
      await loadIdentityContext(); // Reload to show updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate identity');
    }
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

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
        <button
          onClick={loadIdentityContext}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!identityContext) {
    return (
      <div className="p-8 text-center text-gray-500">
        신원 정보를 찾을 수 없습니다.
      </div>
    );
  }

  const { identity, papers, computedRoles, businessRegistrations, primaryRole, availableRoles, permissions } = identityContext;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{identity.fullName}</h2>
          <p className="text-gray-600">{identity.email}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(identity)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            편집
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">기본 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">신원 타입</label>
            <p className="text-lg">{identity.idType === IdType.PERSONAL ? '개인' : '법인'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">상태</label>
            <div className="flex space-x-2 mt-1">
              {identity.isVerified ? (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">인증됨</span>
              ) : (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">미인증</span>
              )}
              {identity.isActive ? (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">활성</span>
              ) : (
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">비활성</span>
              )}
            </div>
          </div>
          {identity.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-500">전화번호</label>
              <p className="text-lg">{identity.phone}</p>
            </div>
          )}
          {identity.birthDate && (
            <div>
              <label className="block text-sm font-medium text-gray-500">생년월일</label>
              <p className="text-lg">{new Date(identity.birthDate).toLocaleDateString('ko-KR')}</p>
            </div>
          )}
          {identity.idNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-500">신분증 번호</label>
              <p className="text-lg">{identity.idNumber}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-500">생성일</label>
            <p className="text-lg">{new Date(identity.createdAt).toLocaleDateString('ko-KR')}</p>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleVerificationToggle}
            disabled={verifyLoading}
            className={`px-4 py-2 rounded-md text-white disabled:opacity-50 ${
              identity.isVerified 
                ? 'bg-yellow-600 hover:bg-yellow-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {verifyLoading ? '처리 중...' : (identity.isVerified ? '인증 해제' : '인증 승인')}
          </button>
          {identity.isActive && (
            <button
              onClick={handleDeactivate}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              비활성화
            </button>
          )}
        </div>
      </div>

      {/* Role Information */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">역할 정보</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">주요 역할</label>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(primaryRole)}`}>
              {primaryRole}
            </span>
          </div>
          
          {availableRoles.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">보유 역할</label>
              <div className="flex flex-wrap gap-2">
                {availableRoles.map((role, index) => (
                  <span key={index} className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(role)}`}>
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {computedRoles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">계산된 역할</label>
              <div className="space-y-2">
                {computedRoles.map((role, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(role.role)}`}>
                        {role.role}
                      </span>
                      {role.businessContextId && (
                        <span className="text-sm text-gray-600">
                          사업자 컨텍스트: {role.businessContextId}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      계산일: {new Date(role.computedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Papers */}
      {papers.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">보유 문서 ({papers.length}개)</h3>
          <div className="space-y-3">
            {papers.map((paper, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium">{paper.paperType}</p>
                  {paper.relatedBusinessId && (
                    <p className="text-sm text-gray-600">사업자: {paper.relatedBusinessId}</p>
                  )}
                </div>
                <div className="text-right text-sm text-gray-500">
                  {paper.validFrom && (
                    <p>시작: {new Date(paper.validFrom).toLocaleDateString('ko-KR')}</p>
                  )}
                  {paper.validUntil && (
                    <p>만료: {new Date(paper.validUntil).toLocaleDateString('ko-KR')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business Registrations */}
      {businessRegistrations.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">관련 사업자 ({businessRegistrations.length}개)</h3>
          <div className="space-y-3">
            {businessRegistrations.map((business, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium">{business.businessName}</p>
                  <p className="text-sm text-gray-600">등록번호: {business.registrationNumber}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    business.verificationStatus === 'verified' 
                      ? 'bg-green-100 text-green-800'
                      : business.verificationStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {business.verificationStatus === 'verified' ? '인증됨' : 
                     business.verificationStatus === 'pending' ? '검토중' : '거부됨'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions */}
      {permissions.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">권한 ({permissions.length}개)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permissions.map((permission, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium">{permission.resource}</p>
                <p className="text-sm text-gray-600">액션: {permission.action}</p>
                {permission.businessContext && (
                  <p className="text-sm text-gray-600">사업자 컨텍스트 필요</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Identity Management Component
export const IdentityManagement: React.FC = () => {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedIdentity, setSelectedIdentity] = useState<UnifiedIdentity | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSelectIdentity = (identity: UnifiedIdentity) => {
    setSelectedIdentity(identity);
    setView('detail');
    setShowModal(true);
  };

  const handleCreateIdentity = () => {
    setSelectedIdentity(null);
    setView('create');
    setShowModal(true);
  };

  const handleEditIdentity = (identity: UnifiedIdentity) => {
    setSelectedIdentity(identity);
    setView('edit');
    setShowModal(true);
  };

  const handleSaveIdentity = (identity: UnifiedIdentity) => {
    setShowModal(false);
    setView('list');
    // Optionally refresh the list or show success message
  };

  const handleCancel = () => {
    setShowModal(false);
    setView('list');
    setSelectedIdentity(null);
  };

  const getModalTitle = () => {
    switch (view) {
      case 'create': return '신원 생성';
      case 'edit': return '신원 수정';
      case 'detail': return '신원 상세';
      default: return '신원 관리';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">신원 관리</h1>
      </div>

      <IdentityList 
        onSelectIdentity={handleSelectIdentity}
        onCreateIdentity={handleCreateIdentity}
      />

      <Modal
        isOpen={showModal}
        onClose={handleCancel}
        title={getModalTitle()}
        size={view === 'detail' ? 'xl' : 'lg'}
      >
        {view === 'create' && (
          <IdentityForm
            onSave={handleSaveIdentity}
            onCancel={handleCancel}
          />
        )}
        {view === 'edit' && selectedIdentity && (
          <IdentityForm
            identity={selectedIdentity}
            onSave={handleSaveIdentity}
            onCancel={handleCancel}
          />
        )}
        {view === 'detail' && selectedIdentity && (
          <IdentityDetail
            identityId={selectedIdentity.id}
            onEdit={handleEditIdentity}
            onClose={handleCancel}
          />
        )}
      </Modal>
    </div>
  );
};

export default IdentityManagement;
