-- Enable required PostgreSQL extensions
-- PostGIS for geographic data and GPS coordinates

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geographic operations
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create helper function to get installed extensions (for testing)
CREATE OR REPLACE FUNCTION get_installed_extensions()
RETURNS TABLE(extname text, extversion text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT extname::text, extversion::text 
  FROM pg_extension 
  WHERE extname NOT IN ('plpgsql');
$$;

-- Create enum types for the database
CREATE TYPE organization_type AS ENUM (
  'MASTER_ADMIN',
  'COMPANY',
  'FRANCHISE',
  'INDIVIDUAL'
);

CREATE TYPE contract_type AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'TEMPORARY',
  'INTERNSHIP',
  'FREELANCE'
);

CREATE TYPE contract_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED'
);

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'EMPLOYEE'
);

CREATE TYPE attendance_status AS ENUM (
  'CHECKED_IN',
  'CHECKED_OUT',
  'ABSENT',
  'HOLIDAY',
  'LEAVE'
);

CREATE TYPE device_type AS ENUM (
  'IOS',
  'ANDROID',
  'WEB'
);

CREATE TYPE audit_action AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT'
);

-- Helper function to get table columns (for testing)
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  udt_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::text,
    column_default::text,
    udt_name::text
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = $1
  ORDER BY ordinal_position;
$$;

-- Helper function to get table constraints (for testing)
CREATE OR REPLACE FUNCTION get_table_constraints(
  table_name text,
  constraint_type text DEFAULT NULL
)
RETURNS TABLE(
  constraint_name text,
  constraint_type text,
  column_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    tc.constraint_name::text,
    tc.constraint_type::text,
    kcu.column_name::text
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = $1
    AND ($2 IS NULL OR tc.constraint_type = $2)
  ORDER BY tc.constraint_name, kcu.ordinal_position;
$$;