-- =====================================================
-- Attendance Service Database Schema
-- Based on user-permission-diagram.md specifications
-- Multi-tenant architecture with RLS
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('master_admin', 'admin', 'manager', 'worker');
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'half_day', 'holiday', 'leave');
CREATE TYPE sync_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');

-- =====================================================
-- TABLE: organizations
-- =====================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    settings JSONB DEFAULT '{}',
    max_employees INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: users
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    encrypted_password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'worker',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Master admins don't belong to any organization
    CONSTRAINT master_admin_no_org CHECK (
        (role = 'master_admin' AND organization_id IS NULL) OR
        (role != 'master_admin' AND organization_id IS NOT NULL)
    )
);

-- =====================================================
-- TABLE: employees
-- =====================================================

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    manager_id UUID REFERENCES employees(id),
    hire_date DATE NOT NULL,
    phone VARCHAR(20),
    emergency_contact JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, employee_code)
);

-- =====================================================
-- TABLE: locations
-- =====================================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    radius_meters INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: shifts
-- =====================================================

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration INTEGER DEFAULT 0, -- in minutes
    days_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 1=Monday, 7=Sunday
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: employee_shifts
-- =====================================================

CREATE TABLE employee_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, shift_id, start_date)
);

-- =====================================================
-- TABLE: attendance
-- =====================================================

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    check_in_location_id UUID REFERENCES locations(id),
    check_out_location_id UUID REFERENCES locations(id),
    shift_id UUID REFERENCES shifts(id),
    status attendance_status DEFAULT 'present',
    late_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    break_duration INTEGER DEFAULT 0, -- in minutes
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- =====================================================
-- TABLE: permissions
-- =====================================================

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, resource, action)
);

-- =====================================================
-- TABLE: role_templates
-- =====================================================

CREATE TABLE role_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    base_role user_role NOT NULL,
    custom_permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: user_role_assignments
-- =====================================================

CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_template_id UUID REFERENCES role_templates(id) ON DELETE SET NULL,
    assigned_by UUID NOT NULL REFERENCES users(id),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: notifications
-- =====================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: audit_logs
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    changes JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: sync_queue
-- =====================================================

CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    data JSONB NOT NULL,
    status sync_status DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);

-- Employees indexes
CREATE INDEX idx_employees_user ON employees(user_id);
CREATE INDEX idx_employees_organization ON employees(organization_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_code ON employees(organization_id, employee_code);

-- Attendance indexes
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Sync queue indexes
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_organization ON sync_queue(organization_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Organizations policies
CREATE POLICY "Master admins can view all organizations"
    ON organizations FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'master_admin');

CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    TO authenticated
    USING (id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Master admins can manage all organizations"
    ON organizations FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'master_admin');

-- Users policies
CREATE POLICY "Master admins can view all users"
    ON users FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'master_admin');

CREATE POLICY "Admins can view users in their organization"
    ON users FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin' AND
        organization_id::text = auth.jwt() ->> 'organization_id'
    );

CREATE POLICY "Managers can view their team members"
    ON users FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'manager' AND
        organization_id::text = auth.jwt() ->> 'organization_id' AND
        id::text IN (
            SELECT user_id::text FROM employees 
            WHERE manager_id::text = (
                SELECT id::text FROM employees 
                WHERE user_id::text = auth.uid()::text
            )
        )
    );

CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Employees policies
CREATE POLICY "Organization members can view employees"
    ON employees FOR SELECT
    TO authenticated
    USING (
        organization_id::text = auth.jwt() ->> 'organization_id' OR
        auth.jwt() ->> 'role' = 'master_admin'
    );

CREATE POLICY "Admins can manage employees in their organization"
    ON employees FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role' = 'admin' AND 
         organization_id::text = auth.jwt() ->> 'organization_id') OR
        auth.jwt() ->> 'role' = 'master_admin'
    );

-- Attendance policies
CREATE POLICY "Employees can view their own attendance"
    ON attendance FOR SELECT
    TO authenticated
    USING (
        employee_id::text IN (
            SELECT id::text FROM employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can view team attendance"
    ON attendance FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'manager', 'master_admin') AND
        employee_id::text IN (
            SELECT id::text FROM employees 
            WHERE organization_id = auth.jwt() ->> 'organization_id' OR
                  auth.jwt() ->> 'role' = 'master_admin'
        )
    );

CREATE POLICY "Workers can create their own attendance"
    ON attendance FOR INSERT
    TO authenticated
    WITH CHECK (
        employee_id::text IN (
            SELECT id::text FROM employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage team attendance"
    ON attendance FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role' IN ('admin', 'manager') AND
         employee_id::text IN (
             SELECT id::text FROM employees 
             WHERE organization_id::text = auth.jwt() ->> 'organization_id'
         )) OR
        auth.jwt() ->> 'role' = 'master_admin'
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Audit logs policies
CREATE POLICY "Admins can view audit logs for their organization"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role' = 'admin' AND 
         organization_id::text = auth.jwt() ->> 'organization_id') OR
        auth.jwt() ->> 'role' = 'master_admin'
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Add updated_at triggers to all tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_templates_updated_at BEFORE UPDATE ON role_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL PERMISSIONS DATA
-- =====================================================

-- Insert default permissions for each role
INSERT INTO permissions (role, resource, action) VALUES
-- Master Admin permissions (full access)
('master_admin', 'organizations', 'create'),
('master_admin', 'organizations', 'read'),
('master_admin', 'organizations', 'update'),
('master_admin', 'organizations', 'delete'),
('master_admin', 'users', 'create'),
('master_admin', 'users', 'read'),
('master_admin', 'users', 'update'),
('master_admin', 'users', 'delete'),
('master_admin', 'system', 'manage'),

-- Admin permissions (organization level)
('admin', 'employees', 'create'),
('admin', 'employees', 'read'),
('admin', 'employees', 'update'),
('admin', 'employees', 'delete'),
('admin', 'attendance', 'create'),
('admin', 'attendance', 'read'),
('admin', 'attendance', 'update'),
('admin', 'attendance', 'delete'),
('admin', 'shifts', 'create'),
('admin', 'shifts', 'read'),
('admin', 'shifts', 'update'),
('admin', 'shifts', 'delete'),
('admin', 'locations', 'create'),
('admin', 'locations', 'read'),
('admin', 'locations', 'update'),
('admin', 'locations', 'delete'),
('admin', 'reports', 'generate'),
('admin', 'audit_logs', 'read'),

-- Manager permissions
('manager', 'employees', 'read'),
('manager', 'employees', 'update'),
('manager', 'attendance', 'create'),
('manager', 'attendance', 'read'),
('manager', 'attendance', 'update'),
('manager', 'attendance', 'approve'),
('manager', 'shifts', 'read'),
('manager', 'shifts', 'assign'),
('manager', 'locations', 'read'),
('manager', 'reports', 'view'),

-- Worker permissions
('worker', 'attendance', 'create'),
('worker', 'attendance', 'read'),
('worker', 'profile', 'read'),
('worker', 'profile', 'update'),
('worker', 'shifts', 'read'),
('worker', 'locations', 'read');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations table';
COMMENT ON TABLE users IS 'System users with role-based access';
COMMENT ON TABLE employees IS 'Employee profiles linked to users';
COMMENT ON TABLE attendance IS 'Daily attendance records';
COMMENT ON TABLE shifts IS 'Work shift definitions';
COMMENT ON TABLE locations IS 'Physical locations for attendance tracking';
COMMENT ON TABLE permissions IS 'Role-based permission definitions';
COMMENT ON TABLE audit_logs IS 'System audit trail';
COMMENT ON TABLE sync_queue IS 'Offline sync queue for mobile apps';