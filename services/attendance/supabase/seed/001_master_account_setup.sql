-- ===============================================
-- Master Account Setup for archt723@gmail.com
-- ===============================================
-- This account will have MASTER_ADMIN role which includes all permissions
-- No need for multiple registrations - one account with highest role

-- First, ensure the user exists in auth.users (Supabase Auth)
-- Note: User must sign up through Supabase Auth first

-- Insert or update employee record with MASTER_ADMIN role
INSERT INTO employees (
    id,
    email,
    name,
    phone,
    role,
    department_id,
    is_active,
    created_at
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'archt723@gmail.com'),
    'archt723@gmail.com',
    'Master Administrator',
    '010-0000-0000',
    'MASTER_ADMIN'::employee_role,  -- Highest role with all permissions
    NULL,  -- No department restriction for master admin
    true,
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'MASTER_ADMIN'::employee_role,
    is_active = true,
    updated_at = NOW();

-- Grant all system permissions to master admin
INSERT INTO employee_permissions (
    employee_id,
    permission_id,
    is_active,
    approval_status,
    notes
)
SELECT 
    (SELECT id FROM employees WHERE email = 'archt723@gmail.com'),
    id,
    true,
    'approved',
    'Auto-granted to Master Administrator'
FROM master_admin_permissions
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Create audit log entry
INSERT INTO master_admin_audit_logs (
    action_type,
    actor_id,
    actor_role,
    action_details,
    ip_address
) VALUES (
    'CREATE',
    (SELECT id FROM employees WHERE email = 'archt723@gmail.com'),
    'MASTER_ADMIN',
    jsonb_build_object(
        'description', 'Master Administrator account created with full permissions',
        'email', 'archt723@gmail.com',
        'permissions_granted', 'ALL'
    ),
    '127.0.0.1'
);

-- Verify setup
DO $$
DECLARE
    user_role employee_role;
    permission_count INTEGER;
BEGIN
    -- Check role
    SELECT role INTO user_role 
    FROM employees 
    WHERE email = 'archt723@gmail.com';
    
    RAISE NOTICE 'User role: %', user_role;
    
    -- Check permissions
    SELECT COUNT(*) INTO permission_count
    FROM employee_permissions ep
    JOIN employees e ON ep.employee_id = e.id
    WHERE e.email = 'archt723@gmail.com'
    AND ep.is_active = true;
    
    RAISE NOTICE 'Active permissions: %', permission_count;
    
    IF user_role = 'MASTER_ADMIN' THEN
        RAISE NOTICE '✅ Master Admin setup complete!';
        RAISE NOTICE '📋 This account can now:';
        RAISE NOTICE '   - Perform all employee functions';
        RAISE NOTICE '   - Manage other employees and departments';
        RAISE NOTICE '   - Access admin dashboard and reports';
        RAISE NOTICE '   - Configure system settings';
        RAISE NOTICE '   - Everything a MANAGER, ADMIN can do + more';
    END IF;
END $$;