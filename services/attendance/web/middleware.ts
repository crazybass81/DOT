import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for middleware
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/attendance',
  '/admin'
];

// Admin-only routes
const adminRoutes = [
  '/admin'
];

// Routes that don't require approval (public routes)
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/approval-pending',
  '/auth'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files, API routes, and _next
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if the route requires protection
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  const isAdminRoute = adminRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get the session token from cookies
  const sessionToken = request.cookies.get('sb-mljyiuzetchtjudbcfvd-auth-token');
  
  if (!sessionToken) {
    // No session, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(sessionToken.value);
    
    if (userError || !user) {
      // Invalid session, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get employee data to check approval status
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('approval_status, role, is_master_admin, is_active')
      .eq('auth_user_id', user.id)
      .single();

    if (employeeError || !employee) {
      // No employee record, redirect to registration
      return NextResponse.redirect(new URL('/register', request.url));
    }

    // Check if user is trying to access admin routes
    if (isAdminRoute) {
      const canAccessAdmin = employee.is_master_admin || 
                            employee.role === 'ADMIN' || 
                            employee.role === 'MASTER_ADMIN';
      
      if (!canAccessAdmin) {
        // Not authorized for admin access, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Check approval status for non-admin routes
    if (!isAdminRoute) {
      if (employee.approval_status === 'PENDING') {
        // User is pending approval, redirect to approval pending page
        return NextResponse.redirect(new URL('/approval-pending', request.url));
      }

      if (employee.approval_status === 'REJECTED') {
        // User was rejected, redirect to approval pending page to see status
        return NextResponse.redirect(new URL('/approval-pending', request.url));
      }

      if (employee.approval_status !== 'APPROVED' || !employee.is_active) {
        // User is not approved or not active, redirect to approval pending
        return NextResponse.redirect(new URL('/approval-pending', request.url));
      }
    }

    // User is approved or is accessing admin routes with proper permissions
    return NextResponse.next();

  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login for safety
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};