/**
 * Supabase Client Configuration for ID-ROLE-PAPER System
 * Centralized client setup with authentication and database connectivity
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Environment variables with fallback for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL is not set. Using default value.');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Using default value.');
}

// Create Supabase client with TypeScript database types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'id-role-paper-system'
    }
  }
});

// Authentication helper functions
export const auth = {
  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  /**
   * Sign up new user
   */
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    return { data, error };
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get current session
   */
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  /**
   * Get current user
   */
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }
};

// Database helper functions with RLS (Row Level Security) support
export const db = {
  /**
   * Get records with automatic organization filtering
   */
  from: (table: keyof Database['public']['Tables']) => {
    return supabase.from(table);
  },

  /**
   * Execute RPC (Remote Procedure Call) functions
   */
  rpc: (fn: keyof Database['public']['Functions'], args?: any) => {
    return supabase.rpc(fn, args);
  }
};

// Real-time subscription helpers
export const realtime = {
  /**
   * Subscribe to table changes with organization filtering
   */
  subscribe: (table: keyof Database['public']['Tables'], callback: (payload: any) => void) => {
    return supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table as string 
        }, 
        callback
      )
      .subscribe();
  },

  /**
   * Unsubscribe from channel
   */
  unsubscribe: (channel: any) => {
    return supabase.removeChannel(channel);
  }
};

// Storage helpers for file uploads
export const storage = {
  /**
   * Upload file to storage bucket
   */
  upload: async (bucket: string, path: string, file: File) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    return { data, error };
  },

  /**
   * Get public URL for stored file
   */
  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Delete file from storage
   */
  remove: async (bucket: string, paths: string[]) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(paths);
    return { data, error };
  }
};

// Connection health check
export const healthCheck = async () => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase health check failed:', error);
      return { healthy: false, error };
    }
    
    return { healthy: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('Supabase connection error:', error);
    return { healthy: false, error };
  }
};

export default supabase;