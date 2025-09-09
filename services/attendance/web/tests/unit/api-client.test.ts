/**
 * API Client Tests
 * Tests for centralized API client with error handling and authentication
 */

import { ApiClient, api, ApiResponse, ApiError } from '../../src/lib/api-client';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('/api');
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  describe('인증 헤더', () => {
    it('토큰이 있을 때 Authorization 헤더를 포함한다', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token-123');
      
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: 'test' })
      });

      await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-123'
        }
      });
    });

    it('토큰이 없을 때 Authorization 헤더를 포함하지 않는다', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: 'test' })
      });

      await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('GET 요청', () => {
    it('성공적인 GET 요청을 처리한다', async () => {
      const responseData = { data: { id: 1, name: 'test' } };
      
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => responseData
      });

      const result = await client.get('/test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(responseData.data);
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });

    it('쿼리 파라미터와 함께 GET 요청을 처리한다', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: [] })
      });

      await client.get('/test', {
        params: { limit: 10, offset: 20, type: 'personal' }
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test?limit=10&offset=20&type=personal', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });

    it('undefined/null 파라미터를 제외한다', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: [] })
      });

      await client.get('/test', {
        params: { 
          limit: 10, 
          offset: undefined, 
          type: null, 
          search: 'test' 
        }
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test?limit=10&search=test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });
  });

  describe('POST 요청', () => {
    it('성공적인 POST 요청을 처리한다', async () => {
      const requestData = { name: 'test', email: 'test@example.com' };
      const responseData = { data: { id: 1, ...requestData } };
      
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => responseData
      });

      const result = await client.post('/test', requestData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(responseData.data);
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestData)
      });
    });

    it('데이터 없이 POST 요청을 처리한다', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true })
      });

      await client.post('/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: undefined
      });
    });
  });

  describe('에러 처리', () => {
    it('400 에러를 한국어로 처리한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ error: '사용자 정의 오류 메시지' })
      });

      await expect(client.get('/test')).rejects.toMatchObject({
        message: '사용자 정의 오류 메시지',
        status: 400
      });
    });

    it('401 인증 오류를 처리한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({})
      });

      await expect(client.get('/test')).rejects.toMatchObject({
        message: '인증이 필요합니다. 다시 로그인해주세요.',
        status: 401
      });
    });

    it('403 권한 오류를 처리한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({})
      });

      await expect(client.get('/test')).rejects.toMatchObject({
        message: '권한이 없습니다.',
        status: 403
      });
    });

    it('404 오류를 처리한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({})
      });

      await expect(client.get('/test')).rejects.toMatchObject({
        message: '요청한 리소스를 찾을 수 없습니다.',
        status: 404
      });
    });

    it('500 서버 오류를 처리한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({})
      });

      await expect(client.get('/test')).rejects.toMatchObject({
        message: '서버 오류가 발생했습니다.',
        status: 500
      });
    });

    it('네트워크 오류를 처리한다', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow('네트워크 오류가 발생했습니다.');
    });

    it('JSON 파싱 오류를 처리한다', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(client.get('/test')).rejects.toThrow('응답 파싱 중 오류가 발생했습니다.');
    });
  });

  describe('편의 메서드', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: [] })
      });
    });

    it('identity.getAll()을 올바른 파라미터로 호출한다', async () => {
      await api.identity.getAll({ limit: 10, type: 'personal' });

      expect(mockFetch).toHaveBeenCalledWith('/api/identity?limit=10&type=personal', expect.any(Object));
    });

    it('identity.create()를 올바른 데이터로 호출한다', async () => {
      const identityData = { fullName: '홍길동', identityType: 'personal' };
      
      await api.identity.create(identityData);

      expect(mockFetch).toHaveBeenCalledWith('/api/identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(identityData)
      });
    });

    it('business.verify()를 올바른 ID로 호출한다', async () => {
      await api.business.verify('business-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/business/business-123/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: undefined
      });
    });

    it('permissions.check()를 올바른 데이터로 호출한다', async () => {
      const permissionData = {
        identityId: 'identity-123',
        resource: 'business',
        action: 'read',
        businessId: 'business-456'
      };
      
      await api.permissions.check(permissionData);

      expect(mockFetch).toHaveBeenCalledWith('/api/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(permissionData)
      });
    });

    it('papers.extend()를 올바른 데이터로 호출한다', async () => {
      const extensionData = {
        newValidUntil: '2025-12-31',
        reason: '사업 연장으로 인한 연장'
      };
      
      await api.papers.extend('paper-123', extensionData);

      expect(mockFetch).toHaveBeenCalledWith('/api/papers/paper-123/extend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(extensionData)
      });
    });
  });

  describe('PUT과 DELETE 요청', () => {
    it('PUT 요청을 올바르게 처리한다', async () => {
      const updateData = { name: 'updated name' };
      
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: updateData })
      });

      const result = await client.put('/test/123', updateData);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/test/123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(updateData)
      });
    });

    it('DELETE 요청을 올바르게 처리한다', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true })
      });

      const result = await client.delete('/test/123');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/test/123', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });
  });
});