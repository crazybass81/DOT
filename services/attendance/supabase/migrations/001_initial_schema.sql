-- Initial Schema Migration for DOT Attendance System
-- Version: 1.0.0
-- Date: 2025-09-01

-- ===============================================
-- ENABLE REQUIRED EXTENSIONS
-- ===============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ===============================================
-- CREATE ENUMS
-- ===============================================
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE attendance_status AS ENUM ('NOT_WORKING', 'WORKING', 'ON_BREAK', 'COMPLETED');
CREATE TYPE break_status AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE employee_role AS ENUM ('EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN');

-- ===============================================
-- CREATE ORGANIZATIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- CREATE BRANCHES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geofence_radius INTEGER DEFAULT 100, -- in meters
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- Create spatial index for location queries
CREATE INDEX idx_branches_location ON branches USING GIST (
    ST_MakePoint(longitude, latitude)
);

-- ===============================================
-- CREATE DEPARTMENTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- ===============================================
-- CREATE POSITIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- ===============================================
-- CREATE EMPLOYEES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    
    -- Basic Information
    employee_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    
    -- Authentication
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    password_hash TEXT, -- For non-Supabase auth fallback
    
    -- Device Registration
    device_id VARCHAR(255) UNIQUE,
    qr_registered_device_id VARCHAR(255) UNIQUE,
    fcm_token TEXT,
    
    -- Approval System
    approval_status approval_status DEFAULT 'PENDING',
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES employees(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Permissions
    role employee_role DEFAULT 'EMPLOYEE',
    is_master_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT false,
    
    -- Profile
    avatar_url TEXT,
    date_of_birth DATE,
    join_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_approval_consistency CHECK (
        (approval_status = 'APPROVED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (approval_status = 'REJECTED' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL) OR
        (approval_status IN ('PENDING', 'SUSPENDED'))
    )
);

-- ===============================================
-- CREATE LOCATIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius INTEGER DEFAULT 50, -- in meters
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- Create spatial index for location queries
CREATE INDEX idx_locations_point ON locations USING GIST (
    ST_MakePoint(longitude, latitude)
);

-- ===============================================
-- CREATE ATTENDANCE TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Check-in Information
    check_in_time TIMESTAMPTZ,
    check_in_location UUID REFERENCES locations(id),
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_in_address TEXT,
    check_in_device_id VARCHAR(255),
    
    -- Check-out Information
    check_out_time TIMESTAMPTZ,
    check_out_location UUID REFERENCES locations(id),
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    check_out_address TEXT,
    check_out_device_id VARCHAR(255),
    
    -- Working Time Calculation
    status attendance_status DEFAULT 'NOT_WORKING',
    total_work_minutes INTEGER DEFAULT 0,
    break_minutes INTEGER DEFAULT 0,
    actual_work_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    
    -- Break Management
    current_break_start TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    is_holiday BOOLEAN DEFAULT false,
    is_leave BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, date),
    CONSTRAINT check_checkout_after_checkin CHECK (
        check_out_time IS NULL OR check_out_time > check_in_time
    )
);

-- Create indexes for performance
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date DESC);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- ===============================================
-- CREATE BREAKS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    status break_status DEFAULT 'ACTIVE',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_break_times CHECK (
        end_time IS NULL OR end_time > start_time
    )
);

-- Create index for break queries
CREATE INDEX idx_breaks_attendance ON breaks(attendance_id);
CREATE INDEX idx_breaks_status ON breaks(status);

-- ===============================================
-- CREATE APPROVAL HISTORY TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS approval_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- REGISTERED, APPROVED, REJECTED, SUSPENDED, REACTIVATED
    performed_by UUID REFERENCES employees(id),
    performed_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for history queries
CREATE INDEX idx_approval_history_employee ON approval_history(employee_id);
CREATE INDEX idx_approval_history_action ON approval_history(action);

-- ===============================================
-- CREATE QR CODES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    code VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    type VARCHAR(50) NOT NULL, -- LOCATION, EMPLOYEE, TEMPORARY
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for QR code lookups
CREATE INDEX idx_qr_codes_code ON qr_codes(code);
CREATE INDEX idx_qr_codes_type ON qr_codes(type);

-- ===============================================
-- CREATE FUNCTIONS
-- ===============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate working minutes
CREATE OR REPLACE FUNCTION calculate_working_minutes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_out_time IS NOT NULL AND NEW.check_in_time IS NOT NULL THEN
        NEW.total_work_minutes = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
        NEW.actual_work_minutes = NEW.total_work_minutes - COALESCE(NEW.break_minutes, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check location within geofence
CREATE OR REPLACE FUNCTION is_within_geofence(
    lat1 DECIMAL(10, 8),
    lon1 DECIMAL(11, 8),
    lat2 DECIMAL(10, 8),
    lon2 DECIMAL(11, 8),
    radius_meters INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    distance_meters FLOAT;
BEGIN
    -- Calculate distance using Haversine formula
    distance_meters = ST_Distance(
        ST_MakePoint(lon1, lat1)::geography,
        ST_MakePoint(lon2, lat2)::geography
    );
    
    RETURN distance_meters <= radius_meters;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- CREATE TRIGGERS
-- ===============================================

-- Update triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breaks_updated_at BEFORE UPDATE ON breaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON qr_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate working minutes trigger
CREATE TRIGGER calculate_attendance_working_minutes BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION calculate_working_minutes();

-- ===============================================
-- CREATE ROW LEVEL SECURITY POLICIES
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Employee policies
CREATE POLICY "Employees can view their own data" ON employees
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Employees can update their own profile" ON employees
    FOR UPDATE USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Master admin can manage all employees" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND is_master_admin = true
        )
    );

-- Attendance policies
CREATE POLICY "Employees can view their own attendance" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = attendance.employee_id 
            AND auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can create their own attendance" ON attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = attendance.employee_id 
            AND auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can update their own attendance" ON attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = attendance.employee_id 
            AND auth_user_id = auth.uid()
        )
    );

-- Managers can view their team's attendance
CREATE POLICY "Managers can view team attendance" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees manager
            JOIN employees employee ON employee.department_id = manager.department_id
            WHERE manager.auth_user_id = auth.uid()
            AND manager.role IN ('MANAGER', 'ADMIN', 'MASTER_ADMIN')
            AND employee.id = attendance.employee_id
        )
    );

-- ===============================================
-- INSERT DEFAULT DATA
-- ===============================================

-- Insert default organization
INSERT INTO organizations (id, name, code, description)
VALUES ('00000000-0000-0000-0000-000000000001', 'DOT Inc.', 'DOT', 'Default Organization')
ON CONFLICT DO NOTHING;

-- Insert default branch
INSERT INTO branches (id, organization_id, name, code, address, latitude, longitude)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Main Office',
    'MAIN',
    '123 Main St, City, Country',
    37.5665,
    126.9780
) ON CONFLICT DO NOTHING;

-- Insert default department
INSERT INTO departments (id, organization_id, branch_id, name, code)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'General',
    'GEN'
) ON CONFLICT DO NOTHING;

-- Insert default position
INSERT INTO positions (id, organization_id, department_id, name, code)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'Employee',
    'EMP'
) ON CONFLICT DO NOTHING;

-- ===============================================
-- CREATE VIEWS
-- ===============================================

-- View for attendance summary
CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT 
    a.employee_id,
    e.name as employee_name,
    e.employee_code,
    a.date,
    a.check_in_time,
    a.check_out_time,
    a.status,
    a.total_work_minutes,
    a.break_minutes,
    a.actual_work_minutes,
    a.overtime_minutes,
    COUNT(b.id) as break_count
FROM attendance a
JOIN employees e ON e.id = a.employee_id
LEFT JOIN breaks b ON b.attendance_id = a.id
GROUP BY a.id, e.id;

-- View for pending approvals
CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT 
    e.id,
    e.name,
    e.email,
    e.phone,
    d.name as department,
    p.name as position,
    e.created_at as submitted_at
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN positions p ON p.id = e.position_id
WHERE e.approval_status = 'PENDING'
ORDER BY e.created_at DESC;

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on tables to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;