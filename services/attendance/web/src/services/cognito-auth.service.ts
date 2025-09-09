// Compatibility wrapper for cognitoAuthService
// Redirects all calls to unifiedAuthService (Supabase)

import { unifiedAuthService } from './unified-auth.service';

class CognitoAuthService {
  async signIn(email: string, password: string): Promise<any> {
    const result = await unifiedAuthService.signIn(email, password);
    if (!result.success) {
      throw new Error(result.error || 'Sign in failed');
    }
    return result.user;
  }

  async signUp(email: string, password: string, name?: string): Promise<any> {
    const result = await unifiedAuthService.signUp(email, password, { name });
    return {
      userId: result.user?.id,
      userConfirmed: !result.requiresAction
    };
  }

  signOut(): void {
    // Fire and forget for backward compatibility
    unifiedAuthService.signOut().catch(console.error);
  }

  isAuthenticated(): boolean {
    // Synchronous check - returns cached state
    // Should be replaced with async check in components
    const token = this.getAccessToken();
    return !!token;
  }

  getAccessToken(): string | null {
    // Synchronous method - returns from localStorage
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('supabase.auth.token');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          return data?.access_token || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  async getCurrentUser(): Promise<any> {
    return await unifiedAuthService.getCurrentUser();
  }

  async refreshSession(): Promise<void> {
    await unifiedAuthService.refreshSession();
  }
}

export const cognitoAuthService = new CognitoAuthService();