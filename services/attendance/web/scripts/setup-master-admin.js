/**
 * Master Admin Setup Script
 * Creates the master admin user step by step
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const masterAdmin = {
  email: 'archt723@gmail.com',
  password: 'MasterAdmin123!',
  name: 'Master Administrator'
}

async function setupMasterAdmin() {
  console.log('🚀 Setting up master admin user...')
  
  try {
    // Step 1: Create organization first
    console.log('📋 Step 1: Creating default organization...')
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Default Organization',
        type: 'company', 
        settings: {},
        is_active: true
      })
      .select()
      .single()
    
    let organizationId = null
    if (orgError) {
      console.log('❌ Organization creation failed:', orgError.message)
      console.log('🔍 Checking if organization already exists...')
      
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)
        .single()
      
      if (existingOrg) {
        organizationId = existingOrg.id
        console.log('✅ Using existing organization:', organizationId)
      } else {
        console.log('❌ No organizations found and cannot create one')
        return false
      }
    } else {
      organizationId = orgData.id
      console.log('✅ Organization created:', organizationId)
    }
    
    // Step 2: Try different auth approaches
    console.log('\\n🔐 Step 2: Creating auth user...')
    
    // Method 1: Try with the expected email
    const authResult1 = await supabase.auth.signUp({
      email: masterAdmin.email,
      password: masterAdmin.password,
      options: {
        data: {
          name: masterAdmin.name,
          full_name: masterAdmin.name
        }
      }
    })
    
    console.log('Auth method 1 result:', {
      user: authResult1.data?.user?.id,
      error: authResult1.error?.message
    })
    
    let authUserId = authResult1.data?.user?.id
    
    // Method 2: Try with a different email format if first failed
    if (!authUserId && authResult1.error?.message.includes('invalid')) {
      console.log('\\n🔄 Trying alternative email format...')
      
      const altEmail = 'admin@dotproject.local'
      const authResult2 = await supabase.auth.signUp({
        email: altEmail,
        password: masterAdmin.password,
        options: {
          data: {
            name: masterAdmin.name,
            full_name: masterAdmin.name,
            original_email: masterAdmin.email
          }
        }
      })
      
      console.log('Auth method 2 result:', {
        user: authResult2.data?.user?.id,
        error: authResult2.error?.message
      })
      
      if (authResult2.data?.user?.id) {
        authUserId = authResult2.data.user.id
        masterAdmin.email = altEmail // Update for employee record
      }
    }
    
    // Step 3: Create employee record regardless
    console.log('\\n👤 Step 3: Creating employee record...')
    
    const employeeData = {
      organization_id: organizationId,
      name: masterAdmin.name,
      email: masterAdmin.email,
      role: 'MASTER_ADMIN',
      approval_status: 'APPROVED',
      is_active: true
    }
    
    // Add auth_user_id if we have it
    if (authUserId) {
      employeeData.auth_user_id = authUserId
    }
    
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single()
    
    if (empError) {
      console.log('❌ Employee creation failed:', empError.message)
      console.log('📋 Trying with different field names...')
      
      // Try alternative field names
      const altEmployeeData = {
        organization_id: organizationId,
        name: masterAdmin.name,
        email: masterAdmin.email,
        position: 'MASTER_ADMIN', // Try 'position' instead of 'role'
        is_active: true
      }
      
      if (authUserId) {
        altEmployeeData.user_id = authUserId // Try 'user_id' instead of 'auth_user_id'
      }
      
      const { data: empData2, error: empError2 } = await supabase
        .from('employees')
        .insert(altEmployeeData)
        .select()
        .single()
      
      if (empError2) {
        console.log('❌ Alternative employee creation also failed:', empError2.message)
        return false
      } else {
        console.log('✅ Employee created with alternative fields')
        console.log('Employee ID:', empData2.id)
      }
    } else {
      console.log('✅ Employee created successfully')
      console.log('Employee ID:', empData.id)
    }
    
    console.log('\\n🎉 Master admin setup completed!')
    console.log('📧 Email:', masterAdmin.email)
    console.log('🏢 Organization ID:', organizationId)
    console.log('👤 Auth User ID:', authUserId || 'not created')
    
    return true
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    return false
  }
}

async function testLogin() {
  console.log('\\n🧪 Testing login with created user...')
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: masterAdmin.email,
      password: masterAdmin.password
    })
    
    console.log('Login test result:', {
      success: !!data.user,
      user: data.user?.email,
      error: error?.message
    })
    
    if (data.user) {
      console.log('✅ Login successful!')
      
      // Check employee record
      const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('email', data.user.email)
        .single()
      
      console.log('Employee record found:', !!employee)
      if (employee) {
        console.log('Employee role/position:', employee.role || employee.position)
      }
      
      // Sign out
      await supabase.auth.signOut()
    }
    
  } catch (err) {
    console.log('❌ Login test failed:', err.message)
  }
}

async function main() {
  const success = await setupMasterAdmin()
  
  if (success) {
    await testLogin()
  }
  
  console.log('\\n🏁 Setup process completed')
}

main().catch(console.error)