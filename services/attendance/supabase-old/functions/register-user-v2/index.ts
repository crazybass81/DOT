import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

// =====================================================
// Schema Definitions
// =====================================================

const RegistrationStartSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^[0-9-]+$/),
  fullName: z.string().min(2).max(255),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  registrationType: z.enum(['personal', 'business_owner', 'corporation_founder', 'franchise_founder']),
})

const AgeVerificationSchema = z.object({
  flowId: z.string().uuid(),
  verificationType: z.enum(['nice_api', 'parent_consent', 'document']),
  verificationData: z.object({
    token: z.string().optional(),
    parentPhone: z.string().optional(),
    parentName: z.string().optional(),
    documentUrl: z.string().optional(),
  }),
})

const BusinessVerificationSchema = z.object({
  flowId: z.string().uuid(),
  businessNumber: z.string().regex(/^\d{3}-\d{2}-\d{5}$/),
  businessName: z.string().min(1).max(255),
  representativeName: z.string().optional(),
})

const RoleSelectionSchema = z.object({
  flowId: z.string().uuid(),
  roleType: z.enum(['worker', 'admin', 'manager', 'franchise_staff']),
  organizationCode: z.string().optional(),
  createOrganization: z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['personal_business', 'corporation', 'franchise_hq']),
    businessNumber: z.string().optional(),
  }).optional(),
})

const RegistrationCompleteSchema = z.object({
  flowId: z.string().uuid(),
  password: z.string().min(8).max(255),
})

// =====================================================
// Helper Functions
// =====================================================

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

async function verifyWithNiceAPI(data: any): Promise<boolean> {
  // TODO: Implement actual NICE API call
  // This is a mock implementation
  console.log('Verifying with NICE API:', data)
  return true
}

async function verifyBusinessWithNTS(businessNumber: string): Promise<any> {
  // TODO: Implement actual NTS API call
  // This is a mock implementation
  console.log('Verifying business with NTS:', businessNumber)
  return {
    isValid: true,
    businessName: 'Test Business',
    representativeName: 'Test Representative',
  }
}

async function sendParentConsentSMS(parentPhone: string, childName: string): Promise<void> {
  // TODO: Implement actual SMS sending
  console.log(`Sending parent consent SMS to ${parentPhone} for ${childName}`)
}

function generateSessionId(): string {
  return `REG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function generateOrgCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// =====================================================
// Main Handler
// =====================================================

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    switch (path) {
      // =====================================================
      // Start Registration Flow
      // =====================================================
      case 'start': {
        const body = await req.json()
        const validated = RegistrationStartSchema.parse(body)
        
        // Calculate age
        const age = calculateAge(validated.birthDate)
        
        // Check age restrictions
        if (age < 15) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Registration requires minimum age of 15' 
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        
        // Check if account already exists
        const { data: existingAccount } = await supabase
          .from('personal_accounts')
          .select('id')
          .or(`email.eq.${validated.email},phone.eq.${validated.phone}`)
          .single()
        
        if (existingAccount) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Account already exists with this email or phone' 
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        
        // Create registration flow
        const sessionId = generateSessionId()
        const requiresParentConsent = age < 18
        
        const { data: flow, error: flowError } = await supabase
          .from('registration_flows')
          .insert({
            session_id: sessionId,
            email: validated.email,
            flow_type: 'new_user',
            current_step: requiresParentConsent ? 'parent_consent' : 'age_verification',
            flow_data: {
              ...validated,
              age,
              requiresParentConsent,
            },
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent'),
          })
          .select()
          .single()
        
        if (flowError) throw flowError
        
        return new Response(
          JSON.stringify({
            success: true,
            flowId: flow.id,
            sessionId: flow.session_id,
            requiresAgeVerification: true,
            requiresParentConsent,
            nextStep: flow.current_step,
          }),
          { 
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      // =====================================================
      // Age Verification
      // =====================================================
      case 'verify-age': {
        const body = await req.json()
        const validated = AgeVerificationSchema.parse(body)
        
        // Get flow
        const { data: flow, error: flowError } = await supabase
          .from('registration_flows')
          .select('*')
          .eq('id', validated.flowId)
          .single()
        
        if (flowError || !flow) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid flow ID' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        
        let isVerified = false
        let verificationData = {}
        
        // Process verification based on type
        switch (validated.verificationType) {
          case 'nice_api':
            isVerified = await verifyWithNiceAPI(validated.verificationData)
            verificationData = { method: 'nice_api', verified: true }
            break
            
          case 'parent_consent':
            if (!validated.verificationData.parentPhone || !validated.verificationData.parentName) {
              throw new Error('Parent phone and name required')
            }
            await sendParentConsentSMS(
              validated.verificationData.parentPhone,
              flow.flow_data.fullName
            )
            verificationData = {
              parentPhone: validated.verificationData.parentPhone,
              parentName: validated.verificationData.parentName,
              consentRequested: true,
            }
            isVerified = true // Will be verified via separate consent flow
            break
            
          case 'document':
            // Manual verification process
            verificationData = {
              documentUrl: validated.verificationData.documentUrl,
              pending: true,
            }
            break
        }
        
        // Create verification record
        await supabase
          .from('age_verifications')
          .insert({
            account_id: null, // Will be linked after account creation
            verification_type: validated.verificationType,
            request_data: validated.verificationData,
            response_data: verificationData,
            is_verified: isVerified,
            verified_at: isVerified ? new Date().toISOString() : null,
          })
        
        // Update flow
        const nextStep = flow.flow_data.registrationType === 'business_owner' 
          ? 'business_verification' 
          : 'role_selection'
        
        await supabase
          .from('registration_flows')
          .update({
            current_step: nextStep,
            completed_steps: [...(flow.completed_steps || []), 'age_verification'],
            flow_data: {
              ...flow.flow_data,
              ageVerified: isVerified,
              verificationMethod: validated.verificationType,
            },
          })
          .eq('id', validated.flowId)
        
        return new Response(
          JSON.stringify({
            success: true,
            verified: isVerified,
            nextStep,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      // =====================================================
      // Business Verification
      // =====================================================
      case 'verify-business': {
        const body = await req.json()
        const validated = BusinessVerificationSchema.parse(body)
        
        // Get flow
        const { data: flow } = await supabase
          .from('registration_flows')
          .select('*')
          .eq('id', validated.flowId)
          .single()
        
        if (!flow) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid flow ID' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        
        // Verify business with NTS
        const businessData = await verifyBusinessWithNTS(validated.businessNumber)
        
        if (!businessData.isValid) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Business verification failed' 
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        
        // Update flow
        await supabase
          .from('registration_flows')
          .update({
            current_step: 'complete_registration',
            completed_steps: [...(flow.completed_steps || []), 'business_verification'],
            flow_data: {
              ...flow.flow_data,
              businessVerified: true,
              businessNumber: validated.businessNumber,
              businessName: validated.businessName,
            },
          })
          .eq('id', validated.flowId)
        
        return new Response(
          JSON.stringify({
            success: true,
            verified: true,
            businessData,
            nextStep: 'complete_registration',
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      // =====================================================
      // Role Selection
      // =====================================================
      case 'select-role': {
        const body = await req.json()
        const validated = RoleSelectionSchema.parse(body)
        
        // Get flow
        const { data: flow } = await supabase
          .from('registration_flows')
          .select('*')
          .eq('id', validated.flowId)
          .single()
        
        if (!flow) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid flow ID' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        
        let organizationId = null
        let organizationCode = validated.organizationCode
        
        // Handle organization creation or joining
        if (validated.createOrganization) {
          // Generate unique org code
          organizationCode = generateOrgCode()
          
          // Will create organization after account creation
          flow.flow_data.createOrganization = {
            ...validated.createOrganization,
            code: organizationCode,
          }
        } else if (validated.organizationCode) {
          // Verify organization exists
          const { data: org } = await supabase
            .from('organizations_v2')
            .select('id')
            .eq('code', validated.organizationCode)
            .single()
          
          if (!org) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Organization not found' 
              }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            )
          }
          
          organizationId = org.id
        }
        
        // Update flow
        await supabase
          .from('registration_flows')
          .update({
            current_step: 'complete_registration',
            completed_steps: [...(flow.completed_steps || []), 'role_selection'],
            flow_data: {
              ...flow.flow_data,
              roleType: validated.roleType,
              organizationId,
              organizationCode,
            },
          })
          .eq('id', validated.flowId)
        
        return new Response(
          JSON.stringify({
            success: true,
            roleSelected: validated.roleType,
            organizationCode,
            nextStep: 'complete_registration',
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      // =====================================================
      // Complete Registration
      // =====================================================
      case 'complete': {
        const body = await req.json()
        const validated = RegistrationCompleteSchema.parse(body)
        
        // Get flow
        const { data: flow } = await supabase
          .from('registration_flows')
          .select('*')
          .eq('id', validated.flowId)
          .single()
        
        if (!flow || flow.is_completed) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Invalid or completed flow' 
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(validated.password)
        
        // Start transaction-like operations
        try {
          // 1. Create Supabase Auth user
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: flow.flow_data.email,
            password: validated.password,
            email_confirm: true,
            user_metadata: {
              full_name: flow.flow_data.fullName,
              phone: flow.flow_data.phone,
            },
          })
          
          if (authError) throw authError
          
          // 2. Create personal account
          const { data: account, error: accountError } = await supabase
            .from('personal_accounts')
            .insert({
              auth_user_id: authUser.user.id,
              email: flow.flow_data.email,
              phone: flow.flow_data.phone,
              full_name: flow.flow_data.fullName,
              birth_date: flow.flow_data.birthDate,
              age_verified_at: flow.flow_data.ageVerified ? new Date().toISOString() : null,
              age_verification_method: flow.flow_data.verificationMethod,
              parent_consent: flow.flow_data.parentConsent,
              is_verified: flow.flow_data.ageVerified,
            })
            .select()
            .single()
          
          if (accountError) throw accountError
          
          // 3. Create organization if needed
          let organizationId = flow.flow_data.organizationId
          
          if (flow.flow_data.createOrganization) {
            const { data: org, error: orgError } = await supabase
              .from('organizations_v2')
              .insert({
                code: flow.flow_data.createOrganization.code,
                name: flow.flow_data.createOrganization.name,
                type: flow.flow_data.createOrganization.type,
                business_number: flow.flow_data.businessNumber,
                business_verified_at: flow.flow_data.businessVerified 
                  ? new Date().toISOString() 
                  : null,
                owner_account_id: account.id,
              })
              .select()
              .single()
            
            if (orgError) throw orgError
            organizationId = org.id
            
            // Create business verification record
            if (flow.flow_data.businessNumber) {
              await supabase
                .from('business_verifications')
                .insert({
                  organization_id: org.id,
                  business_number: flow.flow_data.businessNumber,
                  business_name: flow.flow_data.businessName,
                  verification_method: 'nts_api',
                  verification_status: 'verified',
                  is_verified: true,
                  verified_at: new Date().toISOString(),
                })
            }
          }
          
          // 4. Create user role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              account_id: account.id,
              organization_id: organizationId,
              role: flow.flow_data.roleType || 'worker',
              is_primary: true,
            })
          
          if (roleError) throw roleError
          
          // 5. Create employment contract if admin of own organization
          if (flow.flow_data.roleType === 'admin' && flow.flow_data.createOrganization) {
            await supabase
              .from('employment_contracts')
              .insert({
                employee_id: account.id,
                organization_id: organizationId,
                position: 'Administrator',
                employment_type: 'full_time',
                start_date: new Date().toISOString().split('T')[0],
                wage_type: 'monthly',
                wage_amount: 0, // To be set later
                work_hours_per_week: 40,
                status: 'active',
                signed_at: new Date().toISOString(),
              })
          }
          
          // 6. Complete flow
          await supabase
            .from('registration_flows')
            .update({
              account_id: account.id,
              is_completed: true,
              completed_at: new Date().toISOString(),
              completed_steps: [...(flow.completed_steps || []), 'complete_registration'],
            })
            .eq('id', validated.flowId)
          
          // 7. Log registration
          await supabase
            .from('registration_audit_logs')
            .insert({
              account_id: account.id,
              session_id: flow.session_id,
              action: 'registration_completed',
              action_category: 'registration',
              action_data: {
                email: flow.flow_data.email,
                roleType: flow.flow_data.roleType,
                organizationId,
              },
              ip_address: req.headers.get('x-forwarded-for'),
              user_agent: req.headers.get('user-agent'),
            })
          
          // Generate session
          const { data: session, error: sessionError } = await supabase.auth.admin
            .generateLink({
              type: 'magiclink',
              email: flow.flow_data.email,
            })
          
          return new Response(
            JSON.stringify({
              success: true,
              accountId: account.id,
              authUserId: authUser.user.id,
              organizationCode: flow.flow_data.organizationCode,
              role: flow.flow_data.roleType,
              message: 'Registration completed successfully',
            }),
            { 
              status: 201,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
          
        } catch (error) {
          // Rollback-like behavior: log the error
          await supabase
            .from('registration_audit_logs')
            .insert({
              session_id: flow.session_id,
              action: 'registration_failed',
              action_category: 'registration',
              action_data: { error: error.message },
              success: false,
              error_message: error.message,
            })
          
          throw error
        }
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
    }
    
  } catch (error) {
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})