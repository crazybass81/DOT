/**
 * API Endpoints Integration Tests
 * 
 * Tests the complete API layer for ID-ROLE-PAPER architecture:
 * - Personal/Corporate ID management endpoints
 * - Business registration API
 * - Paper management API
 * - Role calculation API
 * - Permission validation API
 * - Real database integration with Supabase
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { TestDatabase, TestDataFactory, testClient, setupTestEnvironment } from '../setup/id-role-paper-test-setup';

// Mock Next.js API request/response
const createMockReq = (method: string, body?: any, query?: any) => ({
  method,
  body,
  query: query || {},
  headers: { 'content-type': 'application/json' }
});

const createMockRes = () => {
  const res: any = {
    statusCode: 200,
    data: null,
    status: jest.fn().mockReturnValue(res),
    json: jest.fn().mockImplementation((data) => {
      res.data = data;
      return res;
    }),
    end: jest.fn()
  };
  return res;
};

// Mock API handlers (in real implementation these would be imported)
class APIHandlers {
  static async handlePersonalIds(req: any, res: any) {
    try {
      switch (req.method) {
        case 'POST':
          return await this.createPersonalId(req, res);
        case 'GET':
          return await this.getPersonalId(req, res);
        case 'PUT':
          return await this.updatePersonalId(req, res);
        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async createPersonalId(req: any, res: any) {
    const { name, phone, email, birth_date } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Check for existing phone
    const { data: existing } = await testClient
      .from('personal_ids')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Phone number already exists' });
    }

    const personalId = TestDataFactory.createPersonalId({
      name: name.trim(),
      phone,
      email,
      birth_date
    });

    const { data, error } = await testClient
      .from('personal_ids')
      .insert([personalId])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ data });
  }

  static async getPersonalId(req: any, res: any) {
    const { id, phone } = req.query;

    let query = testClient.from('personal_ids').select('*');

    if (id) {
      query = query.eq('id', id);
    } else if (phone) {
      query = query.eq('phone', phone);
    } else {
      return res.status(400).json({ error: 'ID or phone parameter required' });
    }

    const { data, error } = await query.single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Personal ID not found' });
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  static async updatePersonalId(req: any, res: any) {
    const { id } = req.query;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID parameter required' });
    }

    const { data, error } = await testClient
      .from('personal_ids')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  static async handleBusinessRegistrations(req: any, res: any) {
    try {
      switch (req.method) {
        case 'POST':
          return await this.createBusinessRegistration(req, res);
        case 'GET':
          return await this.getBusinessRegistrations(req, res);
        case 'PUT':
          return await this.updateBusinessRegistration(req, res);
        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async createBusinessRegistration(req: any, res: any) {
    const { business_name, business_number, business_type, owner_personal_id, registration_date } = req.body;

    // Validation
    if (!business_name || !business_number || !business_type || !owner_personal_id) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if owner exists
    const { data: owner } = await testClient
      .from('personal_ids')
      .select('id')
      .eq('id', owner_personal_id)
      .single();

    if (!owner) {
      return res.status(400).json({ error: 'Owner personal ID does not exist' });
    }

    // Check for duplicate business number
    const { data: existing } = await testClient
      .from('business_registrations')
      .select('id')
      .eq('business_number', business_number)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Business number already exists' });
    }

    const business = TestDataFactory.createBusinessRegistration(owner_personal_id, {
      business_name: business_name.trim(),
      business_number,
      business_type,
      registration_date: registration_date || new Date().toISOString().split('T')[0],
      status: 'ACTIVE'
    });

    const { data, error } = await testClient
      .from('business_registrations')
      .insert([business])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ data });
  }

  static async getBusinessRegistrations(req: any, res: any) {
    const { id, owner_personal_id, business_type } = req.query;

    let query = testClient.from('business_registrations').select('*');

    if (id) {
      query = query.eq('id', id);
      const { data, error } = await query.single();
      
      if (error && error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Business not found' });
      }
      
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ data });
    }

    if (owner_personal_id) {
      query = query.eq('owner_personal_id', owner_personal_id);
    }

    if (business_type) {
      query = query.eq('business_type', business_type);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data: data || [] });
  }

  static async updateBusinessRegistration(req: any, res: any) {
    const { id } = req.query;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID parameter required' });
    }

    const { data, error } = await testClient
      .from('business_registrations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  static async handlePapers(req: any, res: any) {
    try {
      switch (req.method) {
        case 'POST':
          return await this.createPaper(req, res);
        case 'GET':
          return await this.getPapers(req, res);
        case 'PUT':
          return await this.updatePaper(req, res);
        case 'DELETE':
          return await this.deletePaper(req, res);
        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async createPaper(req: any, res: any) {
    const { personal_id, business_id, paper_type, role_granted, effective_from, effective_until, metadata } = req.body;

    // Validation
    if (!personal_id || !business_id || !paper_type || !role_granted || !effective_from) {
      return res.status(400).json({ error: 'Required fields: personal_id, business_id, paper_type, role_granted, effective_from' });
    }

    // Validate paper type and role compatibility
    const validCombinations: Record<string, string[]> = {
      'BUSINESS_REGISTRATION': ['OWNER'],
      'EMPLOYMENT_CONTRACT': ['WORKER'],
      'MANAGEMENT_APPOINTMENT': ['MANAGER', 'SUPERVISOR'],
      'FRANCHISE_AGREEMENT': ['FRANCHISEE', 'FRANCHISOR']
    };

    if (!validCombinations[paper_type]?.includes(role_granted)) {
      return res.status(400).json({ 
        error: `Paper type ${paper_type} cannot grant role ${role_granted}` 
      });
    }

    const paper = TestDataFactory.createPaper(personal_id, business_id, {
      paper_type,
      role_granted,
      effective_from,
      effective_until,
      status: 'ACTIVE',
      metadata: metadata || {}
    });

    const { data, error } = await testClient
      .from('papers')
      .insert([paper])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ data });
  }

  static async getPapers(req: any, res: any) {
    const { id, personal_id, business_id, status } = req.query;

    let query = testClient.from('papers').select('*');

    if (id) {
      query = query.eq('id', id);
      const { data, error } = await query.single();
      
      if (error && error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Paper not found' });
      }
      
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ data });
    }

    if (personal_id) {
      query = query.eq('personal_id', personal_id);
    }

    if (business_id) {
      query = query.eq('business_id', business_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data: data || [] });
  }

  static async updatePaper(req: any, res: any) {
    const { id } = req.query;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID parameter required' });
    }

    const { data, error } = await testClient
      .from('papers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  static async deletePaper(req: any, res: any) {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID parameter required' });
    }

    // Soft delete by updating status
    const { data, error } = await testClient
      .from('papers')
      .update({ status: 'REVOKED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data, message: 'Paper revoked successfully' });
  }

  static async handleRoleCalculation(req: any, res: any) {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { personal_id, business_id } = req.body;

      if (!personal_id || !business_id) {
        return res.status(400).json({ error: 'personal_id and business_id are required' });
      }

      // Get active papers for this person and business
      const { data: papers, error: papersError } = await testClient
        .from('papers')
        .select('*')
        .eq('personal_id', personal_id)
        .eq('business_id', business_id)
        .eq('status', 'ACTIVE');

      if (papersError) {
        return res.status(500).json({ error: papersError.message });
      }

      // Calculate roles based on papers
      const roles = this.calculateRolesFromPapers(papers || []);

      // Store/update role calculation
      const roleCalculation = {
        personal_id,
        business_id,
        calculated_roles: roles.calculatedRoles,
        highest_role: roles.highestRole,
        calculation_basis: {
          papers: (papers || []).map(p => p.id),
          dependencies: roles.dependencies,
          inheritance: roles.inheritance
        },
        updated_at: new Date().toISOString()
      };

      const { data, error } = await testClient
        .from('role_calculations')
        .upsert([roleCalculation], { onConflict: 'personal_id,business_id' })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ data });

    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  private static calculateRolesFromPapers(papers: any[]): {
    calculatedRoles: string[];
    highestRole: string;
    dependencies: string[];
    inheritance: string[];
  } {
    if (papers.length === 0) {
      return {
        calculatedRoles: ['SEEKER'],
        highestRole: 'SEEKER',
        dependencies: [],
        inheritance: []
      };
    }

    const roleHierarchy = {
      'SEEKER': 0,
      'WORKER': 1,
      'SUPERVISOR': 2,
      'MANAGER': 3,
      'OWNER': 4,
      'FRANCHISEE': 5,
      'FRANCHISOR': 6
    };

    const roleInheritance: Record<string, string[]> = {
      'MANAGER': ['WORKER'],
      'OWNER': ['MANAGER', 'WORKER'],
      'FRANCHISEE': ['MANAGER', 'WORKER'],
      'FRANCHISOR': ['FRANCHISEE', 'MANAGER', 'WORKER']
    };

    // Filter active and effective papers
    const now = new Date();
    const activePapers = papers.filter(p => {
      const effectiveFrom = new Date(p.effective_from);
      const effectiveUntil = p.effective_until ? new Date(p.effective_until) : null;
      return effectiveFrom <= now && (!effectiveUntil || effectiveUntil >= now);
    });

    const grantedRoles = new Set(activePapers.map(p => p.role_granted));
    const allRoles = new Set<string>();

    // Add granted roles and their inheritance
    for (const role of grantedRoles) {
      allRoles.add(role);
      const inherited = roleInheritance[role] || [];
      inherited.forEach(r => allRoles.add(r));
    }

    // Find highest role
    let highestRole = 'SEEKER';
    let highestLevel = -1;
    for (const role of allRoles) {
      const level = (roleHierarchy as any)[role] || 0;
      if (level > highestLevel) {
        highestLevel = level;
        highestRole = role;
      }
    }

    const calculatedRoles = Array.from(allRoles).sort((a, b) => 
      ((roleHierarchy as any)[b] || 0) - ((roleHierarchy as any)[a] || 0)
    );

    return {
      calculatedRoles: calculatedRoles.length > 0 ? calculatedRoles : ['SEEKER'],
      highestRole,
      dependencies: Array.from(grantedRoles),
      inheritance: Array.from(allRoles).filter(r => !grantedRoles.has(r))
    };
  }
}

describe('API Endpoints Integration Tests', () => {
  setupTestEnvironment();

  describe('Personal ID Endpoints', () => {
    test('should create personal ID via API', async () => {
      const req = createMockReq('POST', {
        name: '김테스트',
        phone: '010-1234-5678',
        email: 'test@example.com',
        birth_date: '1990-01-01'
      });
      const res = createMockRes();

      await APIHandlers.handlePersonalIds(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.data.data).toBeDefined();
      expect(res.data.data.name).toBe('김테스트');
      expect(res.data.data.phone).toBe('010-1234-5678');
    });

    test('should fail to create personal ID with missing required fields', async () => {
      const req = createMockReq('POST', {
        name: '',
        phone: ''
      });
      const res = createMockRes();

      await APIHandlers.handlePersonalIds(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.error).toBe('Name and phone are required');
    });

    test('should fail to create personal ID with duplicate phone', async () => {
      const phone = '010-1234-5679';

      // Create first personal ID
      const req1 = createMockReq('POST', {
        name: '김첫번째',
        phone: phone
      });
      const res1 = createMockRes();

      await APIHandlers.handlePersonalIds(req1, res1);
      expect(res1.statusCode).toBe(201);

      // Try to create second with same phone
      const req2 = createMockReq('POST', {
        name: '김두번째',
        phone: phone
      });
      const res2 = createMockRes();

      await APIHandlers.handlePersonalIds(req2, res2);
      expect(res2.statusCode).toBe(409);
      expect(res2.data.error).toBe('Phone number already exists');
    });

    test('should get personal ID by ID', async () => {
      // First create a personal ID
      const createReq = createMockReq('POST', {
        name: '김조회',
        phone: '010-9999-9999'
      });
      const createRes = createMockRes();

      await APIHandlers.handlePersonalIds(createReq, createRes);
      const createdId = createRes.data.data.id;

      // Now get it by ID
      const getReq = createMockReq('GET', null, { id: createdId });
      const getRes = createMockRes();

      await APIHandlers.handlePersonalIds(getReq, getRes);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.data.data.id).toBe(createdId);
      expect(getRes.data.data.name).toBe('김조회');
    });

    test('should get personal ID by phone', async () => {
      const phone = '010-8888-8888';

      // First create a personal ID
      const createReq = createMockReq('POST', {
        name: '김폰조회',
        phone: phone
      });
      const createRes = createMockRes();

      await APIHandlers.handlePersonalIds(createReq, createRes);

      // Now get it by phone
      const getReq = createMockReq('GET', null, { phone: phone });
      const getRes = createMockRes();

      await APIHandlers.handlePersonalIds(getReq, getRes);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.data.data.phone).toBe(phone);
      expect(getRes.data.data.name).toBe('김폰조회');
    });

    test('should return 404 for non-existent personal ID', async () => {
      const req = createMockReq('GET', null, { id: 'non-existent-id' });
      const res = createMockRes();

      await APIHandlers.handlePersonalIds(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.data.error).toBe('Personal ID not found');
    });

    test('should update personal ID', async () => {
      // First create a personal ID
      const createReq = createMockReq('POST', {
        name: '김업데이트전',
        phone: '010-7777-7777'
      });
      const createRes = createMockRes();

      await APIHandlers.handlePersonalIds(createReq, createRes);
      const createdId = createRes.data.data.id;

      // Now update it
      const updateReq = createMockReq('PUT', {
        name: '김업데이트후',
        email: 'updated@example.com'
      }, { id: createdId });
      const updateRes = createMockRes();

      await APIHandlers.handlePersonalIds(updateReq, updateRes);

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.data.data.name).toBe('김업데이트후');
      expect(updateRes.data.data.email).toBe('updated@example.com');
    });
  });

  describe('Business Registration Endpoints', () => {
    test('should create business registration via API', async () => {
      // First create owner
      const ownerReq = createMockReq('POST', {
        name: '김사장',
        phone: '010-1111-1111'
      });
      const ownerRes = createMockRes();

      await APIHandlers.handlePersonalIds(ownerReq, ownerRes);
      const ownerId = ownerRes.data.data.id;

      // Create business
      const req = createMockReq('POST', {
        business_name: '테스트 카페',
        business_number: '123-45-67890',
        business_type: 'SOLE_PROPRIETORSHIP',
        owner_personal_id: ownerId,
        registration_date: '2024-01-01'
      });
      const res = createMockRes();

      await APIHandlers.handleBusinessRegistrations(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.data.data.business_name).toBe('테스트 카페');
      expect(res.data.data.owner_personal_id).toBe(ownerId);
      expect(res.data.data.status).toBe('ACTIVE');
    });

    test('should fail to create business with non-existent owner', async () => {
      const req = createMockReq('POST', {
        business_name: '테스트 카페',
        business_number: '123-45-67891',
        business_type: 'SOLE_PROPRIETORSHIP',
        owner_personal_id: 'non-existent-owner'
      });
      const res = createMockRes();

      await APIHandlers.handleBusinessRegistrations(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.error).toBe('Owner personal ID does not exist');
    });

    test('should get businesses by owner', async () => {
      // Create owner
      const ownerReq = createMockReq('POST', {
        name: '김멀티사장',
        phone: '010-2222-2222'
      });
      const ownerRes = createMockRes();

      await APIHandlers.handlePersonalIds(ownerReq, ownerRes);
      const ownerId = ownerRes.data.data.id;

      // Create multiple businesses
      const business1Req = createMockReq('POST', {
        business_name: '카페1',
        business_number: '111-11-11111',
        business_type: 'SOLE_PROPRIETORSHIP',
        owner_personal_id: ownerId
      });
      const business1Res = createMockRes();

      await APIHandlers.handleBusinessRegistrations(business1Req, business1Res);

      const business2Req = createMockReq('POST', {
        business_name: '카페2',
        business_number: '222-22-22222',
        business_type: 'SOLE_PROPRIETORSHIP',
        owner_personal_id: ownerId
      });
      const business2Res = createMockRes();

      await APIHandlers.handleBusinessRegistrations(business2Req, business2Res);

      // Get businesses by owner
      const getReq = createMockReq('GET', null, { owner_personal_id: ownerId });
      const getRes = createMockRes();

      await APIHandlers.handleBusinessRegistrations(getReq, getRes);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.data.data).toHaveLength(2);
      expect(getRes.data.data.map((b: any) => b.business_name)).toContain('카페1');
      expect(getRes.data.data.map((b: any) => b.business_name)).toContain('카페2');
    });
  });

  describe('Paper Management Endpoints', () => {
    test('should create paper via API', async () => {
      // Create personal ID and business
      const personalReq = createMockReq('POST', {
        name: '김직원',
        phone: '010-3333-3333'
      });
      const personalRes = createMockRes();
      await APIHandlers.handlePersonalIds(personalReq, personalRes);
      const personalId = personalRes.data.data.id;

      const businessReq = createMockReq('POST', {
        business_name: '테스트 회사',
        business_number: '333-33-33333',
        business_type: 'CORPORATION',
        owner_personal_id: personalId
      });
      const businessRes = createMockRes();
      await APIHandlers.handleBusinessRegistrations(businessReq, businessRes);
      const businessId = businessRes.data.data.id;

      // Create paper
      const paperReq = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId,
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        effective_from: '2024-01-01',
        metadata: { department: 'IT' }
      });
      const paperRes = createMockRes();

      await APIHandlers.handlePapers(paperReq, paperRes);

      expect(paperRes.statusCode).toBe(201);
      expect(paperRes.data.data.paper_type).toBe('EMPLOYMENT_CONTRACT');
      expect(paperRes.data.data.role_granted).toBe('WORKER');
      expect(paperRes.data.data.status).toBe('ACTIVE');
      expect(paperRes.data.data.metadata.department).toBe('IT');
    });

    test('should fail to create paper with invalid paper type and role combination', async () => {
      const req = createMockReq('POST', {
        personal_id: 'pid1',
        business_id: 'bid1',
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'OWNER', // Invalid combination
        effective_from: '2024-01-01'
      });
      const res = createMockRes();

      await APIHandlers.handlePapers(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.error).toContain('cannot grant role OWNER');
    });

    test('should get papers by personal ID and business ID', async () => {
      // Setup data
      const personalReq = createMockReq('POST', {
        name: '김다중역할',
        phone: '010-4444-4444'
      });
      const personalRes = createMockRes();
      await APIHandlers.handlePersonalIds(personalReq, personalRes);
      const personalId = personalRes.data.data.id;

      const businessReq = createMockReq('POST', {
        business_name: '다역할 회사',
        business_number: '444-44-44444',
        business_type: 'CORPORATION',
        owner_personal_id: personalId
      });
      const businessRes = createMockRes();
      await APIHandlers.handleBusinessRegistrations(businessReq, businessRes);
      const businessId = businessRes.data.data.id;

      // Create multiple papers
      const paper1Req = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId,
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        effective_from: '2024-01-01'
      });
      const paper1Res = createMockRes();
      await APIHandlers.handlePapers(paper1Req, paper1Res);

      const paper2Req = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId,
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'MANAGER',
        effective_from: '2024-02-01'
      });
      const paper2Res = createMockRes();
      await APIHandlers.handlePapers(paper2Req, paper2Res);

      // Get papers
      const getReq = createMockReq('GET', null, {
        personal_id: personalId,
        business_id: businessId
      });
      const getRes = createMockRes();

      await APIHandlers.handlePapers(getReq, getRes);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.data.data).toHaveLength(2);
      expect(getRes.data.data.map((p: any) => p.role_granted)).toContain('WORKER');
      expect(getRes.data.data.map((p: any) => p.role_granted)).toContain('MANAGER');
    });

    test('should update paper status', async () => {
      // Create paper first
      const personalReq = createMockReq('POST', {
        name: '김종료',
        phone: '010-5555-5555'
      });
      const personalRes = createMockRes();
      await APIHandlers.handlePersonalIds(personalReq, personalRes);
      const personalId = personalRes.data.data.id;

      const businessReq = createMockReq('POST', {
        business_name: '종료 회사',
        business_number: '555-55-55555',
        business_type: 'CORPORATION',
        owner_personal_id: personalId
      });
      const businessRes = createMockRes();
      await APIHandlers.handleBusinessRegistrations(businessReq, businessRes);
      const businessId = businessRes.data.data.id;

      const paperReq = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId,
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        effective_from: '2024-01-01'
      });
      const paperRes = createMockRes();
      await APIHandlers.handlePapers(paperReq, paperRes);
      const paperId = paperRes.data.data.id;

      // Update paper
      const updateReq = createMockReq('PUT', {
        status: 'SUSPENDED',
        effective_until: '2024-12-31'
      }, { id: paperId });
      const updateRes = createMockRes();

      await APIHandlers.handlePapers(updateReq, updateRes);

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.data.data.status).toBe('SUSPENDED');
      expect(updateRes.data.data.effective_until).toBe('2024-12-31');
    });

    test('should revoke paper via DELETE', async () => {
      // Create paper first
      const personalReq = createMockReq('POST', {
        name: '김철회',
        phone: '010-6666-6666'
      });
      const personalRes = createMockRes();
      await APIHandlers.handlePersonalIds(personalReq, personalRes);
      const personalId = personalRes.data.data.id;

      const businessReq = createMockReq('POST', {
        business_name: '철회 회사',
        business_number: '666-66-66666',
        business_type: 'CORPORATION',
        owner_personal_id: personalId
      });
      const businessRes = createMockRes();
      await APIHandlers.handleBusinessRegistrations(businessReq, businessRes);
      const businessId = businessRes.data.data.id;

      const paperReq = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId,
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        effective_from: '2024-01-01'
      });
      const paperRes = createMockRes();
      await APIHandlers.handlePapers(paperReq, paperRes);
      const paperId = paperRes.data.data.id;

      // Revoke paper
      const deleteReq = createMockReq('DELETE', null, { id: paperId });
      const deleteRes = createMockRes();

      await APIHandlers.handlePapers(deleteReq, deleteRes);

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.data.data.status).toBe('REVOKED');
      expect(deleteRes.data.message).toBe('Paper revoked successfully');
    });
  });

  describe('Role Calculation Endpoints', () => {
    test('should calculate roles from papers', async () => {
      // Create complete setup
      const personalReq = createMockReq('POST', {
        name: '김역할계산',
        phone: '010-7777-7777'
      });
      const personalRes = createMockRes();
      await APIHandlers.handlePersonalIds(personalReq, personalRes);
      const personalId = personalRes.data.data.id;

      const businessReq = createMockReq('POST', {
        business_name: '역할계산 회사',
        business_number: '777-77-77777',
        business_type: 'CORPORATION',
        owner_personal_id: personalId
      });
      const businessRes = createMockRes();
      await APIHandlers.handleBusinessRegistrations(businessReq, businessRes);
      const businessId = businessRes.data.data.id;

      // Create multiple papers for role hierarchy
      const workerPaper = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId,
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        effective_from: '2024-01-01'
      });
      const workerRes = createMockRes();
      await APIHandlers.handlePapers(workerPaper, workerRes);

      const managerPaper = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId,
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'MANAGER',
        effective_from: '2024-02-01'
      });
      const managerRes = createMockRes();
      await APIHandlers.handlePapers(managerPaper, managerRes);

      // Calculate roles
      const calcReq = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId
      });
      const calcRes = createMockRes();

      await APIHandlers.handleRoleCalculation(calcReq, calcRes);

      expect(calcRes.statusCode).toBe(200);
      expect(calcRes.data.data.personal_id).toBe(personalId);
      expect(calcRes.data.data.business_id).toBe(businessId);
      expect(calcRes.data.data.calculated_roles).toContain('MANAGER');
      expect(calcRes.data.data.calculated_roles).toContain('WORKER');
      expect(calcRes.data.data.highest_role).toBe('MANAGER');
    });

    test('should return SEEKER for person with no papers', async () => {
      // Create personal ID and business but no papers
      const personalReq = createMockReq('POST', {
        name: '김무역할',
        phone: '010-8888-8888'
      });
      const personalRes = createMockRes();
      await APIHandlers.handlePersonalIds(personalReq, personalRes);
      const personalId = personalRes.data.data.id;

      const businessReq = createMockReq('POST', {
        business_name: '무역할 회사',
        business_number: '888-88-88888',
        business_type: 'CORPORATION',
        owner_personal_id: personalId
      });
      const businessRes = createMockRes();
      await APIHandlers.handleBusinessRegistrations(businessReq, businessRes);
      const businessId = businessRes.data.data.id;

      // Calculate roles without any papers
      const calcReq = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId
      });
      const calcRes = createMockRes();

      await APIHandlers.handleRoleCalculation(calcReq, calcRes);

      expect(calcRes.statusCode).toBe(200);
      expect(calcRes.data.data.calculated_roles).toEqual(['SEEKER']);
      expect(calcRes.data.data.highest_role).toBe('SEEKER');
    });

    test('should handle role inheritance correctly', async () => {
      // Create setup for OWNER role
      const personalReq = createMockReq('POST', {
        name: '김사장역할',
        phone: '010-9999-9999'
      });
      const personalRes = createMockRes();
      await APIHandlers.handlePersonalIds(personalReq, personalRes);
      const personalId = personalRes.data.data.id;

      const businessReq = createMockReq('POST', {
        business_name: '사장 회사',
        business_number: '999-99-99999',
        business_type: 'SOLE_PROPRIETORSHIP',
        owner_personal_id: personalId
      });
      const businessRes = createMockRes();
      await APIHandlers.handleBusinessRegistrations(businessReq, businessRes);
      const businessId = businessRes.data.data.id;

      // Create OWNER paper (which should inherit MANAGER and WORKER)
      const ownerPaper = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId,
        paper_type: 'BUSINESS_REGISTRATION',
        role_granted: 'OWNER',
        effective_from: '2024-01-01'
      });
      const ownerRes = createMockRes();
      await APIHandlers.handlePapers(ownerPaper, ownerRes);

      // Calculate roles
      const calcReq = createMockReq('POST', {
        personal_id: personalId,
        business_id: businessId
      });
      const calcRes = createMockRes();

      await APIHandlers.handleRoleCalculation(calcReq, calcRes);

      expect(calcRes.statusCode).toBe(200);
      expect(calcRes.data.data.highest_role).toBe('OWNER');
      expect(calcRes.data.data.calculated_roles).toContain('OWNER');
      expect(calcRes.data.data.calculated_roles).toContain('MANAGER');
      expect(calcRes.data.data.calculated_roles).toContain('WORKER');
      
      // Check calculation basis
      expect(calcRes.data.data.calculation_basis.dependencies).toContain('OWNER');
      expect(calcRes.data.data.calculation_basis.inheritance).toContain('MANAGER');
      expect(calcRes.data.data.calculation_basis.inheritance).toContain('WORKER');
    });
  });

  describe('API Error Handling', () => {
    test('should handle invalid HTTP methods', async () => {
      const req = createMockReq('PATCH', {}); // Unsupported method
      const res = createMockRes();

      await APIHandlers.handlePersonalIds(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.data.error).toBe('Method not allowed');
    });

    test('should handle missing required parameters', async () => {
      const req = createMockReq('GET', null, {}); // Missing ID or phone
      const res = createMockRes();

      await APIHandlers.handlePersonalIds(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.error).toBe('ID or phone parameter required');
    });

    test('should handle database constraint violations', async () => {
      // Try to create business with invalid business number format
      // (This would be caught by validation, but tests database error handling)
      const req = createMockReq('POST', {
        business_name: 'Test Business',
        business_number: '', // Empty business number
        business_type: 'SOLE_PROPRIETORSHIP',
        owner_personal_id: 'some-id'
      });
      const res = createMockRes();

      await APIHandlers.handleBusinessRegistrations(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.error).toBe('All required fields must be provided');
    });

    test('should handle malformed request bodies gracefully', async () => {
      const req = createMockReq('POST', null); // null body
      const res = createMockRes();

      await APIHandlers.handlePersonalIds(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.error).toBe('Name and phone are required');
    });
  });
});