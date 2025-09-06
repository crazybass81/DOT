# Unified Identity System Migration Guide

## Current Status
❌ Migration not yet executed
- Old system (employees/organizations tables) still exists
- New unified system tables need to be created
- Complete replacement migration is ready

## Manual Migration Required

Since Supabase client cannot execute DDL statements directly, the migration must be run manually through the Supabase Dashboard.

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `mljyiuzetchtjudbcfvd`
3. Navigate to **SQL Editor**

### Step 2: Execute Migration SQL
1. Copy the entire contents of: `scripts/complete-migration-manual.sql`
2. Paste into the SQL Editor
3. Click **Run** to execute

### Step 3: Verify Migration
After execution, run the verification script:
```bash
node scripts/verify-migration.js
```

Expected result after successful migration:
- ✅ All new tables created (unified_identities, organizations_v3, role_assignments)
- ✅ Old tables removed (employees, organizations)
- ✅ Helper views created
- ✅ RLS policies enabled

## What the Migration Does

### Tables Removed:
- `employees` - Old employee table
- `organizations` - Old organization table

### Tables Created:
- `unified_identities` - Central identity management (개인/법인/프랜차이즈본사)
- `organizations_v3` - Enhanced organization structure with hierarchy
- `role_assignments` - Flexible role system (master/admin/manager/worker/franchise_admin)

### Features Added:
- Hierarchical organization structure (franchise support)
- Unified identity types matching Korean business requirements
- Flexible role assignment system
- Row Level Security (RLS) policies
- Helper views for common queries
- Audit trail for role assignments

## Post-Migration Steps

1. **Update Services**: Modify application code to use new tables
2. **Test Authentication**: Verify login/signup works with new system
3. **Create Master Admin**: Set up initial master admin user
4. **Data Validation**: Test all role-based access patterns

## Rollback Plan

If rollback is needed:
1. The migration includes `DROP TABLE IF EXISTS` for old tables
2. Original table structures are preserved in migration history
3. Can be recreated from previous migration files if needed

## Security Notes

- All new tables have RLS enabled by default
- Master admin role has full system access
- Organization owners can manage their organizations
- Users can only see their own identity data
- Role assignments are audited with assignment/revocation tracking