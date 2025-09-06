-- Create qr_codes table
-- Manages QR codes for branch check-in/check-out

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  -- QR Code details
  code VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) DEFAULT 'CHECK_IN', -- 'CHECK_IN', 'CHECK_OUT', 'BOTH'
  
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  
  -- Security
  require_location_check BOOLEAN DEFAULT true,
  max_distance_meters INTEGER DEFAULT 100,
  require_photo BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  generated_by UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  last_used_by UUID REFERENCES employees(id),
  
  -- Constraints
  CONSTRAINT qr_codes_code_unique UNIQUE (code),
  CONSTRAINT qr_codes_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT qr_codes_use_count_valid CHECK (use_count >= 0),
  CONSTRAINT qr_codes_max_distance_positive CHECK (max_distance_meters IS NULL OR max_distance_meters > 0),
  CONSTRAINT qr_codes_validity_period CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT qr_codes_purpose_valid CHECK (purpose IN ('CHECK_IN', 'CHECK_OUT', 'BOTH'))
);

-- Create partial unique index for active QR code per branch
CREATE UNIQUE INDEX idx_qr_codes_one_active_per_branch 
  ON qr_codes(branch_id, is_active) 
  WHERE is_active = true;

-- Create indexes
CREATE INDEX idx_qr_codes_branch_id ON qr_codes(branch_id);
CREATE INDEX idx_qr_codes_code ON qr_codes(code);
CREATE INDEX idx_qr_codes_is_active ON qr_codes(is_active);
CREATE INDEX idx_qr_codes_valid_from ON qr_codes(valid_from);
CREATE INDEX idx_qr_codes_valid_until ON qr_codes(valid_until);
CREATE INDEX idx_qr_codes_created_at ON qr_codes(created_at DESC);

-- Add comments
COMMENT ON TABLE qr_codes IS 'QR codes for branch attendance management';
COMMENT ON COLUMN qr_codes.purpose IS 'Purpose of QR code (CHECK_IN, CHECK_OUT, BOTH)';
COMMENT ON COLUMN qr_codes.max_uses IS 'Maximum number of times the QR code can be used';
COMMENT ON COLUMN qr_codes.require_location_check IS 'Whether to verify user location when scanning';

-- Create trigger for updated_at
CREATE TRIGGER update_qr_codes_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique QR code
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random code with timestamp prefix
    new_code := 'QR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM qr_codes WHERE code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create new QR code for branch
CREATE OR REPLACE FUNCTION create_branch_qr_code(
  p_branch_id UUID,
  p_purpose VARCHAR(50) DEFAULT 'BOTH',
  p_valid_days INTEGER DEFAULT NULL,
  p_max_uses INTEGER DEFAULT NULL,
  p_generated_by UUID DEFAULT NULL
)
RETURNS qr_codes AS $$
DECLARE
  v_qr_code qr_codes;
  v_valid_until TIMESTAMPTZ;
BEGIN
  -- Calculate valid until date
  IF p_valid_days IS NOT NULL THEN
    v_valid_until := NOW() + (p_valid_days || ' days')::INTERVAL;
  END IF;
  
  -- Deactivate existing active QR codes for this branch
  UPDATE qr_codes
  SET is_active = false,
      updated_at = NOW()
  WHERE branch_id = p_branch_id
    AND is_active = true;
  
  -- Create new QR code
  INSERT INTO qr_codes (
    branch_id,
    code,
    purpose,
    valid_until,
    max_uses,
    generated_by,
    is_active
  ) VALUES (
    p_branch_id,
    generate_qr_code(),
    p_purpose,
    v_valid_until,
    p_max_uses,
    p_generated_by,
    true
  ) RETURNING * INTO v_qr_code;
  
  RETURN v_qr_code;
END;
$$ LANGUAGE plpgsql;

-- Function to validate QR code
CREATE OR REPLACE FUNCTION validate_qr_code(
  p_code VARCHAR,
  p_purpose VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  branch_id UUID,
  message TEXT
) AS $$
DECLARE
  v_qr qr_codes;
BEGIN
  -- Get QR code
  SELECT * INTO v_qr
  FROM qr_codes
  WHERE code = p_code;
  
  -- Check if QR code exists
  IF v_qr.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'QR code not found'::TEXT;
    RETURN;
  END IF;
  
  -- Check if active
  IF NOT v_qr.is_active THEN
    RETURN QUERY SELECT false, v_qr.branch_id, 'QR code is not active'::TEXT;
    RETURN;
  END IF;
  
  -- Check validity period
  IF v_qr.valid_until IS NOT NULL AND v_qr.valid_until < NOW() THEN
    RETURN QUERY SELECT false, v_qr.branch_id, 'QR code has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check max uses
  IF v_qr.max_uses IS NOT NULL AND v_qr.use_count >= v_qr.max_uses THEN
    RETURN QUERY SELECT false, v_qr.branch_id, 'QR code has reached maximum uses'::TEXT;
    RETURN;
  END IF;
  
  -- Check purpose
  IF p_purpose IS NOT NULL AND v_qr.purpose != 'BOTH' AND v_qr.purpose != p_purpose THEN
    RETURN QUERY SELECT false, v_qr.branch_id, 'QR code is not valid for ' || p_purpose::TEXT;
    RETURN;
  END IF;
  
  -- QR code is valid
  RETURN QUERY SELECT true, v_qr.branch_id, 'QR code is valid'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to use QR code
CREATE OR REPLACE FUNCTION use_qr_code(
  p_code VARCHAR,
  p_employee_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_qr qr_codes;
BEGIN
  -- Update QR code usage
  UPDATE qr_codes
  SET 
    use_count = use_count + 1,
    last_used_at = NOW(),
    last_used_by = p_employee_id,
    updated_at = NOW()
  WHERE code = p_code
    AND is_active = true
  RETURNING * INTO v_qr;
  
  RETURN v_qr.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Policy for viewing QR codes
CREATE POLICY "Users can view QR codes for their organization branches"
  ON qr_codes
  FOR SELECT
  USING (
    branch_id IN (
      SELECT b.id
      FROM branches b
      JOIN employees e ON e.organization_id = b.organization_id
      WHERE e.auth_user_id = auth.uid()
    )
  );

-- Policy for managing QR codes (managers and admins)
CREATE POLICY "Managers can manage QR codes"
  ON qr_codes
  FOR ALL
  USING (
    branch_id IN (
      SELECT b.id
      FROM branches b
      JOIN employees e ON e.organization_id = b.organization_id
      JOIN user_roles ur ON ur.employee_id = e.id
      WHERE e.auth_user_id = auth.uid()
        AND ur.role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER')
    )
  );