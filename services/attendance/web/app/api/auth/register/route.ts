/**
 * Individual User Registration API Endpoint
 * Production-ready registration with Supabase auth and unified identity integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthService } from '@/src/services/supabase-auth.service';
import { supabase } from '@/src/lib/supabase-config';
import { 
  RegistrationRequestSchema, 
  RegistrationSuccessSchema,
  type RegistrationRequest 
} from '@/src/schemas/registration.schema';
import { z } from 'zod';
import crypto from 'crypto';

// Error codes for registration
export const REGISTRATION_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  AUTH_CREATION_FAILED: 'AUTH_CREATION_FAILED',
  IDENTITY_CREATION_FAILED: 'IDENTITY_CREATION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

interface RegistrationError {
  code: keyof typeof REGISTRATION_ERROR_CODES;
  message: string;
  details?: any;
}

/**
 * Create a standardized error response
 */
function createErrorResponse(error: RegistrationError, status = 400): NextResponse {
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
 * Create a standardized success response
 */
function createSuccessResponse(data: any, message: string, status = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
  }, { status });
}

/**
 * Check if email is already in use
 */
async function checkEmailExists(email: string): Promise<boolean> {
  if (!email) return false;
  
  try {
    // Check in unified_identities table
    const { data, error } = await supabase
      .from('unified_identities')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error('Error checking email existence:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false;
  }
}

/**
 * Check if phone number is already in use
 */
async function checkPhoneExists(phone: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('unified_identities')
      .select('id')
      .eq('phone', phone)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error('Error checking phone existence:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking phone existence:', error);
    return false;
  }
}

/**
 * Generate a unique email for phone-only registration
 */
function generateEmailFromPhone(phone: string): string {
  const hash = crypto.createHash('md5').update(phone).digest('hex').substring(0, 8);
  return `${phone}_${hash}@temp.dotattendance.com`;
}

/**
 * Create unified identity record
 */
async function createUnifiedIdentity(
  authUserId: string,
  data: RegistrationRequest
): Promise<{ id: string; email: string } | null> {
  try {
    const email = data.email || generateEmailFromPhone(data.phone);
    
    const identityData = {
      auth_user_id: authUserId,
      email: email.toLowerCase(),
      full_name: data.name,
      phone: data.phone,
      id_type: 'personal' as const,
      is_verified: false,
      is_active: true,
      business_verification_status: 'verified', // Personal identities are auto-verified
      profile_data: {
        birth_date: data.birthDate,
        account_number: data.accountNumber || null,
        registered_via: 'web_form',
        qr_context: data.qrContext || null,
        registration_timestamp: new Date().toISOString(),
      },
    };

    const { data: identity, error } = await supabase
      .from('unified_identities')
      .insert(identityData)
      .select('id, email')
      .single();

    if (error) {
      console.error('Error creating unified identity:', error);
      return null;
    }

    return identity;
  } catch (error) {
    console.error('Error creating unified identity:', error);
    return null;
  }
}

/**
 * Assign default worker role to new user
 */
async function assignDefaultRole(identityId: string, organizationId?: string): Promise<boolean> {
  try {
    const roleData = {
      identity_id: identityId,
      organization_id: organizationId || null,
      role: 'worker' as const,
      is_active: true,
      is_primary: true,
      assigned_at: new Date().toISOString(),
      custom_permissions: {},
    };

    const { error } = await supabase
      .from('role_assignments')
      .insert(roleData);

    if (error) {
      console.error('Error assigning default role:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error assigning default role:', error);
    return false;
  }
}

/**
 * POST /api/auth/register
 * Register a new individual user
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    const validation = RegistrationRequestSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: '입력 데이터가 올바르지 않습니다',
        details: validation.error.errors.reduce((acc, err) => ({
          ...acc,
          [err.path.join('.')]: err.message,
        }), {}),
      });
    }

    const data = validation.data;

    // Check for existing email (if provided)
    if (data.email && await checkEmailExists(data.email)) {
      return createErrorResponse({
        code: 'EMAIL_ALREADY_EXISTS',
        message: '이미 사용중인 이메일입니다',
      });
    }

    // Check for existing phone number
    if (await checkPhoneExists(data.phone)) {
      return createErrorResponse({
        code: 'PHONE_ALREADY_EXISTS',
        message: '이미 사용중인 휴대폰 번호입니다',
      });
    }

    // Generate email if not provided
    const email = data.email || generateEmailFromPhone(data.phone);

    try {
      // Create Supabase auth user
      const authResult = await supabaseAuthService.signUp(
        email,
        data.password,
        { name: data.name }
      );

      if (!authResult.user) {
        return createErrorResponse({
          code: 'AUTH_CREATION_FAILED',
          message: '계정 생성에 실패했습니다',
        });
      }

      // Create unified identity
      const identity = await createUnifiedIdentity(authResult.user.id, data);
      
      if (!identity) {
        // Try to clean up auth user (though this might not be possible)
        try {
          await supabaseAuthService.signOut();
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        
        return createErrorResponse({
          code: 'IDENTITY_CREATION_FAILED',
          message: '사용자 정보 생성에 실패했습니다',
        });
      }

      // Assign default worker role (non-blocking)
      assignDefaultRole(identity.id, data.qrContext?.organizationId).catch((error) => {
        console.error('Failed to assign default role (non-blocking):', error);
      });

      // Prepare response data
      const responseData = {
        userId: authResult.user.id,
        email: identity.email,
        requiresVerification: authResult.needsVerification,
        verificationMethod: authResult.needsVerification 
          ? (data.email ? 'email' : 'phone') as 'email' | 'phone'
          : 'none' as const,
      };

      // Validate response data
      const responseValidation = RegistrationSuccessSchema.safeParse({
        success: true,
        data: responseData,
        message: '회원가입이 완료되었습니다',
      });

      if (!responseValidation.success) {
        console.error('Response validation failed:', responseValidation.error);
        return createErrorResponse({
          code: 'INTERNAL_ERROR',
          message: '응답 데이터 생성 중 오류가 발생했습니다',
        });
      }

      return createSuccessResponse(
        responseData,
        authResult.needsVerification 
          ? '회원가입이 완료되었습니다. 이메일 인증을 완료해주세요.' 
          : '회원가입이 완료되었습니다',
        201
      );

    } catch (authError: any) {
      console.error('Supabase auth error:', authError);
      
      // Handle specific Supabase auth errors
      let errorMessage = '계정 생성 중 오류가 발생했습니다';
      if (authError.message?.includes('email')) {
        errorMessage = '이메일 관련 오류가 발생했습니다';
      } else if (authError.message?.includes('password')) {
        errorMessage = '비밀번호 조건을 확인해주세요';
      } else if (authError.message?.includes('rate limit')) {
        errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요';
      }

      return createErrorResponse({
        code: 'AUTH_CREATION_FAILED',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? authError.message : undefined,
      });
    }

  } catch (error: any) {
    console.error('Registration error:', error);
    
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, 500);
  }
}

/**
 * OPTIONS /api/auth/register
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