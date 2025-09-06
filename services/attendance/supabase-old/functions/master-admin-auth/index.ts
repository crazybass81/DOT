// master-admin-auth/index.ts
// Master Admin Authentication and Authorization

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import * as jwt from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  isMasterAdmin: boolean;
  organizationId: string;
  permissions: string[];
  exp: number;
  iat: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    switch (path) {
      case 'login':
        return await handleMasterAdminLogin(req, supabase);
      case 'verify':
        return await verifyMasterAdminToken(req, supabase);
      case 'refresh':
        return await refreshMasterAdminToken(req, supabase);
      case 'logout':
        return await handleMasterAdminLogout(req, supabase);
      case 'permissions':
        return await getMasterAdminPermissions(req, supabase);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleMasterAdminLogin(req: Request, supabase: any) {
  const { email, password, twoFactorCode }: LoginRequest = await req.json();

  // Validate input
  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email and password required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user exists and is master admin
  const { data: employee, error: fetchError } = await supabase
    .from('employees')
    .select(`
      *,
      organization:organizations(id, name, code),
      employee_permissions(
        permission:master_admin_permissions(
          id,
          code,
          name,
          category
        )
      )
    `)
    .eq('email', email)
    .eq('is_master_admin', true)
    .eq('approval_status', 'APPROVED')
    .single();

  if (fetchError || !employee) {
    // Log failed attempt
    await logSecurityEvent(supabase, null, 'LOGIN_FAILED', { email });
    return new Response(
      JSON.stringify({ error: 'Invalid credentials or insufficient permissions' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if account is locked
  if (employee.account_locked_until && new Date(employee.account_locked_until) > new Date()) {
    return new Response(
      JSON.stringify({ 
        error: 'Account is locked',
        lockedUntil: employee.account_locked_until 
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify password (if using custom auth)
  // For Supabase Auth, this would be handled differently
  const passwordValid = await bcrypt.compare(password, employee.password_hash || '');
  
  if (!passwordValid) {
    // Increment failed attempts
    await supabase
      .from('employees')
      .update({ 
        failed_login_attempts: (employee.failed_login_attempts || 0) + 1,
        // Lock account after 5 failed attempts
        account_locked_until: employee.failed_login_attempts >= 4 
          ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
          : null
      })
      .eq('id', employee.id);

    await logSecurityEvent(supabase, employee.id, 'LOGIN_FAILED', { reason: 'Invalid password' });
    
    return new Response(
      JSON.stringify({ error: 'Invalid credentials' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check 2FA if enabled
  if (employee.two_factor_enabled) {
    if (!twoFactorCode) {
      return new Response(
        JSON.stringify({ 
          error: 'Two-factor authentication required',
          requiresTwoFactor: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify 2FA code (simplified - in production use proper TOTP)
    const validCode = await verify2FACode(employee.id, twoFactorCode, supabase);
    if (!validCode) {
      await logSecurityEvent(supabase, employee.id, 'TWO_FACTOR_FAILED', {});
      return new Response(
        JSON.stringify({ error: 'Invalid two-factor code' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Extract permissions
  const permissions = employee.employee_permissions?.map((ep: any) => ep.permission.code) || [];

  // Generate JWT token
  const secret = new TextEncoder().encode(Deno.env.get('JWT_SECRET') || 'your-secret-key');
  const tokenPayload: TokenPayload = {
    sub: employee.id,
    email: employee.email,
    role: employee.role,
    isMasterAdmin: true,
    organizationId: employee.organization_id,
    permissions,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    iat: Math.floor(Date.now() / 1000),
  };

  const token = await jwt.create({ alg: "HS256", typ: "JWT" }, tokenPayload, secret);

  // Create session
  const { data: session } = await supabase
    .from('master_admin_sessions')
    .insert({
      employee_id: employee.id,
      token_hash: await hashToken(token),
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
      expires_at: new Date(tokenPayload.exp * 1000).toISOString(),
    })
    .select()
    .single();

  // Update last login
  await supabase
    .from('employees')
    .update({
      last_login_at: new Date().toISOString(),
      login_count: (employee.login_count || 0) + 1,
      failed_login_attempts: 0,
      account_locked_until: null,
    })
    .eq('id', employee.id);

  // Log successful login
  await logSecurityEvent(supabase, employee.id, 'LOGIN_SUCCESS', {
    sessionId: session?.id,
  });

  // Create audit log
  await createAuditLog(supabase, {
    actor_id: employee.id,
    action: 'MASTER_ADMIN_LOGIN',
    resource_type: 'session',
    resource_id: session?.id,
    details: {
      organizationId: employee.organization_id,
      permissions: permissions.length,
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      token,
      sessionId: session?.id,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        organizationId: employee.organization_id,
        organizationName: employee.organization?.name,
        permissions,
      },
      expiresAt: new Date(tokenPayload.exp * 1000).toISOString(),
    }),
    { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Set-Cookie': `master_admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`,
      } 
    }
  );
}

async function verifyMasterAdminToken(req: Request, supabase: any) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'No token provided' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const secret = new TextEncoder().encode(Deno.env.get('JWT_SECRET') || 'your-secret-key');
    const payload = await jwt.verify(token, secret) as TokenPayload;

    // Verify session is still active
    const tokenHash = await hashToken(token);
    const { data: session } = await supabase
      .from('master_admin_sessions')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .single();

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last activity
    await supabase
      .from('master_admin_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id);

    return new Response(
      JSON.stringify({
        valid: true,
        payload,
        sessionId: session.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid token', details: error.message }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function refreshMasterAdminToken(req: Request, supabase: any) {
  const { refreshToken } = await req.json();

  if (!refreshToken) {
    return new Response(
      JSON.stringify({ error: 'Refresh token required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Implementation for refresh token logic
  // This would validate the refresh token and issue a new access token
  
  return new Response(
    JSON.stringify({ message: 'Token refresh not implemented yet' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleMasterAdminLogout(req: Request, supabase: any) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'No token provided' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const tokenHash = await hashToken(token);
    
    // Deactivate session
    const { data: session } = await supabase
      .from('master_admin_sessions')
      .update({ 
        is_active: false,
        ended_at: new Date().toISOString(),
      })
      .eq('token_hash', tokenHash)
      .select()
      .single();

    if (session) {
      // Log logout
      await logSecurityEvent(supabase, session.employee_id, 'LOGOUT', {
        sessionId: session.id,
      });

      // Create audit log
      await createAuditLog(supabase, {
        actor_id: session.employee_id,
        action: 'MASTER_ADMIN_LOGOUT',
        resource_type: 'session',
        resource_id: session.id,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Logged out successfully' }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Set-Cookie': 'master_admin_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Logout failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getMasterAdminPermissions(req: Request, supabase: any) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'No token provided' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const secret = new TextEncoder().encode(Deno.env.get('JWT_SECRET') || 'your-secret-key');
    const payload = await jwt.verify(token, secret) as TokenPayload;

    // Get detailed permissions
    const { data: permissions } = await supabase
      .from('employee_permissions')
      .select(`
        permission:master_admin_permissions(
          id,
          code,
          name,
          description,
          category,
          parent_id,
          delegation_level,
          requires_2fa,
          restrictions
        ),
        granted_at,
        granted_by,
        expires_at,
        is_delegated
      `)
      .eq('employee_id', payload.sub)
      .eq('is_active', true);

    // Organize permissions by category
    const categorizedPermissions = permissions?.reduce((acc: any, item: any) => {
      const category = item.permission.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push({
        ...item.permission,
        grantedAt: item.granted_at,
        expiresAt: item.expires_at,
        isDelegated: item.is_delegated,
      });
      return acc;
    }, {}) || {};

    return new Response(
      JSON.stringify({
        success: true,
        permissions: categorizedPermissions,
        totalPermissions: permissions?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch permissions', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper functions
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verify2FACode(employeeId: string, code: string, supabase: any): Promise<boolean> {
  // Simplified 2FA verification - in production use proper TOTP library
  // This is just checking against a stored code for demo purposes
  const { data } = await supabase
    .from('two_factor_codes')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('code', code)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (data) {
    // Mark code as used
    await supabase
      .from('two_factor_codes')
      .update({ used: true })
      .eq('id', data.id);
    return true;
  }

  return false;
}

async function logSecurityEvent(supabase: any, employeeId: string | null, eventType: string, details: any) {
  try {
    await supabase
      .from('security_events')
      .insert({
        employee_id: employeeId,
        event_type: eventType,
        details,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

async function createAuditLog(supabase: any, data: any) {
  try {
    const auditData = {
      ...data,
      created_at: new Date().toISOString(),
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      risk_level: data.risk_level || 'low',
    };

    // Generate checksum
    const checksum = await generateChecksum(auditData);
    
    await supabase
      .from('master_admin_audit_log')
      .insert({
        ...auditData,
        checksum,
      });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

async function generateChecksum(data: any): Promise<string> {
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data);
  const dataBuffer = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}