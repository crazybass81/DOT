/**
 * Contract Service - 근로계약 관리 서비스
 * ID-ROLE-PAPER 시스템의 계약 관리 기능 구현
 */

import { createClient } from '@supabase/supabase-js';

// Contract types and interfaces
export interface Contract {
  id: string;
  employee_id: string;
  organization_id: string;
  contract_type: 'EMPLOYMENT' | 'PART_TIME' | 'TEMPORARY' | 'INTERNSHIP' | 'FREELANCE';
  start_date: string;
  end_date?: string;
  status: 'PENDING' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  wage_amount?: number;
  wage_type: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
  is_minor: boolean;
  parent_consent_file?: string;
  terms: Record<string, any>;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateContractData {
  employee_id: string;
  organization_id: string;
  contract_type: Contract['contract_type'];
  start_date: string;
  end_date?: string;
  wage_amount?: number;
  wage_type: Contract['wage_type'];
  is_minor?: boolean;
  parent_consent_file?: string;
  terms?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ContractWithEmployee extends Contract {
  employee: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ContractWithOrganization extends Contract {
  organization: {
    id: string;
    name: string;
  };
}

/**
 * Contract Service Class
 */
export class ContractService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * 사용자의 활성 계약 목록 조회
   */
  async getUserContracts(userId: string): Promise<{
    success: boolean;
    contracts?: ContractWithOrganization[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('get_active_contracts', {
        user_uuid: userId
      });

      if (error) {
        console.error('Error fetching user contracts:', error);
        return {
          success: false,
          error: 'Failed to fetch contracts'
        };
      }

      return {
        success: true,
        contracts: data || []
      };
    } catch (error) {
      console.error('Contract service error:', error);
      return {
        success: false,
        error: 'Service error'
      };
    }
  }

  /**
   * 조직의 모든 계약 조회 (관리자용)
   */
  async getOrganizationContracts(organizationId: string): Promise<{
    success: boolean;
    contracts?: ContractWithEmployee[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('get_organization_contracts', {
        org_id: organizationId
      });

      if (error) {
        console.error('Error fetching organization contracts:', error);
        return {
          success: false,
          error: 'Failed to fetch organization contracts'
        };
      }

      return {
        success: true,
        contracts: data || []
      };
    } catch (error) {
      console.error('Contract service error:', error);
      return {
        success: false,
        error: 'Service error'
      };
    }
  }

  /**
   * 새 계약 생성
   */
  async createContract(contractData: CreateContractData): Promise<{
    success: boolean;
    contract?: Contract;
    error?: string;
  }> {
    try {
      // 데이터 유효성 검증
      const validation = this.validateContractData(contractData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const { data, error } = await this.supabase
        .from('contracts')
        .insert([{
          ...contractData,
          status: 'PENDING',
          is_active: true,
          terms: contractData.terms || {},
          metadata: contractData.metadata || {}
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating contract:', error);
        return {
          success: false,
          error: 'Failed to create contract'
        };
      }

      return {
        success: true,
        contract: data
      };
    } catch (error) {
      console.error('Contract creation error:', error);
      return {
        success: false,
        error: 'Service error'
      };
    }
  }

  /**
   * 계약 수정
   */
  async updateContract(
    contractId: string, 
    updates: Partial<Contract>
  ): Promise<{
    success: boolean;
    contract?: Contract;
    error?: string;
  }> {
    try {
      // 수정 가능한 필드만 허용
      const allowedUpdates = {
        end_date: updates.end_date,
        status: updates.status,
        metadata: updates.metadata,
        parent_consent_file: updates.parent_consent_file
      };

      // undefined 값 제거
      Object.keys(allowedUpdates).forEach(key => {
        if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
          delete allowedUpdates[key as keyof typeof allowedUpdates];
        }
      });

      const { data, error } = await this.supabase
        .from('contracts')
        .update(allowedUpdates)
        .eq('id', contractId)
        .select()
        .single();

      if (error) {
        console.error('Error updating contract:', error);
        return {
          success: false,
          error: 'Failed to update contract'
        };
      }

      return {
        success: true,
        contract: data
      };
    } catch (error) {
      console.error('Contract update error:', error);
      return {
        success: false,
        error: 'Service error'
      };
    }
  }

  /**
   * 계약 활성화
   */
  async activateContract(contractId: string): Promise<{
    success: boolean;
    contract?: Contract;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('contracts')
        .update({ 
          status: 'ACTIVE',
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId)
        .eq('status', 'PENDING')
        .select()
        .single();

      if (error) {
        console.error('Error activating contract:', error);
        return {
          success: false,
          error: 'Failed to activate contract'
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Contract not found or already active'
        };
      }

      return {
        success: true,
        contract: data
      };
    } catch (error) {
      console.error('Contract activation error:', error);
      return {
        success: false,
        error: 'Service error'
      };
    }
  }

  /**
   * 계약 종료
   */
  async terminateContract(contractId: string, endDate?: string): Promise<{
    success: boolean;
    contract?: Contract;
    error?: string;
  }> {
    try {
      const updates: Partial<Contract> = {
        status: 'TERMINATED',
        updated_at: new Date().toISOString()
      };

      if (endDate) {
        updates.end_date = endDate;
      }

      const { data, error } = await this.supabase
        .from('contracts')
        .update(updates)
        .eq('id', contractId)
        .eq('status', 'ACTIVE')
        .select()
        .single();

      if (error) {
        console.error('Error terminating contract:', error);
        return {
          success: false,
          error: 'Failed to terminate contract'
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Contract not found or not active'
        };
      }

      return {
        success: true,
        contract: data
      };
    } catch (error) {
      console.error('Contract termination error:', error);
      return {
        success: false,
        error: 'Service error'
      };
    }
  }

  /**
   * 계약 상세 조회
   */
  async getContractById(contractId: string): Promise<{
    success: boolean;
    contract?: Contract;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('contracts')
        .select(`
          *,
          employee:employees!employee_id(id, name, email),
          organization:organizations!organization_id(id, name)
        `)
        .eq('id', contractId)
        .single();

      if (error) {
        console.error('Error fetching contract:', error);
        return {
          success: false,
          error: 'Contract not found'
        };
      }

      return {
        success: true,
        contract: data
      };
    } catch (error) {
      console.error('Contract fetch error:', error);
      return {
        success: false,
        error: 'Service error'
      };
    }
  }

  /**
   * 만료된 계약 자동 처리
   */
  async expireContracts(): Promise<{
    success: boolean;
    expiredCount?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('expire_contracts');

      if (error) {
        console.error('Error expiring contracts:', error);
        return {
          success: false,
          error: 'Failed to expire contracts'
        };
      }

      return {
        success: true,
        expiredCount: data || 0
      };
    } catch (error) {
      console.error('Contract expiration error:', error);
      return {
        success: false,
        error: 'Service error'
      };
    }
  }

  /**
   * 계약 데이터 유효성 검증
   */
  private validateContractData(data: CreateContractData): {
    isValid: boolean;
    error?: string;
  } {
    if (!data.employee_id) {
      return { isValid: false, error: 'Employee ID is required' };
    }

    if (!data.organization_id) {
      return { isValid: false, error: 'Organization ID is required' };
    }

    if (!data.start_date) {
      return { isValid: false, error: 'Start date is required' };
    }

    // 시작일 유효성 검증
    const startDate = new Date(data.start_date);
    if (isNaN(startDate.getTime())) {
      return { isValid: false, error: 'Invalid start date' };
    }

    // 종료일 유효성 검증
    if (data.end_date) {
      const endDate = new Date(data.end_date);
      if (isNaN(endDate.getTime())) {
        return { isValid: false, error: 'Invalid end date' };
      }

      if (endDate <= startDate) {
        return { isValid: false, error: 'End date must be after start date' };
      }
    }

    // 급여 정보 검증
    if (data.wage_amount !== undefined && data.wage_amount < 0) {
      return { isValid: false, error: 'Wage amount cannot be negative' };
    }

    return { isValid: true };
  }
}

// Singleton instance
export const contractService = new ContractService();