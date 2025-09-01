-- =====================================================
-- EMPLOYEE APPROVAL SYSTEM UPDATE
-- =====================================================

-- Add approval status columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Add constraint for approval_status
ALTER TABLE employees 
ADD CONSTRAINT check_approval_status 
CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));

-- Create index for approval status
CREATE INDEX IF NOT EXISTS idx_employees_approval_status 
ON employees(approval_status);

-- =====================================================
-- APPROVAL REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- REGISTRATION, UPDATE, REACTIVATION
    request_data JSONB,
    status VARCHAR(50) DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- UPDATED REGISTRATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION register_employee_via_qr(
    p_email VARCHAR,
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_phone VARCHAR,
    p_employee_code VARCHAR,
    p_branch_id UUID,
    p_device_id VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_employee_id UUID;
    v_organization_id UUID;
BEGIN
    -- Get organization from branch
    SELECT organization_id INTO v_organization_id
    FROM branches WHERE id = p_branch_id;
    
    -- Check if employee already exists
    SELECT id INTO v_employee_id
    FROM employees 
    WHERE email = p_email OR employee_code = p_employee_code;
    
    IF v_employee_id IS NOT NULL THEN
        -- Update existing employee
        UPDATE employees 
        SET 
            qr_registered = true,
            qr_registered_at = NOW(),
            qr_registered_device_id = p_device_id,
            approval_status = 'PENDING', -- Reset to pending for re-registration
            updated_at = NOW()
        WHERE id = v_employee_id;
    ELSE
        -- Create new employee with PENDING status
        INSERT INTO employees (
            employee_code,
            first_name,
            last_name,
            email,
            phone,
            organization_id,
            branch_id,
            hire_date,
            qr_registered,
            qr_registered_at,
            qr_registered_device_id,
            approval_status,
            is_active
        ) VALUES (
            p_employee_code,
            p_first_name,
            p_last_name,
            p_email,
            p_phone,
            v_organization_id,
            p_branch_id,
            CURRENT_DATE,
            true,
            NOW(),
            p_device_id,
            'PENDING',
            false -- Not active until approved
        ) RETURNING id INTO v_employee_id;
    END IF;
    
    -- Create approval request
    INSERT INTO approval_requests (
        employee_id,
        request_type,
        request_data,
        status
    ) VALUES (
        v_employee_id,
        'REGISTRATION',
        jsonb_build_object(
            'email', p_email,
            'first_name', p_first_name,
            'last_name', p_last_name,
            'employee_code', p_employee_code,
            'phone', p_phone,
            'branch_id', p_branch_id,
            'device_id', p_device_id
        ),
        'PENDING'
    );
    
    RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CHECK EMPLOYEE STATUS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION check_employee_status(
    p_email VARCHAR DEFAULT NULL,
    p_device_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    status VARCHAR,
    employee_id UUID,
    approval_status VARCHAR,
    organization_name VARCHAR,
    branch_name VARCHAR,
    is_active BOOLEAN,
    rejection_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN e.id IS NULL THEN 'NOT_REGISTERED'
            WHEN e.approval_status = 'PENDING' THEN 'PENDING_APPROVAL'
            WHEN e.approval_status = 'APPROVED' THEN 'APPROVED'
            WHEN e.approval_status = 'REJECTED' THEN 'REJECTED'
            WHEN e.approval_status = 'SUSPENDED' THEN 'SUSPENDED'
            ELSE 'UNKNOWN'
        END as status,
        e.id,
        e.approval_status,
        o.name,
        b.name,
        e.is_active,
        e.rejection_reason
    FROM employees e
    LEFT JOIN organizations o ON e.organization_id = o.id
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE (p_email IS NOT NULL AND e.email = p_email)
       OR (p_device_id IS NOT NULL AND e.qr_registered_device_id = p_device_id)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- APPROVE EMPLOYEE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION approve_employee(
    p_employee_id UUID,
    p_approver_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_success BOOLEAN := false;
BEGIN
    -- Update employee status
    UPDATE employees 
    SET 
        approval_status = 'APPROVED',
        approved_by = p_approver_id,
        approved_at = NOW(),
        is_active = true,
        updated_at = NOW()
    WHERE id = p_employee_id
    AND approval_status = 'PENDING';
    
    IF FOUND THEN
        -- Update approval request
        UPDATE approval_requests
        SET 
            status = 'APPROVED',
            reviewed_by = p_approver_id,
            reviewed_at = NOW(),
            review_notes = p_notes
        WHERE employee_id = p_employee_id
        AND status = 'PENDING';
        
        v_success := true;
    END IF;
    
    RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- REJECT EMPLOYEE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION reject_employee(
    p_employee_id UUID,
    p_rejector_id UUID,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_success BOOLEAN := false;
BEGIN
    -- Update employee status
    UPDATE employees 
    SET 
        approval_status = 'REJECTED',
        rejected_by = p_rejector_id,
        rejected_at = NOW(),
        rejection_reason = p_reason,
        is_active = false,
        updated_at = NOW()
    WHERE id = p_employee_id
    AND approval_status = 'PENDING';
    
    IF FOUND THEN
        -- Update approval request
        UPDATE approval_requests
        SET 
            status = 'REJECTED',
            reviewed_by = p_rejector_id,
            reviewed_at = NOW(),
            review_notes = p_reason
        WHERE employee_id = p_employee_id
        AND status = 'PENDING';
        
        v_success := true;
    END IF;
    
    RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GET PENDING APPROVALS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION get_pending_approvals(
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    employee_id UUID,
    employee_code VARCHAR,
    full_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    branch_name VARCHAR,
    requested_at TIMESTAMPTZ,
    device_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.employee_code,
        e.full_name,
        e.email,
        e.phone,
        b.name as branch_name,
        e.qr_registered_at,
        e.qr_registered_device_id
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.approval_status = 'PENDING'
    AND (p_organization_id IS NULL OR e.organization_id = p_organization_id)
    ORDER BY e.qr_registered_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES FOR APPROVAL REQUESTS
-- =====================================================
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Admins can view all approval requests in their organization
CREATE POLICY "Admins can view approval requests" ON approval_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e1
            JOIN employees e2 ON e1.organization_id = e2.organization_id
            WHERE e1.user_id = auth.uid() 
            AND e1.role IN ('ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN')
            AND e2.id = approval_requests.employee_id
        )
    );

-- Admins can update approval requests in their organization
CREATE POLICY "Admins can update approval requests" ON approval_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees e1
            JOIN employees e2 ON e1.organization_id = e2.organization_id
            WHERE e1.user_id = auth.uid() 
            AND e1.role IN ('ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN')
            AND e2.id = approval_requests.employee_id
        )
    );

-- Employees can view their own approval requests
CREATE POLICY "Employees can view own approval requests" ON approval_requests
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        )
    );

COMMENT ON COLUMN employees.approval_status IS '승인 상태: PENDING(대기), APPROVED(승인), REJECTED(거부), SUSPENDED(정지)';
COMMENT ON TABLE approval_requests IS '직원 등록 및 변경 승인 요청 테이블';