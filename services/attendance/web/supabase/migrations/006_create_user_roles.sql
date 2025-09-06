-- Create user_roles table
-- Manages role-based access control for employees within organizations

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  
  -- Role scope (optional branch restriction)
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  
  -- Permissions (JSON array of permission strings)
  permissions JSONB DEFAULT '[]',
  
  -- Role details
  assigned_by UUID REFERENCES employees(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_roles_unique_employee_org_role UNIQUE (employee_id, organization_id, role),
  CONSTRAINT user_roles_expires_valid CHECK (expires_at IS NULL OR expires_at > assigned_at)
);

-- Create indexes
CREATE INDEX idx_user_roles_employee_id ON user_roles(employee_id);
CREATE INDEX idx_user_roles_organization_id ON user_roles(organization_id);
CREATE INDEX idx_user_roles_branch_id ON user_roles(branch_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at);

-- Add comments
COMMENT ON TABLE user_roles IS 'Role-based access control for employees';
COMMENT ON COLUMN user_roles.role IS 'User role (SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE)';
COMMENT ON COLUMN user_roles.branch_id IS 'Optional branch restriction for the role';
COMMENT ON COLUMN user_roles.permissions IS 'JSON array of specific permission strings';

-- Create trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(
  emp_id UUID,
  required_role user_role,
  org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE employee_id = emp_id
      AND role = required_role
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (org_id IS NULL OR organization_id = org_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION has_any_role(
  emp_id UUID,
  required_roles user_role[],
  org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE employee_id = emp_id
      AND role = ANY(required_roles)
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (org_id IS NULL OR organization_id = org_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's highest role in organization
CREATE OR REPLACE FUNCTION get_highest_role(
  emp_id UUID,
  org_id UUID
)
RETURNS user_role AS $$
DECLARE
  highest_role user_role;
BEGIN
  SELECT role INTO highest_role
  FROM user_roles
  WHERE employee_id = emp_id
    AND organization_id = org_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY 
    CASE role
      WHEN 'SUPER_ADMIN' THEN 1
      WHEN 'ADMIN' THEN 2
      WHEN 'MANAGER' THEN 3
      WHEN 'EMPLOYEE' THEN 4
      ELSE 5
    END
  LIMIT 1;
  
  RETURN highest_role;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  emp_id UUID,
  permission_name TEXT,
  org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE employee_id = emp_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (org_id IS NULL OR organization_id = org_id)
      AND (
        -- Super admins have all permissions
        role = 'SUPER_ADMIN'
        -- Or check specific permission in permissions array
        OR permissions ? permission_name
      )
  );
END;
$$ LANGUAGE plpgsql;

-- Predefined permission sets for each role
CREATE OR REPLACE FUNCTION get_default_permissions(role user_role)
RETURNS JSONB AS $$
BEGIN
  CASE role
    WHEN 'SUPER_ADMIN' THEN
      RETURN '["*"]'::JSONB; -- All permissions
    WHEN 'ADMIN' THEN
      RETURN '["org.manage", "branch.manage", "employee.manage", "contract.manage", "attendance.manage", "report.view", "settings.manage"]'::JSONB;
    WHEN 'MANAGER' THEN
      RETURN '["employee.view", "contract.view", "attendance.manage", "report.view", "qr.manage"]'::JSONB;
    WHEN 'EMPLOYEE' THEN
      RETURN '["profile.edit", "attendance.self", "contract.view.own", "report.view.own"]'::JSONB;
    ELSE
      RETURN '[]'::JSONB;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to automatically set default permissions on role assignment
CREATE OR REPLACE FUNCTION set_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.permissions = '[]'::JSONB THEN
    NEW.permissions = get_default_permissions(NEW.role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_default_permissions_trigger
  BEFORE INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_permissions();

-- Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy for viewing roles
CREATE POLICY "Users can view roles in their organization"
  ON user_roles
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM employees 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Policy for managing roles (admin only)
CREATE POLICY "Admins can manage roles"
  ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM employees e
      JOIN user_roles ur ON e.id = ur.employee_id
      WHERE e.auth_user_id = auth.uid()
        AND ur.organization_id = user_roles.organization_id
        AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
        AND ur.is_active = true
    )
  );