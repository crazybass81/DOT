import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTEwMzAzNSwiZXhwIjoyMDUwNjc5MDM1fQ.3l7OW2fgPxUKJLx4xPFLWo89BFmE7dhCXnbmCfnp0IY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTables() {
  try {
    console.log('Creating database tables...')
    
    // Create organizations table
    const { error: orgError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          biz_number VARCHAR(20),
          biz_address TEXT,
          representative_name VARCHAR(100),
          establish_date DATE,
          subscription_tier VARCHAR(50) DEFAULT 'basic',
          settings JSONB DEFAULT '{}',
          max_employees INTEGER DEFAULT 50,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    if (orgError) {
      console.log('Organizations table might already exist or exec_sql not available')
    }

    // Create employees table
    const { error: empError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS employees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_code VARCHAR(50),
          name VARCHAR(200) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(20),
          birth_date DATE,
          department VARCHAR(100),
          position VARCHAR(100),
          manager_id UUID REFERENCES employees(id),
          hire_date DATE,
          emergency_contact JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    if (empError) {
      console.log('Employees table might already exist')
    }

    // Create user_roles table
    const { error: rolesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL DEFAULT 'worker',
          assigned_at TIMESTAMPTZ DEFAULT NOW(),
          assigned_by UUID REFERENCES auth.users(id),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, organization_id, role)
        );
      `
    })
    
    if (rolesError) {
      console.log('User_roles table might already exist')
    }

    // Create contracts table  
    const { error: contractError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS contracts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          contract_type VARCHAR(50),
          position VARCHAR(100),
          wage_type VARCHAR(20),
          wage_amount DECIMAL(15,2),
          work_start_time TIME,
          work_end_time TIME,
          work_days INTEGER[],
          lunch_break INTEGER,
          annual_leave INTEGER,
          start_date DATE,
          end_date DATE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    if (contractError) {
      console.log('Contracts table might already exist')
    }

    console.log('Tables creation completed!')
    
  } catch (error) {
    console.error('Error creating tables:', error)
  }
}

// Run the function
createTables()