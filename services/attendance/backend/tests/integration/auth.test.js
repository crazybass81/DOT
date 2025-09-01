const request = require('supertest');
const app = require('../../src/app');

describe('Authentication Endpoints', () => {
  describe('POST /api/v1/admin/login', () => {
    it('should authenticate master admin with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('adminToken');
      expect(response.body.data).toHaveProperty('redirectTo', '/admin/dashboard');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.role).toBe('MASTER_ADMIN');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/admin/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/admin/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should rate limit login attempts', async () => {
      // Make 6 rapid login attempts
      const attempts = Array(6).fill().map(() => 
        request(app)
          .post('/api/v1/admin/login')
          .send({
            username: 'admin',
            password: 'wrong'
          })
      );

      const responses = await Promise.all(attempts);
      const lastResponse = responses[responses.length - 1];
      
      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/qr/scan', () => {
    it('should process QR code scan for new user', async () => {
      const response = await request(app)
        .post('/api/v1/qr/scan')
        .send({
          qrCode: 'DOT_QR|checkin|1705282800000|main-office',
          deviceId: 'test-device-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'NOT_REGISTERED');
      expect(response.body.data).toHaveProperty('redirectTo', '/register');
      expect(response.body.data).toHaveProperty('branchId');
    });

    it('should process QR code scan for registered user', async () => {
      const token = createTestToken();
      
      const response = await request(app)
        .post('/api/v1/qr/scan')
        .set('Authorization', `Bearer ${token}`)
        .send({
          qrCode: 'DOT_QR|checkin|1705282800000|main-office',
          deviceId: 'test-device-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'REGISTERED');
      expect(response.body.data).toHaveProperty('redirectTo', '/dashboard');
    });

    it('should reject invalid QR code format', async () => {
      const response = await request(app)
        .post('/api/v1/qr/scan')
        .send({
          qrCode: 'INVALID_QR_CODE',
          deviceId: 'test-device-123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid QR code format');
    });

    it('should reject expired QR codes', async () => {
      const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      const response = await request(app)
        .post('/api/v1/qr/scan')
        .send({
          qrCode: `DOT_QR|checkin|${oldTimestamp}|main-office`,
          deviceId: 'test-device-123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'QR code expired');
    });
  });

  describe('POST /api/v1/register', () => {
    it('should register new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'John Doe',
          phone: '010-1234-5678',
          email: 'john@example.com',
          birthDate: '1990-01-01',
          branchId: 'main-office',
          deviceId: 'test-device-123',
          employeeCode: 'EMP001',
          pin: '1234'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('userToken');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('redirectTo', '/approval-pending');
      expect(response.body.data).toHaveProperty('approvalStatus', 'PENDING');
    });

    it('should prevent duplicate registration', async () => {
      // First registration
      await request(app)
        .post('/api/v1/register')
        .send({
          name: 'John Doe',
          phone: '010-1234-5678',
          email: 'duplicate@example.com',
          birthDate: '1990-01-01',
          branchId: 'main-office',
          deviceId: 'test-device-123',
          employeeCode: 'EMP002',
          pin: '1234'
        });

      // Duplicate registration attempt
      const response = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'Jane Doe',
          phone: '010-9876-5432',
          email: 'duplicate@example.com',
          birthDate: '1990-01-01',
          branchId: 'main-office',
          deviceId: 'test-device-456',
          employeeCode: 'EMP003',
          pin: '5678'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'John Doe'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'John Doe',
          phone: '123-456', // Invalid format
          email: 'john@example.com',
          birthDate: '1990-01-01',
          branchId: 'main-office',
          deviceId: 'test-device-123',
          employeeCode: 'EMP004',
          pin: '1234'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toContain('Invalid phone number format');
    });
  });
});