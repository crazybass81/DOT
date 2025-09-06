-- Create branches table
-- Branches belong to organizations and have GPS coordinates for geofencing

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  manager_name VARCHAR(100),
  
  -- GPS coordinates stored as separate columns for easier access
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  
  -- PostGIS geometry point for geographic queries
  location GEOMETRY(Point, 4326),
  
  -- Geofencing radius in meters
  radius_meters INTEGER NOT NULL DEFAULT 100,
  
  -- Business hours
  business_hours JSONB DEFAULT '{}',
  
  -- Branch settings
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT branches_code_org_unique UNIQUE (organization_id, code),
  CONSTRAINT branches_radius_positive CHECK (radius_meters > 0),
  CONSTRAINT branches_latitude_valid CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT branches_longitude_valid CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT branches_email_valid CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT branches_phone_valid CHECK (phone IS NULL OR phone ~ '^[0-9-]+$')
);

-- Create partial unique index for default branch per organization
CREATE UNIQUE INDEX idx_branches_one_default_per_org 
  ON branches(organization_id, is_default) 
  WHERE is_default = true AND deleted_at IS NULL;

-- Create indexes for better performance
CREATE INDEX idx_branches_organization_id ON branches(organization_id);
CREATE INDEX idx_branches_code ON branches(code);
CREATE INDEX idx_branches_is_active ON branches(is_active);
CREATE INDEX idx_branches_deleted_at ON branches(deleted_at) WHERE deleted_at IS NULL;

-- Create spatial index for location queries
CREATE INDEX idx_branches_location ON branches USING GIST(location);

-- Add comments
COMMENT ON TABLE branches IS 'Branch locations for organizations with GPS coordinates';
COMMENT ON COLUMN branches.location IS 'PostGIS point for geographic queries';
COMMENT ON COLUMN branches.radius_meters IS 'Geofencing radius for attendance check-in/out';
COMMENT ON COLUMN branches.business_hours IS 'JSON object with daily business hours';

-- Create trigger to automatically update location geometry from lat/lng
CREATE OR REPLACE FUNCTION update_branch_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_branch_location_trigger
  BEFORE INSERT OR UPDATE OF latitude, longitude ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_branch_location();

-- Create trigger for updated_at
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to check if a point is within branch radius
CREATE OR REPLACE FUNCTION is_within_radius(
  check_lat DOUBLE PRECISION,
  check_lon DOUBLE PRECISION,
  branch_lat DOUBLE PRECISION,
  branch_lon DOUBLE PRECISION,
  radius INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN calculate_distance(check_lat, check_lon, branch_lat, branch_lon) <= radius;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Row Level Security
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Policy for viewing branches
CREATE POLICY "Users can view branches of their organization"
  ON branches
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM employees 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Policy for managing branches (admins only)
CREATE POLICY "Admins can manage branches"
  ON branches
  FOR ALL
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      JOIN user_roles ur ON e.id = ur.employee_id
      WHERE e.auth_user_id = auth.uid()
        AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );