const request = require('supertest');
const app = require('../../src/app');

describe('Attendance Management Endpoints', () => {
  let authToken;
  let userId = 'test-user-123';

  beforeAll(async () => {
    // Setup: Create and authenticate a test user
    authToken = createTestToken({ 
      id: userId, 
      approvalStatus: 'APPROVED' 
    });
  });

  describe('GET /api/v1/dashboard', () => {
    it('should return dashboard data with attendance status', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('currentStatus');
      expect(['NOT_WORKING', 'WORKING', 'ON_BREAK']).toContain(response.body.data.currentStatus);
      expect(response.body.data).toHaveProperty('workingMinutes');
      expect(response.body.data).toHaveProperty('breakMinutes');
      expect(response.body.data).toHaveProperty('todayRecords');
    });

    it('should auto check-in on first dashboard access', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // If status was NOT_WORKING, it should now be WORKING
      if (response.body.data.previousStatus === 'NOT_WORKING') {
        expect(response.body.data.currentStatus).toBe('WORKING');
        expect(response.body.data).toHaveProperty('checkInTime');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
  });

  describe('POST /api/v1/attendance/checkin', () => {
    it('should process check-in for approved user', async () => {
      const response = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationId: 'main-office'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'WORKING');
      expect(response.body.data).toHaveProperty('checkInTime');
      expect(response.body.data).toHaveProperty('attendanceId');
    });

    it('should prevent duplicate check-in', async () => {
      // First check-in
      await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ locationId: 'main-office' });

      // Second check-in attempt
      const response = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ locationId: 'main-office' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Already checked in');
    });

    it('should reject check-in for pending approval users', async () => {
      const pendingToken = createTestToken({ 
        id: 'pending-user', 
        approvalStatus: 'PENDING' 
      });

      const response = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${pendingToken}`)
        .send({ locationId: 'main-office' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Approval pending');
    });
  });

  describe('POST /api/v1/attendance/break', () => {
    beforeEach(async () => {
      // Ensure user is checked in
      await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ locationId: 'main-office' });
    });

    it('should start break for working user', async () => {
      const response = await request(app)
        .post('/api/v1/attendance/break')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'START'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'ON_BREAK');
      expect(response.body.data).toHaveProperty('breakStartTime');
    });

    it('should end break and resume work', async () => {
      // Start break first
      await request(app)
        .post('/api/v1/attendance/break')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'START' });

      // End break
      const response = await request(app)
        .post('/api/v1/attendance/break')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'END'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'WORKING');
      expect(response.body.data).toHaveProperty('breakEndTime');
      expect(response.body.data).toHaveProperty('breakDuration');
    });

    it('should track multiple breaks in a day', async () => {
      // First break cycle
      await request(app)
        .post('/api/v1/attendance/break')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'START' });
      
      await request(app)
        .post('/api/v1/attendance/break')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'END' });

      // Second break
      const response = await request(app)
        .post('/api/v1/attendance/break')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'START' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalBreaksToday');
      expect(response.body.data.totalBreaksToday).toBeGreaterThanOrEqual(2);
    });

    it('should reject break without check-in', async () => {
      const newToken = createTestToken({ id: 'new-user' });
      
      const response = await request(app)
        .post('/api/v1/attendance/break')
        .set('Authorization', `Bearer ${newToken}`)
        .send({ action: 'START' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not checked in');
    });
  });

  describe('POST /api/v1/attendance/checkout', () => {
    beforeEach(async () => {
      // Ensure user is checked in
      await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ locationId: 'main-office' });
    });

    it('should process checkout and calculate work time', async () => {
      const response = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'COMPLETED');
      expect(response.body.data).toHaveProperty('checkOutTime');
      expect(response.body.data).toHaveProperty('totalWorkMinutes');
      expect(response.body.data).toHaveProperty('totalBreakMinutes');
      expect(response.body.data).toHaveProperty('actualWorkMinutes');
    });

    it('should end active break before checkout', async () => {
      // Start a break
      await request(app)
        .post('/api/v1/attendance/break')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'START' });

      // Checkout (should auto-end break)
      const response = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('status', 'COMPLETED');
      expect(response.body.data).toHaveProperty('autoEndedBreak', true);
    });

    it('should reject checkout without checkin', async () => {
      const newToken = createTestToken({ id: 'another-user' });
      
      const response = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${newToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not checked in');
    });

    it('should prevent duplicate checkout', async () => {
      // First checkout
      await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${authToken}`);

      // Second checkout attempt
      const response = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Already checked out');
    });
  });

  describe('GET /api/v1/attendance/status', () => {
    it('should return current attendance status', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('currentStatus');
      expect(response.body.data).toHaveProperty('today');
      
      if (response.body.data.currentStatus === 'WORKING') {
        expect(response.body.data.today).toHaveProperty('checkInTime');
        expect(response.body.data.today).toHaveProperty('workingMinutes');
      }
    });

    it('should include break information when on break', async () => {
      // Start a break
      await request(app)
        .post('/api/v1/attendance/break')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'START' });

      const response = await request(app)
        .get('/api/v1/attendance/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.currentStatus).toBe('ON_BREAK');
      expect(response.body.data.today).toHaveProperty('currentBreakStart');
      expect(response.body.data.today).toHaveProperty('totalBreakMinutes');
    });
  });

  describe('GET /api/v1/attendance/history', () => {
    it('should return attendance history for user', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('records');
      expect(Array.isArray(response.body.data.records)).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('totalDays');
      expect(response.body.data.summary).toHaveProperty('totalWorkMinutes');
      expect(response.body.data.summary).toHaveProperty('totalBreakMinutes');
      expect(response.body.data.summary).toHaveProperty('averageWorkHours');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-15',
          endDate: '2024-01-15'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.records).toHaveLength(1);
      expect(response.body.data.records[0]).toHaveProperty('date', '2024-01-15');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 10);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
    });

    it('should default to current month without date params', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data.period).toHaveProperty('month', currentMonth);
      expect(response.body.data.period).toHaveProperty('year', currentYear);
    });
  });
});