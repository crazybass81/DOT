-- ID-ROLE-PAPER System Database Schema
-- Initial migration for the complete system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('restaurant', 'franchise', 'corporate')),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT organizations_name_check CHECK (LENGTH(name) >= 2)
);

-- Create identities table
CREATE TABLE identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_type VARCHAR(20) NOT NULL CHECK (identity_type IN ('personal', 'corporate')),
  full_name VARCHAR(255) NOT NULL,
  personal_info JSONB,
  corporate_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT identities_full_name_check CHECK (LENGTH(full_name) >= 2),
  CONSTRAINT identities_unique_user_per_org UNIQUE (organization_id, user_id)
);

-- Create businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(20) NOT NULL CHECK (business_type IN ('individual', 'corporate')),
  business_number VARCHAR(20) NOT NULL,
  owner_identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE RESTRICT,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_documents JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT businesses_unique_number_per_org UNIQUE (organization_id, business_number),
  CONSTRAINT businesses_name_check CHECK (LENGTH(name) >= 2),
  CONSTRAINT businesses_phone_check CHECK (phone ~ '^010-\d{4}-\d{4}$'),
  CONSTRAINT businesses_email_check CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create papers table
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  paper_type VARCHAR(50) NOT NULL CHECK (paper_type IN (
    'BUSINESS_REGISTRATION',
    'TAX_REGISTRATION',
    'EMPLOYMENT_INSURANCE',
    'INDUSTRIAL_ACCIDENT_INSURANCE',
    'HEALTH_INSURANCE',
    'PENSION_INSURANCE'
  )),
  title VARCHAR(255) NOT NULL,
  document_number VARCHAR(100),
  issued_by VARCHAR(255),
  issued_date DATE,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_valid BOOLEAN GENERATED ALWAYS AS (valid_until >= CURRENT_DATE) STORED,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT papers_title_check CHECK (LENGTH(title) >= 2),
  CONSTRAINT papers_validity_check CHECK (valid_until >= valid_from)
);

-- Create roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  role_type VARCHAR(20) NOT NULL CHECK (role_type IN (
    'SEEKER', 'WORKER', 'SUPERVISOR', 'MANAGER', 'OWNER', 'FRANCHISEE', 'FRANCHISOR'
  )),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES identities(id) ON DELETE RESTRICT,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT roles_unique_identity_role_business UNIQUE (identity_id, role_type, business_id),
  CONSTRAINT roles_expiry_check CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- Create permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_type VARCHAR(20) NOT NULL CHECK (role_type IN (
    'SEEKER', 'WORKER', 'SUPERVISOR', 'MANAGER', 'OWNER', 'FRANCHISEE', 'FRANCHISOR'
  )),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT permissions_unique_role_resource_action UNIQUE (organization_id, role_type, resource, action)
);

-- Create indexes for performance
CREATE INDEX idx_identities_organization_id ON identities(organization_id);
CREATE INDEX idx_identities_user_id ON identities(user_id);
CREATE INDEX idx_identities_type ON identities(identity_type);
CREATE INDEX idx_identities_active ON identities(is_active);

CREATE INDEX idx_businesses_organization_id ON businesses(organization_id);
CREATE INDEX idx_businesses_owner_id ON businesses(owner_identity_id);
CREATE INDEX idx_businesses_type ON businesses(business_type);
CREATE INDEX idx_businesses_verification ON businesses(verification_status);
CREATE INDEX idx_businesses_active ON businesses(is_active);

CREATE INDEX idx_papers_organization_id ON papers(organization_id);
CREATE INDEX idx_papers_business_id ON papers(business_id);
CREATE INDEX idx_papers_type ON papers(paper_type);
CREATE INDEX idx_papers_valid_until ON papers(valid_until);
CREATE INDEX idx_papers_is_valid ON papers(is_valid);

CREATE INDEX idx_roles_organization_id ON roles(organization_id);
CREATE INDEX idx_roles_identity_id ON roles(identity_id);
CREATE INDEX idx_roles_type ON roles(role_type);
CREATE INDEX idx_roles_business_id ON roles(business_id);
CREATE INDEX idx_roles_active ON roles(is_active);

CREATE INDEX idx_permissions_organization_id ON permissions(organization_id);
CREATE INDEX idx_permissions_role_type ON permissions(role_type);
CREATE INDEX idx_permissions_resource ON permissions(resource);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER trigger_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_identities_updated_at
  BEFORE UPDATE ON identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_papers_updated_at
  BEFORE UPDATE ON papers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();