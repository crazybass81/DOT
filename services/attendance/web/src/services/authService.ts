// Compatibility wrapper for authService
// Redirects all calls to unifiedAuthService (Supabase)

import { unifiedAuthService } from './unifiedAuthService';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

class AuthService {
  async signIn(email: string, password: string): Promise<User> {
    const result = await unifiedAuthService.signIn(email, password);
    if (!result.success || !result.user) {
      throw new Error(result.error || 'Sign in failed');
    }
    return {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role
    };
  }

  async signUp(email: string, password: string, name?: string): Promise<{ userId?: string; nextStep?: { signUpStep: string } }> {
    const result = await unifiedAuthService.signUp(email, password, { name });
    return {
      userId: result.user?.id,
      nextStep: result.requiresAction === 'verify_email' 
        ? { signUpStep: 'CONFIRM_SIGN_UP' }
        : undefined
    };
  }

  async signOut(): Promise<void> {
    await unifiedAuthService.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    const user = await unifiedAuthService.getCurrentUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }

  async isAuthenticated(): Promise<boolean> {
    return await unifiedAuthService.isAuthenticated();
  }

  async getSessionToken(): Promise<string | null> {
    return await unifiedAuthService.getSessionToken();
  }

  async confirmSignUp(email: string, code: string): Promise<boolean> {
    const result = await unifiedAuthService.verifySignUp(email, code);
    return result.success;
  }

  getAccessToken(): string | null {
    // Synchronous method for backward compatibility
    // Returns null and should be replaced with async getSessionToken
    return null;
  }
}

export const authService = new AuthService();