/**
 * Paper Management Unit Tests
 * 
 * Tests the comprehensive paper management system:
 * - Paper creation, validation, and lifecycle management
 * - Paper type and role matching validation
 * - Paper status transitions and effective date handling
 * - Bulk paper operations and conflict resolution
 * - Paper audit trail and history tracking
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { TestDataFactory, PaperType, RoleType } from '../setup/id-role-paper-test-setup';

// Paper status types and validation
export type PaperStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';

export interface PaperValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PaperConflict {
  conflicting_paper_id: string;
  conflict_type: 'DUPLICATE_ROLE' | 'OVERLAPPING_DATES' | 'INVALID_HIERARCHY' | 'BUSINESS_MISMATCH';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  auto_resolvable: boolean;
}

export interface PaperAuditEntry {
  id: string;
  paper_id: string;
  action: 'CREATED' | 'UPDATED' | 'ACTIVATED' | 'REVOKED' | 'EXPIRED';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_by: string;
  change_reason?: string;
  timestamp: string;
}

// Mock Paper Management Service
class PaperManagementService {
  private papers: Map<string, any> = new Map();
  private auditLog: PaperAuditEntry[] = [];

  async createPaper(paperData: {
    personal_id: string;
    business_id: string;
    paper_type: PaperType;
    role_granted: RoleType;
    effective_from: string;
    effective_until?: string;
    metadata?: Record<string, any>;
    created_by: string;
  }): Promise<{ success: boolean; data?: any; errors?: string[]; conflicts?: PaperConflict[] }> {
    // Validate the paper
    const validation = await this.validatePaper(paperData);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Check for conflicts
    const conflicts = await this.checkPaperConflicts(paperData);
    const criticalConflicts = conflicts.filter(c => c.severity === 'CRITICAL');
    
    if (criticalConflicts.length > 0) {
      return { success: false, errors: ['Critical conflicts detected'], conflicts: criticalConflicts };
    }

    // Create the paper
    const paper = TestDataFactory.createPaper(paperData.personal_id, paperData.business_id, {
      paper_type: paperData.paper_type,
      role_granted: paperData.role_granted,
      effective_from: paperData.effective_from,
      effective_until: paperData.effective_until,
      status: 'DRAFT',
      metadata: paperData.metadata || {}
    });

    this.papers.set(paper.id, paper);

    // Add audit entry
    this.addAuditEntry(paper.id, 'CREATED', undefined, paper, paperData.created_by);

    return { 
      success: true, 
      data: paper, 
      conflicts: conflicts.filter(c => c.severity !== 'CRITICAL')
    };
  }

  async validatePaper(paperData: any): Promise<PaperValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!paperData.personal_id) errors.push('Personal ID is required');
    if (!paperData.business_id) errors.push('Business ID is required');
    if (!paperData.paper_type) errors.push('Paper type is required');
    if (!paperData.role_granted) errors.push('Role granted is required');
    if (!paperData.effective_from) errors.push('Effective from date is required');

    // Date validation
    if (paperData.effective_from) {
      const effectiveFrom = new Date(paperData.effective_from);
      const now = new Date();
      
      if (isNaN(effectiveFrom.getTime())) {
        errors.push('Invalid effective from date');
      } else if (effectiveFrom < new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)) {
        warnings.push('Effective from date is more than 1 year in the past');
      }

      if (paperData.effective_until) {
        const effectiveUntil = new Date(paperData.effective_until);
        if (isNaN(effectiveUntil.getTime())) {
          errors.push('Invalid effective until date');
        } else if (effectiveUntil <= effectiveFrom) {
          errors.push('Effective until must be after effective from');
        }
      }
    }

    // Paper type and role compatibility validation
    const compatibilityErrors = this.validatePaperTypeRoleCompatibility(
      paperData.paper_type, 
      paperData.role_granted
    );
    errors.push(...compatibilityErrors);

    // Business context validation
    if (paperData.business_id && paperData.personal_id) {
      const businessContextValid = await this.validateBusinessContext(
        paperData.personal_id, 
        paperData.business_id
      );
      if (!businessContextValid) {
        errors.push('Personal ID does not have access to specified business');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private validatePaperTypeRoleCompatibility(paperType: PaperType, roleGranted: RoleType): string[] {
    const validCombinations: Record<PaperType, RoleType[]> = {
      'BUSINESS_REGISTRATION': ['OWNER'],
      'EMPLOYMENT_CONTRACT': ['WORKER'],
      'PARTNERSHIP_AGREEMENT': ['OWNER'],
      'FRANCHISE_AGREEMENT': ['FRANCHISEE', 'FRANCHISOR'],
      'MANAGEMENT_APPOINTMENT': ['MANAGER', 'SUPERVISOR'],
      'OWNERSHIP_CERTIFICATE': ['OWNER']
    };

    const validRoles = validCombinations[paperType];
    if (!validRoles?.includes(roleGranted)) {
      return [`Paper type ${paperType} cannot grant role ${roleGranted}. Valid roles: ${validRoles?.join(', ') || 'none'}`];
    }

    return [];
  }

  private async validateBusinessContext(personalId: string, businessId: string): Promise<boolean> {
    // In real implementation, this would verify:
    // 1. Personal ID exists
    // 2. Business exists
    // 3. Personal ID has some relationship to the business (existing papers, employment, etc.)
    return true; // Mock implementation
  }

  async checkPaperConflicts(paperData: any): Promise<PaperConflict[]> {
    const conflicts: PaperConflict[] = [];

    // Get existing papers for this person and business
    const existingPapers = Array.from(this.papers.values()).filter(p => 
      p.personal_id === paperData.personal_id &&
      p.business_id === paperData.business_id &&
      p.status === 'ACTIVE'
    );

    for (const existingPaper of existingPapers) {
      // Check for duplicate roles
      if (existingPaper.role_granted === paperData.role_granted) {
        // Check for overlapping effective dates
        const existingFrom = new Date(existingPaper.effective_from);
        const existingUntil = existingPaper.effective_until ? 
          new Date(existingPaper.effective_until) : 
          new Date('2099-12-31');
        
        const newFrom = new Date(paperData.effective_from);
        const newUntil = paperData.effective_until ? 
          new Date(paperData.effective_until) : 
          new Date('2099-12-31');

        const hasOverlap = newFrom <= existingUntil && newUntil >= existingFrom;

        if (hasOverlap) {
          conflicts.push({
            conflicting_paper_id: existingPaper.id,
            conflict_type: 'OVERLAPPING_DATES',
            description: `Overlapping ${paperData.role_granted} role with existing paper from ${existingFrom.toDateString()} to ${existingUntil.toDateString()}`,
            severity: 'CRITICAL',
            auto_resolvable: false
          });
        }
      }

      // Check for invalid role hierarchies (e.g., MANAGER without WORKER)
      if (paperData.role_granted === 'MANAGER' || paperData.role_granted === 'SUPERVISOR') {
        const hasWorkerRole = existingPapers.some(p => p.role_granted === 'WORKER');
        if (!hasWorkerRole && paperData.role_granted !== 'WORKER') {
          conflicts.push({
            conflicting_paper_id: '',
            conflict_type: 'INVALID_HIERARCHY',
            description: `Role ${paperData.role_granted} requires WORKER role as prerequisite`,
            severity: 'HIGH',
            auto_resolvable: true
          });
        }
      }

      // Check for business type mismatches
      if (existingPaper.paper_type === 'BUSINESS_REGISTRATION' && 
          paperData.paper_type === 'BUSINESS_REGISTRATION') {
        conflicts.push({
          conflicting_paper_id: existingPaper.id,
          conflict_type: 'DUPLICATE_ROLE',
          description: 'Multiple business registration papers for same business',
          severity: 'CRITICAL',
          auto_resolvable: false
        });
      }
    }

    return conflicts;
  }

  async activatePaper(paperId: string, activatedBy: string): Promise<{ success: boolean; error?: string }> {
    const paper = this.papers.get(paperId);
    if (!paper) {
      return { success: false, error: 'Paper not found' };
    }

    if (paper.status !== 'DRAFT') {
      return { success: false, error: `Paper must be in DRAFT status to activate. Current status: ${paper.status}` };
    }

    // Check if paper is ready for activation (effective date, etc.)
    const now = new Date();
    const effectiveFrom = new Date(paper.effective_from);

    if (effectiveFrom > now) {
      return { success: false, error: 'Paper cannot be activated before its effective date' };
    }

    const oldStatus = paper.status;
    paper.status = 'ACTIVE';
    paper.activated_at = now.toISOString();
    paper.activated_by = activatedBy;

    this.addAuditEntry(paperId, 'ACTIVATED', { status: oldStatus }, { status: 'ACTIVE' }, activatedBy);

    return { success: true };
  }

  async revokePaper(paperId: string, reason: string, revokedBy: string): Promise<{ success: boolean; error?: string }> {
    const paper = this.papers.get(paperId);
    if (!paper) {
      return { success: false, error: 'Paper not found' };
    }

    if (paper.status === 'REVOKED') {
      return { success: false, error: 'Paper is already revoked' };
    }

    const oldStatus = paper.status;
    paper.status = 'REVOKED';
    paper.revoked_at = new Date().toISOString();
    paper.revoked_by = revokedBy;
    paper.revocation_reason = reason;

    this.addAuditEntry(paperId, 'REVOKED', { status: oldStatus }, { status: 'REVOKED' }, revokedBy, reason);

    return { success: true };
  }

  async updatePaper(paperId: string, updates: any, updatedBy: string): Promise<{ success: boolean; data?: any; errors?: string[] }> {
    const paper = this.papers.get(paperId);
    if (!paper) {
      return { success: false, errors: ['Paper not found'] };
    }

    // Validate updates
    const validation = await this.validatePaper({ ...paper, ...updates });
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Track changes for audit
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (paper[key] !== value) {
        oldValues[key] = paper[key];
        newValues[key] = value;
        paper[key] = value;
      }
    }

    paper.updated_at = new Date().toISOString();
    paper.updated_by = updatedBy;

    if (Object.keys(oldValues).length > 0) {
      this.addAuditEntry(paperId, 'UPDATED', oldValues, newValues, updatedBy);
    }

    return { success: true, data: paper };
  }

  async getPapersByPersonAndBusiness(personalId: string, businessId: string): Promise<any[]> {
    return Array.from(this.papers.values()).filter(p => 
      p.personal_id === personalId && p.business_id === businessId
    );
  }

  async getActivePapers(personalId: string, businessId: string): Promise<any[]> {
    const now = new Date();
    return Array.from(this.papers.values()).filter(p => 
      p.personal_id === personalId && 
      p.business_id === businessId &&
      p.status === 'ACTIVE' &&
      new Date(p.effective_from) <= now &&
      (!p.effective_until || new Date(p.effective_until) >= now)
    );
  }

  async bulkCreatePapers(papersData: any[], createdBy: string): Promise<{
    success: boolean;
    created: any[];
    failed: Array<{ data: any; errors: string[] }>;
  }> {
    const created: any[] = [];
    const failed: Array<{ data: any; errors: string[] }> = [];

    for (const paperData of papersData) {
      const result = await this.createPaper({ ...paperData, created_by: createdBy });
      
      if (result.success) {
        created.push(result.data);
      } else {
        failed.push({ data: paperData, errors: result.errors || [] });
      }
    }

    return {
      success: failed.length === 0,
      created,
      failed
    };
  }

  async checkExpiredPapers(): Promise<{ expired: any[]; updated: number }> {
    const now = new Date();
    const expired: any[] = [];
    let updated = 0;

    for (const [id, paper] of this.papers.entries()) {
      if (paper.status === 'ACTIVE' && 
          paper.effective_until && 
          new Date(paper.effective_until) < now) {
        
        const oldStatus = paper.status;
        paper.status = 'EXPIRED';
        paper.expired_at = now.toISOString();
        
        this.addAuditEntry(id, 'EXPIRED', { status: oldStatus }, { status: 'EXPIRED' }, 'SYSTEM');
        
        expired.push(paper);
        updated++;
      }
    }

    return { expired, updated };
  }

  async getPaperAuditHistory(paperId: string): Promise<PaperAuditEntry[]> {
    return this.auditLog.filter(entry => entry.paper_id === paperId)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private addAuditEntry(
    paperId: string, 
    action: PaperAuditEntry['action'], 
    oldValues: Record<string, any> | undefined, 
    newValues: Record<string, any>, 
    changedBy: string,
    reason?: string
  ): void {
    this.auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      paper_id: paperId,
      action,
      old_values: oldValues,
      new_values: newValues,
      changed_by: changedBy,
      change_reason: reason,
      timestamp: new Date().toISOString()
    });
  }

  // Helper method to clear all data for testing
  clearAllData(): void {
    this.papers.clear();
    this.auditLog.length = 0;
  }
}

describe('Paper Management Service', () => {
  let paperService: PaperManagementService;

  beforeEach(() => {
    paperService = new PaperManagementService();
  });

  describe('Paper Creation', () => {
    test('should create valid paper successfully', async () => {
      const paperData = {
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      };

      const result = await paperService.createPaper(paperData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.paper_type).toBe('EMPLOYMENT_CONTRACT');
      expect(result.data.role_granted).toBe('WORKER');
      expect(result.data.status).toBe('DRAFT');
    });

    test('should fail to create paper with missing required fields', async () => {
      const paperData = {
        personal_id: '',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      };

      const result = await paperService.createPaper(paperData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Personal ID is required');
    });

    test('should fail to create paper with incompatible paper type and role', async () => {
      const paperData = {
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'OWNER' as RoleType, // Invalid combination
        effective_from: '2024-01-01',
        created_by: 'admin'
      };

      const result = await paperService.createPaper(paperData);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('cannot grant role'))).toBe(true);
    });

    test('should create paper with valid effective date range', async () => {
      const paperData = {
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        effective_until: '2024-12-31',
        created_by: 'admin'
      };

      const result = await paperService.createPaper(paperData);

      expect(result.success).toBe(true);
      expect(result.data.effective_from).toBe('2024-01-01');
      expect(result.data.effective_until).toBe('2024-12-31');
    });

    test('should fail to create paper with invalid date range', async () => {
      const paperData = {
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-12-31',
        effective_until: '2024-01-01', // Before effective_from
        created_by: 'admin'
      };

      const result = await paperService.createPaper(paperData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Effective until must be after effective from');
    });
  });

  describe('Paper Validation', () => {
    test('should validate all paper type and role combinations', async () => {
      const validCombinations = [
        { paper_type: 'BUSINESS_REGISTRATION', role_granted: 'OWNER' },
        { paper_type: 'EMPLOYMENT_CONTRACT', role_granted: 'WORKER' },
        { paper_type: 'MANAGEMENT_APPOINTMENT', role_granted: 'MANAGER' },
        { paper_type: 'MANAGEMENT_APPOINTMENT', role_granted: 'SUPERVISOR' },
        { paper_type: 'FRANCHISE_AGREEMENT', role_granted: 'FRANCHISEE' },
        { paper_type: 'FRANCHISE_AGREEMENT', role_granted: 'FRANCHISOR' }
      ];

      for (const combo of validCombinations) {
        const paperData = {
          personal_id: 'pid1',
          business_id: 'bid1',
          paper_type: combo.paper_type as PaperType,
          role_granted: combo.role_granted as RoleType,
          effective_from: '2024-01-01'
        };

        const validation = await paperService.validatePaper(paperData);
        expect(validation.valid).toBe(true);
      }
    });

    test('should detect invalid combinations', async () => {
      const invalidCombinations = [
        { paper_type: 'BUSINESS_REGISTRATION', role_granted: 'WORKER' },
        { paper_type: 'EMPLOYMENT_CONTRACT', role_granted: 'MANAGER' },
        { paper_type: 'FRANCHISE_AGREEMENT', role_granted: 'WORKER' }
      ];

      for (const combo of invalidCombinations) {
        const paperData = {
          personal_id: 'pid1',
          business_id: 'bid1',
          paper_type: combo.paper_type as PaperType,
          role_granted: combo.role_granted as RoleType,
          effective_from: '2024-01-01'
        };

        const validation = await paperService.validatePaper(paperData);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some(e => e.includes('cannot grant role'))).toBe(true);
      }
    });

    test('should generate warnings for old effective dates', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const paperData = {
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: oldDate.toISOString().split('T')[0]
      };

      const validation = await paperService.validatePaper(paperData);
      expect(validation.warnings.some(w => w.includes('more than 1 year in the past'))).toBe(true);
    });
  });

  describe('Paper Conflicts', () => {
    test('should detect overlapping role conflicts', async () => {
      // First create an existing paper
      await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        effective_until: '2024-12-31',
        created_by: 'admin'
      });

      // Activate the first paper
      const existingPapers = await paperService.getPapersByPersonAndBusiness('pid1', 'bid1');
      await paperService.activatePaper(existingPapers[0].id, 'admin');

      // Try to create a conflicting paper
      const conflicts = await paperService.checkPaperConflicts({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-06-01',
        effective_until: '2025-05-31'
      });

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].conflict_type).toBe('OVERLAPPING_DATES');
      expect(conflicts[0].severity).toBe('CRITICAL');
    });

    test('should detect invalid hierarchy conflicts', async () => {
      const conflicts = await paperService.checkPaperConflicts({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'MANAGEMENT_APPOINTMENT' as PaperType,
        role_granted: 'MANAGER' as RoleType,
        effective_from: '2024-01-01'
      });

      expect(conflicts.some(c => c.conflict_type === 'INVALID_HIERARCHY')).toBe(true);
    });

    test('should prevent critical conflicts', async () => {
      // Create first paper
      const first = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'BUSINESS_REGISTRATION' as PaperType,
        role_granted: 'OWNER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      });

      await paperService.activatePaper(first.data!.id, 'admin');

      // Try to create conflicting business registration
      const second = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'BUSINESS_REGISTRATION' as PaperType,
        role_granted: 'OWNER' as RoleType,
        effective_from: '2024-06-01',
        created_by: 'admin'
      });

      expect(second.success).toBe(false);
      expect(second.conflicts).toBeDefined();
      expect(second.conflicts![0].severity).toBe('CRITICAL');
    });
  });

  describe('Paper Status Management', () => {
    test('should activate draft paper successfully', async () => {
      const created = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      });

      const result = await paperService.activatePaper(created.data!.id, 'manager');

      expect(result.success).toBe(true);

      const papers = await paperService.getPapersByPersonAndBusiness('pid1', 'bid1');
      const activatedPaper = papers.find(p => p.id === created.data!.id);
      expect(activatedPaper.status).toBe('ACTIVE');
      expect(activatedPaper.activated_by).toBe('manager');
    });

    test('should fail to activate non-draft paper', async () => {
      const created = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      });

      // First activation
      await paperService.activatePaper(created.data!.id, 'manager');

      // Try to activate again
      const result = await paperService.activatePaper(created.data!.id, 'manager');

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be in DRAFT status');
    });

    test('should revoke paper successfully', async () => {
      const created = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      });

      await paperService.activatePaper(created.data!.id, 'manager');

      const result = await paperService.revokePaper(created.data!.id, 'Employment terminated', 'hr');

      expect(result.success).toBe(true);

      const papers = await paperService.getPapersByPersonAndBusiness('pid1', 'bid1');
      const revokedPaper = papers.find(p => p.id === created.data!.id);
      expect(revokedPaper.status).toBe('REVOKED');
      expect(revokedPaper.revoked_by).toBe('hr');
      expect(revokedPaper.revocation_reason).toBe('Employment terminated');
    });

    test('should update paper successfully', async () => {
      const created = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      });

      const updates = {
        effective_until: '2024-12-31',
        metadata: { department: 'IT', position: 'Developer' }
      };

      const result = await paperService.updatePaper(created.data!.id, updates, 'hr');

      expect(result.success).toBe(true);
      expect(result.data.effective_until).toBe('2024-12-31');
      expect(result.data.metadata.department).toBe('IT');
      expect(result.data.updated_by).toBe('hr');
    });
  });

  describe('Active Papers Management', () => {
    test('should get active papers correctly', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      // Create active paper
      const activePaper = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: pastDate.toISOString().split('T')[0],
        effective_until: futureDate.toISOString().split('T')[0],
        created_by: 'admin'
      });

      await paperService.activatePaper(activePaper.data!.id, 'admin');

      // Create expired paper
      const expiredPaper = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'MANAGEMENT_APPOINTMENT' as PaperType,
        role_granted: 'SUPERVISOR' as RoleType,
        effective_from: pastDate.toISOString().split('T')[0],
        effective_until: pastDate.toISOString().split('T')[0], // Already expired
        created_by: 'admin'
      });

      await paperService.activatePaper(expiredPaper.data!.id, 'admin');

      const activePapers = await paperService.getActivePapers('pid1', 'bid1');

      expect(activePapers.length).toBe(1);
      expect(activePapers[0].id).toBe(activePaper.data!.id);
    });

    test('should automatically expire papers', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const created = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        effective_until: pastDate.toISOString().split('T')[0],
        created_by: 'admin'
      });

      await paperService.activatePaper(created.data!.id, 'admin');

      const result = await paperService.checkExpiredPapers();

      expect(result.expired.length).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.expired[0].status).toBe('EXPIRED');
    });
  });

  describe('Bulk Operations', () => {
    test('should create multiple papers in bulk', async () => {
      const papersData = [
        {
          personal_id: 'pid1',
          business_id: 'bid1',
          paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
          role_granted: 'WORKER' as RoleType,
          effective_from: '2024-01-01'
        },
        {
          personal_id: 'pid2',
          business_id: 'bid1',
          paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
          role_granted: 'WORKER' as RoleType,
          effective_from: '2024-01-01'
        }
      ];

      const result = await paperService.bulkCreatePapers(papersData, 'admin');

      expect(result.success).toBe(true);
      expect(result.created.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    test('should handle partial failures in bulk creation', async () => {
      const papersData = [
        {
          personal_id: 'pid1',
          business_id: 'bid1',
          paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
          role_granted: 'WORKER' as RoleType,
          effective_from: '2024-01-01'
        },
        {
          personal_id: '', // Invalid - missing personal_id
          business_id: 'bid1',
          paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
          role_granted: 'WORKER' as RoleType,
          effective_from: '2024-01-01'
        }
      ];

      const result = await paperService.bulkCreatePapers(papersData, 'admin');

      expect(result.success).toBe(false);
      expect(result.created.length).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].errors).toContain('Personal ID is required');
    });
  });

  describe('Audit Trail', () => {
    test('should track paper creation in audit log', async () => {
      const created = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      });

      const auditHistory = await paperService.getPaperAuditHistory(created.data!.id);

      expect(auditHistory.length).toBe(1);
      expect(auditHistory[0].action).toBe('CREATED');
      expect(auditHistory[0].changed_by).toBe('admin');
      expect(auditHistory[0].new_values).toBeDefined();
    });

    test('should track paper updates in audit log', async () => {
      const created = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      });

      await paperService.updatePaper(created.data!.id, { effective_until: '2024-12-31' }, 'hr');

      const auditHistory = await paperService.getPaperAuditHistory(created.data!.id);

      expect(auditHistory.length).toBe(2);
      expect(auditHistory[0].action).toBe('UPDATED'); // Most recent first
      expect(auditHistory[0].changed_by).toBe('hr');
      expect(auditHistory[0].old_values).toBeDefined();
      expect(auditHistory[0].new_values).toBeDefined();
    });

    test('should track all paper lifecycle events', async () => {
      const created = await paperService.createPaper({
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT' as PaperType,
        role_granted: 'WORKER' as RoleType,
        effective_from: '2024-01-01',
        created_by: 'admin'
      });

      await paperService.activatePaper(created.data!.id, 'manager');
      await paperService.revokePaper(created.data!.id, 'Test revocation', 'hr');

      const auditHistory = await paperService.getPaperAuditHistory(created.data!.id);

      expect(auditHistory.length).toBe(3);
      expect(auditHistory.map(h => h.action)).toEqual(['REVOKED', 'ACTIVATED', 'CREATED']);
      expect(auditHistory[0].change_reason).toBe('Test revocation');
    });
  });
});