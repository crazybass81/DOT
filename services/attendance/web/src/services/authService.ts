import { signIn, signUp, signOut, confirmSignUp, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth';
import { configureAmplify } from '@/lib/aws-config';

// Initialize Amplify
if (typeof window !== 'undefined') {
  configureAmplify();
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export class AuthService {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, name?: string): Promise<{ userId: string | undefined; nextStep: any }> {
    try {
      const { userId, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name: name || email.split('@')[0]
          }
        }
      });
      
      return { userId, nextStep };
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  }

  /**
   * Confirm sign up with verification code
   */
  async confirmSignUp(email: string, code: string): Promise<boolean> {
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code
      });
      
      return isSignUpComplete;
    } catch (error: any) {
      console.error('Confirm sign up error:', error);
      throw new Error(error.message || 'Failed to confirm sign up');
    }
  }

  /**
   * Sign in a user
   */
  async signIn(email: string, password: string): Promise<User> {
    try {
      const { isSignedIn } = await signIn({
        username: email,
        password
      });
      
      if (isSignedIn) {
        const user = await this.getCurrentUser();
        if (user) {
          return user;
        }
      }
      
      throw new Error('Sign in failed');
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut();
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { username, userId, signInDetails } = await getCurrentUser();
      
      return {
        id: userId,
        email: signInDetails?.loginId || username,
        name: username
      };
    } catch (error) {
      console.log('No authenticated user');
      return null;
    }
  }

  /**
   * Get the current session token
   */
  async getSessionToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error('Failed to get session token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();