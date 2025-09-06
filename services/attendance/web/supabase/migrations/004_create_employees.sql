-- Create employees table
-- Employees are linked to Supabase Auth users and belong to organizations

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_number VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  
  -- Personal information
  birth_date DATE,
  gender VARCHAR(10),
  nationality VARCHAR(50),
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  
  -- Employment information
  hire_date DATE,
  resignation_date DATE,
  
  -- Profile
  profile_image_url TEXT,
  bio TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  
  -- Metadata
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT employees_email_org_unique UNIQUE (organization_id, email),
  CONSTRAINT employees_number_org_unique UNIQUE (organization_id, employee_number),
  CONSTRAINT employees_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT employees_phone_valid CHECK (phone IS NULL OR phone ~ '^[0-9-]+$'),
  CONSTRAINT employees_emergency_phone_valid CHECK (emergency_contact_phone IS NULL OR emergency_contact_phone ~ '^[0-9-]+$'),
  CONSTRAINT employees_gender_valid CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER'))
);

-- Create indexes
CREATE INDEX idx_employees_auth_user_id ON employees(auth_user_id);
CREATE INDEX idx_employees_organization_id ON employees(organization_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_employee_number ON employees(employee_number);
CREATE INDEX idx_employees_is_active ON employees(is_active);
CREATE INDEX idx_employees_hire_date ON employees(hire_date);
CREATE INDEX idx_employees_deleted_at ON employees(deleted_at) WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON TABLE employees IS 'Employee records linked to Supabase Auth users';
COMMENT ON COLUMN employees.auth_user_id IS 'Reference to Supabase Auth user';
COMMENT ON COLUMN employees.employee_number IS 'Organization-specific employee number';
COMMENT ON COLUMN employees.settings IS 'JSON object for employee-specific settings';

-- Create trigger for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create employee after auth user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create employee if metadata contains organization_id
  IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
    INSERT INTO employees (
      auth_user_id,
      organization_id,
      email,
      name,
      employee_number,
      email_verified
    ) VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'organization_id')::UUID,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'employee_number', 'TEMP-' || substring(NEW.id::text, 1, 8)),
      NEW.email_confirmed_at IS NOT NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create employee on auth user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE employees
  SET last_login_at = NOW()
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy for employees to view their own record
CREATE POLICY "Employees can view their own record"
  ON employees
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Policy for viewing employees in same organization
CREATE POLICY "Users can view employees in their organization"
  ON employees
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM employees 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Policy for admins to manage employees
CREATE POLICY "Admins can manage employees"
  ON employees
  FOR ALL
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      JOIN user_roles ur ON e.id = ur.employee_id
      WHERE e.auth_user_id = auth.uid()
        AND ur.role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER')
    )
  );

-- Policy for employees to update their own profile
CREATE POLICY "Employees can update their own profile"
  ON employees
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    -- Can only update certain fields
    auth_user_id = auth.uid() AND
    organization_id = (SELECT organization_id FROM employees WHERE auth_user_id = auth.uid())
  );