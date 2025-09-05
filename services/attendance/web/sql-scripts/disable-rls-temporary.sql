-- TEMPORARY: Disable RLS for testing
-- ⚠️ WARNING: Only use this for testing! Re-enable RLS in production!

-- Disable RLS completely
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON employees TO authenticated;
GRANT ALL ON organizations TO anon;
GRANT ALL ON employees TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Add missing columns if needed
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

-- Create function for generating org codes
CREATE OR REPLACE FUNCTION generate_org_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
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

SELECT 'RLS DISABLED - FOR TESTING ONLY!' as warning;