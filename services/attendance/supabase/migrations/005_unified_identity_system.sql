-- Unified Identity System Migration
-- Phase 1: Create new unified tables with proper hierarchy

BEGIN;

-- =================================
-- 1. UNIFIED IDENTITIES TABLE
-- =================================
CREATE TABLE IF NOT EXISTS unified_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Identity Information
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  birth_date DATE,
  
  -- ID Type (개인/법인/프랜차이즈본사)
  id_type TEXT NOT NULL CHECK (id_type IN (
    'personal',           -- 개인
    'business_owner',     -- 법인 (사업자)
    'corporation',        -- 기업 법인
    'franchise_hq'        -- 프랜차이즈 본사
  )),
  
  -- ID Number (based on type)
  id_number TEXT, -- 주민번호, 사업자등록번호, 법인등록번호
  
  -- Business Verification (for business types)
  business_verification_status TEXT DEFAULT 'pending' CHECK (
    business_verification_status IN ('pending', 'verified', 'rejected')
  ),
  business_verification_data JSONB DEFAULT '{}',
  
  -- Auth Integration
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  profile_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================
-- 2. ORGANIZATIONS V3 TABLE
-- =================================
CREATE TABLE IF NOT EXISTS organizations_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization Identity
  code TEXT UNIQUE NOT NULL, -- 4-digit unique code
  name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  logo_url TEXT,
  
  -- Organization Type (개인사업자/법인/프랜차이즈본사/프랜차이즈매장)
  org_type TEXT NOT NULL CHECK (org_type IN (
    'personal',           -- 개인사업자
    'business_owner',     -- 사업자
    'corporation',        -- 법인
    'franchise_hq',       -- 프랜차이즈 본사
    'franchise_store'     -- 프랜차이즈 매장
  )),
  
  -- Hierarchy
  parent_org_id UUID REFERENCES organizations_v3(id) ON DELETE SET NULL,
  
  -- Owner (from unified_identities)
  owner_identity_id UUID NOT NULL REFERENCES unified_identities(id) ON DELETE RESTRICT,
  
  -- Business Information
  business_number TEXT, -- 사업자등록번호
  business_registration JSONB DEFAULT '{}',
  business_verification_status TEXT DEFAULT 'pending',
  
  -- Settings
  settings JSONB DEFAULT '{
    "workingHours": {"start": "09:00", "end": "18:00"},
    "overtimePolicy": {"enabled": true, "threshold": 480},
    "gpsTracking": {"enabled": true, "radius": 100},
    "approvalRequired": true,
    "notifications": {"email": true, "push": true, "sms": false}
  }'::jsonb,
  
  -- Subscription & Limits
  max_employees INTEGER DEFAULT 10,
  max_locations INTEGER DEFAULT 1,
  subscription_tier TEXT DEFAULT 'basic',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  billing_data JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspension_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(name), -- Organization names must be unique
  CHECK (
    CASE 
      WHEN org_type = 'franchise_store' THEN parent_org_id IS NOT NULL
      ELSE TRUE
    END
  ) -- Franchise stores must have parent
);

-- =================================
-- 3. ROLE ASSIGNMENTS TABLE
-- =================================
CREATE TABLE IF NOT EXISTS role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity Reference
  identity_id UUID NOT NULL REFERENCES unified_identities(id) ON DELETE CASCADE,
  
  -- Organization Reference (NULL for master role)
  organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
  
  -- Role Definition
  role TEXT NOT NULL CHECK (role IN (
    'master',           -- 마스터 관리자 (시스템 전체)
    'admin',            -- 사업자/관리자 (조직 내)
    'manager',          -- 매니저 (부서/팀 관리)
    'worker',           -- 워커 (일반 직원)
    'franchise_admin'   -- 프랜차이즈 본사 관리자
  )),
  
  -- Role Properties
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE, -- Primary role for the user
  
  -- Permissions
  custom_permissions JSONB DEFAULT '{}',
  access_restrictions JSONB DEFAULT '{}',
  
  -- Assignment Tracking
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES unified_identities(id),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES unified_identities(id),
  revocation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Constraints
  CHECK (
    CASE 
      WHEN role = 'master' THEN organization_id IS NULL
      ELSE organization_id IS NOT NULL
    END
  ), -- Master role has no organization, others must have one
  
  UNIQUE(identity_id, organization_id, role) -- One role per person per organization
);

-- =================================
-- 4. INDEXES
-- =================================

-- Unified Identities Indexes
CREATE INDEX IF NOT EXISTS idx_unified_identities_email ON unified_identities(email);
CREATE INDEX IF NOT EXISTS idx_unified_identities_auth_user_id ON unified_identities(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_unified_identities_id_type ON unified_identities(id_type);
CREATE INDEX IF NOT EXISTS idx_unified_identities_active ON unified_identities(is_active) WHERE is_active = true;

-- Organizations Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_v3_code ON organizations_v3(code);
CREATE INDEX IF NOT EXISTS idx_organizations_v3_owner ON organizations_v3(owner_identity_id);
CREATE INDEX IF NOT EXISTS idx_organizations_v3_parent ON organizations_v3(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_v3_type ON organizations_v3(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_v3_active ON organizations_v3(is_active) WHERE is_active = true;

-- Role Assignments Indexes
CREATE INDEX IF NOT EXISTS idx_role_assignments_identity ON role_assignments(identity_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_organization ON role_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON role_assignments(role);
CREATE INDEX IF NOT EXISTS idx_role_assignments_active ON role_assignments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_role_assignments_primary ON role_assignments(identity_id, is_primary) WHERE is_primary = true;

-- =================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_unified_identities_updated_at 
  BEFORE UPDATE ON unified_identities 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_v3_updated_at 
  BEFORE UPDATE ON organizations_v3 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =================================

-- Enable RLS
ALTER TABLE unified_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

-- Unified Identities Policies
CREATE POLICY "Users can view own identity" ON unified_identities
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own identity" ON unified_identities
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Organizations Policies  
CREATE POLICY "Users can view organizations they belong to" ON organizations_v3
  FOR SELECT USING (
    id IN (
      SELECT ra.organization_id 
      FROM role_assignments ra
      JOIN unified_identities ui ON ra.identity_id = ui.id
      WHERE ui.auth_user_id = auth.uid() AND ra.is_active = true
    )
    OR owner_identity_id IN (
      SELECT ui.id 
      FROM unified_identities ui 
      WHERE ui.auth_user_id = auth.uid()
    )
  );

-- Role Assignments Policies
CREATE POLICY "Users can view their own role assignments" ON role_assignments
  FOR SELECT USING (
    identity_id IN (
      SELECT ui.id 
      FROM unified_identities ui 
      WHERE ui.auth_user_id = auth.uid()
    )
  );

-- Master admin bypass policies
CREATE POLICY "Master admin full access to identities" ON unified_identities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN unified_identities ui ON ra.identity_id = ui.id
      WHERE ui.auth_user_id = auth.uid() 
        AND ra.role = 'master' 
        AND ra.is_active = true
    )
  );

CREATE POLICY "Master admin full access to organizations" ON organizations_v3
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN unified_identities ui ON ra.identity_id = ui.id
      WHERE ui.auth_user_id = auth.uid() 
        AND ra.role = 'master' 
        AND ra.is_active = true
    )
  );

CREATE POLICY "Master admin full access to roles" ON role_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN unified_identities ui ON ra.identity_id = ui.id
      WHERE ui.auth_user_id = auth.uid() 
        AND ra.role = 'master' 
        AND ra.is_active = true
    )
  );

COMMIT;