-- Create contracts table
-- Employment contracts linking employees to organizations and branches

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  -- Contract details
  contract_number VARCHAR(50),
  contract_type contract_type NOT NULL,
  status contract_status NOT NULL DEFAULT 'DRAFT',
  
  -- Contract period
  start_date DATE NOT NULL,
  end_date DATE,
  probation_end_date DATE,
  
  -- Working conditions
  work_start_time TIME NOT NULL,
  work_end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 60,
  
  -- Working days (stored as array of integers: 0=Sunday, 6=Saturday)
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
  
  -- Compensation
  hourly_wage DECIMAL(10,2) NOT NULL,
  monthly_salary DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'KRW',
  
  -- Benefits
  annual_leave_days INTEGER DEFAULT 15,
  sick_leave_days INTEGER DEFAULT 10,
  
  -- Additional terms
  job_description TEXT,
  terms_and_conditions TEXT,
  special_conditions TEXT,
  
  -- Signatures
  employee_signed_at TIMESTAMPTZ,
  employer_signed_at TIMESTAMPTZ,
  employer_signatory_name VARCHAR(100),
  
  -- Document management
  contract_document_url TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  
  -- Constraints
  CONSTRAINT contracts_dates_valid CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT contracts_probation_valid CHECK (probation_end_date IS NULL OR probation_end_date >= start_date),
  CONSTRAINT contracts_hourly_wage_positive CHECK (hourly_wage > 0),
  CONSTRAINT contracts_monthly_salary_positive CHECK (monthly_salary IS NULL OR monthly_salary > 0),
  CONSTRAINT contracts_work_hours_valid CHECK (work_end_time > work_start_time),
  CONSTRAINT contracts_break_minutes_valid CHECK (break_minutes >= 0),
  CONSTRAINT contracts_annual_leave_valid CHECK (annual_leave_days >= 0),
  CONSTRAINT contracts_sick_leave_valid CHECK (sick_leave_days >= 0),
  CONSTRAINT contracts_working_days_valid CHECK (
    array_length(working_days, 1) > 0 AND
    working_days <@ ARRAY[0,1,2,3,4,5,6]
  )
);

-- Create unique index for active contracts (only one active contract per employee)
CREATE UNIQUE INDEX idx_contracts_one_active_per_employee 
  ON contracts(employee_id, status) 
  WHERE status = 'ACTIVE';

-- Create indexes
CREATE INDEX idx_contracts_employee_id ON contracts(employee_id);
CREATE INDEX idx_contracts_organization_id ON contracts(organization_id);
CREATE INDEX idx_contracts_branch_id ON contracts(branch_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_contract_type ON contracts(contract_type);
CREATE INDEX idx_contracts_start_date ON contracts(start_date);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contracts_created_at ON contracts(created_at DESC);

-- Add comments
COMMENT ON TABLE contracts IS 'Employment contracts for employees';
COMMENT ON COLUMN contracts.working_days IS 'Array of working day numbers (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN contracts.status IS 'Contract status (DRAFT, ACTIVE, EXPIRED, TERMINATED)';
COMMENT ON COLUMN contracts.attachments IS 'JSON array of attachment documents';

-- Create trigger for updated_at
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically expire contracts
CREATE OR REPLACE FUNCTION expire_contracts()
RETURNS void AS $$
BEGIN
  UPDATE contracts
  SET status = 'EXPIRED',
      updated_at = NOW()
  WHERE status = 'ACTIVE'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to get active contract for employee
CREATE OR REPLACE FUNCTION get_active_contract(emp_id UUID)
RETURNS contracts AS $$
DECLARE
  active_contract contracts;
BEGIN
  SELECT * INTO active_contract
  FROM contracts
  WHERE employee_id = emp_id
    AND status = 'ACTIVE'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LIMIT 1;
  
  RETURN active_contract;
END;
$$ LANGUAGE plpgsql;

-- Function to check if employee is working today
CREATE OR REPLACE FUNCTION is_working_day(emp_id UUID, check_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN AS $$
DECLARE
  contract contracts;
  day_of_week INTEGER;
BEGIN
  -- Get active contract
  contract := get_active_contract(emp_id);
  
  IF contract.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get day of week (0=Sunday, 6=Saturday)
  day_of_week := EXTRACT(DOW FROM check_date);
  
  -- Check if today is a working day
  RETURN day_of_week = ANY(contract.working_days);
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Policy for employees to view their own contracts
CREATE POLICY "Employees can view their own contracts"
  ON contracts
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

-- Policy for HR/Admins to manage contracts
CREATE POLICY "HR and Admins can manage contracts"
  ON contracts
  FOR ALL
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      JOIN user_roles ur ON e.id = ur.employee_id
      WHERE e.auth_user_id = auth.uid()
        AND ur.role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER')
    )
  );

-- Policy for creating contracts (HR/Admin only)
CREATE POLICY "Only HR/Admin can create contracts"
  ON contracts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM employees e
      JOIN user_roles ur ON e.id = ur.employee_id
      WHERE e.auth_user_id = auth.uid()
        AND ur.role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER')
        AND e.organization_id = contracts.organization_id
    )
  );