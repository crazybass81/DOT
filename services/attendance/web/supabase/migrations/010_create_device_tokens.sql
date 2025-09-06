-- Create device_tokens table
-- Manages push notification tokens for mobile devices

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Token details
  token TEXT NOT NULL,
  device_type device_type NOT NULL,
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  device_model VARCHAR(100),
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  
  -- Push notification settings
  push_enabled BOOLEAN DEFAULT true,
  attendance_notifications BOOLEAN DEFAULT true,
  announcement_notifications BOOLEAN DEFAULT true,
  schedule_notifications BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT device_tokens_token_unique UNIQUE (token)
);

-- Create indexes
CREATE INDEX idx_device_tokens_employee_id ON device_tokens(employee_id);
CREATE INDEX idx_device_tokens_token ON device_tokens(token);
CREATE INDEX idx_device_tokens_device_type ON device_tokens(device_type);
CREATE INDEX idx_device_tokens_is_active ON device_tokens(is_active);
CREATE INDEX idx_device_tokens_created_at ON device_tokens(created_at DESC);

-- Add comments
COMMENT ON TABLE device_tokens IS 'Push notification tokens for mobile devices';
COMMENT ON COLUMN device_tokens.device_type IS 'Type of device (IOS, ANDROID, WEB)';
COMMENT ON COLUMN device_tokens.push_enabled IS 'Whether push notifications are enabled for this device';

-- Create trigger for updated_at
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to register or update device token
CREATE OR REPLACE FUNCTION register_device_token(
  p_employee_id UUID,
  p_token TEXT,
  p_device_type device_type,
  p_device_info JSONB DEFAULT '{}'
)
RETURNS device_tokens AS $$
DECLARE
  v_token device_tokens;
BEGIN
  -- Deactivate any existing tokens for the same device
  IF p_device_info->>'device_id' IS NOT NULL THEN
    UPDATE device_tokens
    SET is_active = false,
        updated_at = NOW()
    WHERE employee_id = p_employee_id
      AND device_id = p_device_info->>'device_id'
      AND token != p_token;
  END IF;
  
  -- Insert or update token
  INSERT INTO device_tokens (
    employee_id,
    token,
    device_type,
    device_id,
    device_name,
    device_model,
    os_version,
    app_version,
    is_active,
    last_used_at
  ) VALUES (
    p_employee_id,
    p_token,
    p_device_type,
    p_device_info->>'device_id',
    p_device_info->>'device_name',
    p_device_info->>'device_model',
    p_device_info->>'os_version',
    p_device_info->>'app_version',
    true,
    NOW()
  )
  ON CONFLICT (token)
  DO UPDATE SET
    employee_id = p_employee_id,
    device_type = p_device_type,
    device_id = p_device_info->>'device_id',
    device_name = p_device_info->>'device_name',
    device_model = p_device_info->>'device_model',
    os_version = p_device_info->>'os_version',
    app_version = p_device_info->>'app_version',
    is_active = true,
    last_used_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_token;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- Function to get active tokens for employee
CREATE OR REPLACE FUNCTION get_employee_tokens(
  p_employee_id UUID,
  p_device_type device_type DEFAULT NULL
)
RETURNS TABLE(
  token TEXT,
  device_type device_type,
  device_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.token,
    dt.device_type,
    dt.device_name
  FROM device_tokens dt
  WHERE dt.employee_id = p_employee_id
    AND dt.is_active = true
    AND dt.push_enabled = true
    AND (p_device_type IS NULL OR dt.device_type = p_device_type);
END;
$$ LANGUAGE plpgsql;

-- Function to send push notification (placeholder for actual implementation)
CREATE OR REPLACE FUNCTION send_push_notification(
  p_employee_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}',
  p_notification_type VARCHAR(50) DEFAULT 'GENERAL'
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_token RECORD;
BEGIN
  -- Get active tokens for employee
  FOR v_token IN
    SELECT token, device_type
    FROM device_tokens
    WHERE employee_id = p_employee_id
      AND is_active = true
      AND push_enabled = true
      AND (
        (p_notification_type = 'ATTENDANCE' AND attendance_notifications = true) OR
        (p_notification_type = 'ANNOUNCEMENT' AND announcement_notifications = true) OR
        (p_notification_type = 'SCHEDULE' AND schedule_notifications = true) OR
        p_notification_type = 'GENERAL'
      )
  LOOP
    -- Here you would integrate with actual push notification service
    -- For now, just count the tokens
    v_count := v_count + 1;
    
    -- Update last used timestamp
    UPDATE device_tokens
    SET last_used_at = NOW()
    WHERE token = v_token.token;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for employees to manage their own device tokens
CREATE POLICY "Employees can manage their own device tokens"
  ON device_tokens
  FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

-- Policy for admins to view all device tokens in their organization
CREATE POLICY "Admins can view organization device tokens"
  ON device_tokens
  FOR SELECT
  USING (
    employee_id IN (
      SELECT e2.id
      FROM employees e1
      JOIN employees e2 ON e1.organization_id = e2.organization_id
      JOIN user_roles ur ON ur.employee_id = e1.id
      WHERE e1.auth_user_id = auth.uid()
        AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );