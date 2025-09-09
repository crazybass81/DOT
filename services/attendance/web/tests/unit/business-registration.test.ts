/**
 * Business Registration Unit Tests
 * 
 * Tests the business registration management system:
 * - Business registration creation and validation
 * - Business type handling and compliance
 * - Ownership verification and transfer
 * - Business status lifecycle management
 * - Multi-business ownership scenarios
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { TestDataFactory, BusinessType } from '../setup/id-role-paper-test-setup';

// Business registration types and validation
export type BusinessStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'PENDING' | 'INACTIVE';
export type OwnershipType = 'SOLE' | 'PARTNERSHIP' | 'CORPORATE' | 'FRANCHISE';

export interface BusinessValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  compliance_issues: string[];
}

export interface BusinessOwnershipTransfer {
  id: string;
  business_id: string;
  from_personal_id: string;
  to_personal_id: string;
  transfer_date: string;
  transfer_type: 'SALE' | 'INHERITANCE' | 'GIFT' | 'COURT_ORDER';
  legal_documents: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approved_by?: string;
  completion_date?: string;
}

export interface BusinessComplianceCheck {
  business_id: string;
  check_date: string;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  issues_found: Array<{
    category: 'REGISTRATION' | 'TAX' | 'EMPLOYMENT' | 'LICENSING';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    remediation_required: boolean;
    deadline?: string;
  }>;
  next_review_date: string;
}

// Mock Business Registration Service
class BusinessRegistrationService {
  private businesses: Map<string, any> = new Map();
  private ownershipTransfers: Map<string, BusinessOwnershipTransfer> = new Map();
  private complianceRecords: Map<string, BusinessComplianceCheck[]> = new Map();

  async createBusinessRegistration(data: {
    business_name: string;
    business_number: string;
    business_type: BusinessType;
    owner_personal_id: string;
    registration_date: string;
    address?: string;
    industry_code?: string;
    employee_count?: number;
    created_by: string;
  }): Promise<{ success: boolean; data?: any; errors?: string[]; warnings?: string[] }> {
    // Validate business registration data
    const validation = await this.validateBusinessRegistration(data);
    if (!validation.valid) {
      return { success: false, errors: validation.errors, warnings: validation.warnings };
    }

    // Check for existing business number
    const existing = await this.findBusinessByNumber(data.business_number);
    if (existing.success && existing.data) {
      return { success: false, errors: ['Business number already exists'] };
    }

    // Verify owner exists
    const ownerValid = await this.verifyPersonalIdExists(data.owner_personal_id);
    if (!ownerValid) {
      return { success: false, errors: ['Owner personal ID does not exist'] };
    }

    // Create business registration
    const business = TestDataFactory.createBusinessRegistration(data.owner_personal_id, {
      business_name: data.business_name.trim(),
      business_number: data.business_number,
      business_type: data.business_type,
      registration_date: data.registration_date,
      status: 'ACTIVE'
    });

    // Add additional fields
    business.address = data.address || '';
    business.industry_code = data.industry_code || '';
    business.employee_count = data.employee_count || 0;
    business.created_by = data.created_by;

    this.businesses.set(business.id, business);

    return { 
      success: true, 
      data: business,
      warnings: validation.warnings
    };
  }

  async validateBusinessRegistration(data: any): Promise<BusinessValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const compliance_issues: string[] = [];

    // Required fields validation
    if (!data.business_name || data.business_name.trim().length === 0) {
      errors.push('Business name is required');
    } else if (data.business_name.length > 100) {
      errors.push('Business name must be 100 characters or less');
    }

    if (!data.business_number || !this.isValidBusinessNumber(data.business_number)) {
      errors.push('Valid business number is required (format: XXX-XX-XXXXX)');
    }

    if (!data.business_type || !this.isValidBusinessType(data.business_type)) {
      errors.push('Valid business type is required');
    }

    if (!data.owner_personal_id) {
      errors.push('Owner personal ID is required');
    }

    if (!data.registration_date) {
      errors.push('Registration date is required');
    } else {
      const regDate = new Date(data.registration_date);
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      if (isNaN(regDate.getTime())) {
        errors.push('Invalid registration date format');
      } else if (regDate > now) {
        errors.push('Registration date cannot be in the future');
      } else if (regDate < oneYearAgo) {
        warnings.push('Registration date is more than 1 year old');
      }
    }

    // Business type specific validations
    if (data.business_type === 'CORPORATION' && (!data.industry_code || data.industry_code.length < 4)) {
      compliance_issues.push('Corporations require valid industry code');
    }

    if (data.business_type === 'PARTNERSHIP' && (!data.employee_count || data.employee_count < 2)) {
      warnings.push('Partnerships typically have 2 or more employees');
    }

    if (data.business_type === 'FRANCHISE' && !data.franchisor_info) {
      compliance_issues.push('Franchise businesses require franchisor information');
    }

    // Address validation for certain business types
    if (['CORPORATION', 'PARTNERSHIP'].includes(data.business_type) && !data.address) {
      compliance_issues.push('Business address is required for this business type');
    }

    return { 
      valid: errors.length === 0, 
      errors, 
      warnings,
      compliance_issues 
    };
  }

  private isValidBusinessNumber(businessNumber: string): boolean {
    const businessNumberRegex = /^\d{3}-\d{2}-\d{5}$/;
    return businessNumberRegex.test(businessNumber);
  }

  private isValidBusinessType(businessType: string): boolean {
    const validTypes = ['SOLE_PROPRIETORSHIP', 'CORPORATION', 'PARTNERSHIP', 'FRANCHISE'];
    return validTypes.includes(businessType);
  }

  private async verifyPersonalIdExists(personalId: string): Promise<boolean> {
    // Mock implementation - in real system would check database
    return personalId.length > 0 && !personalId.startsWith('invalid');
  }

  async findBusinessByNumber(businessNumber: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!businessNumber) {
      return { success: false, error: 'Business number is required' };
    }

    const business = Array.from(this.businesses.values()).find(b => b.business_number === businessNumber);
    return { success: true, data: business };
  }

  async findBusinessesByOwner(ownerPersonalId: string): Promise<{ success: boolean; data: any[]; error?: string }> {
    if (!ownerPersonalId) {
      return { success: false, data: [], error: 'Owner personal ID is required' };
    }

    const businesses = Array.from(this.businesses.values()).filter(b => b.owner_personal_id === ownerPersonalId);
    return { success: true, data: businesses };
  }

  async updateBusinessStatus(businessId: string, newStatus: BusinessStatus, reason: string, updatedBy: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const business = this.businesses.get(businessId);
    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    // Validate status transition
    const validTransition = this.isValidStatusTransition(business.status, newStatus);
    if (!validTransition) {
      return { success: false, error: `Invalid status transition from ${business.status} to ${newStatus}` };
    }

    const oldStatus = business.status;
    business.status = newStatus;
    business.status_updated_at = new Date().toISOString();
    business.status_updated_by = updatedBy;
    business.status_change_reason = reason;

    // Add status history
    if (!business.status_history) {
      business.status_history = [];
    }
    business.status_history.push({
      from_status: oldStatus,
      to_status: newStatus,
      change_date: business.status_updated_at,
      changed_by: updatedBy,
      reason
    });

    return { success: true, data: business };
  }

  private isValidStatusTransition(currentStatus: BusinessStatus, newStatus: BusinessStatus): boolean {
    const validTransitions: Record<BusinessStatus, BusinessStatus[]> = {
      'PENDING': ['ACTIVE', 'TERMINATED'],
      'ACTIVE': ['SUSPENDED', 'INACTIVE', 'TERMINATED'],
      'SUSPENDED': ['ACTIVE', 'TERMINATED'],
      'INACTIVE': ['ACTIVE', 'TERMINATED'],
      'TERMINATED': [] // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  async initiateOwnershipTransfer(transferData: {
    business_id: string;
    from_personal_id: string;
    to_personal_id: string;
    transfer_type: BusinessOwnershipTransfer['transfer_type'];
    legal_documents: string[];
    initiated_by: string;
  }): Promise<{ success: boolean; data?: BusinessOwnershipTransfer; errors?: string[] }> {
    const business = this.businesses.get(transferData.business_id);
    if (!business) {
      return { success: false, errors: ['Business not found'] };
    }

    // Verify current ownership
    if (business.owner_personal_id !== transferData.from_personal_id) {
      return { success: false, errors: ['Transfer initiator is not the current owner'] };
    }

    // Verify new owner exists
    const newOwnerValid = await this.verifyPersonalIdExists(transferData.to_personal_id);
    if (!newOwnerValid) {
      return { success: false, errors: ['New owner personal ID does not exist'] };
    }

    // Create transfer record
    const transfer: BusinessOwnershipTransfer = {
      id: `transfer-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      business_id: transferData.business_id,
      from_personal_id: transferData.from_personal_id,
      to_personal_id: transferData.to_personal_id,
      transfer_date: new Date().toISOString(),
      transfer_type: transferData.transfer_type,
      legal_documents: transferData.legal_documents,
      status: 'PENDING'
    };

    this.ownershipTransfers.set(transfer.id, transfer);

    return { success: true, data: transfer };
  }

  async approveOwnershipTransfer(transferId: string, approvedBy: string): Promise<{ success: boolean; data?: BusinessOwnershipTransfer; error?: string }> {
    const transfer = this.ownershipTransfers.get(transferId);
    if (!transfer) {
      return { success: false, error: 'Transfer not found' };
    }

    if (transfer.status !== 'PENDING') {
      return { success: false, error: `Transfer is not in PENDING status. Current status: ${transfer.status}` };
    }

    // Update transfer status
    transfer.status = 'APPROVED';
    transfer.approved_by = approvedBy;

    return { success: true, data: transfer };
  }

  async completeOwnershipTransfer(transferId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const transfer = this.ownershipTransfers.get(transferId);
    if (!transfer) {
      return { success: false, error: 'Transfer not found' };
    }

    if (transfer.status !== 'APPROVED') {
      return { success: false, error: `Transfer must be approved before completion. Current status: ${transfer.status}` };
    }

    const business = this.businesses.get(transfer.business_id);
    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    // Update business ownership
    const oldOwner = business.owner_personal_id;
    business.owner_personal_id = transfer.to_personal_id;
    business.ownership_transferred_at = new Date().toISOString();

    // Add ownership history
    if (!business.ownership_history) {
      business.ownership_history = [];
    }
    business.ownership_history.push({
      from_owner: oldOwner,
      to_owner: transfer.to_personal_id,
      transfer_date: business.ownership_transferred_at,
      transfer_type: transfer.transfer_type,
      transfer_id: transferId
    });

    // Complete transfer
    transfer.status = 'COMPLETED';
    transfer.completion_date = new Date().toISOString();

    return { success: true, data: { business, transfer } };
  }

  async performComplianceCheck(businessId: string, checkType: 'ROUTINE' | 'AUDIT' | 'COMPLAINT' = 'ROUTINE'): Promise<{ success: boolean; data?: BusinessComplianceCheck; error?: string }> {
    const business = this.businesses.get(businessId);
    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    const issues = [];

    // Check registration compliance
    if (!business.business_number || !this.isValidBusinessNumber(business.business_number)) {
      issues.push({
        category: 'REGISTRATION' as const,
        severity: 'HIGH' as const,
        description: 'Invalid or missing business registration number',
        remediation_required: true,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      });
    }

    // Check address requirements
    if (['CORPORATION', 'PARTNERSHIP'].includes(business.business_type) && !business.address) {
      issues.push({
        category: 'REGISTRATION' as const,
        severity: 'MEDIUM' as const,
        description: 'Business address required for this business type',
        remediation_required: true,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
      });
    }

    // Check employee compliance (mock)
    if (business.employee_count > 10 && !business.hr_compliance_certification) {
      issues.push({
        category: 'EMPLOYMENT' as const,
        severity: 'MEDIUM' as const,
        description: 'HR compliance certification required for businesses with >10 employees',
        remediation_required: true,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      });
    }

    // Determine overall compliance status
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = issues.filter(i => i.severity === 'HIGH');
    
    let compliance_status: BusinessComplianceCheck['compliance_status'];
    if (criticalIssues.length > 0) {
      compliance_status = 'NON_COMPLIANT';
    } else if (highIssues.length > 0) {
      compliance_status = 'PENDING_REVIEW';
    } else {
      compliance_status = 'COMPLIANT';
    }

    const complianceCheck: BusinessComplianceCheck = {
      business_id: businessId,
      check_date: new Date().toISOString(),
      compliance_status,
      issues_found: issues,
      next_review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    };

    // Store compliance record
    if (!this.complianceRecords.has(businessId)) {
      this.complianceRecords.set(businessId, []);
    }
    this.complianceRecords.get(businessId)!.push(complianceCheck);

    return { success: true, data: complianceCheck };
  }

  async getBusinessesByType(businessType: BusinessType): Promise<{ success: boolean; data: any[] }> {
    const businesses = Array.from(this.businesses.values()).filter(b => b.business_type === businessType);
    return { success: true, data: businesses };
  }

  async getBusinessesByStatus(status: BusinessStatus): Promise<{ success: boolean; data: any[] }> {
    const businesses = Array.from(this.businesses.values()).filter(b => b.status === status);
    return { success: true, data: businesses };
  }

  async getComplianceHistory(businessId: string): Promise<{ success: boolean; data: BusinessComplianceCheck[]; error?: string }> {
    if (!businessId) {
      return { success: false, data: [], error: 'Business ID is required' };
    }

    const history = this.complianceRecords.get(businessId) || [];
    return { success: true, data: history.sort((a, b) => new Date(b.check_date).getTime() - new Date(a.check_date).getTime()) };
  }

  async updateBusinessInfo(businessId: string, updates: any, updatedBy: string): Promise<{ success: boolean; data?: any; errors?: string[] }> {
    const business = this.businesses.get(businessId);
    if (!business) {
      return { success: false, errors: ['Business not found'] };
    }

    // Validate updates
    const validation = await this.validateBusinessRegistration({ ...business, ...updates });
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Apply updates
    Object.assign(business, updates);
    business.updated_at = new Date().toISOString();
    business.updated_by = updatedBy;

    return { success: true, data: business };
  }

  // Helper method to clear all data for testing
  clearAllData(): void {
    this.businesses.clear();
    this.ownershipTransfers.clear();
    this.complianceRecords.clear();
  }
}

describe('Business Registration Service', () => {
  let businessService: BusinessRegistrationService;

  beforeEach(() => {
    businessService = new BusinessRegistrationService();
  });

  describe('Business Registration Creation', () => {
    test('should create business registration successfully', async () => {
      const businessData = {
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        address: '서울시 강남구 테헤란로 123',
        created_by: 'admin'
      };

      const result = await businessService.createBusinessRegistration(businessData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.business_name).toBe('테스트 카페');
      expect(result.data.business_type).toBe('SOLE_PROPRIETORSHIP');
      expect(result.data.status).toBe('ACTIVE');
    });

    test('should fail to create business with invalid data', async () => {
      const businessData = {
        business_name: '',
        business_number: '123-456-7890', // Invalid format
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      };

      const result = await businessService.createBusinessRegistration(businessData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Business name is required');
      expect(result.errors?.some(e => e.includes('Valid business number is required'))).toBe(true);
    });

    test('should fail to create business with duplicate business number', async () => {
      const businessData = {
        business_name: '첫번째 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      };

      // Create first business
      await businessService.createBusinessRegistration(businessData);

      // Try to create second business with same number
      const duplicateData = { ...businessData, business_name: '두번째 카페' };
      const result = await businessService.createBusinessRegistration(duplicateData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Business number already exists');
    });

    test('should fail to create business with non-existent owner', async () => {
      const businessData = {
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'invalid-pid',
        registration_date: '2024-01-01',
        created_by: 'admin'
      };

      const result = await businessService.createBusinessRegistration(businessData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Owner personal ID does not exist');
    });
  });

  describe('Business Validation', () => {
    test('should validate required fields', async () => {
      const invalidData = {
        business_name: '',
        business_number: '',
        business_type: '',
        owner_personal_id: '',
        registration_date: ''
      };

      const validation = await businessService.validateBusinessRegistration(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Business name is required');
      expect(validation.errors).toContain('Valid business number is required (format: XXX-XX-XXXXX)');
      expect(validation.errors).toContain('Valid business type is required');
      expect(validation.errors).toContain('Owner personal ID is required');
      expect(validation.errors).toContain('Registration date is required');
    });

    test('should validate business number format', async () => {
      const testCases = [
        { number: '123-45-67890', valid: true },
        { number: '999-99-99999', valid: true },
        { number: '123-456-7890', valid: false },
        { number: '12-45-67890', valid: false },
        { number: '123-45-678901', valid: false },
        { number: 'ABC-DE-FGHIJ', valid: false }
      ];

      for (const testCase of testCases) {
        const data = {
          business_name: 'Test',
          business_number: testCase.number,
          business_type: 'SOLE_PROPRIETORSHIP',
          owner_personal_id: 'pid1',
          registration_date: '2024-01-01'
        };

        const validation = await businessService.validateBusinessRegistration(data);
        
        if (testCase.valid) {
          expect(validation.errors.filter(e => e.includes('business number')).length).toBe(0);
        } else {
          expect(validation.errors.some(e => e.includes('Valid business number is required'))).toBe(true);
        }
      }
    });

    test('should validate registration date constraints', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const futureDateData = {
        business_name: 'Test',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP',
        owner_personal_id: 'pid1',
        registration_date: futureDate.toISOString().split('T')[0]
      };

      const futureValidation = await businessService.validateBusinessRegistration(futureDateData);
      expect(futureValidation.errors).toContain('Registration date cannot be in the future');

      const oldDateData = { ...futureDateData, registration_date: oldDate.toISOString().split('T')[0] };
      const oldValidation = await businessService.validateBusinessRegistration(oldDateData);
      expect(oldValidation.warnings.some(w => w.includes('more than 1 year old'))).toBe(true);
    });

    test('should validate business type specific requirements', async () => {
      const corporationData = {
        business_name: 'Test Corp',
        business_number: '123-45-67890',
        business_type: 'CORPORATION',
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        industry_code: '123' // Too short
      };

      const validation = await businessService.validateBusinessRegistration(corporationData);
      expect(validation.compliance_issues).toContain('Corporations require valid industry code');
    });
  });

  describe('Business Status Management', () => {
    test('should update business status with valid transitions', async () => {
      // Create business
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      // Test valid transitions
      const suspendResult = await businessService.updateBusinessStatus(
        created.data!.id, 
        'SUSPENDED', 
        'Tax compliance issue', 
        'admin'
      );

      expect(suspendResult.success).toBe(true);
      expect(suspendResult.data.status).toBe('SUSPENDED');
      expect(suspendResult.data.status_change_reason).toBe('Tax compliance issue');
      expect(suspendResult.data.status_history).toHaveLength(1);

      const reactivateResult = await businessService.updateBusinessStatus(
        created.data!.id, 
        'ACTIVE', 
        'Issue resolved', 
        'admin'
      );

      expect(reactivateResult.success).toBe(true);
      expect(reactivateResult.data.status).toBe('ACTIVE');
      expect(reactivateResult.data.status_history).toHaveLength(2);
    });

    test('should reject invalid status transitions', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      // Terminate business
      await businessService.updateBusinessStatus(created.data!.id, 'TERMINATED', 'Business closed', 'admin');

      // Try to reactivate terminated business
      const result = await businessService.updateBusinessStatus(
        created.data!.id, 
        'ACTIVE', 
        'Try to reopen', 
        'admin'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });
  });

  describe('Business Ownership Transfer', () => {
    test('should initiate ownership transfer successfully', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      const transferResult = await businessService.initiateOwnershipTransfer({
        business_id: created.data!.id,
        from_personal_id: 'pid1',
        to_personal_id: 'pid2',
        transfer_type: 'SALE',
        legal_documents: ['sale_agreement.pdf', 'tax_clearance.pdf'],
        initiated_by: 'pid1'
      });

      expect(transferResult.success).toBe(true);
      expect(transferResult.data).toBeDefined();
      expect(transferResult.data!.status).toBe('PENDING');
      expect(transferResult.data!.from_personal_id).toBe('pid1');
      expect(transferResult.data!.to_personal_id).toBe('pid2');
    });

    test('should fail to initiate transfer by non-owner', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      const transferResult = await businessService.initiateOwnershipTransfer({
        business_id: created.data!.id,
        from_personal_id: 'pid2', // Not the owner
        to_personal_id: 'pid3',
        transfer_type: 'SALE',
        legal_documents: [],
        initiated_by: 'pid2'
      });

      expect(transferResult.success).toBe(false);
      expect(transferResult.errors).toContain('Transfer initiator is not the current owner');
    });

    test('should complete full ownership transfer workflow', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      // Initiate transfer
      const initiated = await businessService.initiateOwnershipTransfer({
        business_id: created.data!.id,
        from_personal_id: 'pid1',
        to_personal_id: 'pid2',
        transfer_type: 'SALE',
        legal_documents: ['sale_agreement.pdf'],
        initiated_by: 'pid1'
      });

      // Approve transfer
      const approved = await businessService.approveOwnershipTransfer(initiated.data!.id, 'admin');
      expect(approved.success).toBe(true);
      expect(approved.data!.status).toBe('APPROVED');

      // Complete transfer
      const completed = await businessService.completeOwnershipTransfer(initiated.data!.id);
      expect(completed.success).toBe(true);
      expect(completed.data.business.owner_personal_id).toBe('pid2');
      expect(completed.data.transfer.status).toBe('COMPLETED');
      expect(completed.data.business.ownership_history).toHaveLength(1);
    });

    test('should reject completing unapproved transfer', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      const initiated = await businessService.initiateOwnershipTransfer({
        business_id: created.data!.id,
        from_personal_id: 'pid1',
        to_personal_id: 'pid2',
        transfer_type: 'SALE',
        legal_documents: [],
        initiated_by: 'pid1'
      });

      // Try to complete without approval
      const result = await businessService.completeOwnershipTransfer(initiated.data!.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be approved before completion');
    });
  });

  describe('Business Compliance Management', () => {
    test('should perform basic compliance check', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        address: '서울시 강남구',
        created_by: 'admin'
      });

      const complianceResult = await businessService.performComplianceCheck(created.data!.id);

      expect(complianceResult.success).toBe(true);
      expect(complianceResult.data).toBeDefined();
      expect(complianceResult.data!.compliance_status).toBe('COMPLIANT');
      expect(complianceResult.data!.business_id).toBe(created.data!.id);
    });

    test('should detect compliance issues', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 법인',
        business_number: '123-45-67890',
        business_type: 'CORPORATION' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        // Missing address and industry code for corporation
        created_by: 'admin'
      });

      const complianceResult = await businessService.performComplianceCheck(created.data!.id);

      expect(complianceResult.success).toBe(true);
      expect(complianceResult.data!.compliance_status).toBe('PENDING_REVIEW');
      expect(complianceResult.data!.issues_found.length).toBeGreaterThan(0);
      
      const addressIssue = complianceResult.data!.issues_found.find(i => 
        i.description.includes('address')
      );
      expect(addressIssue).toBeDefined();
      expect(addressIssue!.remediation_required).toBe(true);
    });

    test('should track compliance history', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      // Perform multiple compliance checks
      await businessService.performComplianceCheck(created.data!.id);
      await businessService.performComplianceCheck(created.data!.id);
      await businessService.performComplianceCheck(created.data!.id);

      const history = await businessService.getComplianceHistory(created.data!.id);

      expect(history.success).toBe(true);
      expect(history.data).toHaveLength(3);
      // Should be sorted by date (most recent first)
      expect(new Date(history.data[0].check_date).getTime()).toBeGreaterThanOrEqual(
        new Date(history.data[1].check_date).getTime()
      );
    });
  });

  describe('Business Query Operations', () => {
    test('should find businesses by owner', async () => {
      const business1 = await businessService.createBusinessRegistration({
        business_name: '카페1',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      const business2 = await businessService.createBusinessRegistration({
        business_name: '카페2',
        business_number: '123-45-67891',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      const business3 = await businessService.createBusinessRegistration({
        business_name: '카페3',
        business_number: '123-45-67892',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid2',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      const result = await businessService.findBusinessesByOwner('pid1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.map(b => b.business_name)).toContain('카페1');
      expect(result.data.map(b => b.business_name)).toContain('카페2');
      expect(result.data.map(b => b.business_name)).not.toContain('카페3');
    });

    test('should find businesses by type', async () => {
      await businessService.createBusinessRegistration({
        business_name: '개인사업자',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      await businessService.createBusinessRegistration({
        business_name: '법인',
        business_number: '123-45-67891',
        business_type: 'CORPORATION' as BusinessType,
        owner_personal_id: 'pid2',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      const corporationResult = await businessService.getBusinessesByType('CORPORATION');
      expect(corporationResult.success).toBe(true);
      expect(corporationResult.data).toHaveLength(1);
      expect(corporationResult.data[0].business_name).toBe('법인');

      const soleResult = await businessService.getBusinessesByType('SOLE_PROPRIETORSHIP');
      expect(soleResult.success).toBe(true);
      expect(soleResult.data).toHaveLength(1);
      expect(soleResult.data[0].business_name).toBe('개인사업자');
    });

    test('should find businesses by status', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      await businessService.updateBusinessStatus(created.data!.id, 'SUSPENDED', 'Test', 'admin');

      const suspendedResult = await businessService.getBusinessesByStatus('SUSPENDED');
      expect(suspendedResult.success).toBe(true);
      expect(suspendedResult.data).toHaveLength(1);
      expect(suspendedResult.data[0].id).toBe(created.data!.id);

      const activeResult = await businessService.getBusinessesByStatus('ACTIVE');
      expect(activeResult.success).toBe(true);
      expect(activeResult.data).toHaveLength(0);
    });
  });

  describe('Business Information Updates', () => {
    test('should update business information successfully', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '원래 이름',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      const updates = {
        business_name: '변경된 이름',
        address: '새로운 주소',
        employee_count: 5
      };

      const result = await businessService.updateBusinessInfo(created.data!.id, updates, 'manager');

      expect(result.success).toBe(true);
      expect(result.data.business_name).toBe('변경된 이름');
      expect(result.data.address).toBe('새로운 주소');
      expect(result.data.employee_count).toBe(5);
      expect(result.data.updated_by).toBe('manager');
    });

    test('should validate updates before applying', async () => {
      const created = await businessService.createBusinessRegistration({
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP' as BusinessType,
        owner_personal_id: 'pid1',
        registration_date: '2024-01-01',
        created_by: 'admin'
      });

      const invalidUpdates = {
        business_name: '', // Invalid empty name
        business_number: '123-456-7890' // Invalid format
      };

      const result = await businessService.updateBusinessInfo(created.data!.id, invalidUpdates, 'manager');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Business name is required');
      expect(result.errors?.some(e => e.includes('Valid business number is required'))).toBe(true);
    });
  });
});