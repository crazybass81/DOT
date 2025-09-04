-- =====================================================
-- Create Missing Tables for Attendance Service
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: organizations
-- =====================================================
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

-- =====================================================
-- TABLE: employees
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_code VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    birth_date DATE,
    department VARCHAR(100),
    position VARCHAR(100),
    manager_id UUID REFERENCES employees(id),
    hire_date DATE DEFAULT CURRENT_DATE,
    emergency_contact JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: user_roles
-- =====================================================
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

-- =====================================================
-- TABLE: contracts
-- =====================================================
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
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for organizations
-- =====================================================

-- Allow users to read their own organization
CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id 
            FROM employees 
            WHERE user_id = auth.uid()
        )
    );

-- Allow creating organizations (for registration)
CREATE POLICY "Allow creating organizations" ON organizations
    FOR INSERT
    WITH CHECK (true);

-- Allow organization admins to update
CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE
    USING (
        id IN (
            SELECT organization_id 
            FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
            AND is_active = true
        )
    );

-- =====================================================
-- RLS Policies for employees
-- =====================================================

-- Allow users to view employees in their organization
CREATE POLICY "Users can view employees in their organization" ON employees
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE user_id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Allow creating employees (for registration)
CREATE POLICY "Allow creating employees" ON employees
    FOR INSERT
    WITH CHECK (true);

-- Allow users to update their own employee record
CREATE POLICY "Users can update their own employee record" ON employees
    FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- RLS Policies for user_roles
-- =====================================================

-- Allow users to view roles in their organization
CREATE POLICY "Users can view roles in their organization" ON user_roles
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE user_id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Allow creating roles (for registration)
CREATE POLICY "Allow creating roles" ON user_roles
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- RLS Policies for contracts
-- =====================================================

-- Allow users to view contracts in their organization
CREATE POLICY "Users can view contracts in their organization" ON contracts
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE user_id = auth.uid()
        ) OR 
        employee_id IN (
            SELECT id 
            FROM employees 
            WHERE user_id = auth.uid()
        )
    );

-- Allow creating contracts (for registration)
CREATE POLICY "Allow creating contracts" ON contracts
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- Create Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employee_id ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_organization_id ON contracts(organization_id);

-- =====================================================
-- Success Message
-- =====================================================
SELECT 'All tables and policies created successfully!' as message;