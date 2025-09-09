-- Default Permission Seeds for ID-ROLE-PAPER System
-- Comprehensive role-based permissions following 7-tier hierarchy

-- Insert default permissions for each role type
-- SEEKER (Level 1) - Basic read access only
INSERT INTO permissions (organization_id, role_type, resource, action, conditions) VALUES
-- For default system organization (will be replaced with actual org_id)
('00000000-0000-0000-0000-000000000000', 'SEEKER', 'identity', 'read', '{"own_only": true}'),
('00000000-0000-0000-0000-000000000000', 'SEEKER', 'business', 'read', '{"public_only": true}'),
('00000000-0000-0000-0000-000000000000', 'SEEKER', 'papers', 'read', '{"public_only": true}');

-- WORKER (Level 2) - Personal data management
INSERT INTO permissions (organization_id, role_type, resource, action, conditions) VALUES
-- Inherit all SEEKER permissions plus:
('00000000-0000-0000-0000-000000000000', 'WORKER', 'identity', 'read', '{"own_only": true}'),
('00000000-0000-0000-0000-000000000000', 'WORKER', 'identity', 'update', '{"own_only": true}'),
('00000000-0000-0000-0000-000000000000', 'WORKER', 'business', 'read', '{"own_business_only": true}'),
('00000000-0000-0000-0000-000000000000', 'WORKER', 'papers', 'read', '{"own_business_only": true}');

-- SUPERVISOR (Level 3) - Team oversight
INSERT INTO permissions (organization_id, role_type, resource, action, conditions) VALUES
-- Inherit all WORKER permissions plus:
('00000000-0000-0000-0000-000000000000', 'SUPERVISOR', 'identity', 'read', '{"team_only": true}'),
('00000000-0000-0000-0000-000000000000', 'SUPERVISOR', 'identity', 'update', '{"team_only": true}'),
('00000000-0000-0000-0000-000000000000', 'SUPERVISOR', 'business', 'read', '{"supervised_businesses": true}'),
('00000000-0000-0000-0000-000000000000', 'SUPERVISOR', 'business', 'update', '{"supervised_businesses": true}'),
('00000000-0000-0000-0000-000000000000', 'SUPERVISOR', 'papers', 'read', '{"supervised_businesses": true}'),
('00000000-0000-0000-0000-000000000000', 'SUPERVISOR', 'papers', 'validate', '{"supervised_businesses": true}');

-- MANAGER (Level 4) - Department management
INSERT INTO permissions (organization_id, role_type, resource, action, conditions) VALUES
-- Inherit all SUPERVISOR permissions plus:
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'identity', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'identity', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'identity', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'identity', 'delete', '{"non_owner_only": true}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'business', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'business', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'business', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'papers', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'papers', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'papers', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'papers', 'validate', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'permissions', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'roles', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'MANAGER', 'roles', 'create', '{"lower_roles_only": true}');

-- OWNER (Level 5) - Business ownership
INSERT INTO permissions (organization_id, role_type, resource, action, conditions) VALUES
-- Inherit all MANAGER permissions plus:
('00000000-0000-0000-0000-000000000000', 'OWNER', 'identity', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'identity', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'identity', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'identity', 'delete', '{"non_franchisor_only": true}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'business', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'business', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'business', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'business', 'delete', '{"owned_only": true}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'business', 'verify', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'papers', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'papers', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'papers', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'papers', 'delete', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'papers', 'validate', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'permissions', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'roles', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'roles', 'create', '{"non_franchisor_only": true}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'roles', 'update', '{"non_franchisor_only": true}'),
('00000000-0000-0000-0000-000000000000', 'OWNER', 'roles', 'delete', '{"non_franchisor_only": true}');

-- FRANCHISEE (Level 6) - Franchise operations
INSERT INTO permissions (organization_id, role_type, resource, action, conditions) VALUES
-- Inherit all OWNER permissions plus:
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'identity', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'identity', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'identity', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'identity', 'delete', '{"non_franchisor_only": true}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'business', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'business', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'business', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'business', 'delete', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'business', 'verify', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'papers', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'papers', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'papers', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'papers', 'delete', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'papers', 'validate', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'permissions', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'permissions', 'update', '{"limited_scope": true}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'roles', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'roles', 'create', '{"non_franchisor_only": true}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'roles', 'update', '{"non_franchisor_only": true}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'roles', 'delete', '{"non_franchisor_only": true}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISEE', 'organizations', 'read', '{"franchise_network": true}');

-- FRANCHISOR (Level 7) - System-wide control
INSERT INTO permissions (organization_id, role_type, resource, action, conditions) VALUES
-- Full system access:
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'identity', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'identity', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'identity', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'identity', 'delete', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'business', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'business', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'business', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'business', 'delete', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'business', 'verify', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'papers', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'papers', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'papers', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'papers', 'delete', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'papers', 'validate', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'permissions', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'permissions', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'permissions', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'permissions', 'delete', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'roles', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'roles', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'roles', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'roles', 'delete', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'organizations', 'read', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'organizations', 'create', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'organizations', 'update', '{}'),
('00000000-0000-0000-0000-000000000000', 'FRANCHISOR', 'organizations', 'delete', '{}');

-- Create function to copy default permissions for new organizations
CREATE OR REPLACE FUNCTION create_default_permissions_for_organization(org_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Copy all default permissions to the new organization
  INSERT INTO permissions (organization_id, role_type, resource, action, conditions)
  SELECT 
    org_id,
    role_type,
    resource,
    action,
    conditions
  FROM permissions 
  WHERE organization_id = '00000000-0000-0000-0000-000000000000';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create permissions for new organizations
CREATE OR REPLACE FUNCTION trigger_create_org_permissions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_permissions_for_organization(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_new_organization_permissions
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_org_permissions();

-- Create function for role hierarchy checking with permissions
CREATE OR REPLACE FUNCTION get_effective_permissions(
  user_uuid UUID,
  org_id UUID DEFAULT NULL
)
RETURNS TABLE(resource TEXT, action TEXT, conditions JSONB) AS $$
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
  SELECT ARRAY_AGG(DISTINCT r.role_type) INTO user_roles
  FROM identities i
  JOIN roles r ON i.id = r.identity_id
  WHERE i.user_id = user_uuid
  AND r.is_active = true
  AND (org_id IS NULL OR i.organization_id = org_id);

  -- Return all permissions that the user has through role hierarchy
  RETURN QUERY
  SELECT DISTINCT p.resource, p.action, p.conditions
  FROM permissions p
  WHERE (org_id IS NULL OR p.organization_id = org_id)
  AND EXISTS (
    SELECT 1 FROM unnest(user_roles) AS user_role
    WHERE p.role_type = ANY(
      SELECT jsonb_array_elements_text(role_hierarchy->user_role)::TEXT
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;