const request = require('supertest');
const app = require('../../src/app');

describe('Admin Management Endpoints', () => {
  let adminToken;

  beforeAll(async () => {
    // Login as admin
    const loginResponse = await request(app)
      .post('/api/v1/admin/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    adminToken = loginResponse.body.data.adminToken;
  });

  describe('POST /api/v1/admin/qr/generate', () => {
    it('should generate QR code for branch', async () => {
      const response = await request(app)
        .post('/api/v1/admin/qr/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          branchId: 'main-office',
          branchName: '본사'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('qrImageUrl');
      expect(response.body.data).toHaveProperty('qrData');
      expect(response.body.data.qrData).toHaveProperty('branchId', 'main-office');
      expect(response.body.data.qrData).toHaveProperty('qrCode');
      expect(response.body.data.qrData).toHaveProperty('createdAt');
    });

    it('should update existing QR code for branch', async () => {
      // Generate first QR
      const firstResponse = await request(app)
        .post('/api/v1/admin/qr/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          branchId: 'branch-001',
          branchName: 'Branch 1'
        });

      const firstQrCode = firstResponse.body.data.qrData.qrCode;

      // Generate second QR for same branch
      const secondResponse = await request(app)
        .post('/api/v1/admin/qr/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          branchId: 'branch-001',
          branchName: 'Branch 1'
        });

      expect(secondResponse.status).toBe(201);
      expect(secondResponse.body.data.qrData.qrCode).not.toBe(firstQrCode);
      expect(secondResponse.body.data).toHaveProperty('updated', true);
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .post('/api/v1/admin/qr/generate')
        .send({
          branchId: 'main-office',
          branchName: '본사'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/admin/qr/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject non-admin users', async () => {
      const userToken = createTestToken({ role: 'EMPLOYEE' });
      
      const response = await request(app)
        .post('/api/v1/admin/qr/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          branchId: 'main-office',
          branchName: '본사'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Admin access required');
    });
  });

  describe('GET /api/v1/admin/approvals/pending', () => {
    it('should return list of pending approvals', async () => {
      const response = await request(app)
        .get('/api/v1/admin/approvals/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('approvals');
      expect(Array.isArray(response.body.data.approvals)).toBe(true);
      
      if (response.body.data.approvals.length > 0) {
        const approval = response.body.data.approvals[0];
        expect(approval).toHaveProperty('employeeId');
        expect(approval).toHaveProperty('name');
        expect(approval).toHaveProperty('email');
        expect(approval).toHaveProperty('employeeCode');
        expect(approval).toHaveProperty('branchName');
        expect(approval).toHaveProperty('requestedAt');
        expect(approval).toHaveProperty('status', 'PENDING');
      }
    });

    it('should filter by branch', async () => {
      const response = await request(app)
        .get('/api/v1/admin/approvals/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ branchId: 'main-office' });

      expect(response.status).toBe(200);
      expect(response.body.data.approvals).toSatisfyAll(
        approval => approval.branchId === 'main-office'
      );
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/admin/approvals/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 5);
    });
  });

  describe('POST /api/v1/admin/approvals/:employeeId/approve', () => {
    let pendingEmployeeId;

    beforeEach(async () => {
      // Create a pending registration
      const registerResponse = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'Pending User',
          phone: '010-9999-9999',
          email: `pending${Date.now()}@example.com`,
          birthDate: '1990-01-01',
          branchId: 'main-office',
          deviceId: 'test-device',
          employeeCode: `EMP${Date.now()}`,
          pin: '1234'
        });
      
      pendingEmployeeId = registerResponse.body.data.userId;
    });

    it('should approve employee registration', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/approvals/${pendingEmployeeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('employeeId', pendingEmployeeId);
      expect(response.body.data).toHaveProperty('approvalStatus', 'APPROVED');
      expect(response.body.data).toHaveProperty('approvedBy');
      expect(response.body.data).toHaveProperty('approvedAt');
    });

    it('should activate employee account on approval', async () => {
      await request(app)
        .post(`/api/v1/admin/approvals/${pendingEmployeeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Check employee can now check in
      const employeeToken = createTestToken({ 
        id: pendingEmployeeId,
        approvalStatus: 'APPROVED'
      });

      const checkInResponse = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ locationId: 'main-office' });

      expect(checkInResponse.status).toBe(200);
    });

    it('should prevent duplicate approval', async () => {
      // First approval
      await request(app)
        .post(`/api/v1/admin/approvals/${pendingEmployeeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Second approval attempt
      const response = await request(app)
        .post(`/api/v1/admin/approvals/${pendingEmployeeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Already approved');
    });

    it('should handle non-existent employee', async () => {
      const response = await request(app)
        .post('/api/v1/admin/approvals/non-existent-id/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Employee not found');
    });
  });

  describe('POST /api/v1/admin/approvals/:employeeId/reject', () => {
    let pendingEmployeeId;

    beforeEach(async () => {
      // Create a pending registration
      const registerResponse = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'To Reject',
          phone: '010-8888-8888',
          email: `reject${Date.now()}@example.com`,
          birthDate: '1990-01-01',
          branchId: 'main-office',
          deviceId: 'test-device',
          employeeCode: `REJ${Date.now()}`,
          pin: '1234'
        });
      
      pendingEmployeeId = registerResponse.body.data.userId;
    });

    it('should reject employee registration with reason', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/approvals/${pendingEmployeeId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Invalid employee code'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('employeeId', pendingEmployeeId);
      expect(response.body.data).toHaveProperty('approvalStatus', 'REJECTED');
      expect(response.body.data).toHaveProperty('rejectionReason', 'Invalid employee code');
      expect(response.body.data).toHaveProperty('rejectedBy');
      expect(response.body.data).toHaveProperty('rejectedAt');
    });

    it('should require rejection reason', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/approvals/${pendingEmployeeId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('reason');
    });

    it('should prevent rejected employee from checking in', async () => {
      // Reject the employee
      await request(app)
        .post(`/api/v1/admin/approvals/${pendingEmployeeId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test rejection' });

      // Try to check in
      const employeeToken = createTestToken({ 
        id: pendingEmployeeId,
        approvalStatus: 'REJECTED'
      });

      const checkInResponse = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ locationId: 'main-office' });

      expect(checkInResponse.status).toBe(403);
      expect(checkInResponse.body).toHaveProperty('error');
      expect(checkInResponse.body.error).toContain('rejected');
    });
  });

  describe('GET /api/v1/admin/statistics', () => {
    it('should return attendance statistics', async () => {
      const response = await request(app)
        .get('/api/v1/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalEmployees');
      expect(response.body.data).toHaveProperty('activeToday');
      expect(response.body.data).toHaveProperty('onBreak');
      expect(response.body.data).toHaveProperty('attendanceRate');
      expect(response.body.data).toHaveProperty('branches');
    });

    it('should filter statistics by date range', async () => {
      const response = await request(app)
        .get('/api/v1/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data.period).toHaveProperty('start', '2024-01-01');
      expect(response.body.data.period).toHaveProperty('end', '2024-01-31');
    });

    it('should return branch-specific statistics', async () => {
      const response = await request(app)
        .get('/api/v1/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ branchId: 'main-office' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('branchId', 'main-office');
      expect(response.body.data).toHaveProperty('branchStatistics');
    });
  });
});