-- Create attendance table
-- Records employee check-in/check-out with GPS location tracking

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  
  -- Attendance date
  date DATE NOT NULL,
  
  -- Check-in information
  check_in_time TIME,
  check_in_latitude DOUBLE PRECISION,
  check_in_longitude DOUBLE PRECISION,
  check_in_location GEOMETRY(Point, 4326),
  check_in_address TEXT,
  check_in_distance_meters DOUBLE PRECISION, -- Distance from branch
  check_in_method VARCHAR(50), -- 'GPS', 'QR', 'MANUAL', 'ADMIN'
  check_in_device_info JSONB,
  check_in_photo_url TEXT,
  
  -- Check-out information
  check_out_time TIME,
  check_out_latitude DOUBLE PRECISION,
  check_out_longitude DOUBLE PRECISION,
  check_out_location GEOMETRY(Point, 4326),
  check_out_address TEXT,
  check_out_distance_meters DOUBLE PRECISION,
  check_out_method VARCHAR(50),
  check_out_device_info JSONB,
  check_out_photo_url TEXT,
  
  -- Work hours calculation
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  total_work_minutes INTEGER,
  overtime_minutes INTEGER DEFAULT 0,
  late_minutes INTEGER DEFAULT 0,
  early_leave_minutes INTEGER DEFAULT 0,
  
  -- Status
  status attendance_status NOT NULL DEFAULT 'ABSENT',
  
  -- Notes and approvals
  notes TEXT,
  absence_reason TEXT,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT attendance_unique_employee_date UNIQUE (employee_id, date),
  CONSTRAINT attendance_check_times_valid CHECK (
    check_out_time IS NULL OR check_in_time IS NULL OR check_out_time > check_in_time
  ),
  CONSTRAINT attendance_coordinates_valid CHECK (
    (check_in_latitude IS NULL AND check_in_longitude IS NULL) OR
    (check_in_latitude >= -90 AND check_in_latitude <= 90 AND 
     check_in_longitude >= -180 AND check_in_longitude <= 180)
  ),
  CONSTRAINT attendance_work_minutes_valid CHECK (
    total_work_minutes IS NULL OR total_work_minutes >= 0
  ),
  CONSTRAINT attendance_overtime_valid CHECK (overtime_minutes >= 0),
  CONSTRAINT attendance_late_valid CHECK (late_minutes >= 0),
  CONSTRAINT attendance_early_leave_valid CHECK (early_leave_minutes >= 0)
);

-- Create indexes
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_contract_id ON attendance(contract_id);
CREATE INDEX idx_attendance_branch_id ON attendance(branch_id);
CREATE INDEX idx_attendance_date ON attendance(date DESC);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date DESC);
CREATE INDEX idx_attendance_created_at ON attendance(created_at DESC);

-- Create spatial indexes for location queries
CREATE INDEX idx_attendance_check_in_location ON attendance USING GIST(check_in_location);
CREATE INDEX idx_attendance_check_out_location ON attendance USING GIST(check_out_location);

-- Add comments
COMMENT ON TABLE attendance IS 'Employee attendance records with GPS tracking';
COMMENT ON COLUMN attendance.check_in_distance_meters IS 'Distance from branch location at check-in';
COMMENT ON COLUMN attendance.check_in_method IS 'Method used for check-in (GPS, QR, MANUAL, ADMIN)';
COMMENT ON COLUMN attendance.total_work_minutes IS 'Total minutes worked (excluding breaks)';

-- Create trigger for updated_at
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update location geometry from coordinates
CREATE OR REPLACE FUNCTION update_attendance_locations()
RETURNS TRIGGER AS $$
BEGIN
  -- Update check-in location
  IF NEW.check_in_latitude IS NOT NULL AND NEW.check_in_longitude IS NOT NULL THEN
    NEW.check_in_location = ST_SetSRID(ST_MakePoint(NEW.check_in_longitude, NEW.check_in_latitude), 4326);
    
    -- Calculate distance from branch
    SELECT calculate_distance(
      NEW.check_in_latitude,
      NEW.check_in_longitude,
      b.latitude,
      b.longitude
    ) INTO NEW.check_in_distance_meters
    FROM branches b
    WHERE b.id = NEW.branch_id;
  END IF;
  
  -- Update check-out location
  IF NEW.check_out_latitude IS NOT NULL AND NEW.check_out_longitude IS NOT NULL THEN
    NEW.check_out_location = ST_SetSRID(ST_MakePoint(NEW.check_out_longitude, NEW.check_out_latitude), 4326);
    
    -- Calculate distance from branch
    SELECT calculate_distance(
      NEW.check_out_latitude,
      NEW.check_out_longitude,
      b.latitude,
      b.longitude
    ) INTO NEW.check_out_distance_meters
    FROM branches b
    WHERE b.id = NEW.branch_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_locations_trigger
  BEFORE INSERT OR UPDATE OF check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude
  ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_locations();

-- Function to calculate work hours
CREATE OR REPLACE FUNCTION calculate_work_hours()
RETURNS TRIGGER AS $$
DECLARE
  break_minutes INTEGER;
BEGIN
  -- Only calculate if both check-in and check-out times exist
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    -- Calculate total minutes between check-in and check-out
    NEW.total_work_minutes = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
    
    -- Subtract break time
    SELECT COALESCE(SUM(duration_minutes), 0) INTO break_minutes
    FROM breaks
    WHERE attendance_id = NEW.id;
    
    NEW.total_work_minutes = NEW.total_work_minutes - break_minutes;
    
    -- Calculate late minutes
    IF NEW.scheduled_start_time IS NOT NULL AND NEW.check_in_time > NEW.scheduled_start_time THEN
      NEW.late_minutes = EXTRACT(EPOCH FROM (NEW.check_in_time - NEW.scheduled_start_time)) / 60;
    ELSE
      NEW.late_minutes = 0;
    END IF;
    
    -- Calculate early leave minutes
    IF NEW.scheduled_end_time IS NOT NULL AND NEW.check_out_time < NEW.scheduled_end_time THEN
      NEW.early_leave_minutes = EXTRACT(EPOCH FROM (NEW.scheduled_end_time - NEW.check_out_time)) / 60;
    ELSE
      NEW.early_leave_minutes = 0;
    END IF;
    
    -- Calculate overtime
    IF NEW.scheduled_start_time IS NOT NULL AND NEW.scheduled_end_time IS NOT NULL THEN
      DECLARE
        scheduled_minutes INTEGER;
      BEGIN
        scheduled_minutes = EXTRACT(EPOCH FROM (NEW.scheduled_end_time - NEW.scheduled_start_time)) / 60;
        IF NEW.total_work_minutes > scheduled_minutes THEN
          NEW.overtime_minutes = NEW.total_work_minutes - scheduled_minutes;
        ELSE
          NEW.overtime_minutes = 0;
        END IF;
      END;
    END IF;
    
    -- Update status
    NEW.status = 'CHECKED_OUT';
  ELSIF NEW.check_in_time IS NOT NULL THEN
    NEW.status = 'CHECKED_IN';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_work_hours_trigger
  BEFORE INSERT OR UPDATE OF check_in_time, check_out_time
  ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_work_hours();

-- Function to check in
CREATE OR REPLACE FUNCTION check_in(
  p_employee_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_method VARCHAR(50) DEFAULT 'GPS',
  p_device_info JSONB DEFAULT '{}'
)
RETURNS attendance AS $$
DECLARE
  v_contract contracts;
  v_branch branches;
  v_attendance attendance;
BEGIN
  -- Get active contract
  SELECT * INTO v_contract
  FROM contracts
  WHERE employee_id = p_employee_id
    AND status = 'ACTIVE'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LIMIT 1;
  
  IF v_contract.id IS NULL THEN
    RAISE EXCEPTION 'No active contract found for employee';
  END IF;
  
  -- Get branch
  SELECT * INTO v_branch
  FROM branches
  WHERE id = v_contract.branch_id;
  
  -- Check if already checked in today
  SELECT * INTO v_attendance
  FROM attendance
  WHERE employee_id = p_employee_id
    AND date = CURRENT_DATE;
  
  IF v_attendance.id IS NOT NULL AND v_attendance.check_in_time IS NOT NULL THEN
    RAISE EXCEPTION 'Already checked in today';
  END IF;
  
  -- Create or update attendance record
  INSERT INTO attendance (
    employee_id,
    contract_id,
    branch_id,
    date,
    check_in_time,
    check_in_latitude,
    check_in_longitude,
    check_in_method,
    check_in_device_info,
    scheduled_start_time,
    scheduled_end_time,
    status
  ) VALUES (
    p_employee_id,
    v_contract.id,
    v_contract.branch_id,
    CURRENT_DATE,
    CURRENT_TIME,
    p_latitude,
    p_longitude,
    p_method,
    p_device_info,
    v_contract.work_start_time,
    v_contract.work_end_time,
    'CHECKED_IN'
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    check_in_time = CURRENT_TIME,
    check_in_latitude = p_latitude,
    check_in_longitude = p_longitude,
    check_in_method = p_method,
    check_in_device_info = p_device_info,
    status = 'CHECKED_IN',
    updated_at = NOW()
  RETURNING * INTO v_attendance;
  
  RETURN v_attendance;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policy for employees to view their own attendance
CREATE POLICY "Employees can view their own attendance"
  ON attendance
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

-- Policy for employees to check in/out
CREATE POLICY "Employees can check in/out"
  ON attendance
  FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    ) AND date >= CURRENT_DATE - INTERVAL '1 day'
  );

-- Policy for managers to view and manage attendance
CREATE POLICY "Managers can manage attendance"
  ON attendance
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