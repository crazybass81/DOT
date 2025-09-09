/**
 * Database Type Definitions for Supabase
 * Generated types for the ID-ROLE-PAPER system database schema
 */

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          type: 'restaurant' | 'franchise' | 'corporate';
          created_at: string;
          updated_at: string;
          settings: Json;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'restaurant' | 'franchise' | 'corporate';
          created_at?: string;
          updated_at?: string;
          settings?: Json;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'restaurant' | 'franchise' | 'corporate';
          created_at?: string;
          updated_at?: string;
          settings?: Json;
          is_active?: boolean;
        };
      };
      identities: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          identity_type: 'personal' | 'corporate';
          full_name: string;
          personal_info: Json | null;
          corporate_info: Json | null;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          identity_type: 'personal' | 'corporate';
          full_name: string;
          personal_info?: Json | null;
          corporate_info?: Json | null;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          identity_type?: 'personal' | 'corporate';
          full_name?: string;
          personal_info?: Json | null;
          corporate_info?: Json | null;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
      };
      businesses: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          business_type: 'individual' | 'corporate';
          business_number: string;
          owner_identity_id: string;
          address: string;
          phone: string;
          email: string | null;
          verification_status: 'pending' | 'verified' | 'rejected';
          verification_documents: Json | null;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          business_type: 'individual' | 'corporate';
          business_number: string;
          owner_identity_id: string;
          address: string;
          phone: string;
          email?: string | null;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verification_documents?: Json | null;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          business_type?: 'individual' | 'corporate';
          business_number?: string;
          owner_identity_id?: string;
          address?: string;
          phone?: string;
          email?: string | null;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verification_documents?: Json | null;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
      };
      papers: {
        Row: {
          id: string;
          organization_id: string;
          business_id: string;
          paper_type: 'BUSINESS_REGISTRATION' | 'TAX_REGISTRATION' | 'EMPLOYMENT_INSURANCE' | 'INDUSTRIAL_ACCIDENT_INSURANCE' | 'HEALTH_INSURANCE' | 'PENSION_INSURANCE';
          title: string;
          document_number: string | null;
          issued_by: string | null;
          issued_date: string | null;
          valid_from: string;
          valid_until: string;
          is_valid: boolean;
          document_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          business_id: string;
          paper_type: 'BUSINESS_REGISTRATION' | 'TAX_REGISTRATION' | 'EMPLOYMENT_INSURANCE' | 'INDUSTRIAL_ACCIDENT_INSURANCE' | 'HEALTH_INSURANCE' | 'PENSION_INSURANCE';
          title: string;
          document_number?: string | null;
          issued_by?: string | null;
          issued_date?: string | null;
          valid_from: string;
          valid_until: string;
          is_valid?: boolean;
          document_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          business_id?: string;
          paper_type?: 'BUSINESS_REGISTRATION' | 'TAX_REGISTRATION' | 'EMPLOYMENT_INSURANCE' | 'INDUSTRIAL_ACCIDENT_INSURANCE' | 'HEALTH_INSURANCE' | 'PENSION_INSURANCE';
          title?: string;
          document_number?: string | null;
          issued_by?: string | null;
          issued_date?: string | null;
          valid_from?: string;
          valid_until?: string;
          is_valid?: boolean;
          document_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          organization_id: string;
          identity_id: string;
          role_type: 'SEEKER' | 'WORKER' | 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'FRANCHISEE' | 'FRANCHISOR';
          business_id: string | null;
          granted_by: string;
          granted_at: string;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          identity_id: string;
          role_type: 'SEEKER' | 'WORKER' | 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'FRANCHISEE' | 'FRANCHISOR';
          business_id?: string | null;
          granted_by: string;
          granted_at: string;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          identity_id?: string;
          role_type?: 'SEEKER' | 'WORKER' | 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'FRANCHISEE' | 'FRANCHISOR';
          business_id?: string | null;
          granted_by?: string;
          granted_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          organization_id: string;
          role_type: 'SEEKER' | 'WORKER' | 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'FRANCHISEE' | 'FRANCHISOR';
          resource: string;
          action: string;
          conditions: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          role_type: 'SEEKER' | 'WORKER' | 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'FRANCHISEE' | 'FRANCHISOR';
          resource: string;
          action: string;
          conditions?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          role_type?: 'SEEKER' | 'WORKER' | 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'FRANCHISEE' | 'FRANCHISOR';
          resource?: string;
          action?: string;
          conditions?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_permission: {
        Args: {
          user_id: string;
          resource: string;
          action: string;
          business_id?: string;
        };
        Returns: boolean;
      };
      get_user_roles: {
        Args: {
          user_id: string;
          business_id?: string;
        };
        Returns: Array<{
          role_type: string;
          business_id: string | null;
          business_name: string | null;
        }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// JSON type for flexible data structures
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];