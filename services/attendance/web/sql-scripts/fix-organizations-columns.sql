-- Fix organizations table columns and refresh schema cache
-- Run this FIRST before other scripts

-- 1. Add missing columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS biz_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS biz_number VARCHAR(50);

-- 2. Check if columns were added successfully
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM 
    information_schema.columns
WHERE 
    table_name = 'organizations'
    AND column_name IN ('code', 'biz_type', 'biz_number');

-- 3. Create function for generating org codes
CREATE OR REPLACE FUNCTION generate_org_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for auto-generating org code
DROP TRIGGER IF EXISTS auto_generate_org_code ON organizations;
CREATE TRIGGER auto_generate_org_code
    BEFORE INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION generate_org_code();

-- 5. Refresh schema cache (Supabase specific)
NOTIFY pgrst, 'reload schema';

-- 6. Grant permissions
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organizations TO anon;
GRANT ALL ON organizations TO service_role;

-- 7. Verify the table structure
SELECT 
    'Organizations table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'organizations'
ORDER BY 
    ordinal_position;