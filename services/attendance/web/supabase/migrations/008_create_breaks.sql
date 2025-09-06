-- Create breaks table
-- Records break times within attendance records

CREATE TABLE IF NOT EXISTS breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  
  -- Break times
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER,
  
  -- Break type
  break_type VARCHAR(50) DEFAULT 'REGULAR', -- 'REGULAR', 'LUNCH', 'REST', 'OTHER'
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT breaks_times_valid CHECK (
    end_time IS NULL OR end_time > start_time
  ),
  CONSTRAINT breaks_duration_positive CHECK (
    duration_minutes IS NULL OR duration_minutes > 0
  )
);

-- Create indexes
CREATE INDEX idx_breaks_attendance_id ON breaks(attendance_id);
CREATE INDEX idx_breaks_start_time ON breaks(start_time);
CREATE INDEX idx_breaks_break_type ON breaks(break_type);

-- Add comments
COMMENT ON TABLE breaks IS 'Break time records within attendance';
COMMENT ON COLUMN breaks.break_type IS 'Type of break (REGULAR, LUNCH, REST, OTHER)';
COMMENT ON COLUMN breaks.duration_minutes IS 'Calculated duration in minutes';

-- Create trigger for updated_at
CREATE TRIGGER update_breaks_updated_at
  BEFORE UPDATE ON breaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate break duration
CREATE OR REPLACE FUNCTION calculate_break_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate duration if both start and end times exist
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  
  -- Update attendance total work minutes when break is modified
  IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
    UPDATE attendance
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.attendance_id, OLD.attendance_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_break_duration_trigger
  BEFORE INSERT OR UPDATE OF start_time, end_time
  ON breaks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_break_duration();

-- Function to start a break
CREATE OR REPLACE FUNCTION start_break(
  p_attendance_id UUID,
  p_break_type VARCHAR(50) DEFAULT 'REGULAR'
)
RETURNS breaks AS $$
DECLARE
  v_break breaks;
BEGIN
  -- Check if there's an active break
  SELECT * INTO v_break
  FROM breaks
  WHERE attendance_id = p_attendance_id
    AND end_time IS NULL;
  
  IF v_break.id IS NOT NULL THEN
    RAISE EXCEPTION 'There is already an active break';
  END IF;
  
  -- Create new break
  INSERT INTO breaks (
    attendance_id,
    start_time,
    break_type
  ) VALUES (
    p_attendance_id,
    CURRENT_TIME,
    p_break_type
  ) RETURNING * INTO v_break;
  
  RETURN v_break;
END;
$$ LANGUAGE plpgsql;

-- Function to end a break
CREATE OR REPLACE FUNCTION end_break(
  p_break_id UUID
)
RETURNS breaks AS $$
DECLARE
  v_break breaks;
BEGIN
  -- Update break with end time
  UPDATE breaks
  SET 
    end_time = CURRENT_TIME,
    updated_at = NOW()
  WHERE id = p_break_id
    AND end_time IS NULL
  RETURNING * INTO v_break;
  
  IF v_break.id IS NULL THEN
    RAISE EXCEPTION 'Break not found or already ended';
  END IF;
  
  RETURN v_break;
END;
$$ LANGUAGE plpgsql;

-- Function to get total break time for an attendance record
CREATE OR REPLACE FUNCTION get_total_break_minutes(
  p_attendance_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  total_minutes INTEGER;
BEGIN
  SELECT COALESCE(SUM(duration_minutes), 0) INTO total_minutes
  FROM breaks
  WHERE attendance_id = p_attendance_id
    AND duration_minutes IS NOT NULL;
  
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;

-- Policy for employees to view and manage their own breaks
CREATE POLICY "Employees can manage their own breaks"
  ON breaks
  FOR ALL
  USING (
    attendance_id IN (
      SELECT a.id
      FROM attendance a
      JOIN employees e ON e.id = a.employee_id
      WHERE e.auth_user_id = auth.uid()
    )
  );

-- Policy for managers to view and manage breaks
CREATE POLICY "Managers can manage breaks"
  ON breaks
  FOR ALL
  USING (
    attendance_id IN (
      SELECT a.id
      FROM attendance a
      JOIN branches b ON b.id = a.branch_id
      JOIN employees e ON e.organization_id = b.organization_id
      JOIN user_roles ur ON ur.employee_id = e.id
      WHERE e.auth_user_id = auth.uid()
        AND ur.role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER')
    )
  );