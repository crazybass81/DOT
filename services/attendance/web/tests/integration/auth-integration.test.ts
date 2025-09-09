/**
 * Authentication Integration Tests
 * Tests the unified authentication system with real Supabase integration
 */

import { authService } from '../../src/services/auth.service';
import { userService } from '../../src/services/user.service';

describe('Authentication Integration Tests', () => {
  // These tests verify the auth system structure and error handling
  // without requiring actual authentication

  describe('Service Availability', () => {
    test('authService should be available with all required methods', () => {
      expect(authService).toBeDefined();
      expect(typeof authService.signIn).toBe('function');
      expect(typeof authService.signUp).toBe('function');
      expect(typeof authService.signOut).toBe('function');
      expect(typeof authService.getCurrentUser).toBe('function');
      expect(typeof authService.isAuthenticated).toBe('function');
      expect(typeof authService.isMasterAdmin).toBe('function');
      expect(typeof authService.isVerified).toBe('function');
      expect(typeof authService.hasRole).toBe('function');
      expect(typeof authService.getUserRoles).toBe('function');
      expect(typeof authService.getSession).toBe('function');
      expect(typeof authService.getSessionToken).toBe('function');
      expect(typeof authService.resetPassword).toBe('function');
      expect(typeof authService.updatePassword).toBe('function');
      expect(typeof authService.verifyOtp).toBe('function');
      expect(typeof authService.linkEmployeeAccount).toBe('function');
    });

    test('userService should be available with compatibility methods', () => {
      expect(userService).toBeDefined();
      expect(typeof userService.getCurrentUser).toBe('function');
      expect(typeof userService.isAdmin).toBe('function');
      expect(typeof userService.isBusinessAdmin).toBe('function');
      expect(typeof userService.isSuperAdmin).toBe('function');
      expect(typeof userService.isEmployee).toBe('function');
      expect(typeof userService.hasPermission).toBe('function');
      expect(typeof userService.isAuthenticated).toBe('function');
    });

    test('userService should have async methods', () => {
      expect(typeof userService.isAdminAsync).toBe('function');
      expect(typeof userService.isBusinessAdminAsync).toBe('function');
      expect(typeof userService.isSuperAdminAsync).toBe('function');
      expect(typeof userService.isEmployeeAsync).toBe('function');
      expect(typeof userService.hasPermissionAsync).toBe('function');
    });
  });

  describe('Authentication State Management', () => {
    test('should handle unauthenticated state', async () => {
      const isAuthenticated = await authService.isAuthenticated();
      const currentUser = await authService.getCurrentUser();
      const isMasterAdmin = await authService.isMasterAdmin();
      const isVerified = await authService.isVerified();
      const userRoles = await authService.getUserRoles();

      // Should return falsy/empty values when not authenticated
      expect(isAuthenticated).toBe(false);
      expect(currentUser).toBeNull();
      expect(isMasterAdmin).toBe(false);
      expect(isVerified).toBe(false);
      expect(Array.isArray(userRoles)).toBe(true);
      expect(userRoles.length).toBe(0);
    });

    test('should handle role checks when not authenticated', async () => {
      const hasAdminRole = await authService.hasRole('admin');
      const hasWorkerRole = await authService.hasRole('worker');
      const hasMasterRole = await authService.hasRole('master_admin');

      expect(hasAdminRole).toBe(false);
      expect(hasWorkerRole).toBe(false);
      expect(hasMasterRole).toBe(false);
    });

    test('userService async methods should handle unauthenticated state', async () => {
      const isAdmin = await userService.isAdminAsync();
      const isBusinessAdmin = await userService.isBusinessAdminAsync();
      const isSuperAdmin = await userService.isSuperAdminAsync();
      const isEmployee = await userService.isEmployeeAsync();
      const isAuthenticated = await userService.isAuthenticated();

      expect(isAdmin).toBe(false);
      expect(isBusinessAdmin).toBe(false);
      expect(isSuperAdmin).toBe(false);
      expect(isEmployee).toBe(false);
      expect(isAuthenticated).toBe(false);
    });

    test('should handle permission checks when not authenticated', async () => {
      const canManageEmployees = await userService.hasPermissionAsync('manage_employees');
      const canViewReports = await userService.hasPermissionAsync('view_reports');
      const canCheckIn = await userService.hasPermissionAsync('check_in');

      expect(canManageEmployees).toBe(false);
      expect(canViewReports).toBe(false);
      expect(canCheckIn).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('signIn should handle invalid credentials gracefully', async () => {
      await expect(authService.signIn('invalid@test.com', 'wrongpassword'))
        .rejects.toThrow();
    });

    test('signUp should handle missing data gracefully', async () => {
      await expect(authService.signUp('', ''))
        .resolves.toBeDefined();
      // Should return error result, not throw
    });

    test('resetPassword should handle invalid email gracefully', async () => {
      await expect(authService.resetPassword('invalid-email'))
        .rejects.toThrow();
    });

    test('verifyOtp should handle invalid token gracefully', async () => {
      await expect(authService.verifyOtp('test@example.com', 'invalid-token'))
        .rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    test('should handle session retrieval when not authenticated', async () => {
      const session = await authService.getSession();
      const token = await authService.getSessionToken();

      expect(session).toBeNull();
      expect(token).toBeNull();
    });

    test('legacy methods should return expected defaults', () => {
      const syncToken = authService.getAccessToken();
      const syncCurrentUser = userService.getCurrentUser();
      const syncIsAdmin = userService.isAdmin();

      expect(syncToken).toBeNull();
      expect(syncCurrentUser).toBeNull();
      expect(syncIsAdmin).toBe(false);
    });
  });

  describe('Supabase Integration', () => {
    test('should have access to Supabase client', () => {
      const client = authService.getSupabaseClient();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(typeof client.from).toBe('function');
    });

    test('Supabase client should have required methods', () => {
      const client = authService.getSupabaseClient();
      expect(typeof client.auth.signInWithPassword).toBe('function');
      expect(typeof client.auth.signUp).toBe('function');
      expect(typeof client.auth.signOut).toBe('function');
      expect(typeof client.auth.getUser).toBe('function');
      expect(typeof client.auth.getSession).toBe('function');
    });
  });

  describe('Type Safety', () => {
    test('should return properly typed results', async () => {
      const signUpResult = await authService.signUp('test@example.com', 'password');
      
      expect(signUpResult).toHaveProperty('user');
      expect(signUpResult).toHaveProperty('session');
      expect(signUpResult).toHaveProperty('needsVerification');
      expect(typeof signUpResult.needsVerification).toBe('boolean');

      if (signUpResult.error) {
        expect(typeof signUpResult.error).toBe('string');
      }
    });

    test('user roles should be string array', async () => {
      const roles = await authService.getUserRoles();
      expect(Array.isArray(roles)).toBe(true);
      roles.forEach(role => {
        expect(typeof role).toBe('string');
      });
    });
  });

  describe('System Integration', () => {
    test('unified system should be operational', () => {
      // Verify all core services are available and connected
      const systemChecks = {
        authServiceAvailable: !!authService,
        userServiceAvailable: !!userService,
        supabaseClientAvailable: !!authService.getSupabaseClient(),
        coreMethodsAvailable: {
          signIn: typeof authService.signIn === 'function',
          signUp: typeof authService.signUp === 'function',
          getCurrentUser: typeof authService.getCurrentUser === 'function',
          isAuthenticated: typeof authService.isAuthenticated === 'function'
        }
      };

      expect(systemChecks.authServiceAvailable).toBe(true);
      expect(systemChecks.userServiceAvailable).toBe(true);
      expect(systemChecks.supabaseClientAvailable).toBe(true);
      expect(Object.values(systemChecks.coreMethodsAvailable).every(Boolean)).toBe(true);
    });
  });
});