import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

const REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || 'us-east-1_EbYMLw6Kj';
const CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '32pd1i2idlso1nakce8tfjtpmq';

class CognitoAuthService {
  private client: CognitoIdentityProviderClient;

  constructor() {
    this.client = new CognitoIdentityProviderClient({ region: REGION });
  }

  /**
   * Direct authentication with Cognito
   * This bypasses Amplify and handles the email/username issue directly
   */
  async directSignIn(email: string, password: string) {
    try {
      // For the specific test user, use the known UUID
      // This is a temporary workaround until the Cognito configuration is fixed
      let username = email;
      
      // Map known email addresses to their UUIDs
      const emailToUUID: { [key: string]: string } = {
        'employee1@dotattendance.com': '2478f4a8-9011-703c-2de4-8a21ada7eaf5',
        'admin@dotattendance.com': '8448f448-50b1-700f-56f2-cadfeff7d21e'
      };
      
      if (emailToUUID[email]) {
        username = emailToUUID[email];
        // Using UUID for authentication
      }
      
      // Authentication attempt
      
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      });

      const response = await this.client.send(command);
      
      if (response.AuthenticationResult) {
        // Store tokens in localStorage
        localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken || '');
        localStorage.setItem('idToken', response.AuthenticationResult.IdToken || '');
        localStorage.setItem('refreshToken', response.AuthenticationResult.RefreshToken || '');
        localStorage.setItem('userEmail', email);
        
        return {
          success: true,
          tokens: response.AuthenticationResult
        };
      }
      
      throw new Error('Authentication failed');
    } catch (error: any) {
      // Direct sign in error
      
      // Provide more specific error messages
      if (error.name === 'NotAuthorizedException') {
        throw new Error('Incorrect email or password');
      } else if (error.name === 'UserNotFoundException') {
        throw new Error('User not found');
      }
      
      throw new Error(error.message || 'Authentication failed');
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken');
    return !!token;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  signOut() {
    // Starting signOut process
    
    // Remove all auth-related items from localStorage
    const itemsToRemove = ['accessToken', 'idToken', 'refreshToken', 'userEmail'];
    
    itemsToRemove.forEach(item => {
      // Removing item from localStorage
      localStorage.removeItem(item);
    });
    
    // Clear all localStorage (nuclear option)
    try {
      localStorage.clear();
      // All localStorage cleared
    } catch (error) {
      // Error clearing localStorage
    }
    
    // SignOut complete
  }
}

export const cognitoAuthService = new CognitoAuthService();