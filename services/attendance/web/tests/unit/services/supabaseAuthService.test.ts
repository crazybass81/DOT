import { authService, AuthService } from '../../../src/services/authService';
import { supabase } from '../../../src/services/authService';

// Mock Supabase
jest.mock('../../lib/supabase-config', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      verifyOtp: jest.fn(),
      onAuthStateChange: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }))
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('SupabaseAuthService', () => {
  let authService: SupabaseAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new SupabaseAuthService();
  });

  describe('signUp', () => {
    it('should create a new user account', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      };
      const mockSession = { access_token: 'token-123', user: mockUser };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null })
          })
        })
      } as any);

      const result = await authService.signUp('test@example.com', 'password123', { name: 'Test User' });

      expect(result.needsVerification).toBe(false);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { name: 'Test User' },
          emailRedirectTo: expect.stringContaining('/auth/verify')
        }
      });
    });

    it('should handle sign up errors', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already exists' }
      });

      await expect(authService.signUp('test@example.com', 'password123'))
        .rejects.toThrow('Email already exists');
    });

    it('should detect when email verification is needed', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        email_confirmed_at: null,
        user_metadata: { name: 'Test User' }
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      });

      const result = await authService.signUp('test@example.com', 'password123');

      expect(result.needsVerification).toBe(true);
      expect(result.session).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      };
      const mockSession = { access_token: 'token-123', user: mockUser };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: {
                id: 'emp-123',
                name: 'Test User',
                role: 'EMPLOYEE',
                approval_status: 'APPROVED'
              }
            })
          })
        })
      } as any);

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('EMPLOYEE');
    });

    it('should handle invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      await expect(authService.signIn('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current authenticated user', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: {
                id: 'emp-123',
                name: 'Test User',
                role: 'EMPLOYEE',
                approval_status: 'APPROVED'
              }
            })
          })
        })
      } as any);

      const result = await authService.getCurrentUser();

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('linkEmployeeAccount', () => {
    it('should create employee record for new user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock no existing employee
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null })
          })
        })
      } as any);

      // Mock successful insert
      const mockEmployee = {
        id: 'emp-123',
        auth_user_id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        approval_status: 'PENDING'
      };

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: mockEmployee,
              error: null 
            })
          })
        })
      } as any);

      const result = await authService.linkEmployeeAccount({
        name: 'Test User',
        phone: '123-456-7890'
      });

      expect(result).toEqual(mockEmployee);
    });

    it('should return existing employee if already linked', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const existingEmployee = {
        id: 'emp-123',
        auth_user_id: 'user-123',
        name: 'Test User',
        email: 'test@example.com'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: existingEmployee })
          })
        })
      } as any);

      const result = await authService.linkEmployeeAccount({
        name: 'Test User'
      });

      expect(result).toEqual(existingEmployee);
    });
  });

  describe('isMasterAdmin', () => {
    it('should return true for master admin user', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'admin@example.com',
        user_metadata: { name: 'Admin User' }
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: {
                id: 'emp-123',
                is_master_admin: true,
                role: 'MASTER_ADMIN'
              }
            })
          })
        })
      } as any);

      const result = await authService.isMasterAdmin();

      expect(result).toBe(true);
    });

    it('should return false for regular user', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'user@example.com',
        user_metadata: { name: 'Regular User' }
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: {
                id: 'emp-123',
                is_master_admin: false,
                role: 'EMPLOYEE'
              }
            })
          })
        })
      } as any);

      const result = await authService.isMasterAdmin();

      expect(result).toBe(false);
    });
  });
});