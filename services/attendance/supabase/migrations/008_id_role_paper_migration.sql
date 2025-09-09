-- ID-ROLE-PAPER Architecture Migration
-- This migration introduces the new ID-ROLE-PAPER system to replace organization-based roles

BEGIN;

-- Create new enums for the ID-ROLE-PAPER system
CREATE TYPE id_type_enum AS ENUM ('personal', 'corporate');
CREATE TYPE role_type_enum AS ENUM ('SEEKER', 'WORKER', 'MANAGER', 'OWNER', 'FRANCHISEE', 'FRANCHISOR', 'SUPERVISOR');
CREATE TYPE paper_type_enum AS ENUM (
  'Business Registration',
  'Employment Contract', 
  'Authority Delegation',
  'Supervisor Authority Delegation',
  'Franchise Agreement',
  'Franchise HQ Registration'
);

-- Unified Identities Table - Core identity management
CREATE TABLE unified_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_type id_type_enum NOT NULL DEFAULT 'personal',
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  birth_date DATE,
  id_number TEXT, -- Personal: SSN, Corporate: Business Registration Number
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_personal_id UUID REFERENCES unified_identities(id), -- For Corporate IDs linked to Personal IDs
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_id_type CHECK (
    (id_type = 'personal' AND linked_personal_id IS NULL) OR
    (id_type = 'corporate' AND linked_personal_id IS NOT NULL)
  ),
  CONSTRAINT no_self_reference CHECK (id != linked_personal_id)
);

-- Business Registrations Table - Replaces organizations
CREATE TABLE business_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('individual', 'corporate')),
  owner_identity_id UUID NOT NULL REFERENCES unified_identities(id),
  registration_data JSONB DEFAULT '{}',
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAPER Documents Table - Core of the PAPER system
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_type paper_type_enum NOT NULL,
  owner_identity_id UUID NOT NULL REFERENCES unified_identities(id),
  related_business_id UUID REFERENCES business_registrations(id),
  paper_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business logic constraints
  CONSTRAINT business_registration_requires_business CHECK (
    (paper_type = 'Business Registration' AND related_business_id IS NOT NULL) OR
    (paper_type != 'Business Registration')
  ),
  CONSTRAINT employment_contract_requires_business CHECK (
    (paper_type = 'Employment Contract' AND related_business_id IS NOT NULL) OR
    (paper_type != 'Employment Contract')
  )
);

-- Role Assignments - Computed from PAPER ownership
CREATE TABLE computed_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES unified_identities(id),
  role role_type_enum NOT NULL,
  source_papers UUID[] NOT NULL, -- Array of paper IDs that grant this role
  business_context_id UUID REFERENCES business_registrations(id),
  is_active BOOLEAN DEFAULT TRUE,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique role per identity per business context
  UNIQUE(identity_id, role, business_context_id)
);

-- Role Dependencies Table - Manages role prerequisite relationships
CREATE TABLE role_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_role role_type_enum NOT NULL,
  child_role role_type_enum NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(parent_role, child_role)
);

-- Insert role dependency rules
INSERT INTO role_dependencies (parent_role, child_role, description) VALUES
  ('WORKER', 'MANAGER', 'Manager role requires Worker role as prerequisite'),
  ('WORKER', 'SUPERVISOR', 'Supervisor role requires Worker role as prerequisite');

-- Attendance Records Update - Link to unified identities
ALTER TABLE attendance_records 
ADD COLUMN identity_id UUID REFERENCES unified_identities(id),
ADD COLUMN business_registration_id UUID REFERENCES business_registrations(id);

-- Create indexes for performance
CREATE INDEX idx_unified_identities_auth_user ON unified_identities(auth_user_id);
CREATE INDEX idx_unified_identities_email ON unified_identities(email);
CREATE INDEX idx_unified_identities_id_type ON unified_identities(id_type);
CREATE INDEX idx_unified_identities_linked_personal ON unified_identities(linked_personal_id);

CREATE INDEX idx_business_registrations_owner ON business_registrations(owner_identity_id);
CREATE INDEX idx_business_registrations_number ON business_registrations(registration_number);
CREATE INDEX idx_business_registrations_active ON business_registrations(is_active);

CREATE INDEX idx_papers_owner ON papers(owner_identity_id);
CREATE INDEX idx_papers_type ON papers(paper_type);
CREATE INDEX idx_papers_business ON papers(related_business_id);
CREATE INDEX idx_papers_active ON papers(is_active);

CREATE INDEX idx_computed_roles_identity ON computed_roles(identity_id);
CREATE INDEX idx_computed_roles_role ON computed_roles(role);
CREATE INDEX idx_computed_roles_business ON computed_roles(business_context_id);
CREATE INDEX idx_computed_roles_active ON computed_roles(is_active);

-- Row Level Security Policies
ALTER TABLE unified_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE computed_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own identity
CREATE POLICY "Users can view own identity" ON unified_identities
  FOR SELECT USING (auth_user_id = auth.uid());

-- Users can update their own identity
CREATE POLICY "Users can update own identity" ON unified_identities
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Users can view business registrations they own or have access to
CREATE POLICY "Users can view accessible business registrations" ON business_registrations
  FOR SELECT USING (
    owner_identity_id IN (
      SELECT id FROM unified_identities WHERE auth_user_id = auth.uid()
    ) OR
    id IN (
      SELECT DISTINCT related_business_id 
      FROM papers p
      JOIN unified_identities ui ON p.owner_identity_id = ui.id
      WHERE ui.auth_user_id = auth.uid() AND p.is_active = true
    )
  );

-- Users can view their own papers
CREATE POLICY "Users can view own papers" ON papers
  FOR SELECT USING (
    owner_identity_id IN (
      SELECT id FROM unified_identities WHERE auth_user_id = auth.uid()
    )
  );

-- Users can view their own computed roles
CREATE POLICY "Users can view own roles" ON computed_roles
  FOR SELECT USING (
    identity_id IN (
      SELECT id FROM unified_identities WHERE auth_user_id = auth.uid()
    )
  );

-- Functions for role calculation and management

-- Function to calculate roles based on papers
CREATE OR REPLACE FUNCTION calculate_roles_for_identity(identity_uuid UUID)
RETURNS TABLE(role_type role_type_enum, source_paper_ids UUID[], business_id UUID) AS $$
DECLARE
  paper_record RECORD;
  role_record RECORD;
  paper_types text[];
  current_business_id UUID;
BEGIN
  -- Get all active papers for this identity grouped by business
  FOR paper_record IN 
    SELECT 
      related_business_id,
      array_agg(paper_type::text ORDER BY paper_type) as types,
      array_agg(id ORDER BY paper_type) as paper_ids
    FROM papers 
    WHERE owner_identity_id = identity_uuid AND is_active = true
    GROUP BY related_business_id
  LOOP
    current_business_id := paper_record.related_business_id;
    paper_types := paper_record.types;
    
    -- Apply role calculation rules
    
    -- SEEKER: No papers or just basic profile
    IF array_length(paper_types, 1) IS NULL OR paper_types = ARRAY[]::text[] THEN
      role_type := 'SEEKER';
      source_paper_ids := ARRAY[]::UUID[];
      business_id := NULL;
      RETURN NEXT;
    END IF;
    
    -- OWNER: Business Registration only
    IF paper_types = ARRAY['Business Registration'] THEN
      role_type := 'OWNER';
      source_paper_ids := paper_record.paper_ids;
      business_id := current_business_id;
      RETURN NEXT;
    END IF;
    
    -- WORKER: Employment Contract only
    IF paper_types = ARRAY['Employment Contract'] THEN
      role_type := 'WORKER';
      source_paper_ids := paper_record.paper_ids;
      business_id := current_business_id;
      RETURN NEXT;
    END IF;
    
    -- MANAGER: Employment Contract + Authority Delegation
    IF 'Employment Contract' = ANY(paper_types) AND 'Authority Delegation' = ANY(paper_types) THEN
      -- First assign WORKER role (prerequisite)
      role_type := 'WORKER';
      source_paper_ids := ARRAY[
        (SELECT id FROM papers WHERE owner_identity_id = identity_uuid AND paper_type = 'Employment Contract' AND related_business_id = current_business_id LIMIT 1)
      ];
      business_id := current_business_id;
      RETURN NEXT;
      
      -- Then assign MANAGER role
      role_type := 'MANAGER';
      source_paper_ids := paper_record.paper_ids;
      business_id := current_business_id;
      RETURN NEXT;
    END IF;
    
    -- FRANCHISEE: Business Registration + Franchise Agreement
    IF 'Business Registration' = ANY(paper_types) AND 'Franchise Agreement' = ANY(paper_types) THEN
      role_type := 'FRANCHISEE';
      source_paper_ids := paper_record.paper_ids;
      business_id := current_business_id;
      RETURN NEXT;
    END IF;
    
    -- FRANCHISOR: Business Registration + Franchise HQ Registration
    IF 'Business Registration' = ANY(paper_types) AND 'Franchise HQ Registration' = ANY(paper_types) THEN
      role_type := 'FRANCHISOR';
      source_paper_ids := paper_record.paper_ids;
      business_id := current_business_id;
      RETURN NEXT;
    END IF;
    
    -- SUPERVISOR: Employment Contract + Supervisor Authority Delegation
    IF 'Employment Contract' = ANY(paper_types) AND 'Supervisor Authority Delegation' = ANY(paper_types) THEN
      -- First assign WORKER role (prerequisite)
      role_type := 'WORKER';
      source_paper_ids := ARRAY[
        (SELECT id FROM papers WHERE owner_identity_id = identity_uuid AND paper_type = 'Employment Contract' AND related_business_id = current_business_id LIMIT 1)
      ];
      business_id := current_business_id;
      RETURN NEXT;
      
      -- Then assign SUPERVISOR role
      role_type := 'SUPERVISOR';
      source_paper_ids := paper_record.paper_ids;
      business_id := current_business_id;
      RETURN NEXT;
    END IF;
    
  END LOOP;
  
  -- If no roles were assigned, assign SEEKER
  IF NOT EXISTS (SELECT 1 FROM computed_roles WHERE identity_id = identity_uuid AND is_active = true) THEN
    role_type := 'SEEKER';
    source_paper_ids := ARRAY[]::UUID[];
    business_id := NULL;
    RETURN NEXT;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh computed roles for an identity
CREATE OR REPLACE FUNCTION refresh_computed_roles(identity_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Deactivate existing roles
  UPDATE computed_roles 
  SET is_active = false 
  WHERE identity_id = identity_uuid;
  
  -- Insert new computed roles
  INSERT INTO computed_roles (identity_id, role, source_papers, business_context_id, is_active)
  SELECT 
    identity_uuid,
    role_type,
    source_paper_ids,
    business_id,
    true
  FROM calculate_roles_for_identity(identity_uuid);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update computed roles when papers change
CREATE OR REPLACE FUNCTION trigger_refresh_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM refresh_computed_roles(NEW.owner_identity_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM refresh_computed_roles(OLD.owner_identity_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on papers table
CREATE TRIGGER papers_role_refresh_trigger
  AFTER INSERT OR UPDATE OR DELETE ON papers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_roles();

-- Update function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_unified_identities_updated_at BEFORE UPDATE ON unified_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_registrations_updated_at BEFORE UPDATE ON business_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_papers_updated_at BEFORE UPDATE ON papers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;