import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// Use hardcoded values as fallback for client-side
export const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database types
export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          auth_user_id: string | null;
          organization_id: string;
          branch_id: string | null;
          department_id: string | null;
          position_id: string | null;
          employee_code: string | null;
          name: string;
          email: string;
          phone: string | null;
          password_hash: string | null;
          device_id: string | null;
          qr_registered_device_id: string | null;
          fcm_token: string | null;
          approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
          approved_by: string | null;
          approved_at: string | null;
          rejected_by: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
          is_master_admin: boolean;
          is_active: boolean;
          avatar_url: string | null;
          date_of_birth: string | null;
          join_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
      };
    };
  };
}

export type Employee = Database['public']['Tables']['employees']['Row'];