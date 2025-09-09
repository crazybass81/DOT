/**
 * Paper Management UI Components
 * Document lifecycle management with business context validation
 * 
 * Features:
 * - Paper creation and editing with type-specific validation
 * - Document lifecycle management (valid periods, extensions)
 * - Business context association and validation
 * - Paper status tracking and workflow management
 * - Bulk operations for paper management
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import {
  PaperType,
  Paper,
  BusinessRegistration,
  UnifiedIdentity,
  IdType
} from '../../types/id-role-paper';

// API client for paper operations
class PaperApiClient {
  private baseUrl = '/api/papers';

  async searchPapers(params: {
    ownerIdentityId?: string;
    relatedBusinessId?: string;
    paperType?: PaperType;
    isActive?: boolean;
    validOnly?: boolean;
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

  async getPaperById(paperId: string): Promise<Paper> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${paperId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get paper: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async createPaper(request: {
    paperType: PaperType;
    ownerIdentityId: string;
    relatedBusinessId?: string;
    paperData: Record<string, any>;
    validFrom?: Date;
    validUntil?: Date;
  }): Promise<Paper> {
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
      throw new Error(error.error || 'Failed to create paper');
    }

    const result = await response.json();
    return result.data;
  }

  async updatePaper(paperId: string, request: {
    paperData?: Record<string, any>;
    validFrom?: Date;
    validUntil?: Date;
  }): Promise<Paper> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${paperId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update paper');
    }

    const result = await response.json();
    return result.data;
  }

  async validatePaper(paperId: string, validationData?: any): Promise<Paper> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${paperId}/validate`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ validationData })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to validate paper');
    }

    const result = await response.json();
    return result.data;
  }

  async extendValidity(paperId: string, newValidUntil: Date, extensionData?: any): Promise<Paper> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${paperId}/extend`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newValidUntil, extensionData })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extend validity');
    }

    const result = await response.json();
    return result.data;
  }

  async deactivatePaper(paperId: string): Promise<Paper> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${this.baseUrl}/${paperId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to deactivate paper');
    }

    const result = await response.json();
    return result.data;
  }

  // Get available identities for paper ownership
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

  // Get available businesses for paper association
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

const paperApi = new PaperApiClient();

// Paper Type Configuration
const PAPER_TYPE_CONFIG = {
  [PaperType.EMPLOYMENT_CONTRACT]: {
    name: '근로계약서',
    description: '직원과의 근로계약',
    requiresBusiness: true,
    defaultValidityMonths: 12
  },
  [PaperType.BUSINESS_LICENSE]: {
    name: '사업자등록증',
    description: '사업자 등록 증명',
    requiresBusiness: true,
    defaultValidityMonths: 60
  },
  [PaperType.WORK_PERMIT]: {
    name: '재류및취업허가',
    description: '외국인 재류 및 취업 허가',
    requiresBusiness: false,
    defaultValidityMonths: 24
  },
  [PaperType.FRANCHISE_AGREEMENT]: {
    name: '프랜차이즈계약서',
    description: '프랜차이즈 운영 계약',
    requiresBusiness: true,
    defaultValidityMonths: 36
  },
  [PaperType.OWNERSHIP_CERTIFICATE]: {
    name: '소유권증명서',
    description: '사업자 소유권 증명',
    requiresBusiness: true,
    defaultValidityMonths: 120
  },
  [PaperType.DELEGATION_LETTER]: {
    name: '위임장',
    description: '권한 위임 증명',
    requiresBusiness: true,
    defaultValidityMonths: 6
  }
};

// Paper Search and List Component
interface PaperListProps {
  onSelectPaper: (paper: Paper) => void;
  onCreatePaper: () => void;
}

export const PaperList: React.FC<PaperListProps> = ({ onSelectPaper, onCreatePaper }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    ownerIdentityId: '',
    relatedBusinessId: '',
    paperType: '' as '' | PaperType,
    isActive: 'true' as '' | 'true' | 'false',
    validOnly: '' as '' | 'true' | 'false'
  });
  const [error, setError] = useState<string | null>(null);
  const [availableOwners, setAvailableOwners] = useState<UnifiedIdentity[]>([]);
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessRegistration[]>([]);

  const loadPapers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = { limit: 50 };
      if (searchParams.ownerIdentityId) params.ownerIdentityId = searchParams.ownerIdentityId;
      if (searchParams.relatedBusinessId) params.relatedBusinessId = searchParams.relatedBusinessId;
      if (searchParams.paperType) params.paperType = searchParams.paperType;
      if (searchParams.isActive) params.isActive = searchParams.isActive === 'true';
      if (searchParams.validOnly) params.validOnly = searchParams.validOnly === 'true';

      const result = await paperApi.searchPapers(params);
      setPapers(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPapers();
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const [owners, businesses] = await Promise.all([
        paperApi.getAvailableOwners(),
        paperApi.getAvailableBusinesses()
      ]);
      setAvailableOwners(owners);
      setAvailableBusinesses(businesses);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const handleSearch = () => {
    loadPapers();
  };

  const getStatusBadge = (paper: Paper) => {
    const badges = [];
    
    if (paper.isActive) {
      badges.push(<span key="active" className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">활성</span>);
    } else {
      badges.push(<span key="inactive" className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">비활성</span>);
    }

    // Check validity
    const now = new Date();
    const isValid = !paper.validUntil || new Date(paper.validUntil) > now;
    const isStarted = !paper.validFrom || new Date(paper.validFrom) <= now;
    
    if (isStarted && isValid) {
      badges.push(<span key="valid" className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">유효</span>);
    } else if (!isStarted) {
      badges.push(<span key="future" className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">시작 전</span>);
    } else {
      badges.push(<span key="expired" className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">만료</span>);
    }

    // Paper type
    const config = PAPER_TYPE_CONFIG[paper.paperType as PaperType];
    badges.push(
      <span key="type" className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
        {config?.name || paper.paperType}
      </span>
    );

    return badges;
  };

  const getExpirationWarning = (paper: Paper) => {
    if (!paper.validUntil || !paper.isActive) return null;

    const now = new Date();
    const validUntil = new Date(paper.validUntil);
    const daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <span className="text-red-600 text-sm font-medium">만료됨</span>;
    } else if (daysUntilExpiry <= 30) {
      return <span className="text-yellow-600 text-sm font-medium">{daysUntilExpiry}일 후 만료</span>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">문서 검색</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">소유자</label>
            <select
              value={searchParams.ownerIdentityId}
              onChange={(e) => setSearchParams(prev => ({ ...prev, ownerIdentityId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 소유자</option>
              {availableOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fullName} ({owner.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">관련 사업자</label>
            <select
              value={searchParams.relatedBusinessId}
              onChange={(e) => setSearchParams(prev => ({ ...prev, relatedBusinessId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 사업자</option>
              {availableBusinesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.businessName} ({business.registrationNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">문서 타입</label>
            <select
              value={searchParams.paperType}
              onChange={(e) => setSearchParams(prev => ({ ...prev, paperType: e.target.value as '' | PaperType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 타입</option>
              {Object.entries(PAPER_TYPE_CONFIG).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
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
              활성화된 문서만
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={searchParams.validOnly === 'true'}
                onChange={(e) => setSearchParams(prev => ({ 
                  ...prev, 
                  validOnly: e.target.checked ? 'true' : '' 
                }))}
                className="mr-2"
              />
              유효한 문서만
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
              onClick={onCreatePaper}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              문서 등록
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

      {/* Paper List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">문서 목록 ({papers.length}개)</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            로딩 중...
          </div>
        ) : papers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            검색 결과가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {papers.map((paper) => {
              const config = PAPER_TYPE_CONFIG[paper.paperType as PaperType];
              const owner = availableOwners.find(o => o.id === paper.ownerIdentityId);
              const business = availableBusinesses.find(b => b.id === paper.relatedBusinessId);
              const expirationWarning = getExpirationWarning(paper);
              
              return (
                <div
                  key={paper.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectPaper(paper)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium">{config?.name || paper.paperType}</h4>
                        <div className="flex space-x-2">
                          {getStatusBadge(paper)}
                        </div>
                        {expirationWarning && (
                          <div className="ml-auto">
                            {expirationWarning}
                          </div>
                        )}
                      </div>
                      {owner && (
                        <p className="text-gray-600 mb-1">소유자: {owner.fullName} ({owner.email})</p>
                      )}
                      {business && (
                        <p className="text-gray-600 mb-1">관련 사업자: {business.businessName}</p>
                      )}
                      {paper.validFrom && (
                        <p className="text-gray-500 text-sm">시작: {new Date(paper.validFrom).toLocaleDateString('ko-KR')}</p>
                      )}
                      {paper.validUntil && (
                        <p className="text-gray-500 text-sm">만료: {new Date(paper.validUntil).toLocaleDateString('ko-KR')}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>등록: {new Date(paper.createdAt).toLocaleDateString('ko-KR')}</p>
                      {paper.updatedAt && paper.updatedAt !== paper.createdAt && (
                        <p>수정: {new Date(paper.updatedAt).toLocaleDateString('ko-KR')}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Paper Form Component
interface PaperFormProps {
  paper?: Paper;
  onSave: (paper: Paper) => void;
  onCancel: () => void;
}

export const PaperForm: React.FC<PaperFormProps> = ({ paper, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    paperType: paper?.paperType || PaperType.EMPLOYMENT_CONTRACT,
    ownerIdentityId: paper?.ownerIdentityId || '',
    relatedBusinessId: paper?.relatedBusinessId || '',
    paperData: paper?.paperData || {},
    validFrom: paper?.validFrom ? new Date(paper.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    validUntil: paper?.validUntil ? new Date(paper.validUntil).toISOString().split('T')[0] : ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [availableOwners, setAvailableOwners] = useState<UnifiedIdentity[]>([]);
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessRegistration[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load available options
  useEffect(() => {
    loadAvailableData();
  }, []);

  useEffect(() => {
    // Set default validity period when paper type changes
    if (!paper) { // Only for new papers
      const config = PAPER_TYPE_CONFIG[formData.paperType as PaperType];
      if (config?.defaultValidityMonths && !formData.validUntil) {
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + config.defaultValidityMonths);
        setFormData(prev => ({ 
          ...prev, 
          validUntil: validUntil.toISOString().split('T')[0]
        }));
      }
    }
  }, [formData.paperType, paper]);

  const loadAvailableData = async () => {
    try {
      setLoadingData(true);
      const [owners, businesses] = await Promise.all([
        paperApi.getAvailableOwners(),
        paperApi.getAvailableBusinesses()
      ]);
      setAvailableOwners(owners);
      setAvailableBusinesses(businesses);
    } catch (err) {
      console.error('Failed to load available data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const config = PAPER_TYPE_CONFIG[formData.paperType as PaperType];

    if (!formData.ownerIdentityId) {
      newErrors.ownerIdentityId = '소유자를 선택해주세요';
    }

    if (config?.requiresBusiness && !formData.relatedBusinessId) {
      newErrors.relatedBusinessId = '이 문서 타입에는 관련 사업자가 필요합니다';
    }

    if (formData.validFrom && formData.validUntil) {
      const validFrom = new Date(formData.validFrom);
      const validUntil = new Date(formData.validUntil);
      if (validFrom >= validUntil) {
        newErrors.validUntil = '만료일은 시작일보다 늘어야 합니다';
      }
    }

    try {
      JSON.parse(JSON.stringify(formData.paperData));
    } catch {
      newErrors.paperData = '문서 데이터가 올바르지 않습니다';
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
        paperType: formData.paperType,
        ownerIdentityId: formData.ownerIdentityId,
        relatedBusinessId: formData.relatedBusinessId || undefined,
        paperData: formData.paperData,
        validFrom: formData.validFrom ? new Date(formData.validFrom) : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined
      };

      let result: Paper;
      if (paper) {
        // Update existing paper
        const updateRequest = {
          paperData: request.paperData,
          validFrom: request.validFrom,
          validUntil: request.validUntil
        };
        result = await paperApi.updatePaper(paper.id, updateRequest);
      } else {
        // Create new paper
        result = await paperApi.createPaper(request);
      }

      onSave(result);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to save paper' });
    } finally {
      setLoading(false);
    }
  };

  const config = PAPER_TYPE_CONFIG[formData.paperType as PaperType];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Paper Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">문서 타입</label>
        <select
          value={formData.paperType}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            paperType: e.target.value as PaperType,
            relatedBusinessId: '' // Reset business when type changes
          }))}
          disabled={!!paper} // Cannot change type for existing paper
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(PAPER_TYPE_CONFIG).map(([type, typeConfig]) => (
            <option key={type} value={type}>
              {typeConfig.name} - {typeConfig.description}
            </option>
          ))}
        </select>
        {paper && (
          <p className="text-sm text-gray-500 mt-1">문서 타입은 등록 후 변경할 수 없습니다.</p>
        )}
      </div>

      {loadingData ? (
        <div className="p-4 text-center text-gray-500">데이터 로딩 중...</div>
      ) : (
        <>
          {/* Owner Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">소유자 *</label>
            <select
              value={formData.ownerIdentityId}
              onChange={(e) => setFormData(prev => ({ ...prev, ownerIdentityId: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.ownerIdentityId ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={!!paper} // Cannot change owner for existing paper
            >
              <option value="">소유자를 선택하세요</option>
              {availableOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fullName} ({owner.email}) - {owner.idType === IdType.PERSONAL ? '개인' : '법인'}
                </option>
              ))}
            </select>
            {errors.ownerIdentityId && <p className="text-red-500 text-sm mt-1">{errors.ownerIdentityId}</p>}
          </div>

          {/* Business Selection (if required) */}
          {config?.requiresBusiness && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">관련 사업자 *</label>
              <select
                value={formData.relatedBusinessId}
                onChange={(e) => setFormData(prev => ({ ...prev, relatedBusinessId: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.relatedBusinessId ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={!!paper} // Cannot change business for existing paper
              >
                <option value="">사업자를 선택하세요</option>
                {availableBusinesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.businessName} ({business.registrationNumber})
                  </option>
                ))}
              </select>
              {errors.relatedBusinessId && <p className="text-red-500 text-sm mt-1">{errors.relatedBusinessId}</p>}
            </div>
          )}
        </>
      )}

      {/* Validity Period */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
          <input
            type="date"
            value={formData.validFrom}
            onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">만료일</label>
          <input
            type="date"
            value={formData.validUntil}
            onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.validUntil ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.validUntil && <p className="text-red-500 text-sm mt-1">{errors.validUntil}</p>}
        </div>
      </div>

      {/* Paper Data */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">문서 데이터</label>
        <textarea
          value={JSON.stringify(formData.paperData, null, 2)}
          onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value || '{}');
              setFormData(prev => ({ ...prev, paperData: data }));
              setErrors(prev => ({ ...prev, paperData: '' })); // Clear error
            } catch {
              // Keep the text as is for editing, error will be shown on submit
            }
          }}
          placeholder='{
  "title": "제목",
  "description": "설명",
  "terms": "조건"
}'
          rows={6}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
            errors.paperData ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.paperData && <p className="text-red-500 text-sm mt-1">{errors.paperData}</p>}
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
          {loading ? '저장 중...' : (paper ? '수정' : '등록')}
        </button>
      </div>
    </form>
  );
};

// Paper Detail Component
interface PaperDetailProps {
  paperId: string;
  onEdit: (paper: Paper) => void;
  onClose: () => void;
}

export const PaperDetail: React.FC<PaperDetailProps> = ({ paperId, onEdit, onClose }) => {
  const [paper, setPaper] = useState<Paper | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<UnifiedIdentity | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validateLoading, setValidateLoading] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [newValidUntil, setNewValidUntil] = useState('');

  useEffect(() => {
    loadPaperDetail();
  }, [paperId]);

  const loadPaperDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const paperData = await paperApi.getPaperById(paperId);
      setPaper(paperData);

      // Load owner information
      if (paperData.ownerIdentityId) {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/identity/${paperData.ownerIdentityId}`, {
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

      // Load business information if related
      if (paperData.relatedBusinessId) {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/business/${paperData.relatedBusinessId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const result = await response.json();
          setBusinessInfo(result.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load paper');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!paper) return;

    try {
      setValidateLoading(true);
      const updated = await paperApi.validatePaper(
        paperId,
        { validatedAt: new Date(), validatedBy: 'admin' }
      );
      setPaper(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate paper');
    } finally {
      setValidateLoading(false);
    }
  };

  const handleExtendValidity = async () => {
    if (!paper || !newValidUntil) return;

    try {
      setExtendLoading(true);
      const updated = await paperApi.extendValidity(
        paperId,
        new Date(newValidUntil),
        { extendedAt: new Date(), extendedBy: 'admin' }
      );
      setPaper(updated);
      setShowExtendModal(false);
      setNewValidUntil('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extend validity');
    } finally {
      setExtendLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!paper || !confirm('정말로 이 문서를 비활성화하시겠습니까?')) return;

    try {
      await paperApi.deactivatePaper(paperId);
      await loadPaperDetail(); // Reload to show updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate paper');
    }
  };

  const openExtendModal = () => {
    if (paper?.validUntil) {
      // Set default to 6 months from current expiry
      const currentExpiry = new Date(paper.validUntil);
      currentExpiry.setMonth(currentExpiry.getMonth() + 6);
      setNewValidUntil(currentExpiry.toISOString().split('T')[0]);
    } else {
      // Set default to 6 months from now
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      setNewValidUntil(sixMonthsFromNow.toISOString().split('T')[0]);
    }
    setShowExtendModal(true);
  };

  const getValidityStatus = () => {
    if (!paper) return null;

    const now = new Date();
    const isActive = paper.isActive;
    const isStarted = !paper.validFrom || new Date(paper.validFrom) <= now;
    const isValid = !paper.validUntil || new Date(paper.validUntil) > now;

    if (!isActive) {
      return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">비활성</span>;
    } else if (!isStarted) {
      return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">시작 전</span>;
    } else if (isValid) {
      return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">유효</span>;
    } else {
      return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">만료</span>;
    }
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
          onClick={loadPaperDetail}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="p-8 text-center text-gray-500">
        문서 정보를 찾을 수 없습니다.
      </div>
    );
  }

  const config = PAPER_TYPE_CONFIG[paper.paperType as PaperType];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{config?.name || paper.paperType}</h2>
          <p className="text-gray-600">{config?.description}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(paper)}
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
            <label className="block text-sm font-medium text-gray-500">문서 타입</label>
            <p className="text-lg">{config?.name || paper.paperType}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">상태</label>
            {getValidityStatus()}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">등록일</label>
            <p className="text-lg">{new Date(paper.createdAt).toLocaleDateString('ko-KR')}</p>
          </div>
          {paper.validFrom && (
            <div>
              <label className="block text-sm font-medium text-gray-500">시작일</label>
              <p className="text-lg">{new Date(paper.validFrom).toLocaleDateString('ko-KR')}</p>
            </div>
          )}
          {paper.validUntil && (
            <div>
              <label className="block text-sm font-medium text-gray-500">만료일</label>
              <p className="text-lg">{new Date(paper.validUntil).toLocaleDateString('ko-KR')}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex space-x-2">
          <button
            onClick={handleValidate}
            disabled={validateLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {validateLoading ? '검증 중...' : '문서 검증'}
          </button>
          <button
            onClick={openExtendModal}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            유효기간 연장
          </button>
          {paper.isActive && (
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

      {/* Business Information */}
      {businessInfo && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">관련 사업자 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">사업자명</label>
              <p className="text-lg">{businessInfo.businessName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">등록번호</label>
              <p className="text-lg">{businessInfo.registrationNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">사업자 타입</label>
              <p className="text-lg">{businessInfo.businessType === 'individual' ? '개인사업자' : '법인사업자'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">인증 상태</label>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                businessInfo.verificationStatus === 'verified' 
                  ? 'bg-green-100 text-green-800'
                  : businessInfo.verificationStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {businessInfo.verificationStatus === 'verified' ? '인증됨' : 
                 businessInfo.verificationStatus === 'pending' ? '검토중' : '거부됨'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Paper Data */}
      {paper.paperData && Object.keys(paper.paperData).length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">문서 데이터</h3>
          <pre className="bg-gray-50 p-4 rounded-md text-sm font-mono overflow-x-auto">
            {JSON.stringify(paper.paperData, null, 2)}
          </pre>
        </div>
      )}

      {/* Extend Validity Modal */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        title="유효기간 연장"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
            <p className="font-medium">유효기간을 연장합니다.</p>
            <p className="text-sm mt-1">현재 만료일: {paper.validUntil ? new Date(paper.validUntil).toLocaleDateString('ko-KR') : '설정되지 않음'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">새로운 만료일</label>
            <input
              type="date"
              value={newValidUntil}
              onChange={(e) => setNewValidUntil(e.target.value)}
              min={paper.validUntil ? paper.validUntil.split('T')[0] : new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowExtendModal(false)}
              disabled={extendLoading}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleExtendValidity}
              disabled={extendLoading || !newValidUntil}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {extendLoading ? '연장 중...' : '유효기간 연장'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Main Paper Management Component
export const PaperManagement: React.FC = () => {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSelectPaper = (paper: Paper) => {
    setSelectedPaper(paper);
    setView('detail');
    setShowModal(true);
  };

  const handleCreatePaper = () => {
    setSelectedPaper(null);
    setView('create');
    setShowModal(true);
  };

  const handleEditPaper = (paper: Paper) => {
    setSelectedPaper(paper);
    setView('edit');
    setShowModal(true);
  };

  const handleSavePaper = (paper: Paper) => {
    setShowModal(false);
    setView('list');
    // Optionally refresh the list or show success message
  };

  const handleCancel = () => {
    setShowModal(false);
    setView('list');
    setSelectedPaper(null);
  };

  const getModalTitle = () => {
    switch (view) {
      case 'create': return '문서 등록';
      case 'edit': return '문서 수정';
      case 'detail': return '문서 상세';
      default: return '문서 관리';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">문서 관리</h1>
      </div>

      <PaperList 
        onSelectPaper={handleSelectPaper}
        onCreatePaper={handleCreatePaper}
      />

      <Modal
        isOpen={showModal}
        onClose={handleCancel}
        title={getModalTitle()}
        size={view === 'detail' ? 'xl' : 'lg'}
      >
        {view === 'create' && (
          <PaperForm
            onSave={handleSavePaper}
            onCancel={handleCancel}
          />
        )}
        {view === 'edit' && selectedPaper && (
          <PaperForm
            paper={selectedPaper}
            onSave={handleSavePaper}
            onCancel={handleCancel}
          />
        )}
        {view === 'detail' && selectedPaper && (
          <PaperDetail
            paperId={selectedPaper.id}
            onEdit={handleEditPaper}
            onClose={handleCancel}
          />
        )}
      </Modal>
    </div>
  );
};

export default PaperManagement;
