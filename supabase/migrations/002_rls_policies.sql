-- Row Level Security (RLS) Policies for ID-ROLE-PAPER System
-- Comprehensive security policies for multi-tenant data isolation

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Organizations policies
-- Users can only access organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT i.organization_id 
      FROM identities i 
      WHERE i.user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can manage organizations" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM identities i
      JOIN roles r ON i.id = r.identity_id
      WHERE i.user_id = auth.uid() 
      AND r.role_type = 'FRANCHISOR' 
      AND r.is_active = true
    )
  );

-- Identities policies
-- Users can view identities in their organization
CREATE POLICY "Users can view identities in their org" ON identities
  FOR SELECT USING (
    organization_id IN (
      SELECT i.organization_id 
      FROM identities i 
      WHERE i.user_id = auth.uid()
    )
  );

-- Users can create identities in their organization
CREATE POLICY "Users can create identities in their org" ON identities
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT i.organization_id 
      FROM identities i 
      WHERE i.user_id = auth.uid()
    )
  );

-- Users can update their own identity or identities they manage
CREATE POLICY "Users can update managed identities" ON identities
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM identities manager
      JOIN roles manager_role ON manager.id = manager_role.identity_id
      WHERE manager.user_id = auth.uid()
      AND manager.organization_id = identities.organization_id
      AND manager_role.role_type IN ('MANAGER', 'OWNER', 'FRANCHISEE', 'FRANCHISOR')
      AND manager_role.is_active = true
    )
  );

-- Businesses policies
-- Users can view businesses in their organization
CREATE POLICY "Users can view businesses in their org" ON businesses
  FOR SELECT USING (
    organization_id IN (
      SELECT i.organization_id 
      FROM identities i 
      WHERE i.user_id = auth.uid()
    )
  );

-- Business owners and managers can create businesses
CREATE POLICY "Authorized users can create businesses" ON businesses
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT i.organization_id 
      FROM identities i 
      JOIN roles r ON i.id = r.identity_id
      WHERE i.user_id = auth.uid()
      AND r.role_type IN ('OWNER', 'FRANCHISEE', 'FRANCHISOR', 'MANAGER')
      AND r.is_active = true
    )
  );

-- Business owners and managers can update businesses
CREATE POLICY "Authorized users can update businesses" ON businesses
  FOR UPDATE USING (
    owner_identity_id IN (
      SELECT i.id 
      FROM identities i 
      WHERE i.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM identities manager
      JOIN roles manager_role ON manager.id = manager_role.identity_id
      WHERE manager.user_id = auth.uid()
      AND manager.organization_id = businesses.organization_id
      AND manager_role.role_type IN ('MANAGER', 'OWNER', 'FRANCHISEE', 'FRANCHISOR')
      AND manager_role.is_active = true
    )
  );

-- Papers policies
-- Users can view papers for businesses in their organization
CREATE POLICY "Users can view papers in their org" ON papers
  FOR SELECT USING (
    organization_id IN (
      SELECT i.organization_id 
      FROM identities i 
      WHERE i.user_id = auth.uid()
    )
  );

-- Business owners and managers can manage papers
CREATE POLICY "Authorized users can manage papers" ON papers
  FOR ALL USING (
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN identities i ON b.owner_identity_id = i.id
      WHERE i.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM identities manager
      JOIN roles manager_role ON manager.id = manager_role.identity_id
      WHERE manager.user_id = auth.uid()
      AND manager.organization_id = papers.organization_id
      AND manager_role.role_type IN ('MANAGER', 'OWNER', 'FRANCHISEE', 'FRANCHISOR')
      AND manager_role.is_active = true
    )
  );

-- Roles policies
-- Users can view roles in their organization
CREATE POLICY "Users can view roles in their org" ON roles
  FOR SELECT USING (
    organization_id IN (
      SELECT i.organization_id 
      FROM identities i 
      WHERE i.user_id = auth.uid()
    )
  );

-- Only authorized users can grant roles
CREATE POLICY "Authorized users can grant roles" ON roles
  FOR INSERT WITH CHECK (
    granted_by IN (
      SELECT i.id FROM identities i
      JOIN roles r ON i.id = r.identity_id
      WHERE i.user_id = auth.uid()
      AND r.role_type IN ('MANAGER', 'OWNER', 'FRANCHISEE', 'FRANCHISOR')
      AND r.is_active = true
    )
  );

-- Only authorized users can modify roles
CREATE POLICY "Authorized users can modify roles" ON roles
  FOR UPDATE USING (
    granted_by IN (
      SELECT i.id FROM identities i
      WHERE i.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM identities manager
      JOIN roles manager_role ON manager.id = manager_role.identity_id
      WHERE manager.user_id = auth.uid()
      AND manager.organization_id = roles.organization_id
      AND manager_role.role_type IN ('MANAGER', 'OWNER', 'FRANCHISEE', 'FRANCHISOR')
      AND manager_role.is_active = true
    )
  );

-- Permissions policies
-- Users can view permissions for their organization
CREATE POLICY "Users can view permissions in their org" ON permissions
  FOR SELECT USING (
    organization_id IN (
      SELECT i.organization_id 
      FROM identities i 
      WHERE i.user_id = auth.uid()
    )
  );

-- Only system administrators can manage permissions
CREATE POLICY "System admins can manage permissions" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM identities i
      JOIN roles r ON i.id = r.identity_id
      WHERE i.user_id = auth.uid()
      AND r.role_type = 'FRANCHISOR'
      AND r.is_active = true
    )
  );

-- Create helper function for role hierarchy checking
CREATE OR REPLACE FUNCTION has_role_hierarchy_access(
  user_uuid UUID,
  required_role TEXT,
  org_id UUID DEFAULT NULL,
  business_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_roles TEXT[];
  role_hierarchy JSONB := '{
    "FRANCHISOR": ["FRANCHISOR", "FRANCHISEE", "OWNER", "MANAGER", "SUPERVISOR", "WORKER", "SEEKER"],
    "FRANCHISEE": ["FRANCHISEE", "OWNER", "MANAGER", "SUPERVISOR", "WORKER", "SEEKER"],
    "OWNER": ["OWNER", "MANAGER", "SUPERVISOR", "WORKER", "SEEKER"],
    "MANAGER": ["MANAGER", "SUPERVISOR", "WORKER", "SEEKER"],
    "SUPERVISOR": ["SUPERVISOR", "WORKER", "SEEKER"],
    "WORKER": ["WORKER", "SEEKER"],
    "SEEKER": ["SEEKER"]
  }';
BEGIN
  -- Get user's active roles
  SELECT ARRAY_AGG(r.role_type) INTO user_roles
  FROM identities i
  JOIN roles r ON i.id = r.identity_id
  WHERE i.user_id = user_uuid
  AND r.is_active = true
  AND (org_id IS NULL OR i.organization_id = org_id)
  AND (business_id IS NULL OR r.business_id = business_id OR r.business_id IS NULL);

  -- Check if user has any role that grants access to required_role
  RETURN EXISTS (
    SELECT 1 FROM unnest(user_roles) AS user_role
    WHERE required_role = ANY(
      SELECT jsonb_array_elements_text(role_hierarchy->user_role)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check permissions
CREATE OR REPLACE FUNCTION check_permission(
  user_uuid UUID,
  resource_name TEXT,
  action_name TEXT,
  business_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
  user_roles TEXT[];
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Get user's organization
  SELECT i.organization_id INTO user_org_id
  FROM identities i
  WHERE i.user_id = user_uuid
  LIMIT 1;

  IF user_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user's active roles
  SELECT ARRAY_AGG(r.role_type) INTO user_roles
  FROM identities i
  JOIN roles r ON i.id = r.identity_id
  WHERE i.user_id = user_uuid
  AND r.is_active = true
  AND (business_uuid IS NULL OR r.business_id = business_uuid OR r.business_id IS NULL);

  -- Check if user has permission through any of their roles
  SELECT EXISTS (
    SELECT 1 FROM permissions p
    WHERE p.organization_id = user_org_id
    AND p.resource = resource_name
    AND p.action = action_name
    AND p.role_type = ANY(user_roles)
  ) INTO has_permission;

  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;