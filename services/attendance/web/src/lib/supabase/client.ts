/**
 * TDD Phase 2: GREEN - Minimal Supabase Client Implementation
 * Type-safe Supabase client for both browser and server environments
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

// Type-safe Supabase client
export type TypedSupabaseClient = SupabaseClient<Database>;

// Get environment variables with fallback for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

// Singleton client instance for browser
let browserClient: TypedSupabaseClient | null = null;

/**
 * Get Supabase client for browser environment
 * Uses singleton pattern to reuse the same client instance
 */
export function getSupabaseClient(): TypedSupabaseClient {
  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'DOT Attendance System'
        }
      }
    });
  }
  
  return browserClient;
}

/**
 * Get Supabase client for server environment with service role
 * Creates new instance for each request to avoid session leakage
 */
export async function getSupabaseServerClient(): Promise<TypedSupabaseClient> {
  // Check if running on server
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseServerClient should only be called on the server');
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Use service role key if available, otherwise fall back to anon key
  const authKey = serviceRoleKey || supabaseAnonKey;
  
  const serverClient = createClient<Database>(supabaseUrl, authKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'DOT Attendance System Server'
      }
    }
  });

  return serverClient;
}

/**
 * Get Supabase client with custom configuration
 * Useful for testing and special cases
 */
export function createCustomClient(
  url?: string,
  key?: string,
  options?: any
): TypedSupabaseClient {
  return createClient<Database>(
    url || supabaseUrl,
    key || supabaseAnonKey,
    options || {}
  );
}

/**
 * Test helper to reset the singleton client
 * Should only be used in tests
 */
export function resetBrowserClient(): void {
  browserClient = null;
}

// Export the default client for backward compatibility
export const supabase = getSupabaseClient();