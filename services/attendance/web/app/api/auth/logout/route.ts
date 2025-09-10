/**
 * Logout API Endpoint
 * Production-ready logout with session cleanup and security measures
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthService } from '@/src/services/supabase-auth.service';
import { LogoutResponseSchema } from '@/src/schemas/auth.schema';

/**
 * Create standardized response
 */
function createResponse(success: boolean, message: string, status = 200): NextResponse {
  const responseData = { success, message };
  
  // Validate response structure
  const validation = LogoutResponseSchema.safeParse(responseData);
  if (!validation.success) {
    console.error('Logout response validation failed:', validation.error);
    return NextResponse.json({
      success: false,
      message: '로그아웃 처리 중 오류가 발생했습니다',
    }, { status: 500 });
  }

  const response = NextResponse.json(responseData, { status });
  
  // Clear all authentication-related cookies
  const cookiesToClear = [
    'remember_token',
    'sb-access-token',
    'sb-refresh-token',
    'auth-token',
    'session-token',
  ];

  cookiesToClear.forEach(cookieName => {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  });

  return response;
}

/**
 * POST /api/auth/logout
 * Sign out user and cleanup session
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user to verify authentication
    const currentUser = await supabaseAuthService.getCurrentUser();
    
    if (!currentUser) {
      // User not authenticated, but still return success for idempotency
      return createResponse(true, '이미 로그아웃되었습니다');
    }

    try {
      // Sign out from Supabase
      await supabaseAuthService.signOut();
      
      console.log(`User ${currentUser.email} logged out successfully`);
      
      return createResponse(true, '성공적으로 로그아웃되었습니다');

    } catch (signOutError: any) {
      console.error('Supabase sign out error:', signOutError);
      
      // Even if Supabase sign out fails, we should clear client-side state
      // This handles network issues or server-side problems gracefully
      return createResponse(true, '로그아웃이 완료되었습니다');
    }

  } catch (error: any) {
    console.error('Logout error:', error);
    
    // Return success even on errors to prevent logout failures from trapping users
    return createResponse(true, '로그아웃이 완료되었습니다');
  }
}

/**
 * GET /api/auth/logout
 * Alternative logout endpoint for GET requests (browser navigation)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

/**
 * OPTIONS /api/auth/logout
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}