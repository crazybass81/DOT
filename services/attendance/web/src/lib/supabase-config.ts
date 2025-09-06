import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// Use hardcoded values as fallback for client-side
export const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

// Re-export createClient for use in services
export { createClient };

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

// Database types for unified schema
export interface Database {
  public: {
    Tables: {
      unified_identities: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string;
          phone: string | null;
          id_type: 'personal' | 'corporate';
          auth_user_id: string | null;
          is_active: boolean;
          metadata: Record<string, any>;
          last_login: string | null;
          login_count: number;
        };
        Insert: Omit<Database['public']['Tables']['unified_identities']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['unified_identities']['Insert']>;
      };
      organizations_v3: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          description: string | null;
          type: 'company' | 'franchise' | 'department' | 'branch';
          parent_organization_id: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          settings: Record<string, any>;
          business_hours: Record<string, any>;
          location: Record<string, any> | null;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['organizations_v3']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations_v3']['Insert']>;
      };
      role_assignments: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          identity_id: string;
          organization_id: string | null;
          role: 'master' | 'admin' | 'manager' | 'worker' | 'franchise_admin';
          assigned_by: string | null;
          assigned_at: string;
          revoked_by: string | null;
          revoked_at: string | null;
          is_active: boolean;
          custom_permissions: Record<string, any>;
          employee_code: string | null;
          department: string | null;
          position: string | null;
        };
        Insert: Omit<Database['public']['Tables']['role_assignments']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['role_assignments']['Insert']>;
      };
      attendance_records: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          employee_id: string;
          business_id: string;
          check_in_time: string | null;
          check_out_time: string | null;
          work_date: string | null;
          check_in_location: Record<string, any> | null;
          check_out_location: Record<string, any> | null;
          verification_method: 'gps' | 'qr' | 'manual';
          status: 'active' | 'completed' | 'cancelled' | 'pending';
          notes: string | null;
          break_time_minutes: number;
          overtime_minutes: number;
        };
        Insert: Omit<Database['public']['Tables']['attendance_records']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['attendance_records']['Insert']>;
      };
    };
    Views: {
      user_roles_view: {
        Row: {
          user_id: string;
          email: string;
          full_name: string;
          auth_user_id: string | null;
          role_assignment_id: string | null;
          role: string | null;
          organization_id: string | null;
          organization_name: string | null;
          organization_type: string | null;
          role_active: boolean | null;
          assigned_at: string | null;
          employee_code: string | null;
          department: string | null;
          position: string | null;
        };
      };
      active_employees: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          auth_user_id: string | null;
          role: string;
          organization_id: string;
          employee_code: string | null;
          department: string | null;
          position: string | null;
          organization_name: string;
        };
      };
    };
  };
}

export type UnifiedIdentity = Database['public']['Tables']['unified_identities']['Row'];
export type OrganizationV3 = Database['public']['Tables']['organizations_v3']['Row'];
export type RoleAssignment = Database['public']['Tables']['role_assignments']['Row'];
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];