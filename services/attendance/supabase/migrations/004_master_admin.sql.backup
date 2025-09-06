-- ============================================================================
-- Migration: Master Admin Database Schema
-- Description: Comprehensive schema for master admin functionality including
--              permissions, QR code management, and audit logging
-- Version: 004
-- Date: 2025-09-02
-- ============================================================================

-- ============================================================================
-- 1. UPDATE EMPLOYEES TABLE FOR MASTER ADMIN DISTINCTION
-- ============================================================================

-- Add role and master admin fields to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'master_admin')),
ADD COLUMN IF NOT EXISTS is_master_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS permissions_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS permissions_updated_by UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);

-- Create indexes for employee role queries
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_is_master_admin ON employees(is_master_admin) WHERE is_master_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_employees_account_locked ON employees(account_locked_until) WHERE account_locked_until IS NOT NULL;

-- ============================================================================
-- 2. MASTER ADMIN PERMISSIONS TABLE
-- ============================================================================

-- Create hierarchical permissions structure
CREATE TABLE IF NOT EXISTS master_admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Permission identification
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    permission_code VARCHAR(50) NOT NULL UNIQUE,
    permission_category VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Hierarchical structure
    parent_permission_id UUID REFERENCES master_admin_permissions(id) ON DELETE CASCADE,
    permission_level INTEGER NOT NULL DEFAULT 1,
    permission_path TEXT, -- Materialized path for efficient hierarchy queries
    
    -- Configuration
    is_system_permission BOOLEAN DEFAULT FALSE, -- Cannot be deleted if true
    requires_two_factor BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    max_delegation_level INTEGER DEFAULT 0, -- How many levels down can this be delegated
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    updated_by UUID REFERENCES employees(id),
    
    -- Constraints
    CONSTRAINT valid_permission_level CHECK (permission_level >= 1 AND permission_level <= 10),
    CONSTRAINT valid_delegation_level CHECK (max_delegation_level >= 0 AND max_delegation_level <= 5),
    CONSTRAINT no_self_parent CHECK (id != parent_permission_id)
);

-- Create indexes for permission queries
CREATE INDEX idx_permissions_code ON master_admin_permissions(permission_code);
CREATE INDEX idx_permissions_category ON master_admin_permissions(permission_category);
CREATE INDEX idx_permissions_parent ON master_admin_permissions(parent_permission_id);
CREATE INDEX idx_permissions_path ON master_admin_permissions(permission_path);
CREATE INDEX idx_permissions_active ON master_admin_permissions(is_active) WHERE is_active = TRUE;

-- Permission assignment table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS employee_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES master_admin_permissions(id) ON DELETE CASCADE,
    
    -- Grant details
    granted_by UUID NOT NULL REFERENCES employees(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Delegation
    can_delegate BOOLEAN DEFAULT FALSE,
    delegation_level INTEGER DEFAULT 0,
    delegated_from UUID REFERENCES employee_permissions(id), -- Track delegation chain
    
    -- Approval workflow
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'revoked')),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES employees(id),
    revoke_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(employee_id, permission_id),
    CONSTRAINT valid_delegation_level CHECK (delegation_level >= 0 AND delegation_level <= 5)
);

-- Create indexes for permission assignment queries
CREATE INDEX idx_employee_permissions_employee ON employee_permissions(employee_id);
CREATE INDEX idx_employee_permissions_permission ON employee_permissions(permission_id);
CREATE INDEX idx_employee_permissions_active ON employee_permissions(is_active, approval_status) 
    WHERE is_active = TRUE AND approval_status = 'approved';
CREATE INDEX idx_employee_permissions_expires ON employee_permissions(expires_at) 
    WHERE expires_at IS NOT NULL;
CREATE INDEX idx_employee_permissions_delegated ON employee_permissions(delegated_from) 
    WHERE delegated_from IS NOT NULL;

-- ============================================================================
-- 3. QR CODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- QR Code identification
    code VARCHAR(255) NOT NULL UNIQUE,
    qr_type VARCHAR(50) NOT NULL CHECK (qr_type IN ('check_in', 'check_out', 'meeting', 'event', 'visitor', 'temporary', 'permanent')),
    
    -- Purpose and scope
    purpose TEXT NOT NULL,
    description TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    single_use BOOLEAN DEFAULT FALSE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    
    -- Security
    requires_authentication BOOLEAN DEFAULT TRUE,
    allowed_roles TEXT[], -- Array of roles that can use this QR code
    allowed_employees UUID[], -- Specific employees who can use this QR code
    ip_restrictions INET[], -- IP addresses/ranges that can scan this QR
    
    -- Configuration
    auto_checkout_after_hours INTEGER, -- Auto checkout after X hours
    grace_period_minutes INTEGER DEFAULT 15, -- Grace period for late check-ins
    
    -- Generation details
    generated_by UUID NOT NULL REFERENCES employees(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generation_method VARCHAR(50) DEFAULT 'manual', -- manual, scheduled, api
    
    -- Status tracking
    is_active BOOLEAN DEFAULT TRUE,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivated_by UUID REFERENCES employees(id),
    deactivation_reason TEXT,
    
    -- Analytics
    scan_count INTEGER DEFAULT 0,
    last_scanned_at TIMESTAMP WITH TIME ZONE,
    last_scanned_by UUID REFERENCES employees(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_max_uses CHECK (max_uses IS NULL OR max_uses > 0),
    CONSTRAINT valid_current_uses CHECK (current_uses >= 0),
    CONSTRAINT uses_not_exceed_max CHECK (max_uses IS NULL OR current_uses <= max_uses),
    CONSTRAINT valid_validity_period CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- Create indexes for QR code queries
CREATE INDEX idx_qr_codes_code ON qr_codes(code);
CREATE INDEX idx_qr_codes_type ON qr_codes(qr_type);
CREATE INDEX idx_qr_codes_department ON qr_codes(department_id);
CREATE INDEX idx_qr_codes_location ON qr_codes(location_id);
CREATE INDEX idx_qr_codes_active ON qr_codes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_qr_codes_validity ON qr_codes(valid_from, valid_until);
CREATE INDEX idx_qr_codes_generated_by ON qr_codes(generated_by);
CREATE INDEX idx_qr_codes_single_use ON qr_codes(single_use, current_uses) WHERE single_use = TRUE;

-- QR Code scan history
CREATE TABLE IF NOT EXISTS qr_code_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    
    -- Scan details
    scanned_by UUID NOT NULL REFERENCES employees(id),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scan_location POINT, -- Geographic coordinates
    scan_ip INET,
    scan_device_info JSONB, -- User agent, device type, etc.
    
    -- Result
    scan_successful BOOLEAN NOT NULL,
    failure_reason TEXT,
    attendance_record_id UUID REFERENCES attendance_records(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes included below
    CONSTRAINT valid_scan_result CHECK (
        (scan_successful = TRUE AND failure_reason IS NULL) OR
        (scan_successful = FALSE AND failure_reason IS NOT NULL)
    )
);

-- Create indexes for QR scan history
CREATE INDEX idx_qr_scans_qr_code ON qr_code_scans(qr_code_id);
CREATE INDEX idx_qr_scans_employee ON qr_code_scans(scanned_by);
CREATE INDEX idx_qr_scans_timestamp ON qr_code_scans(scanned_at DESC);
CREATE INDEX idx_qr_scans_successful ON qr_code_scans(scan_successful);
CREATE INDEX idx_qr_scans_attendance ON qr_code_scans(attendance_record_id) WHERE attendance_record_id IS NOT NULL;

-- ============================================================================
-- 4. AUDIT LOG TABLES
-- ============================================================================

-- Master admin audit log for all administrative actions
CREATE TABLE IF NOT EXISTS master_admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor information
    actor_id UUID NOT NULL REFERENCES employees(id),
    actor_role VARCHAR(50) NOT NULL,
    actor_ip INET,
    actor_user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Action details
    action_type VARCHAR(100) NOT NULL,
    action_category VARCHAR(50) NOT NULL,
    action_description TEXT NOT NULL,
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Target information
    target_type VARCHAR(50), -- employees, permissions, qr_codes, etc.
    target_id UUID,
    target_name VARCHAR(255),
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Risk and compliance
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    requires_review BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES employees(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Result
    action_result VARCHAR(20) NOT NULL CHECK (action_result IN ('success', 'failure', 'partial', 'pending')),
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent tampering
    checksum VARCHAR(64) -- SHA-256 hash of critical fields
);

-- Create indexes for audit log queries
CREATE INDEX idx_audit_actor ON master_admin_audit_log(actor_id);
CREATE INDEX idx_audit_timestamp ON master_admin_audit_log(action_timestamp DESC);
CREATE INDEX idx_audit_action_type ON master_admin_audit_log(action_type);
CREATE INDEX idx_audit_action_category ON master_admin_audit_log(action_category);
CREATE INDEX idx_audit_target ON master_admin_audit_log(target_type, target_id);
CREATE INDEX idx_audit_risk_level ON master_admin_audit_log(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_audit_requires_review ON master_admin_audit_log(requires_review) WHERE requires_review = TRUE;
CREATE INDEX idx_audit_result ON master_admin_audit_log(action_result);
CREATE INDEX idx_audit_session ON master_admin_audit_log(session_id);

-- Permission change audit log
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Permission change details
    employee_id UUID NOT NULL REFERENCES employees(id),
    permission_id UUID REFERENCES master_admin_permissions(id),
    permission_name VARCHAR(100) NOT NULL,
    
    -- Change information
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('grant', 'revoke', 'modify', 'delegate', 'expire')),
    changed_by UUID NOT NULL REFERENCES employees(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Previous and new state
    previous_state JSONB,
    new_state JSONB,
    
    -- Justification
    change_reason TEXT NOT NULL,
    approval_reference VARCHAR(255),
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for permission audit log
CREATE INDEX idx_perm_audit_employee ON permission_audit_log(employee_id);
CREATE INDEX idx_perm_audit_permission ON permission_audit_log(permission_id);
CREATE INDEX idx_perm_audit_changed_by ON permission_audit_log(changed_by);
CREATE INDEX idx_perm_audit_timestamp ON permission_audit_log(changed_at DESC);
CREATE INDEX idx_perm_audit_change_type ON permission_audit_log(change_type);

-- ============================================================================
-- 5. SUPPORTING TABLES
-- ============================================================================

-- Master admin sessions for tracking active sessions
CREATE TABLE IF NOT EXISTS master_admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Session details
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Security
    ip_address INET NOT NULL,
    user_agent TEXT,
    two_factor_verified BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_expiry CHECK (expires_at > started_at)
);

-- Create indexes for session management
CREATE INDEX idx_sessions_token ON master_admin_sessions(session_token);
CREATE INDEX idx_sessions_employee ON master_admin_sessions(employee_id);
CREATE INDEX idx_sessions_active ON master_admin_sessions(is_active, expires_at) 
    WHERE is_active = TRUE;
CREATE INDEX idx_sessions_expiry ON master_admin_sessions(expires_at);

-- Master admin notifications
CREATE TABLE IF NOT EXISTS master_admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    recipient_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Action required
    requires_action BOOLEAN DEFAULT FALSE,
    action_type VARCHAR(50),
    action_deadline TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    
    -- Related entities
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_recipient ON master_admin_notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON master_admin_notifications(recipient_id, is_read) 
    WHERE is_read = FALSE;
CREATE INDEX idx_notifications_priority ON master_admin_notifications(priority, created_at DESC) 
    WHERE priority IN ('high', 'urgent');
CREATE INDEX idx_notifications_action ON master_admin_notifications(requires_action, action_deadline) 
    WHERE requires_action = TRUE;

-- ============================================================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_master_admin_permissions_updated_at 
    BEFORE UPDATE ON master_admin_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_permissions_updated_at 
    BEFORE UPDATE ON employee_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qr_codes_updated_at 
    BEFORE UPDATE ON qr_codes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate permission path for hierarchical queries
CREATE OR REPLACE FUNCTION calculate_permission_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
BEGIN
    IF NEW.parent_permission_id IS NULL THEN
        NEW.permission_path = '/' || NEW.id::TEXT || '/';
        NEW.permission_level = 1;
    ELSE
        SELECT permission_path, permission_level + 1
        INTO parent_path, NEW.permission_level
        FROM master_admin_permissions
        WHERE id = NEW.parent_permission_id;
        
        NEW.permission_path = parent_path || NEW.id::TEXT || '/';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_permission_path_trigger
    BEFORE INSERT OR UPDATE OF parent_permission_id ON master_admin_permissions
    FOR EACH ROW EXECUTE FUNCTION calculate_permission_path();

-- Function to audit permission changes
CREATE OR REPLACE FUNCTION audit_permission_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO permission_audit_log (
        employee_id,
        permission_id,
        permission_name,
        change_type,
        changed_by,
        previous_state,
        new_state,
        change_reason
    ) VALUES (
        COALESCE(NEW.employee_id, OLD.employee_id),
        COALESCE(NEW.permission_id, OLD.permission_id),
        (SELECT permission_name FROM master_admin_permissions WHERE id = COALESCE(NEW.permission_id, OLD.permission_id)),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'grant'
            WHEN TG_OP = 'DELETE' THEN 'revoke'
            ELSE 'modify'
        END,
        COALESCE(NEW.granted_by, NEW.revoked_by, OLD.granted_by),
        CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
        COALESCE(NEW.revoke_reason, 'Permission ' || LOWER(TG_OP))
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_employee_permissions_changes
    AFTER INSERT OR UPDATE OR DELETE ON employee_permissions
    FOR EACH ROW EXECUTE FUNCTION audit_permission_change();

-- Function to increment QR code scan count
CREATE OR REPLACE FUNCTION increment_qr_scan_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scan_successful = TRUE THEN
        UPDATE qr_codes
        SET 
            scan_count = scan_count + 1,
            current_uses = current_uses + 1,
            last_scanned_at = NEW.scanned_at,
            last_scanned_by = NEW.scanned_by
        WHERE id = NEW.qr_code_id;
        
        -- Deactivate single-use QR codes after use
        UPDATE qr_codes
        SET 
            is_active = FALSE,
            deactivated_at = NOW(),
            deactivation_reason = 'Single use QR code has been used'
        WHERE id = NEW.qr_code_id 
            AND single_use = TRUE;
        
        -- Deactivate QR codes that reached max uses
        UPDATE qr_codes
        SET 
            is_active = FALSE,
            deactivated_at = NOW(),
            deactivation_reason = 'Maximum uses reached'
        WHERE id = NEW.qr_code_id 
            AND max_uses IS NOT NULL 
            AND current_uses >= max_uses;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qr_scan_count
    AFTER INSERT ON qr_code_scans
    FOR EACH ROW EXECUTE FUNCTION increment_qr_scan_count();

-- Function to generate audit log checksum
CREATE OR REPLACE FUNCTION generate_audit_checksum()
RETURNS TRIGGER AS $$
BEGIN
    NEW.checksum = encode(
        sha256(
            (NEW.actor_id::TEXT || 
             NEW.action_type || 
             NEW.action_timestamp::TEXT || 
             COALESCE(NEW.target_id::TEXT, '') || 
             NEW.action_result)::bytea
        ), 
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_audit_checksum_trigger
    BEFORE INSERT ON master_admin_audit_log
    FOR EACH ROW EXECUTE FUNCTION generate_audit_checksum();

-- Function to auto-expire permissions
CREATE OR REPLACE FUNCTION expire_permissions()
RETURNS void AS $$
BEGIN
    UPDATE employee_permissions
    SET 
        is_active = FALSE,
        revoked_at = NOW(),
        revoke_reason = 'Permission expired'
    WHERE is_active = TRUE 
        AND expires_at IS NOT NULL 
        AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE master_admin_sessions
    SET 
        is_active = FALSE,
        terminated_at = NOW(),
        termination_reason = 'expired'
    WHERE is_active = TRUE 
        AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE master_admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_admin_notifications ENABLE ROW LEVEL SECURITY;

-- Master admins can see all permissions
CREATE POLICY master_admin_view_all_permissions ON master_admin_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND is_master_admin = TRUE
        )
    );

-- Employees can see their own permissions
CREATE POLICY employees_view_own_permissions ON employee_permissions
    FOR SELECT
    USING (employee_id = auth.uid());

-- Master admins can manage permissions
CREATE POLICY master_admin_manage_permissions ON employee_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND is_master_admin = TRUE
        )
    );

-- Audit logs are read-only for master admins
CREATE POLICY master_admin_view_audit_logs ON master_admin_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND is_master_admin = TRUE
        )
    );

-- Employees can view their own sessions
CREATE POLICY employees_view_own_sessions ON master_admin_sessions
    FOR SELECT
    USING (employee_id = auth.uid());

-- Employees can view their own notifications
CREATE POLICY employees_view_own_notifications ON master_admin_notifications
    FOR SELECT
    USING (recipient_id = auth.uid());

-- ============================================================================
-- 8. INITIAL DATA SEED
-- ============================================================================

-- Insert core system permissions
INSERT INTO master_admin_permissions (
    permission_name, 
    permission_code, 
    permission_category,
    description,
    is_system_permission,
    requires_two_factor
) VALUES 
    ('Full System Access', 'system.full_access', 'system', 'Complete control over all system functions', TRUE, TRUE),
    ('Manage Employees', 'employees.manage', 'employees', 'Create, update, and delete employee records', TRUE, FALSE),
    ('View Employees', 'employees.view', 'employees', 'View employee information', TRUE, FALSE),
    ('Manage Permissions', 'permissions.manage', 'permissions', 'Grant and revoke permissions', TRUE, TRUE),
    ('View Permissions', 'permissions.view', 'permissions', 'View permission assignments', TRUE, FALSE),
    ('Manage QR Codes', 'qr.manage', 'qr_codes', 'Create and manage QR codes', TRUE, FALSE),
    ('View QR Codes', 'qr.view', 'qr_codes', 'View QR code information', TRUE, FALSE),
    ('View Audit Logs', 'audit.view', 'audit', 'View system audit logs', TRUE, FALSE),
    ('Manage Departments', 'departments.manage', 'organization', 'Create and manage departments', TRUE, FALSE),
    ('View Departments', 'departments.view', 'organization', 'View department information', FALSE, FALSE),
    ('Manage Locations', 'locations.manage', 'organization', 'Create and manage locations', TRUE, FALSE),
    ('View Locations', 'locations.view', 'organization', 'View location information', FALSE, FALSE),
    ('Manage Attendance', 'attendance.manage', 'attendance', 'Manage attendance records', TRUE, FALSE),
    ('View All Attendance', 'attendance.view_all', 'attendance', 'View all attendance records', TRUE, FALSE),
    ('View Own Attendance', 'attendance.view_own', 'attendance', 'View own attendance records', FALSE, FALSE),
    ('Generate Reports', 'reports.generate', 'reports', 'Generate system reports', TRUE, FALSE),
    ('Export Data', 'data.export', 'data', 'Export system data', TRUE, TRUE),
    ('Import Data', 'data.import', 'data', 'Import data into system', TRUE, TRUE),
    ('System Configuration', 'system.config', 'system', 'Modify system configuration', TRUE, TRUE),
    ('Backup Management', 'backup.manage', 'system', 'Manage system backups', TRUE, TRUE)
ON CONFLICT (permission_code) DO NOTHING;

-- Create permission hierarchy
UPDATE master_admin_permissions SET parent_permission_id = 
    (SELECT id FROM master_admin_permissions WHERE permission_code = 'employees.manage')
WHERE permission_code = 'employees.view';

UPDATE master_admin_permissions SET parent_permission_id = 
    (SELECT id FROM master_admin_permissions WHERE permission_code = 'permissions.manage')
WHERE permission_code = 'permissions.view';

UPDATE master_admin_permissions SET parent_permission_id = 
    (SELECT id FROM master_admin_permissions WHERE permission_code = 'qr.manage')
WHERE permission_code = 'qr.view';

UPDATE master_admin_permissions SET parent_permission_id = 
    (SELECT id FROM master_admin_permissions WHERE permission_code = 'departments.manage')
WHERE permission_code = 'departments.view';

UPDATE master_admin_permissions SET parent_permission_id = 
    (SELECT id FROM master_admin_permissions WHERE permission_code = 'locations.manage')
WHERE permission_code = 'locations.view';

UPDATE master_admin_permissions SET parent_permission_id = 
    (SELECT id FROM master_admin_permissions WHERE permission_code = 'attendance.view_all')
WHERE permission_code = 'attendance.view_own';

-- ============================================================================
-- 9. PERFORMANCE OPTIMIZATION VIEWS
-- ============================================================================

-- View for active employee permissions with details
CREATE OR REPLACE VIEW v_active_employee_permissions AS
SELECT 
    ep.id,
    ep.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    e.email AS employee_email,
    e.role AS employee_role,
    e.is_master_admin,
    ep.permission_id,
    p.permission_name,
    p.permission_code,
    p.permission_category,
    p.requires_two_factor,
    ep.granted_by,
    granter.first_name || ' ' || granter.last_name AS granted_by_name,
    ep.granted_at,
    ep.expires_at,
    ep.can_delegate,
    ep.delegation_level
FROM employee_permissions ep
INNER JOIN employees e ON ep.employee_id = e.id
INNER JOIN master_admin_permissions p ON ep.permission_id = p.id
LEFT JOIN employees granter ON ep.granted_by = granter.id
WHERE ep.is_active = TRUE 
    AND ep.approval_status = 'approved'
    AND (ep.expires_at IS NULL OR ep.expires_at > NOW());

-- View for QR code usage statistics
CREATE OR REPLACE VIEW v_qr_code_statistics AS
SELECT 
    q.id,
    q.code,
    q.qr_type,
    q.purpose,
    q.department_id,
    d.name AS department_name,
    q.location_id,
    l.name AS location_name,
    q.scan_count,
    q.current_uses,
    q.max_uses,
    q.valid_from,
    q.valid_until,
    q.is_active,
    q.generated_by,
    generator.first_name || ' ' || generator.last_name AS generated_by_name,
    COUNT(DISTINCT qs.scanned_by) AS unique_users,
    MAX(qs.scanned_at) AS last_scan_time
FROM qr_codes q
LEFT JOIN departments d ON q.department_id = d.id
LEFT JOIN locations l ON q.location_id = l.id
LEFT JOIN employees generator ON q.generated_by = generator.id
LEFT JOIN qr_code_scans qs ON q.id = qs.qr_code_id
GROUP BY q.id, d.id, l.id, generator.id;

-- View for recent audit activities
CREATE OR REPLACE VIEW v_recent_audit_activities AS
SELECT 
    a.id,
    a.actor_id,
    actor.first_name || ' ' || actor.last_name AS actor_name,
    actor.email AS actor_email,
    a.actor_role,
    a.action_type,
    a.action_category,
    a.action_description,
    a.action_timestamp,
    a.target_type,
    a.target_id,
    a.target_name,
    a.risk_level,
    a.action_result,
    a.error_message
FROM master_admin_audit_log a
INNER JOIN employees actor ON a.actor_id = actor.id
WHERE a.action_timestamp > NOW() - INTERVAL '30 days'
ORDER BY a.action_timestamp DESC;

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to the application role (adjust role name as needed)
-- These grants assume you have an 'app_user' role for your application

-- Grant usage on schema
-- GRANT USAGE ON SCHEMA public TO app_user;

-- Grant appropriate permissions on tables
-- GRANT SELECT, INSERT, UPDATE ON employees TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON master_admin_permissions TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON employee_permissions TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON qr_codes TO app_user;
-- GRANT SELECT, INSERT ON qr_code_scans TO app_user;
-- GRANT SELECT, INSERT ON master_admin_audit_log TO app_user;
-- GRANT SELECT, INSERT ON permission_audit_log TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON master_admin_sessions TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON master_admin_notifications TO app_user;

-- Grant permissions on views
-- GRANT SELECT ON v_active_employee_permissions TO app_user;
-- GRANT SELECT ON v_qr_code_statistics TO app_user;
-- GRANT SELECT ON v_recent_audit_activities TO app_user;

-- Grant execute on functions
-- GRANT EXECUTE ON FUNCTION expire_permissions() TO app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO app_user;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Add migration completion record
INSERT INTO schema_migrations (version, name, executed_at) 
VALUES ('004', 'master_admin', NOW())
ON CONFLICT (version) DO NOTHING;