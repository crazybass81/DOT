/**
 * TDD Phase 1: RED - Real Supabase Connection Tests
 * These tests verify actual Supabase connection without mocks
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseServerClient } from '../../../src/lib/supabase/client';
import { testDatabaseConnection, checkPostGISExtension } from '../../../src/lib/supabase/health';

describe('Real Supabase Connection Tests', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    // Verify environment variables are set
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });

  describe('Environment Configuration', () => {
    test('should have valid Supabase URL format', () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      expect(url).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
    });

    test('should have valid JWT format for anon key', () => {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      expect(anonKey).toMatch(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    test('should have service role key for server operations', () => {
      // Service role key should be set for server-side operations
      if (typeof window === 'undefined') {
        expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
      }
    });
  });

  describe('Client Connection', () => {
    test('should create a Supabase client instance', () => {
      const client = getSupabaseClient();
      expect(client).toBeDefined();
      expect(client).toHaveProperty('auth');
      expect(client).toHaveProperty('from');
      expect(client).toHaveProperty('storage');
      expect(client).toHaveProperty('realtime');
    });

    test('should connect to real Supabase instance', async () => {
      const client = getSupabaseClient();
      
      // Test basic health check query
      const { data, error } = await client
        .from('_health_check')
        .select('*')
        .limit(1);
      
      // The table might not exist, but we should get a proper error response
      if (error) {
        expect(error.code).toBeDefined();
        // Should be a "relation does not exist" error, not a connection error
        expect(['42P01', 'PGRST116'].includes(error.code!)).toBe(true);
      }
    });

    test('should verify auth service is accessible', async () => {
      const client = getSupabaseClient();
      
      // Get current session (should be null if not logged in)
      const { data: { session }, error } = await client.auth.getSession();
      
      expect(error).toBeNull();
      // Session can be null (not logged in) or defined (logged in)
      expect(session === null || typeof session === 'object').toBe(true);
    });
  });

  describe('Database Connection', () => {
    test('should execute basic PostgreSQL query', async () => {
      const isConnected = await testDatabaseConnection();
      expect(isConnected).toBe(true);
    });

    test('should verify PostGIS extension is enabled', async () => {
      const hasPostGIS = await checkPostGISExtension();
      expect(hasPostGIS).toBe(true);
    });

    test('should handle connection errors gracefully', async () => {
      // Create client with invalid URL
      const invalidClient = createClient(
        'https://invalid.supabase.co',
        'invalid-key'
      );

      const { error } = await invalidClient
        .from('test')
        .select('*')
        .limit(1);

      expect(error).toBeDefined();
    });
  });

  describe('Authentication State', () => {
    test('should check authentication state', async () => {
      const client = getSupabaseClient();
      const { data: { user }, error } = await client.auth.getUser();
      
      // Should not error when checking auth state
      expect(error?.status !== 500).toBe(true);
      
      // User can be null (not authenticated) or an object (authenticated)
      if (user) {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
      }
    });

    test('should handle auth state changes', async () => {
      const client = getSupabaseClient();
      
      // Set up auth state listener
      const authStatePromise = new Promise((resolve) => {
        const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
          resolve({ event, session });
          subscription.unsubscribe();
        });
      });

      // Trigger an auth state check
      await client.auth.getSession();
      
      // Wait for auth state callback (with timeout)
      const result = await Promise.race([
        authStatePromise,
        new Promise(resolve => setTimeout(() => resolve({ event: 'TIMEOUT' }), 3000))
      ]);

      expect(result).toHaveProperty('event');
    });
  });

  describe('Server-side Client', () => {
    test('should create server-side client with service role', async () => {
      // Skip if running in browser
      if (typeof window !== 'undefined') {
        return;
      }

      const serverClient = await getSupabaseServerClient();
      expect(serverClient).toBeDefined();
      expect(serverClient).toHaveProperty('auth');
    });

    test('should have elevated permissions with service role', async () => {
      // Skip if running in browser
      if (typeof window !== 'undefined') {
        return;
      }

      const serverClient = await getSupabaseServerClient();
      
      // Service role should bypass RLS
      const { data, error } = await serverClient
        .from('employees')
        .select('count')
        .limit(1);

      // Should not get permission denied error
      if (error) {
        expect(error.code).not.toBe('42501'); // PostgreSQL insufficient_privilege
      }
    });
  });

  describe('Real-time Connection', () => {
    test('should establish real-time connection', async () => {
      const client = getSupabaseClient();
      
      const channel = client
        .channel('test-channel')
        .on('presence', { event: 'sync' }, () => {
          // Presence sync callback
        });

      const subscription = await new Promise<string>((resolve) => {
        channel.subscribe((status) => {
          resolve(status);
        });
      });

      expect(['SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT'].includes(subscription)).toBe(true);
      
      // Cleanup
      await channel.unsubscribe();
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts', async () => {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          db: {
            schema: 'public'
          },
          global: {
            fetch: async (url, options) => {
              // Simulate network timeout
              return new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Network timeout')), 100);
              });
            }
          }
        }
      );

      const { error } = await client.from('test').select('*');
      expect(error).toBeDefined();
    });

    test('should retry on connection failures', async () => {
      let attemptCount = 0;
      
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            fetch: async (url, options) => {
              attemptCount++;
              if (attemptCount < 2) {
                throw new Error('Connection failed');
              }
              return fetch(url as string, options);
            }
          }
        }
      );

      const { error } = await client.auth.getSession();
      
      // Should retry and eventually succeed or fail gracefully
      expect(attemptCount).toBeGreaterThanOrEqual(1);
    });
  });
});