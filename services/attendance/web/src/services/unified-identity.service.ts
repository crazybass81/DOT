/**
 * Unified Identity Service - Real Data Implementation
 * Working service for unified_identities table with proper error handling
 */

import { createClient } from '@supabase/supabase-js'
import { UnifiedIdentity, IdType } from '../types/unified.types'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface CreateUnifiedIdentityRequest {
  email: string
  full_name: string
  phone?: string
  birth_date?: string
  id_type?: IdType
  id_number?: string
  auth_user_id?: string
  business_verification_data?: any
  profile_data?: any
}

export interface UnifiedIdentityResponse {
  success: boolean
  identity?: UnifiedIdentity
  error?: string
}

export class UnifiedIdentityService {
  /**
   * Create a new unified identity
   */
  async createIdentity(data: CreateUnifiedIdentityRequest): Promise<UnifiedIdentityResponse> {
    try {
      console.log('🔧 Creating unified identity:', data.email)

      // Validate required fields
      if (!data.email || !data.full_name) {
        return { success: false, error: 'Email and full name are required' }
      }

      // Prepare identity data
      const identityData = {
        email: data.email.toLowerCase().trim(),
        full_name: data.full_name.trim(),
        phone: data.phone?.trim() || null,
        birth_date: data.birth_date || null,
        id_type: data.id_type || 'personal',
        id_number: data.id_number?.trim() || null,
        business_verification_status: 'pending',
        business_verification_data: data.business_verification_data || {},
        auth_user_id: data.auth_user_id || null,
        is_verified: false,
        is_active: true,
        profile_data: data.profile_data || {}
      }

      console.log('📝 Identity data prepared:', { 
        email: identityData.email, 
        id_type: identityData.id_type 
      })

      // Insert identity using direct supabase client
      const { data: identity, error } = await supabase
        .from('unified_identities')
        .insert(identityData)
        .select()
        .single()

      if (error) {
        console.error('❌ Identity creation error:', error)
        
        // Handle specific error cases
        if (error.code === '23505') {
          return { success: false, error: 'Email already exists' }
        }
        
        if (error.message.includes('RLS')) {
          return { success: false, error: 'Access restricted by security policy' }
        }

        return { success: false, error: `Database error: ${error.message}` }
      }

      if (!identity) {
        return { success: false, error: 'No identity data returned' }
      }

      console.log('✅ Identity created successfully:', identity.id)

      return {
        success: true,
        identity: identity as UnifiedIdentity
      }

    } catch (error: any) {
      console.error('💥 Create identity exception:', error.message)
      return { success: false, error: `System error: ${error.message}` }
    }
  }

  /**
   * Get identity by email
   */
  async getByEmail(email: string): Promise<UnifiedIdentity | null> {
    try {
      if (!email) {
        return null
      }

      console.log('🔍 Looking up identity by email:', email)

      const { data: identity, error } = await supabase
        .from('unified_identities')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('❌ Get by email error:', error)
        
        // Return null for access restrictions instead of throwing
        if (error.message.includes('RLS') || error.code === 'PGRST116') {
          console.log('🔒 Access restricted by RLS policy')
          return null
        }
        
        return null
      }

      if (identity) {
        console.log('✅ Identity found:', identity.id)
      } else {
        console.log('❌ No identity found for email:', email)
      }

      return identity as UnifiedIdentity | null
    } catch (error: any) {
      console.error('💥 Get by email exception:', error.message)
      return null
    }
  }

  /**
   * Get identity by auth user ID
   */
  async getByAuthUserId(authUserId: string): Promise<UnifiedIdentity | null> {
    try {
      if (!authUserId) {
        return null
      }

      console.log('🔍 Looking up identity by auth user ID:', authUserId)

      const { data: identity, error } = await supabase
        .from('unified_identities')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('❌ Get by auth user ID error:', error)
        
        if (error.message.includes('RLS') || error.code === 'PGRST116') {
          console.log('🔒 Access restricted by RLS policy')
          return null
        }
        
        return null
      }

      if (identity) {
        console.log('✅ Identity found for auth user:', identity.id)
      } else {
        console.log('❌ No identity found for auth user:', authUserId)
      }

      return identity as UnifiedIdentity | null
    } catch (error: any) {
      console.error('💥 Get by auth user ID exception:', error.message)
      return null
    }
  }

  /**
   * Get identity by ID
   */
  async getById(id: string): Promise<UnifiedIdentity | null> {
    try {
      if (!id) {
        return null
      }

      console.log('🔍 Looking up identity by ID:', id)

      const { data: identity, error } = await supabase
        .from('unified_identities')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('❌ Get by ID error:', error)
        
        if (error.message.includes('RLS') || error.code === 'PGRST116') {
          console.log('🔒 Access restricted by RLS policy')
          return null
        }
        
        return null
      }

      if (identity) {
        console.log('✅ Identity found:', identity.id)
      } else {
        console.log('❌ No identity found for ID:', id)
      }

      return identity as UnifiedIdentity | null
    } catch (error: any) {
      console.error('💥 Get by ID exception:', error.message)
      return null
    }
  }

  /**
   * Update identity verification status
   */
  async updateVerificationStatus(
    id: string, 
    status: 'pending' | 'verified' | 'rejected',
    verificationData?: any
  ): Promise<UnifiedIdentityResponse> {
    try {
      if (!id) {
        return { success: false, error: 'Identity ID is required' }
      }

      console.log('🔧 Updating verification status:', { id, status })

      const updateData: any = {
        business_verification_status: status,
        is_verified: status === 'verified',
        updated_at: new Date().toISOString()
      }

      if (verificationData) {
        updateData.business_verification_data = verificationData
      }

      const { data: identity, error } = await supabase
        .from('unified_identities')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Update verification status error:', error)
        
        if (error.message.includes('RLS')) {
          return { success: false, error: 'Access restricted by security policy' }
        }

        return { success: false, error: `Update failed: ${error.message}` }
      }

      if (!identity) {
        return { success: false, error: 'Identity not found or no access' }
      }

      console.log('✅ Verification status updated successfully')

      return {
        success: true,
        identity: identity as UnifiedIdentity
      }

    } catch (error: any) {
      console.error('💥 Update verification status exception:', error.message)
      return { success: false, error: `System error: ${error.message}` }
    }
  }

  /**
   * Create identity for auth user (auto-creation during signup)
   */
  async createForAuthUser(
    authUserId: string, 
    userData: {
      email: string
      full_name?: string
      phone?: string
      id_type?: IdType
    }
  ): Promise<UnifiedIdentityResponse> {
    try {
      console.log('🚀 Auto-creating identity for auth user:', authUserId)

      const identityData: CreateUnifiedIdentityRequest = {
        auth_user_id: authUserId,
        email: userData.email,
        full_name: userData.full_name || userData.email.split('@')[0],
        phone: userData.phone,
        id_type: userData.id_type || 'personal'
      }

      const result = await this.createIdentity(identityData)
      
      if (result.success) {
        console.log('✅ Identity auto-created for auth user')
      } else {
        console.error('❌ Failed to auto-create identity:', result.error)
      }

      return result
    } catch (error: any) {
      console.error('💥 Auto-create identity exception:', error.message)
      return { success: false, error: `System error: ${error.message}` }
    }
  }

  /**
   * Test database connectivity
   */
  async testConnectivity(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 Testing database connectivity...')

      // Test simple query to check table access
      const { data, error } = await supabase
        .from('unified_identities')
        .select('count')
        .limit(1)

      if (error) {
        console.error('❌ Connectivity test failed:', error)
        
        if (error.message.includes('does not exist')) {
          return { success: false, error: 'Table does not exist' }
        }
        
        if (error.message.includes('RLS')) {
          return { success: true } // RLS is working, table exists
        }

        return { success: false, error: error.message }
      }

      console.log('✅ Database connectivity test passed')
      return { success: true }

    } catch (error: any) {
      console.error('💥 Connectivity test exception:', error.message)
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
// Export both class and instance for flexibility
export const unifiedIdentityService = new UnifiedIdentityService()

// Default export for class
export default UnifiedIdentityService