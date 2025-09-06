-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  manager_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  position VARCHAR(100),
  role VARCHAR(50) DEFAULT 'EMPLOYEE',
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  join_date DATE,
  employment_type VARCHAR(50),
  work_schedule JSONB,
  is_active BOOLEAN DEFAULT true,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(organization_id, employee_code),
  CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE', 'HR'))
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'PRESENT',
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  actual_work_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2),
  break_duration INTEGER, -- in minutes
  check_in_location JSONB,
  check_out_location JSONB,
  device_info JSONB,
  notes TEXT,
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date),
  CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'HOLIDAY', 'SICK_LEAVE', 'VACATION', 'REMOTE', 'BUSINESS_TRIP'))
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  schedule_type VARCHAR(50) DEFAULT 'REGULAR',
  shift_name VARCHAR(100),
  shift_code VARCHAR(50),
  status VARCHAR(20) DEFAULT 'SCHEDULED',
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date),
  CHECK (schedule_type IN ('REGULAR', 'OVERTIME', 'SHIFT', 'ON_CALL', 'TRAINING')),
  CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'))
);

-- Create attendance_statistics table for aggregated data
CREATE TABLE IF NOT EXISTS attendance_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- YYYY-MM format
  total_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  late_days INTEGER DEFAULT 0,
  leave_days INTEGER DEFAULT 0,
  total_work_hours DECIMAL(6,2) DEFAULT 0,
  overtime_hours DECIMAL(6,2) DEFAULT 0,
  average_check_in_time TIME,
  average_check_out_time TIME,
  attendance_rate DECIMAL(5,2), -- percentage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, period)
);

-- Create indexes for better performance
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, date DESC);
CREATE INDEX idx_attendance_org_date ON attendance_records(organization_id, date DESC);
CREATE INDEX idx_attendance_status ON attendance_records(status);
CREATE INDEX idx_attendance_date ON attendance_records(date DESC);

CREATE INDEX idx_schedule_employee_date ON schedules(employee_id, date DESC);
CREATE INDEX idx_schedule_org_date ON schedules(organization_id, date DESC);

CREATE INDEX idx_employee_org ON employees(organization_id);
CREATE INDEX idx_employee_dept ON employees(department_id);
CREATE INDEX idx_employee_email ON employees(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_statistics_updated_at BEFORE UPDATE ON attendance_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_statistics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic examples - adjust based on your needs)

-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM employees 
      WHERE user_id = auth.uid()
    )
  );

-- Employees: Users can view employees in their organization
CREATE POLICY "Users can view employees in same organization" ON employees
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE user_id = auth.uid()
    )
  );

-- Attendance: Users can view their own attendance
CREATE POLICY "Users can view own attendance" ON attendance_records
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid()
    )
    OR
    -- Managers can view their team's attendance
    employee_id IN (
      SELECT id FROM employees 
      WHERE manager_id IN (
        SELECT id FROM employees 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Attendance: Users can insert their own attendance
CREATE POLICY "Users can insert own attendance" ON attendance_records
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid()
    )
  );

-- Attendance: Users can update their own attendance (for checkout)
CREATE POLICY "Users can update own attendance" ON attendance_records
  FOR UPDATE USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid()
    )
  );

-- Similar policies for other tables...

-- Create function to auto-create employee record when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO employees (user_id, email, name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'organization_id')::UUID,
      (SELECT id FROM organizations WHERE code = 'DEFAULT' LIMIT 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create employee on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert default organization for testing
INSERT INTO organizations (id, name, code, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Organization', 'DEFAULT', 'admin@dot-attendance.com')
ON CONFLICT DO NOTHING;