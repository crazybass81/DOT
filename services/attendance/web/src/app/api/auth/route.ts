/**
 * Authentication API Endpoints
 * Handles login/logout and session management for ID-ROLE-PAPER system
 * 
 * @route GET /api/auth - Get current session info
 * @route POST /api/auth/login - User login with identity context
 * @route POST /api/auth/logout - User logout and session cleanup
 * @route POST /api/auth/refresh - Refresh authentication token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createIdentityService } from '../../../lib/services/identity-service';
import { createPermissionService } from '../../../lib/services/permission-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/auth - Get current authentication session and identity context
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required', authenticated: false },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token', authenticated: false },
        { status: 401 }
      );
    }

    // Get identity context for the authenticated user
    const identityService = createIdentityService(supabase);
    const identityResult = await identityService.searchIdentities({
      emailPattern: user.email,
      limit: 1,
      isActive: true
    });

    if (!identityResult.success || !identityResult.data || identityResult.data.length === 0) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        identity: null,
        message: 'User authenticated but no identity found'
      });
    }

    const identity = identityResult.data[0];
    
    // Get full identity context with roles
    const contextResult = await identityService.getIdentityWithContext(identity.id);
    if (!contextResult.success) {
      return NextResponse.json(
        { error: 'Failed to load identity context' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      identity: contextResult.data,
      session: {
        expires_at: user.user_metadata?.exp,
        token_type: 'Bearer'
      }
    });

  } catch (error) {
    console.error('Auth session check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/login - Authenticate user and return session with identity context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const { user, session } = authData;
    if (!user || !session) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get identity context for the authenticated user
    const identityService = createIdentityService(supabase);
    const identityResult = await identityService.searchIdentities({
      emailPattern: user.email,
      limit: 1,
      isActive: true
    });

    let identityContext = null;
    if (identityResult.success && identityResult.data && identityResult.data.length > 0) {
      const identity = identityResult.data[0];
      const contextResult = await identityService.getIdentityWithContext(identity.id);
      if (contextResult.success) {
        identityContext = contextResult.data;
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      identity: identityContext,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        token_type: session.token_type
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/logout - Logout user and cleanup session
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Sign out from Supabase
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('Logout error:', signOutError);
      // Continue even if sign out fails to ensure client cleanup
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/refresh - Refresh authentication token
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Refresh token with Supabase
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (refreshError || !refreshData.session || !refreshData.user) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const { user, session } = refreshData;

    // Get updated identity context
    const identityService = createIdentityService(supabase);
    const identityResult = await identityService.searchIdentities({
      emailPattern: user.email,
      limit: 1,
      isActive: true
    });

    let identityContext = null;
    if (identityResult.success && identityResult.data && identityResult.data.length > 0) {
      const identity = identityResult.data[0];
      const contextResult = await identityService.getIdentityWithContext(identity.id);
      if (contextResult.success) {
        identityContext = contextResult.data;
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      identity: identityContext,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        token_type: session.token_type
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
