-- ============================================================================
-- Migration: Device Token Management System for FCM and Multi-Device Support
-- Description: Comprehensive device token mapping with FCM integration,
--              device fingerprinting, and security features
-- Version: 005
-- Date: 2025-09-02
-- ============================================================================

-- ============================================================================
-- 1. DEVICE TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Device identification
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL, -- Unique device fingerprint
    device_name VARCHAR(255), -- User-friendly device name
    
    -- FCM token details
    fcm_token VARCHAR(500) NOT NULL UNIQUE,
    fcm_token_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fcm_token_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fcm_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Device information
    device_type VARCHAR(50) DEFAULT 'unknown' CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'web', 'unknown')),
    platform VARCHAR(50), -- iOS, Android, Windows, macOS, Linux, Web
    browser VARCHAR(100), -- Browser name and version for web devices
    app_version VARCHAR(50), -- Application version
    os_version VARCHAR(50), -- Operating system version
    
    -- Device fingerprinting data
    fingerprint_data JSONB DEFAULT '{}', -- Screen resolution, timezone, language, etc.
    hardware_info JSONB DEFAULT '{}', -- CPU, RAM, storage info
    network_info JSONB DEFAULT '{}', -- IP address, network type, provider
    
    -- Trust and security
    trust_level VARCHAR(20) DEFAULT 'unknown' CHECK (trust_level IN ('trusted', 'verified', 'unknown', 'suspicious', 'blocked')),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
    verification_code VARCHAR(10), -- For device verification
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Security features
    requires_biometric BOOLEAN DEFAULT FALSE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    pin_enabled BOOLEAN DEFAULT FALSE,
    auto_lock_enabled BOOLEAN DEFAULT TRUE,
    auto_lock_timeout INTEGER DEFAULT 300, -- Seconds
    
    -- Location and geofencing
    last_known_location POINT, -- Latitude, longitude
    location_accuracy FLOAT, -- Location accuracy in meters
    geofence_enabled BOOLEAN DEFAULT FALSE,
    allowed_locations UUID[], -- Array of allowed location IDs
    
    -- Usage tracking
    first_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    notification_count INTEGER DEFAULT 0,
    failed_auth_attempts INTEGER DEFAULT 0,
    
    -- Status and lifecycle
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary device for this user
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivation_reason VARCHAR(255),
    
    -- Auto-expiry settings
    auto_expire_after_days INTEGER DEFAULT 90,
    last_activity_threshold_days INTEGER DEFAULT 30,
    
    -- Metadata
    user_agent TEXT,
    registration_ip INET,
    last_activity_ip INET,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_device_per_employee UNIQUE(employee_id, device_id),
    CONSTRAINT valid_auto_lock_timeout CHECK (auto_lock_timeout >= 30 AND auto_lock_timeout <= 3600),
    CONSTRAINT valid_auto_expire_days CHECK (auto_expire_after_days >= 7 AND auto_expire_after_days <= 365)
);

-- Create indexes for device tokens
CREATE INDEX idx_device_tokens_employee ON device_tokens(employee_id);
CREATE INDEX idx_device_tokens_fcm_token ON device_tokens(fcm_token);
CREATE INDEX idx_device_tokens_device_id ON device_tokens(device_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_device_tokens_primary ON device_tokens(employee_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_device_tokens_trust_level ON device_tokens(trust_level);
CREATE INDEX idx_device_tokens_verification ON device_tokens(verification_status);
CREATE INDEX idx_device_tokens_last_used ON device_tokens(last_used_at DESC);
CREATE INDEX idx_device_tokens_expires ON device_tokens(fcm_token_expires_at) WHERE fcm_token_expires_at IS NOT NULL;
CREATE INDEX idx_device_tokens_location ON device_tokens USING GIST (last_known_location);

-- ============================================================================
-- 2. FCM NOTIFICATION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS fcm_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target information
    device_token_id UUID NOT NULL REFERENCES device_tokens(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- FCM message details
    fcm_message_id VARCHAR(255), -- FCM response message ID
    notification_title VARCHAR(255) NOT NULL,
    notification_body TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    
    -- Payload and configuration
    data_payload JSONB DEFAULT '{}',
    notification_config JSONB DEFAULT '{}',
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
    
    -- Delivery tracking
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and result
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Analytics
    time_to_delivery INTEGER, -- Milliseconds from sent to delivered
    time_to_read INTEGER, -- Milliseconds from delivered to read
    time_to_click INTEGER, -- Milliseconds from delivered to clicked
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- Create indexes for FCM notifications
CREATE INDEX idx_fcm_notifications_device ON fcm_notifications(device_token_id);
CREATE INDEX idx_fcm_notifications_employee ON fcm_notifications(employee_id);
CREATE INDEX idx_fcm_notifications_status ON fcm_notifications(delivery_status);
CREATE INDEX idx_fcm_notifications_type ON fcm_notifications(notification_type);
CREATE INDEX idx_fcm_notifications_sent_at ON fcm_notifications(sent_at DESC);
CREATE INDEX idx_fcm_notifications_fcm_id ON fcm_notifications(fcm_message_id);

-- ============================================================================
-- 3. DEVICE SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session identification
    session_token VARCHAR(255) NOT NULL UNIQUE,
    device_token_id UUID NOT NULL REFERENCES device_tokens(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Session lifecycle
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Authentication details
    auth_method VARCHAR(50) NOT NULL, -- password, biometric, pin, sso
    two_factor_verified BOOLEAN DEFAULT FALSE,
    biometric_verified BOOLEAN DEFAULT FALSE,
    
    -- Security context
    session_ip INET NOT NULL,
    location_at_start POINT,
    geofence_validated BOOLEAN DEFAULT FALSE,
    risk_score FLOAT DEFAULT 0.0, -- 0.0 (safe) to 1.0 (high risk)
    
    -- Session status
    is_active BOOLEAN DEFAULT TRUE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason VARCHAR(50),
    force_terminated BOOLEAN DEFAULT FALSE,
    
    -- Activity tracking
    api_calls_count INTEGER DEFAULT 0,
    last_api_call_at TIMESTAMP WITH TIME ZONE,
    data_transferred_kb INTEGER DEFAULT 0,
    
    -- Metadata
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > started_at),
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0.0 AND risk_score <= 1.0)
);

-- Create indexes for device sessions
CREATE INDEX idx_device_sessions_token ON device_sessions(session_token);
CREATE INDEX idx_device_sessions_device ON device_sessions(device_token_id);
CREATE INDEX idx_device_sessions_employee ON device_sessions(employee_id);
CREATE INDEX idx_device_sessions_active ON device_sessions(is_active, expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_device_sessions_expiry ON device_sessions(expires_at);
CREATE INDEX idx_device_sessions_risk ON device_sessions(risk_score DESC) WHERE risk_score > 0.5;

-- ============================================================================
-- 4. DEVICE SECURITY EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    device_token_id UUID REFERENCES device_tokens(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    session_id UUID REFERENCES device_sessions(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- authentication, authorization, security, device
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Event data
    event_description TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    location POINT,
    user_agent TEXT,
    
    -- Risk assessment
    risk_score FLOAT DEFAULT 0.0,
    automated_action VARCHAR(50), -- none, warn, lock, block, notify
    manual_review_required BOOLEAN DEFAULT FALSE,
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES employees(id),
    resolution_notes TEXT,
    
    -- Metadata
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0.0 AND risk_score <= 1.0)
);

-- Create indexes for security events
CREATE INDEX idx_security_events_device ON device_security_events(device_token_id);
CREATE INDEX idx_security_events_employee ON device_security_events(employee_id);
CREATE INDEX idx_security_events_session ON device_security_events(session_id);
CREATE INDEX idx_security_events_type ON device_security_events(event_type);
CREATE INDEX idx_security_events_severity ON device_security_events(severity);
CREATE INDEX idx_security_events_occurred_at ON device_security_events(occurred_at DESC);
CREATE INDEX idx_security_events_unresolved ON device_security_events(resolved, manual_review_required) 
    WHERE resolved = FALSE;
CREATE INDEX idx_security_events_high_risk ON device_security_events(risk_score DESC) 
    WHERE risk_score > 0.7;

-- ============================================================================
-- 5. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_device_tokens_updated_at 
    BEFORE UPDATE ON device_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_device_updated_at();

CREATE TRIGGER update_fcm_notifications_updated_at 
    BEFORE UPDATE ON fcm_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_device_updated_at();

CREATE TRIGGER update_device_sessions_updated_at 
    BEFORE UPDATE ON device_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_device_updated_at();

-- Function to update FCM token timestamp on token changes
CREATE OR REPLACE FUNCTION update_fcm_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- If FCM token is being updated, update the timestamp
    IF OLD.fcm_token IS DISTINCT FROM NEW.fcm_token THEN
        NEW.fcm_token_updated_at = NOW();
        NEW.usage_count = NEW.usage_count + 1;
    END IF;
    
    -- Update last used timestamp on any activity
    NEW.last_used_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fcm_token_on_change
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION update_fcm_token_timestamp();

-- Function to ensure only one primary device per employee
CREATE OR REPLACE FUNCTION ensure_single_primary_device()
RETURNS TRIGGER AS $$
BEGIN
    -- If this device is being set as primary, unset all other primary devices for this employee
    IF NEW.is_primary = TRUE THEN
        UPDATE device_tokens 
        SET is_primary = FALSE 
        WHERE employee_id = NEW.employee_id 
            AND id != NEW.id 
            AND is_primary = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_device_trigger
    BEFORE INSERT OR UPDATE OF is_primary ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_device();

-- Function to auto-expire old device tokens
CREATE OR REPLACE FUNCTION expire_old_device_tokens()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    -- Expire tokens based on last activity and auto-expire settings
    UPDATE device_tokens
    SET 
        is_active = FALSE,
        deactivated_at = NOW(),
        deactivation_reason = 'Auto-expired due to inactivity'
    WHERE is_active = TRUE
        AND (
            -- FCM token has explicit expiry
            (fcm_token_expires_at IS NOT NULL AND fcm_token_expires_at < NOW()) OR
            -- No activity within threshold
            (last_used_at < NOW() - (last_activity_threshold_days || ' days')::INTERVAL) OR
            -- Device is older than auto-expire limit
            (registered_at < NOW() - (auto_expire_after_days || ' days')::INTERVAL)
        );
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log security event for expired tokens
    INSERT INTO device_security_events (
        device_token_id, employee_id, event_type, event_category, 
        severity, event_description, automated_action
    )
    SELECT 
        id, employee_id, 'token_expired', 'device', 'medium',
        'Device token auto-expired due to ' || deactivation_reason,
        'lock'
    FROM device_tokens 
    WHERE deactivated_at >= NOW() - INTERVAL '1 minute'
        AND deactivation_reason LIKE 'Auto-expired%';
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    UPDATE device_sessions
    SET 
        is_active = FALSE,
        terminated_at = NOW(),
        termination_reason = 'expired'
    WHERE is_active = TRUE 
        AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate device risk score
CREATE OR REPLACE FUNCTION calculate_device_risk_score(device_uuid UUID)
RETURNS FLOAT AS $$
DECLARE
    risk_score FLOAT := 0.0;
    device_record RECORD;
    failed_attempts INTEGER;
    location_violations INTEGER;
    recent_security_events INTEGER;
BEGIN
    -- Get device record
    SELECT * INTO device_record FROM device_tokens WHERE id = device_uuid;
    
    IF device_record IS NULL THEN
        RETURN 1.0; -- Maximum risk for non-existent device
    END IF;
    
    -- Base risk factors
    CASE device_record.trust_level
        WHEN 'blocked' THEN risk_score := risk_score + 1.0;
        WHEN 'suspicious' THEN risk_score := risk_score + 0.7;
        WHEN 'unknown' THEN risk_score := risk_score + 0.4;
        WHEN 'verified' THEN risk_score := risk_score + 0.1;
        WHEN 'trusted' THEN risk_score := risk_score + 0.0;
    END CASE;
    
    -- Failed authentication attempts
    failed_attempts := device_record.failed_auth_attempts;
    IF failed_attempts > 0 THEN
        risk_score := risk_score + LEAST(failed_attempts * 0.1, 0.5);
    END IF;
    
    -- Recent security events
    SELECT COUNT(*) INTO recent_security_events
    FROM device_security_events
    WHERE device_token_id = device_uuid
        AND occurred_at > NOW() - INTERVAL '7 days'
        AND severity IN ('high', 'critical');
    
    IF recent_security_events > 0 THEN
        risk_score := risk_score + LEAST(recent_security_events * 0.2, 0.4);
    END IF;
    
    -- Location violations (if geofencing is enabled)
    IF device_record.geofence_enabled THEN
        SELECT COUNT(*) INTO location_violations
        FROM device_security_events
        WHERE device_token_id = device_uuid
            AND event_type = 'geofence_violation'
            AND occurred_at > NOW() - INTERVAL '24 hours';
        
        IF location_violations > 0 THEN
            risk_score := risk_score + LEAST(location_violations * 0.15, 0.3);
        END IF;
    END IF;
    
    -- Cap the risk score at 1.0
    RETURN LEAST(risk_score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. VIEWS FOR ANALYTICS AND MONITORING
-- ============================================================================

-- Active devices per employee with statistics
CREATE OR REPLACE VIEW v_employee_devices AS
SELECT 
    e.id AS employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    e.email,
    COUNT(dt.id) AS total_devices,
    COUNT(dt.id) FILTER (WHERE dt.is_active = TRUE) AS active_devices,
    COUNT(dt.id) FILTER (WHERE dt.is_primary = TRUE) AS primary_devices,
    COUNT(dt.id) FILTER (WHERE dt.trust_level = 'trusted') AS trusted_devices,
    COUNT(dt.id) FILTER (WHERE dt.trust_level = 'suspicious') AS suspicious_devices,
    MAX(dt.last_used_at) AS last_device_activity,
    AVG(calculate_device_risk_score(dt.id)) AS avg_risk_score
FROM employees e
LEFT JOIN device_tokens dt ON e.id = dt.employee_id
GROUP BY e.id, e.first_name, e.last_name, e.email;

-- FCM notification statistics
CREATE OR REPLACE VIEW v_fcm_statistics AS
SELECT 
    DATE_TRUNC('day', sent_at) AS date,
    notification_type,
    COUNT(*) AS total_sent,
    COUNT(*) FILTER (WHERE delivery_status = 'delivered') AS delivered_count,
    COUNT(*) FILTER (WHERE delivery_status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE read_at IS NOT NULL) AS read_count,
    COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked_count,
    AVG(time_to_delivery) FILTER (WHERE time_to_delivery IS NOT NULL) AS avg_delivery_time_ms,
    AVG(time_to_read) FILTER (WHERE time_to_read IS NOT NULL) AS avg_read_time_ms
FROM fcm_notifications
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', sent_at), notification_type
ORDER BY date DESC, notification_type;

-- Device security summary
CREATE OR REPLACE VIEW v_device_security_summary AS
SELECT 
    dt.id,
    dt.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    dt.device_name,
    dt.device_type,
    dt.platform,
    dt.trust_level,
    dt.is_active,
    dt.last_used_at,
    calculate_device_risk_score(dt.id) AS current_risk_score,
    COUNT(dse.id) FILTER (WHERE dse.occurred_at > NOW() - INTERVAL '7 days') AS recent_security_events,
    COUNT(dse.id) FILTER (WHERE dse.severity IN ('high', 'critical') AND NOT dse.resolved) AS unresolved_critical_events,
    MAX(dse.occurred_at) AS last_security_event
FROM device_tokens dt
LEFT JOIN employees e ON dt.employee_id = e.id
LEFT JOIN device_security_events dse ON dt.id = dse.device_token_id
GROUP BY dt.id, e.id, e.first_name, e.last_name;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_security_events ENABLE ROW LEVEL SECURITY;

-- Employees can only access their own device tokens
CREATE POLICY employee_own_devices ON device_tokens
    FOR ALL
    USING (employee_id = auth.uid());

-- Master admins can access all device tokens
CREATE POLICY master_admin_all_devices ON device_tokens
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND is_master_admin = TRUE
        )
    );

-- Employees can only access their own FCM notifications
CREATE POLICY employee_own_notifications ON fcm_notifications
    FOR ALL
    USING (employee_id = auth.uid());

-- Master admins can access all notifications
CREATE POLICY master_admin_all_notifications ON fcm_notifications
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND is_master_admin = TRUE
        )
    );

-- Similar policies for sessions and security events
CREATE POLICY employee_own_sessions ON device_sessions
    FOR ALL
    USING (employee_id = auth.uid());

CREATE POLICY master_admin_all_sessions ON device_sessions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND is_master_admin = TRUE
        )
    );

CREATE POLICY employee_own_security_events ON device_security_events
    FOR SELECT
    USING (employee_id = auth.uid());

CREATE POLICY master_admin_all_security_events ON device_security_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND is_master_admin = TRUE
        )
    );

-- ============================================================================
-- 8. INITIAL DATA AND CONFIGURATION
-- ============================================================================

-- Create function to initialize default settings for new devices
CREATE OR REPLACE FUNCTION initialize_device_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default device name if not provided
    IF NEW.device_name IS NULL THEN
        NEW.device_name = COALESCE(NEW.platform, 'Unknown') || ' Device';
    END IF;
    
    -- Set FCM token expiry (90 days from now if not specified)
    IF NEW.fcm_token_expires_at IS NULL THEN
        NEW.fcm_token_expires_at = NOW() + INTERVAL '90 days';
    END IF;
    
    -- If this is the first device for this employee, make it primary
    IF NOT EXISTS (
        SELECT 1 FROM device_tokens 
        WHERE employee_id = NEW.employee_id 
        AND id != NEW.id
    ) THEN
        NEW.is_primary = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_device_defaults_trigger
    BEFORE INSERT ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION initialize_device_defaults();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Add migration completion record
INSERT INTO schema_migrations (version, name, executed_at) 
VALUES ('005', 'device_tokens', NOW())
ON CONFLICT (version) DO NOTHING;