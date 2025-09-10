/**
 * Password Reset API Endpoint
 * Production-ready password reset functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthService } from '@/src/services/supabase-auth.service';
import { PasswordResetRequestSchema, PasswordResetResponseSchema } from '@/src/schemas/auth.schema';

/**
 * Create standardized response
 */
function createResponse(success: boolean, message: string, status = 200): NextResponse {
  const responseData = { success, message };
  
  // Validate response structure
  const validation = PasswordResetResponseSchema.safeParse(responseData);
  if (!validation.success) {
    console.error('Password reset response validation failed:', validation.error);
    return NextResponse.json({
      success: false,
      message: '비밀번호 재설정 요청 처리 중 오류가 발생했습니다',
    }, { status: 500 });
  }

  return NextResponse.json(responseData, { status });
}

/**
 * POST /api/auth/reset-password
 * Send password reset email
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    const validation = PasswordResetRequestSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return createResponse(false, firstError.message, 400);
    }

    const { email } = validation.data;

    try {
      // Send password reset email using Supabase
      await supabaseAuthService.resetPassword(email);
      
      // Always return success for security (don't reveal if email exists)
      return createResponse(
        true, 
        `${email}로 비밀번호 재설정 링크를 전송했습니다. 이메일을 확인해주세요.`
      );

    } catch (resetError: any) {
      console.error('Password reset error:', resetError);
      
      // Handle specific errors but don't reveal too much information
      let message = '비밀번호 재설정 요청에 실패했습니다';
      
      if (resetError.message) {
        const errorMsg = resetError.message.toLowerCase();
        
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
          message = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요';
          return createResponse(false, message, 429);
        }
      }
      
      // For security, always return success even if email doesn't exist
      return createResponse(
        true, 
        `${email}로 비밀번호 재설정 링크를 전송했습니다. 이메일을 확인해주세요.`
      );
    }

  } catch (error: any) {
    console.error('Password reset request error:', error);
    
    return createResponse(
      false,
      '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
      500
    );
  }
}

/**
 * OPTIONS /api/auth/reset-password
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