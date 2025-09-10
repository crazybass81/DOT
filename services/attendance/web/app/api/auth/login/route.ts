/**
 * Login API Endpoint
 * Production-ready authentication with role-based access control and session management
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthService } from '@/src/services/supabase-auth.service';
import { supabase } from '@/src/lib/supabase-config';
import { 
  LoginRequestSchema,
  LoginSuccessSchema,
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
  getDefaultRedirectUrl,
  type LoginRequest,
  type UserRole
} from '@/src/schemas/auth.schema';

interface LoginError {
  code: keyof typeof AUTH_ERROR_CODES;
  message: string;
  details?: any;
}

/**
 * Create standardized error response
 */
function createErrorResponse(error: LoginError, status = 400): NextResponse {
  return NextResponse.json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  }, { status });
}

/**
 * Create standardized success response
 */
function createSuccessResponse(data: any, status = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data,
  }, { status });
}

/**
 * Get user profile with role information from unified identity system
 */
async function getUserProfile(authUserId: string) {
  try {
    // Get unified identity
    const { data: identity, error: identityError } = await supabase
      .from('unified_identities')
      .select(`
        id,
        email,
        full_name,
        phone,
        is_verified,
        is_active,
        created_at,
        updated_at,
        profile_data
      `)
      .eq('auth_user_id', authUserId)
      .eq('is_active', true)
      .single();

    if (identityError || !identity) {
      console.error('Failed to get identity:', identityError);
      return null;
    }

    // Get primary role assignment
    const { data: roleAssignment, error: roleError } = await supabase
      .from('role_assignments')
      .select(`
        role,
        organization_id,
        is_primary,
        is_active,
        assigned_at,
        organizations:organization_id (
          id,
          name,
          status
        )
      `)
      .eq('identity_id', identity.id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('Failed to get role assignment:', roleError);
    }

    // Default to worker role if no role assigned
    const role = roleAssignment?.role || 'worker';
    const organizationId = roleAssignment?.organization_id || undefined;

    return {
      user: {
        id: authUserId,
        email: identity.email,
        name: identity.full_name,
        role: role as UserRole,
        organizationId,
        isVerified: identity.is_verified,
        isActive: identity.is_active,
        lastLoginAt: new Date().toISOString(),
        createdAt: identity.created_at,
      },
      organizationId,
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Update last login timestamp
 */
async function updateLastLogin(identityId: string): Promise<void> {
  try {
    await supabase
      .from('unified_identities')
      .update({
        profile_data: supabase.raw(`
          COALESCE(profile_data, '{}'::jsonb) || 
          '{"last_login_at": "${new Date().toISOString()}"}'::jsonb
        `)
      })
      .eq('id', identityId);
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    const validation = LoginRequestSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: AUTH_ERROR_MESSAGES.VALIDATION_ERROR,
        details: validation.error.errors.reduce((acc, err) => ({
          ...acc,
          [err.path.join('.')]: err.message,
        }), {}),
      });
    }

    const { email, password, rememberMe } = validation.data;

    // Attempt authentication
    try {
      const authUser = await supabaseAuthService.signIn(email, password);
      
      if (!authUser || !authUser.id) {
        return createErrorResponse({
          code: 'INVALID_CREDENTIALS',
          message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
        });
      }

      // Get session information
      const session = await supabaseAuthService.getSession();
      if (!session) {
        return createErrorResponse({
          code: 'SESSION_EXPIRED',
          message: AUTH_ERROR_MESSAGES.SESSION_EXPIRED,
        });
      }

      // Get user profile with role information
      const profileResult = await getUserProfile(authUser.id);
      if (!profileResult) {
        return createErrorResponse({
          code: 'INTERNAL_ERROR',
          message: '사용자 정보를 가져올 수 없습니다',
        });
      }

      const { user, organizationId } = profileResult;

      // Check if account is active
      if (!user.isActive) {
        return createErrorResponse({
          code: 'ACCOUNT_DISABLED',
          message: AUTH_ERROR_MESSAGES.ACCOUNT_DISABLED,
        });
      }

      // Update last login (non-blocking)
      updateLastLogin(user.id).catch(console.error);

      // Determine redirect URL based on role
      const redirectUrl = getDefaultRedirectUrl(user.role, organizationId);

      // Prepare session data
      const sessionData = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token || undefined,
        expiresAt: new Date(session.expires_at! * 1000).getTime(),
        expiresIn: session.expires_in,
        tokenType: session.token_type || 'bearer',
      };

      // Prepare response data
      const responseData = {
        user,
        session: sessionData,
        redirectUrl,
        message: `안녕하세요, ${user.name}님! 로그인되었습니다.`,
      };

      // Validate response
      const responseValidation = LoginSuccessSchema.safeParse({
        success: true,
        data: responseData,
      });

      if (!responseValidation.success) {
        console.error('Response validation failed:', responseValidation.error);
        return createErrorResponse({
          code: 'INTERNAL_ERROR',
          message: AUTH_ERROR_MESSAGES.INTERNAL_ERROR,
        });
      }

      // Set session cookies if remember me is enabled
      const response = createSuccessResponse(responseData);
      
      if (rememberMe) {
        // Set longer-lasting cookie for remember me functionality
        response.cookies.set('remember_token', session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/',
        });
      }

      return response;

    } catch (authError: any) {
      console.error('Authentication error:', authError);
      
      // Handle specific Supabase auth errors
      let errorCode: keyof typeof AUTH_ERROR_CODES = 'INVALID_CREDENTIALS';
      let errorMessage = AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;

      if (authError.message) {
        const message = authError.message.toLowerCase();
        
        if (message.includes('email not confirmed')) {
          errorCode = 'EMAIL_NOT_CONFIRMED';
          errorMessage = AUTH_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED;
        } else if (message.includes('invalid login credentials')) {
          errorCode = 'INVALID_CREDENTIALS';
          errorMessage = AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
        } else if (message.includes('too many requests') || message.includes('rate limit')) {
          errorCode = 'TOO_MANY_REQUESTS';
          errorMessage = AUTH_ERROR_MESSAGES.TOO_MANY_REQUESTS;
        } else if (message.includes('signups not allowed')) {
          errorCode = 'ACCOUNT_DISABLED';
          errorMessage = '현재 새로운 가입이 제한되어 있습니다';
        }
      }

      return createErrorResponse({
        code: errorCode,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? authError.message : undefined,
      }, errorCode === 'TOO_MANY_REQUESTS' ? 429 : 401);
    }

  } catch (error: any) {
    console.error('Login error:', error);
    
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: AUTH_ERROR_MESSAGES.INTERNAL_ERROR,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, 500);
  }
}

/**
 * OPTIONS /api/auth/login
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}