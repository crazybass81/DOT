/**
 * Business Registration UI Components
 * Business entity management with ownership validation and Korean business rules
 * 
 * Features:
 * - Business registration creation and editing
 * - Owner identity validation and linking
 * - Korean business number format validation
 * - Verification workflow management
 * - Business type handling (Individual/Corporate)
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import {
  BusinessType,
  BusinessRegistration,
  UnifiedIdentity,
  VerificationStatus,
  IdType
} from '../../types/id-role-paper';

// API client for business operations
class BusinessApiClient {
  private baseUrl = '/api/business';

  async searchBusinesses(params: {
    namePattern?: string;
    registrationNumber?: string;
    businessType?: BusinessType;
    ownerIdentityId?: string;
    verificationStatus?: VerificationStatus;
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

  async getBusinessById(businessId: string): Promise<BusinessRegistration> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${businessId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get business: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async createBusiness(request: {
    registrationNumber: string;
    businessName: string;
    businessType: BusinessType;
    ownerIdentityId: string;
    registrationData?: Record<string, any>;
  }): Promise<BusinessRegistration> {
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
      throw new Error(error.error || 'Failed to create business');
    }

    const result = await response.json();
    return result.data;
  }

  async updateBusiness(businessId: string, request: {
    businessName?: string;
    registrationData?: Record<string, any>;
  }): Promise<BusinessRegistration> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${businessId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update business');
    }

    const result = await response.json();
    return result.data;
  }

  async verifyBusiness(businessId: string, status: VerificationStatus, verificationData?: any): Promise<BusinessRegistration> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${businessId}/verify`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, verificationData })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify business');
    }

    const result = await response.json();
    return result.data;
  }

  async transferOwnership(businessId: string, newOwnerIdentityId: string): Promise<BusinessRegistration> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${businessId}/transfer`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newOwnerIdentityId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to transfer ownership');
    }

    const result = await response.json();
    return result.data;
  }

  async deactivateBusiness(businessId: string): Promise<BusinessRegistration> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${businessId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to deactivate business');
    }

    const result = await response.json();
    return result.data;
  }

  // Get available identities for ownership
  async getAvailableOwners(): Promise<UnifiedIdentity[]> {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/identity?isVerified=true&isActive=true&limit=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available owners');
    }

    const result = await response.json();
    return result.data || [];
  }
}

const businessApi = new BusinessApiClient();

// Korean Business Number Validation
const validateBusinessNumber = (number: string, type: BusinessType): boolean => {
  if (type === BusinessType.INDIVIDUAL) {
    // Individual: XXX-XX-XXXXX (10 digits)
    return /^\d{3}-\d{2}-\d{5}$/.test(number);
  } else {
    // Corporate: XXXXXX-XXXXXXX (13 digits)
    return /^\d{6}-\d{7}$/.test(number);
  }
};

// Business Search and List Component
interface BusinessListProps {
  onSelectBusiness: (business: BusinessRegistration) => void;
  onCreateBusiness: () => void;
}

export const BusinessList: React.FC<BusinessListProps> = ({ onSelectBusiness, onCreateBusiness }) => {
  const [businesses, setBusinesses] = useState<BusinessRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    namePattern: '',
    registrationNumber: '',
    businessType: '' as '' | BusinessType,
    verificationStatus: '' as '' | VerificationStatus,
    isActive: 'true' as '' | 'true' | 'false'
  });
  const [error, setError] = useState<string | null>(null);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = { limit: 50 };
      if (searchParams.namePattern) params.namePattern = searchParams.namePattern;
      if (searchParams.registrationNumber) params.registrationNumber = searchParams.registrationNumber;
      if (searchParams.businessType) params.businessType = searchParams.businessType;
      if (searchParams.verificationStatus) params.verificationStatus = searchParams.verificationStatus;
      if (searchParams.isActive) params.isActive = searchParams.isActive === 'true';

      const result = await businessApi.searchBusinesses(params);
      setBusinesses(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  const handleSearch = () => {
    loadBusinesses();
  };

  const getStatusBadge = (business: BusinessRegistration) => {
    const badges = [];
    
    // Verification status
    const statusColors = {
      [VerificationStatus.VERIFIED]: 'bg-green-100 text-green-800',
      [VerificationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [VerificationStatus.REJECTED]: 'bg-red-100 text-red-800'
    };
    
    const statusTexts = {
      [VerificationStatus.VERIFIED]: '인증됨',
      [VerificationStatus.PENDING]: '검토중',
      [VerificationStatus.REJECTED]: '거부됨'
    };

    badges.push(
      <span key="verification" className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[business.verificationStatus]}`}>
        {statusTexts[business.verificationStatus]}
      </span>
    );
    
    if (!business.isActive) {
      badges.push(<span key="inactive" className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">비활성</span>);
    }

    badges.push(
      <span key="type" className={`px-2 py-1 rounded-full text-xs font-medium ${
        business.businessType === BusinessType.INDIVIDUAL 
          ? 'bg-blue-100 text-blue-800' 
          : 'bg-purple-100 text-purple-800'
      }`}>
        {business.businessType === BusinessType.INDIVIDUAL ? '개인사업자' : '법인사업자'}
      </span>
    );

    return badges;
  };

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">사업자 검색</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">사업자명</label>
            <input
              type="text"
              value={searchParams.namePattern}
              onChange={(e) => setSearchParams(prev => ({ ...prev, namePattern: e.target.value }))}
              placeholder="사업자명..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">등록번호</label>
            <input
              type="text"
              value={searchParams.registrationNumber}
              onChange={(e) => setSearchParams(prev => ({ ...prev, registrationNumber: e.target.value }))}
              placeholder="000-00-00000 또는 000000-0000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">사업자 타입</label>
            <select
              value={searchParams.businessType}
              onChange={(e) => setSearchParams(prev => ({ ...prev, businessType: e.target.value as '' | BusinessType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 타입</option>
              <option value={BusinessType.INDIVIDUAL}>개인사업자</option>
              <option value={BusinessType.CORPORATE}>법인사업자</option>
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">인증 상태</label>
            <select
              value={searchParams.verificationStatus}
              onChange={(e) => setSearchParams(prev => ({ ...prev, verificationStatus: e.target.value as '' | VerificationStatus }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 상태</option>
              <option value={VerificationStatus.VERIFIED}>인증됨</option>
              <option value={VerificationStatus.PENDING}>검토중</option>
              <option value={VerificationStatus.REJECTED}>거부됨</option>
            </select>
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
              활성화된 사업자만
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
              onClick={onCreateBusiness}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              사업자 등록
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

      {/* Business List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">사업자 목록 ({businesses.length}개)</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            로딩 중...
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            검색 결과가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {businesses.map((business) => (
              <div
                key={business.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectBusiness(business)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium">{business.businessName}</h4>
                      <div className="flex space-x-2">
                        {getStatusBadge(business)}
                      </div>
                    </div>
                    <p className="text-gray-600 mb-1">등록번호: {business.registrationNumber}</p>
                    <p className="text-gray-500 text-sm">사업자 ID: {business.ownerIdentityId}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>등록: {new Date(business.createdAt).toLocaleDateString('ko-KR')}</p>
                    {business.updatedAt && business.updatedAt !== business.createdAt && (
                      <p>수정: {new Date(business.updatedAt).toLocaleDateString('ko-KR')}</p>
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

// Business Form Component
interface BusinessFormProps {
  business?: BusinessRegistration;
  onSave: (business: BusinessRegistration) => void;
  onCancel: () => void;
}

export const BusinessForm: React.FC<BusinessFormProps> = ({ business, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    registrationNumber: business?.registrationNumber || '',
    businessName: business?.businessName || '',
    businessType: business?.businessType || BusinessType.INDIVIDUAL,
    ownerIdentityId: business?.ownerIdentityId || '',
    registrationData: business?.registrationData || {}
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [availableOwners, setAvailableOwners] = useState<UnifiedIdentity[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

  // Load available owners
  useEffect(() => {
    loadAvailableOwners();
  }, []);

  const loadAvailableOwners = async () => {
    try {
      setLoadingOwners(true);
      const owners = await businessApi.getAvailableOwners();
      setAvailableOwners(owners);
    } catch (err) {
      console.error('Failed to load available owners:', err);
    } finally {
      setLoadingOwners(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.registrationNumber) {
      newErrors.registrationNumber = '사업자등록번호는 필수입니다';
    } else if (!validateBusinessNumber(formData.registrationNumber, formData.businessType)) {
      const expectedFormat = formData.businessType === BusinessType.INDIVIDUAL 
        ? '000-00-00000 (개인사업자)' 
        : '000000-0000000 (법인사업자)';
      newErrors.registrationNumber = `올바른 형식: ${expectedFormat}`;
    }

    if (!formData.businessName || formData.businessName.length < 2) {
      newErrors.businessName = '사업자명은 최소 2자 이상이어야 합니다';
    }

    if (!formData.ownerIdentityId) {
      newErrors.ownerIdentityId = '소유자 신원을 선택해주세요';
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
        registrationNumber: formData.registrationNumber,
        businessName: formData.businessName,
        businessType: formData.businessType,
        ownerIdentityId: formData.ownerIdentityId,
        registrationData: formData.registrationData
      };

      let result: BusinessRegistration;
      if (business) {
        // Update existing business
        const updateRequest = {
          businessName: request.businessName,
          registrationData: request.registrationData
        };
        result = await businessApi.updateBusiness(business.id, updateRequest);
      } else {
        // Create new business
        result = await businessApi.createBusiness(request);
      }

      onSave(result);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to save business' });
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessTypeChange = (newType: BusinessType) => {
    setFormData(prev => ({ 
      ...prev, 
      businessType: newType,
      registrationNumber: '' // Reset registration number when type changes
    }));
    setErrors(prev => ({ ...prev, registrationNumber: '' })); // Clear registration number error
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">사업자 타입</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="businessType"
              value={BusinessType.INDIVIDUAL}
              checked={formData.businessType === BusinessType.INDIVIDUAL}
              onChange={(e) => handleBusinessTypeChange(e.target.value as BusinessType)}
              disabled={!!business} // Cannot change type for existing business
              className="mr-2"
            />
            개인사업자
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="businessType"
              value={BusinessType.CORPORATE}
              checked={formData.businessType === BusinessType.CORPORATE}
              onChange={(e) => handleBusinessTypeChange(e.target.value as BusinessType)}
              disabled={!!business} // Cannot change type for existing business
              className="mr-2"
            />
            법인사업자
          </label>
        </div>
        {business && (
          <p className="text-sm text-gray-500 mt-1">사업자 타입은 등록 후 변경할 수 없습니다.</p>
        )}
      </div>

      {/* Registration Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            사업자등록번호 *
          </label>
          <input
            type="text"
            value={formData.registrationNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
            placeholder={formData.businessType === BusinessType.INDIVIDUAL ? '000-00-00000' : '000000-0000000'}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.registrationNumber ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={!!business} // Cannot change registration number for existing business
          />
          {errors.registrationNumber && <p className="text-red-500 text-sm mt-1">{errors.registrationNumber}</p>}
          <p className="text-sm text-gray-500 mt-1">
            {formData.businessType === BusinessType.INDIVIDUAL 
              ? '개인사업자: 000-00-00000 형식' 
              : '법인사업자: 000000-0000000 형식'
            }
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">사업자명 *</label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.businessName ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
        </div>
      </div>

      {/* Owner Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">소유자 신원 *</label>
        {loadingOwners ? (
          <div className="px-3 py-2 text-gray-500">소유자 로딩 중...</div>
        ) : (
          <select
            value={formData.ownerIdentityId}
            onChange={(e) => setFormData(prev => ({ ...prev, ownerIdentityId: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.ownerIdentityId ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={!!business} // Cannot change owner for existing business
          >
            <option value="">소유자를 선택하세요</option>
            {availableOwners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.fullName} ({owner.email}) - {owner.idType === IdType.PERSONAL ? '개인' : '법인'}
              </option>
            ))}
          </select>
        )}
        {errors.ownerIdentityId && <p className="text-red-500 text-sm mt-1">{errors.ownerIdentityId}</p>}
        {business && (
          <p className="text-sm text-gray-500 mt-1">소유자는 등록 후 변경할 수 없습니다. 소유권 이전은 별도 기능을 이용해주세요.</p>
        )}
      </div>

      {/* Additional Information */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">추가 정보</label>
        <textarea
          value={JSON.stringify(formData.registrationData, null, 2)}
          onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value || '{}');
              setFormData(prev => ({ ...prev, registrationData: data }));
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder='{
  "address": "주소",
  "phone": "전화번호",
  "description": "사업 설명"
}'
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <p className="text-sm text-gray-500 mt-1">JSON 형식으로 입력해주세요.</p>
      </div>

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
          {loading ? '저장 중...' : (business ? '수정' : '등록')}
        </button>
      </div>
    </form>
  );
};

// Business Detail Component
interface BusinessDetailProps {
  businessId: string;
  onEdit: (business: BusinessRegistration) => void;
  onClose: () => void;
}

export const BusinessDetail: React.FC<BusinessDetailProps> = ({ businessId, onEdit, onClose }) => {
  const [business, setBusiness] = useState<BusinessRegistration | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<UnifiedIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableOwners, setAvailableOwners] = useState<UnifiedIdentity[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState('');

  useEffect(() => {
    loadBusinessDetail();
  }, [businessId]);

  const loadBusinessDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const businessData = await businessApi.getBusinessById(businessId);
      setBusiness(businessData);

      // Load owner information
      if (businessData.ownerIdentityId) {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/identity/${businessData.ownerIdentityId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const result = await response.json();
          setOwnerInfo(result.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationChange = async (newStatus: VerificationStatus) => {
    if (!business) return;

    try {
      setVerifyLoading(true);
      const updated = await businessApi.verifyBusiness(
        businessId, 
        newStatus,
        { verifiedAt: new Date(), verifiedBy: 'admin' }
      );
      setBusiness(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update verification');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!business || !selectedNewOwner) return;

    if (!confirm(`소유권을 이전하시겠습니까? 이 작업은 취소할 수 없습니다.`)) {
      return;
    }

    try {
      setTransferLoading(true);
      const updated = await businessApi.transferOwnership(businessId, selectedNewOwner);
      setBusiness(updated);
      setShowTransferModal(false);
      await loadBusinessDetail(); // Reload to get new owner info
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!business || !confirm('정말로 이 사업자를 비활성화하시겠습니까?')) return;

    try {
      await businessApi.deactivateBusiness(businessId);
      await loadBusinessDetail(); // Reload to show updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate business');
    }
  };

  const openTransferModal = async () => {
    try {
      const owners = await businessApi.getAvailableOwners();
      setAvailableOwners(owners.filter(owner => owner.id !== business?.ownerIdentityId));
      setShowTransferModal(true);
    } catch (err) {
      setError('Failed to load available owners');
    }
  };

  const getVerificationStatusColor = (status: VerificationStatus): string => {
    const colors = {
      [VerificationStatus.VERIFIED]: 'bg-green-100 text-green-800',
      [VerificationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [VerificationStatus.REJECTED]: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getVerificationStatusText = (status: VerificationStatus): string => {
    const texts = {
      [VerificationStatus.VERIFIED]: '인증됨',
      [VerificationStatus.PENDING]: '검토중',
      [VerificationStatus.REJECTED]: '거부됨'
    };
    return texts[status];
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
          onClick={loadBusinessDetail}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-8 text-center text-gray-500">
        사업자 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{business.businessName}</h2>
          <p className="text-gray-600">등록번호: {business.registrationNumber}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(business)}
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
            <label className="block text-sm font-medium text-gray-500">사업자 타입</label>
            <p className="text-lg">{business.businessType === BusinessType.INDIVIDUAL ? '개인사업자' : '법인사업자'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">인증 상태</label>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVerificationStatusColor(business.verificationStatus)}`}>
              {getVerificationStatusText(business.verificationStatus)}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">등록일</label>
            <p className="text-lg">{new Date(business.createdAt).toLocaleDateString('ko-KR')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">상태</label>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              business.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {business.isActive ? '활성' : '비활성'}
            </span>
          </div>
        </div>

        {/* Verification Actions */}
        <div className="mt-6 flex space-x-2">
          {business.verificationStatus !== VerificationStatus.VERIFIED && (
            <button
              onClick={() => handleVerificationChange(VerificationStatus.VERIFIED)}
              disabled={verifyLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {verifyLoading ? '처리 중...' : '인증 승인'}
            </button>
          )}
          {business.verificationStatus !== VerificationStatus.REJECTED && (
            <button
              onClick={() => handleVerificationChange(VerificationStatus.REJECTED)}
              disabled={verifyLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {verifyLoading ? '처리 중...' : '인증 거부'}
            </button>
          )}
          <button
            onClick={openTransferModal}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            소유권 이전
          </button>
          {business.isActive && (
            <button
              onClick={handleDeactivate}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              비활성화
            </button>
          )}
        </div>
      </div>

      {/* Owner Information */}
      {ownerInfo && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">소유자 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">이름</label>
              <p className="text-lg">{ownerInfo.fullName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">이메일</label>
              <p className="text-lg">{ownerInfo.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">신원 타입</label>
              <p className="text-lg">{ownerInfo.idType === IdType.PERSONAL ? '개인' : '법인'}</p>
            </div>
            {ownerInfo.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-500">전화번호</label>
                <p className="text-lg">{ownerInfo.phone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Information */}
      {business.registrationData && Object.keys(business.registrationData).length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">추가 정보</h3>
          <pre className="bg-gray-50 p-4 rounded-md text-sm font-mono overflow-x-auto">
            {JSON.stringify(business.registrationData, null, 2)}
          </pre>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="소유권 이전"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            <p className="font-medium">주의: 소유권 이전은 취소할 수 없습니다.</p>
            <p className="text-sm mt-1">신중히 결정하시기 바랍니다.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">새로운 소유자 선택</label>
            <select
              value={selectedNewOwner}
              onChange={(e) => setSelectedNewOwner(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">소유자를 선택하세요</option>
              {availableOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fullName} ({owner.email}) - {owner.idType === IdType.PERSONAL ? '개인' : '법인'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowTransferModal(false)}
              disabled={transferLoading}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleTransferOwnership}
              disabled={transferLoading || !selectedNewOwner}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {transferLoading ? '이전 중...' : '소유권 이전'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Main Business Registration Management Component
export const BusinessRegistrationManagement: React.FC = () => {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessRegistration | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSelectBusiness = (business: BusinessRegistration) => {
    setSelectedBusiness(business);
    setView('detail');
    setShowModal(true);
  };

  const handleCreateBusiness = () => {
    setSelectedBusiness(null);
    setView('create');
    setShowModal(true);
  };

  const handleEditBusiness = (business: BusinessRegistration) => {
    setSelectedBusiness(business);
    setView('edit');
    setShowModal(true);
  };

  const handleSaveBusiness = (business: BusinessRegistration) => {
    setShowModal(false);
    setView('list');
    // Optionally refresh the list or show success message
  };

  const handleCancel = () => {
    setShowModal(false);
    setView('list');
    setSelectedBusiness(null);
  };

  const getModalTitle = () => {
    switch (view) {
      case 'create': return '사업자 등록';
      case 'edit': return '사업자 수정';
      case 'detail': return '사업자 상세';
      default: return '사업자 관리';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">사업자 등록 관리</h1>
      </div>

      <BusinessList 
        onSelectBusiness={handleSelectBusiness}
        onCreateBusiness={handleCreateBusiness}
      />

      <Modal
        isOpen={showModal}
        onClose={handleCancel}
        title={getModalTitle()}
        size={view === 'detail' ? 'xl' : 'lg'}
      >
        {view === 'create' && (
          <BusinessForm
            onSave={handleSaveBusiness}
            onCancel={handleCancel}
          />
        )}
        {view === 'edit' && selectedBusiness && (
          <BusinessForm
            business={selectedBusiness}
            onSave={handleSaveBusiness}
            onCancel={handleCancel}
          />
        )}
        {view === 'detail' && selectedBusiness && (
          <BusinessDetail
            businessId={selectedBusiness.id}
            onEdit={handleEditBusiness}
            onClose={handleCancel}
          />
        )}
      </Modal>
    </div>
  );
};

export default BusinessRegistrationManagement;
