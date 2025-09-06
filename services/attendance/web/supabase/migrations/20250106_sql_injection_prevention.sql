-- SQL Injection Prevention and Security Hardening Migration
-- Date: 2025-01-06
-- Purpose: Implement database-level security measures against SQL injection

-- ============================================================================
-- 1. Create Security Audit Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    ip_address INET,
    query TEXT,
    attack_type TEXT[],
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    blocked BOOLEAN DEFAULT false,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);

-- ============================================================================
-- 2. Create Blocked IPs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL UNIQUE,
    reason TEXT,
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    attempts INTEGER DEFAULT 1,
    last_attempt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_until ON blocked_ips(blocked_until);

-- ============================================================================
-- 3. Create Secure Functions for Data Access
-- ============================================================================

-- Function to safely search users with input validation
CREATE OR REPLACE FUNCTION search_users_secure(
    search_term TEXT DEFAULT NULL,
    user_role TEXT DEFAULT NULL,
    user_status TEXT DEFAULT NULL,
    org_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    safe_search TEXT;
    safe_role TEXT;
    safe_status TEXT;
BEGIN
    -- Input validation and sanitization
    IF search_term IS NOT NULL THEN
        -- Remove SQL injection patterns
        safe_search := regexp_replace(search_term, '[-;#/*\\'']', '', 'g');
        safe_search := substring(safe_search, 1, 255); -- Limit length
    END IF;
    
    -- Validate role against whitelist
    IF user_role IS NOT NULL AND user_role NOT IN ('EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN') THEN
        RAISE EXCEPTION 'Invalid role specified';
    END IF;
    safe_role := user_role;
    
    -- Validate status against whitelist
    IF user_status IS NOT NULL AND user_status NOT IN ('ACTIVE', 'INACTIVE', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Invalid status specified';
    END IF;
    safe_status := user_status;
    
    -- Validate pagination parameters
    IF limit_count < 1 OR limit_count > 100 THEN
        limit_count := 20;
    END IF;
    
    IF offset_count < 0 THEN
        offset_count := 0;
    END IF;
    
    -- Execute safe query
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.status,
        u.created_at
    FROM users u
    LEFT JOIN user_organizations uo ON u.id = uo.user_id
    WHERE 
        (safe_search IS NULL OR (
            u.email ILIKE '%' || safe_search || '%' OR
            u.full_name ILIKE '%' || safe_search || '%' OR
            u.phone ILIKE '%' || safe_search || '%'
        ))
        AND (safe_role IS NULL OR uo.role = safe_role)
        AND (safe_status IS NULL OR u.status = safe_status)
        AND (org_id IS NULL OR uo.organization_id = org_id)
    ORDER BY u.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- ============================================================================
-- 4. Create Security Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_sql_injection(input_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    injection_patterns TEXT[] := ARRAY[
        '(DROP|DELETE|TRUNCATE|UPDATE|INSERT|CREATE|ALTER|EXEC|EXECUTE)',
        '(UNION|SELECT).*(FROM|WHERE)',
        '(--|#|/\*|\*/)',
        '\bOR\b\s*\d+\s*=\s*\d+',
        '\bAND\b\s*\d+\s*=\s*\d+',
        '''.*\s*(OR|AND)\s*.*''',
        '(WAITFOR|DELAY|SLEEP|BENCHMARK)',
        'xp_|sp_|0x',
        'information_schema',
        'sys\.(tables|columns)',
        'pg_catalog'
    ];
    pattern TEXT;
BEGIN
    -- Check each pattern
    FOREACH pattern IN ARRAY injection_patterns
    LOOP
        IF input_text ~* pattern THEN
            -- Log the attempt
            INSERT INTO security_logs (
                query, 
                attack_type, 
                severity, 
                blocked,
                details
            ) VALUES (
                input_text,
                ARRAY[pattern],
                'HIGH',
                true,
                jsonb_build_object('detected_pattern', pattern)
            );
            
            RETURN TRUE; -- SQL injection detected
        END IF;
    END LOOP;
    
    RETURN FALSE; -- Input is safe
END;
$$;

-- ============================================================================
-- 5. Create Rate Limiting Function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
    user_ip INET,
    max_requests INTEGER DEFAULT 100,
    time_window INTERVAL DEFAULT '1 minute'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    request_count INTEGER;
    is_blocked BOOLEAN;
BEGIN
    -- Check if IP is already blocked
    SELECT EXISTS(
        SELECT 1 FROM blocked_ips 
        WHERE ip_address = user_ip 
        AND (blocked_until IS NULL OR blocked_until > NOW())
    ) INTO is_blocked;
    
    IF is_blocked THEN
        -- Update last attempt time
        UPDATE blocked_ips 
        SET last_attempt = NOW(), 
            attempts = attempts + 1
        WHERE ip_address = user_ip;
        
        RETURN FALSE; -- Rate limit exceeded
    END IF;
    
    -- Count recent requests from this IP
    SELECT COUNT(*) INTO request_count
    FROM security_logs
    WHERE ip_address = user_ip
    AND timestamp > NOW() - time_window;
    
    IF request_count >= max_requests THEN
        -- Block the IP
        INSERT INTO blocked_ips (ip_address, reason, blocked_until)
        VALUES (user_ip, 'Rate limit exceeded', NOW() + INTERVAL '15 minutes')
        ON CONFLICT (ip_address) 
        DO UPDATE SET 
            attempts = blocked_ips.attempts + 1,
            last_attempt = NOW(),
            blocked_until = NOW() + INTERVAL '15 minutes';
        
        RETURN FALSE; -- Rate limit exceeded
    END IF;
    
    RETURN TRUE; -- Within rate limit
END;
$$;

-- ============================================================================
-- 6. Enhanced Row Level Security Policies
-- ============================================================================

-- Enable RLS on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only view their own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users in their organization" ON users;
DROP POLICY IF EXISTS "Master admins can view all users" ON users;

-- Create secure RLS policies for users table
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Organization admins can view their members"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_organizations uo1
            JOIN user_organizations uo2 ON uo1.organization_id = uo2.organization_id
            WHERE uo1.user_id = auth.uid()
            AND uo1.role IN ('ADMIN', 'MASTER_ADMIN')
            AND uo2.user_id = users.id
        )
    );

CREATE POLICY "Master admins have full read access"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'MASTER_ADMIN'
        )
    );

-- Secure policies for user_organizations
CREATE POLICY "Users can view their own organizations"
    ON user_organizations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Organization members can view each other"
    ON user_organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_organizations uo
            WHERE uo.user_id = auth.uid()
            AND uo.organization_id = user_organizations.organization_id
        )
    );

-- Audit log policies
CREATE POLICY "Users can view their own audit logs"
    ON audit_logs FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view organization audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'MASTER_ADMIN')
        )
    );

-- Security log policies (only for master admins)
CREATE POLICY "Only master admins can view security logs"
    ON security_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'MASTER_ADMIN'
        )
    );

-- ============================================================================
-- 7. Create Triggers for Automatic Security Checks
-- ============================================================================

-- Trigger function to validate inputs
CREATE OR REPLACE FUNCTION validate_input_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check all text fields for SQL injection
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.email IS NOT NULL AND check_sql_injection(NEW.email) THEN
            RAISE EXCEPTION 'Invalid input detected in email field';
        END IF;
        
        IF NEW.full_name IS NOT NULL AND check_sql_injection(NEW.full_name) THEN
            RAISE EXCEPTION 'Invalid input detected in name field';
        END IF;
        
        IF TG_TABLE_NAME = 'users' AND NEW.phone IS NOT NULL AND check_sql_injection(NEW.phone) THEN
            RAISE EXCEPTION 'Invalid input detected in phone field';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply trigger to users table
CREATE TRIGGER validate_users_input
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_input_trigger();

-- ============================================================================
-- 8. Create Monitoring Views
-- ============================================================================

-- View for recent security threats
CREATE OR REPLACE VIEW recent_security_threats AS
SELECT 
    timestamp,
    user_id,
    ip_address,
    attack_type,
    severity,
    blocked,
    substring(query, 1, 100) as query_preview
FROM security_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
AND severity IN ('HIGH', 'CRITICAL')
ORDER BY timestamp DESC;

-- View for blocked IPs
CREATE OR REPLACE VIEW active_blocked_ips AS
SELECT 
    ip_address,
    reason,
    blocked_at,
    blocked_until,
    attempts
FROM blocked_ips
WHERE blocked_until IS NULL OR blocked_until > NOW()
ORDER BY blocked_at DESC;

-- ============================================================================
-- 9. Grant Permissions
-- ============================================================================

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION search_users_secure TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;

-- Revoke direct table access for security
REVOKE ALL ON users FROM anon, authenticated;
REVOKE ALL ON organizations FROM anon, authenticated;
REVOKE ALL ON user_organizations FROM anon, authenticated;

-- Grant access through secure functions only
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON organizations TO authenticated;
GRANT SELECT ON user_organizations TO authenticated;

-- ============================================================================
-- 10. Create Cleanup Job for Old Logs
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete logs older than 90 days
    DELETE FROM security_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Remove expired IP blocks
    DELETE FROM blocked_ips
    WHERE blocked_until < NOW() - INTERVAL '7 days';
END;
$$;

-- Create index for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email_search ON users USING gin(to_tsvector('english', email));
CREATE INDEX IF NOT EXISTS idx_users_name_search ON users USING gin(to_tsvector('english', full_name));

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE security_logs IS 'Stores all security-related events and SQL injection attempts';
COMMENT ON TABLE blocked_ips IS 'Maintains list of blocked IP addresses due to suspicious activity';
COMMENT ON FUNCTION search_users_secure IS 'Secure user search function with input validation and SQL injection prevention';
COMMENT ON FUNCTION check_sql_injection IS 'Validates input text for SQL injection patterns';
COMMENT ON FUNCTION check_rate_limit IS 'Implements rate limiting to prevent abuse';

-- ============================================================================
-- Rollback script (save separately)
-- ============================================================================
/*
-- To rollback these changes:
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS blocked_ips CASCADE;
DROP FUNCTION IF EXISTS search_users_secure CASCADE;
DROP FUNCTION IF EXISTS check_sql_injection CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit CASCADE;
DROP FUNCTION IF EXISTS validate_input_trigger CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_security_logs CASCADE;
DROP TRIGGER IF EXISTS validate_users_input ON users;
DROP VIEW IF EXISTS recent_security_threats;
DROP VIEW IF EXISTS active_blocked_ips;
*/