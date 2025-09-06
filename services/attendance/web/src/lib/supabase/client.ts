/**
 * TDD Phase 3: REFACTOR - Production-Ready Supabase Client
 * Type-safe Supabase client with environment-specific configuration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
import { config, validateConfig, SupabaseConfig } from './config';

// Type-safe Supabase client
export type TypedSupabaseClient = SupabaseClient<Database>;

// Singleton client instance for browser
let browserClient: TypedSupabaseClient | null = null;

// Validate configuration on module load
if (!validateConfig(config)) {
  console.warn('Invalid Supabase configuration detected');
}

/**
 * Get Supabase client for browser environment
 * Uses singleton pattern to reuse the same client instance
 */
export function getSupabaseClient(): TypedSupabaseClient {
  if (!browserClient) {
    const clientConfig = {
      ...config.supabase.options,
      auth: {
        ...config.supabase.options?.auth,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      }
    };
    
    browserClient = createClient<Database>(
      config.supabase.url,
      config.supabase.anonKey,
      clientConfig
    );
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
  
  // Use service role key if available, otherwise fall back to anon key
  const authKey = config.supabase.serviceRoleKey || config.supabase.anonKey;
  
  const serverConfig = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    db: {
      schema: config.supabase.options?.db?.schema || 'public'
    },
    global: {
      headers: {
        'x-application-name': `DOT Attendance Server (${config.name})`
      }
    }
  };
  
  const serverClient = createClient<Database>(
    config.supabase.url,
    authKey,
    serverConfig
  );

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