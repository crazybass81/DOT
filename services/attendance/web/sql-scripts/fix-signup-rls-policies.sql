-- Fix RLS policies for signup flow
-- 1. Organizations table policies

-- Drop existing policies
DROP POLICY IF EXISTS "Organizations - Users can insert their own org" ON organizations;
DROP POLICY IF EXISTS "Organizations - Users can view their org" ON organizations;
DROP POLICY IF EXISTS "Organizations - Users can update their org" ON organizations;

-- Create new policies for organizations
CREATE POLICY "Organizations - Users can insert their own org" 
ON organizations FOR INSERT 
WITH CHECK (true);  -- Allow any authenticated user to create an organization

CREATE POLICY "Organizations - Users can view their org" 
ON organizations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.organization_id = organizations.id 
        AND employees.user_id = auth.uid()
    )
);

CREATE POLICY "Organizations - Users can update their org" 
ON organizations FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.organization_id = organizations.id 
        AND employees.user_id = auth.uid()
        AND employees.position IN ('owner', 'admin')
    )
);

-- 2. Employees table policies

-- Drop existing policies
DROP POLICY IF EXISTS "Employees - Users can insert during signup" ON employees;
DROP POLICY IF EXISTS "Employees - Users can view employees in their org" ON employees;
DROP POLICY IF EXISTS "Employees - Owners/admins can update employees" ON employees;
DROP POLICY IF EXISTS "Employees - Users can view their own record" ON employees;

-- Create new policies for employees
CREATE POLICY "Employees - Users can insert during signup" 
ON employees FOR INSERT 
WITH CHECK (
    -- Allow users to create their own employee record
    auth.uid() = user_id
    OR
    -- Allow admins/owners to create employees in their organization
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.organization_id = NEW.organization_id
        AND e.position IN ('owner', 'admin')
    )
);

CREATE POLICY "Employees - Users can view their own record" 
ON employees FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Employees - Users can view employees in their org" 
ON employees FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.organization_id = employees.organization_id
    )
);

CREATE POLICY "Employees - Owners/admins can update employees" 
ON employees FOR UPDATE 
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.organization_id = employees.organization_id
        AND e.position IN ('owner', 'admin')
    )
);

-- 3. Make sure RLS is enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 4. Grant necessary permissions
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON employees TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Add missing columns to organizations table if they don't exist
DO $$
BEGIN
    -- Add code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'code'
    ) THEN
        ALTER TABLE organizations ADD COLUMN code VARCHAR(20);
    END IF;
    
    -- Add biz_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'biz_type'
    ) THEN
        ALTER TABLE organizations ADD COLUMN biz_type VARCHAR(50);
    END IF;
    
    -- Add biz_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'biz_number'
    ) THEN
        ALTER TABLE organizations ADD COLUMN biz_number VARCHAR(50);
    END IF;
END $$;

-- 6. Generate organization code function
CREATE OR REPLACE FUNCTION generate_org_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate a random 8-character code if not provided
    IF NEW.code IS NULL THEN
        NEW.code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating org code
DROP TRIGGER IF EXISTS auto_generate_org_code ON organizations;
CREATE TRIGGER auto_generate_org_code
    BEFORE INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION generate_org_code();