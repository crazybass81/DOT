-- Simplified RLS policies for signup flow
-- Run this in Supabase SQL Editor

-- 1. First, disable RLS temporarily to clean up
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Drop all policies on organizations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'organizations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
    END LOOP;
    
    -- Drop all policies on employees
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'employees'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON employees', pol.policyname);
    END LOOP;
END $$;

-- 3. Add missing columns to organizations if they don't exist
DO $$
BEGIN
    -- Add code column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'code'
    ) THEN
        ALTER TABLE organizations ADD COLUMN code VARCHAR(20) UNIQUE;
    END IF;
    
    -- Add biz_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'biz_type'
    ) THEN
        ALTER TABLE organizations ADD COLUMN biz_type VARCHAR(50);
    END IF;
    
    -- Add biz_number column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'biz_number'
    ) THEN
        ALTER TABLE organizations ADD COLUMN biz_number VARCHAR(50);
    END IF;
END $$;

-- 4. Create simple, working policies for organizations
CREATE POLICY "Enable insert for authenticated users" 
ON organizations FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable select for members" 
ON organizations FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.organization_id = organizations.id 
        AND employees.user_id = auth.uid()
    )
);

CREATE POLICY "Enable update for owners and admins" 
ON organizations FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.organization_id = organizations.id 
        AND employees.user_id = auth.uid()
        AND employees.position IN ('owner', 'admin')
    )
);

-- 5. Create simple, working policies for employees
CREATE POLICY "Enable insert for own record" 
ON employees FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable select own record" 
ON employees FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable select for same org" 
ON employees FOR SELECT 
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM employees 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Enable update own record" 
ON employees FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable update for admins" 
ON employees FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.user_id = auth.uid() 
        AND e.organization_id = employees.organization_id
        AND e.position IN ('owner', 'admin')
    )
);

-- 6. Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 7. Grant permissions
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON employees TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 8. Create function for generating org codes
CREATE OR REPLACE FUNCTION generate_org_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for auto-generating org code
DROP TRIGGER IF EXISTS auto_generate_org_code ON organizations;
CREATE TRIGGER auto_generate_org_code
    BEFORE INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION generate_org_code();

-- 10. Test the setup
SELECT 'Setup completed successfully!' as status;