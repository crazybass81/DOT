-- Fix RLS Policies - Remove Infinite Recursion
-- Execute this in Supabase Dashboard > SQL Editor

-- ==========================================
-- DROP PROBLEMATIC POLICIES
-- ==========================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own identity" ON unified_identities;
DROP POLICY IF EXISTS "Users can update own identity" ON unified_identities;
DROP POLICY IF EXISTS "Allow identity creation for authenticated users" ON unified_identities;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations_v3;
DROP POLICY IF EXISTS "Organization owners can update" ON organizations_v3;
DROP POLICY IF EXISTS "Allow organization creation for authenticated users" ON organizations_v3;
DROP POLICY IF EXISTS "Users can view their own role assignments" ON role_assignments;
DROP POLICY IF EXISTS "Master admin full access to identities" ON unified_identities;
DROP POLICY IF EXISTS "Master admin full access to organizations" ON organizations_v3;
DROP POLICY IF EXISTS "Master admin full access to roles" ON role_assignments;

-- ==========================================
-- CREATE SIMPLIFIED RLS POLICIES
-- ==========================================

-- Unified Identities Policies - Simple direct auth check
CREATE POLICY "identity_select_own" ON unified_identities
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "identity_update_own" ON unified_identities
  FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY "identity_insert_own" ON unified_identities
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Organizations Policies - Owners can manage their organizations
CREATE POLICY "org_select_owner" ON organizations_v3
  FOR SELECT USING (
    owner_identity_id IN (
      SELECT id FROM unified_identities 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "org_update_owner" ON organizations_v3
  FOR UPDATE USING (
    owner_identity_id IN (
      SELECT id FROM unified_identities 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "org_insert_owner" ON organizations_v3
  FOR INSERT WITH CHECK (
    owner_identity_id IN (
      SELECT id FROM unified_identities 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Role Assignments Policies - Users can see their own roles
CREATE POLICY "role_select_own" ON role_assignments
  FOR SELECT USING (
    identity_id IN (
      SELECT id FROM unified_identities 
      WHERE auth_user_id = auth.uid()
    )
  );

-- ==========================================
-- CREATE MASTER ADMIN BYPASS (SIMPLIFIED)
-- ==========================================

-- Create a simple function to check master admin status
CREATE OR REPLACE FUNCTION is_master_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM role_assignments ra
    JOIN unified_identities ui ON ra.identity_id = ui.id
    WHERE ui.auth_user_id = user_id 
      AND ra.role = 'master' 
      AND ra.is_active = true
      AND ra.organization_id IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Master admin policies - using function to avoid recursion
CREATE POLICY "master_admin_identities" ON unified_identities
  FOR ALL USING (is_master_admin(auth.uid()));

CREATE POLICY "master_admin_organizations" ON organizations_v3
  FOR ALL USING (is_master_admin(auth.uid()));

CREATE POLICY "master_admin_roles" ON role_assignments
  FOR ALL USING (is_master_admin(auth.uid()));

-- ==========================================
-- GRANT PERMISSIONS
-- ==========================================

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION is_master_admin(UUID) TO authenticated;

-- Policies are now fixed and should work without infinite recursion