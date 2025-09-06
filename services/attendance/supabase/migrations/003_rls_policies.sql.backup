-- ================================================
-- Row Level Security (RLS) Policies
-- Version: 1.0.0
-- Date: 2025-01-02
-- Description: Comprehensive RLS policies for attendance system
-- ================================================

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- ================================================
-- EMPLOYEES TABLE POLICIES
-- ================================================

-- Policy: Employees can view their own data
CREATE POLICY "employees_self_select" ON employees
    FOR SELECT
    USING (auth.uid() = auth_user_id);

-- Policy: Employees can update their own profile (limited fields)
CREATE POLICY "employees_self_update" ON employees
    FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (
        auth.uid() = auth_user_id AND
        -- Prevent updating sensitive fields
        role = (SELECT role FROM employees WHERE id = employees.id) AND
        approval_status = (SELECT approval_status FROM employees WHERE id = employees.id)
    );

-- Policy: Managers can view employees in their branch
CREATE POLICY "managers_view_branch_employees" ON employees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.auth_user_id = auth.uid()
            AND e.role IN ('MANAGER', 'ADMIN', 'MASTER_ADMIN')
            AND e.branch_id = employees.branch_id
        )
    );

-- Policy: Admins can view all employees in their organization
CREATE POLICY "admins_view_org_employees" ON employees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.auth_user_id = auth.uid()
            AND e.role IN ('ADMIN', 'MASTER_ADMIN')
            AND e.organization_id = employees.organization_id
        )
    );

-- Policy: Master Admins can do everything
CREATE POLICY "master_admin_all" ON employees
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE auth_user_id = auth.uid()
            AND is_master_admin = true
        )
    );

-- ================================================
-- ATTENDANCE TABLE POLICIES
-- ================================================

-- Policy: Employees can view their own attendance
CREATE POLICY "attendance_self_select" ON attendance
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );

-- Policy: Employees can insert their own attendance
CREATE POLICY "attendance_self_insert" ON attendance
    FOR INSERT
    WITH CHECK (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
            AND approval_status = 'APPROVED'
        )
    );

-- Policy: Employees can update their own attendance (today only)
CREATE POLICY "attendance_self_update_today" ON attendance
    FOR UPDATE
    USING (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        ) AND date = CURRENT_DATE
    );

-- Policy: Managers can view attendance for their branch
CREATE POLICY "managers_view_branch_attendance" ON attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees e1, employees e2
            WHERE e1.auth_user_id = auth.uid()
            AND e1.role IN ('MANAGER', 'ADMIN', 'MASTER_ADMIN')
            AND e2.id = attendance.employee_id
            AND e1.branch_id = e2.branch_id
        )
    );

-- ================================================
-- BRANCHES TABLE POLICIES
-- ================================================

-- Policy: All authenticated users can view branches
CREATE POLICY "branches_select_authenticated" ON branches
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Only admins can modify branches
CREATE POLICY "branches_admin_modify" ON branches
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE auth_user_id = auth.uid()
            AND role IN ('ADMIN', 'MASTER_ADMIN')
        )
    );

-- ================================================
-- ORGANIZATIONS TABLE POLICIES
-- ================================================

-- Policy: All authenticated users can view their organization
CREATE POLICY "organizations_select_own" ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM employees
            WHERE auth_user_id = auth.uid()
        )
    );

-- Policy: Only master admins can modify organizations
CREATE POLICY "organizations_master_admin_all" ON organizations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE auth_user_id = auth.uid()
            AND is_master_admin = true
        )
    );

-- ================================================
-- HELPER FUNCTIONS FOR RLS
-- ================================================

-- Function: Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS employee_role AS $$
BEGIN
    RETURN (
        SELECT role FROM employees
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is admin or higher
CREATE OR REPLACE FUNCTION is_admin_or_higher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employees
        WHERE auth_user_id = auth.uid()
        AND role IN ('ADMIN', 'MASTER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is master admin
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employees
        WHERE auth_user_id = auth.uid()
        AND is_master_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_higher() TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_admin() TO authenticated;