-- Create organizations table
-- This is the top-level entity for multi-tenant architecture

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  business_number VARCHAR(50) NOT NULL,
  type organization_type NOT NULL DEFAULT 'COMPANY',
  representative_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  employee_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT organizations_business_number_unique UNIQUE (business_number),
  CONSTRAINT organizations_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT organizations_phone_valid CHECK (phone ~ '^[0-9-]+$'),
  CONSTRAINT organizations_employee_count_positive CHECK (employee_count >= 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX idx_organizations_business_number ON organizations(business_number);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Top-level entity for multi-tenant architecture';
COMMENT ON COLUMN organizations.id IS 'Unique identifier for the organization';
COMMENT ON COLUMN organizations.business_number IS 'Government-issued business registration number';
COMMENT ON COLUMN organizations.type IS 'Type of organization (MASTER_ADMIN, COMPANY, FRANCHISE, INDIVIDUAL)';
COMMENT ON COLUMN organizations.settings IS 'JSON object for organization-specific settings';
COMMENT ON COLUMN organizations.deleted_at IS 'Soft delete timestamp';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy for viewing organizations (users can see their own org)
CREATE POLICY "Users can view their own organization"
  ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM employees 
      WHERE auth_user_id = auth.uid()
    )
    OR type = 'MASTER_ADMIN'
  );

-- Policy for updating organizations (only admins)
CREATE POLICY "Admins can update their organization"
  ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM employees e
      JOIN user_roles ur ON e.id = ur.employee_id
      WHERE e.auth_user_id = auth.uid()
        AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Policy for inserting organizations (only super admins)
CREATE POLICY "Super admins can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM employees e
      JOIN user_roles ur ON e.id = ur.employee_id
      WHERE e.auth_user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
    )
  );