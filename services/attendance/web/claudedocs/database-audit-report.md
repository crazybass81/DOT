# 🚨 Database Migration Audit Report

## Executive Summary
**CRITICAL FINDING**: The database migration to unified identity system was **incomplete**. The database contains **NO TABLES** and the codebase has **inconsistent table references**.

## 📊 Audit Results

### Database State
- ✅ **Clean**: No legacy tables remain (good for cleanup perspective)
- ❌ **Critical**: NO current system tables exist
- 🚨 **Health Score**: 0.0% (0/4 expected tables found)

### Tables Expected vs Found
| Table Name | Expected | Found | Status |
|------------|----------|--------|--------|
| `unified_identities` | ✅ Current | ❌ Missing | CRITICAL |
| `organizations_v3` | ✅ Current | ❌ Missing | CRITICAL |
| `role_assignments` | ✅ Current | ❌ Missing | CRITICAL |
| `attendance_records` | ✅ Current | ❌ Missing | CRITICAL |
| `employees` | 🗑️ Legacy | ❌ Not found | Clean |
| `organizations` | 🗑️ Legacy | ❌ Not found | Clean |
| `user_roles` | 🗑️ Legacy | ❌ Not found | Clean |

## 🔍 Code Analysis Issues

### Inconsistent Table Usage
The codebase contains references to **BOTH** old and new table structures:

#### API Routes Still Using Old Tables ⚠️
- `src/app/api/attendance/route.ts` → `user_roles`
- `src/app/api/organizations/route.ts` → `organizations` + `user_roles`  
- `src/app/api/user-roles/route.ts` → `user_roles`
- `src/app/api/organizations/stats/route.ts` → `organizations` + `user_roles`

#### Services Using New Tables ✅
- `src/services/organizationService.ts` → `organizations_v3` + `role_assignments`
- `src/services/unifiedIdentityService.ts` → `unified_identities`
- `src/services/supabaseAuthService.ts` → `unified_identities` + `role_assignments`

#### Mixed Usage Files ⚠️
- `src/services/supabaseAuthService.ts` - References BOTH `employees` AND `unified_identities`
- `src/services/multiRoleAuthService.ts` - Still uses `user_roles` + `organizations`

## 🛠️ Critical Actions Required

### Phase 1: Database Schema Creation (URGENT)
```sql
-- Create unified identity system tables
-- ⚠️ IMPORTANT: Run these in Supabase SQL Editor

-- 1. Unified Identities Table
CREATE TABLE unified_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    id_type TEXT CHECK (id_type IN ('personal', 'corporate')) NOT NULL DEFAULT 'personal',
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'
);

-- 2. Organizations V3 Table  
CREATE TABLE organizations_v3 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('company', 'franchise', 'department')) NOT NULL DEFAULT 'company',
    parent_organization_id UUID REFERENCES organizations_v3(id),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true
);

-- 3. Role Assignments Table
CREATE TABLE role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    identity_id UUID REFERENCES unified_identities(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('master', 'admin', 'manager', 'worker', 'franchise_admin')) NOT NULL,
    assigned_by UUID REFERENCES unified_identities(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    custom_permissions JSONB DEFAULT '{}'
);

-- 4. Attendance Records Table
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    employee_id UUID REFERENCES unified_identities(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_location JSONB, -- {lat: number, lng: number}
    check_out_location JSONB,
    verification_method TEXT CHECK (verification_method IN ('gps', 'qr')) NOT NULL,
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    notes TEXT
);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE unified_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize as needed)
CREATE POLICY "Users can view their own identity" ON unified_identities
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own identity" ON unified_identities
    FOR UPDATE USING (auth.uid() = auth_user_id);
```

### Phase 2: Code Unification (HIGH PRIORITY)
Files requiring immediate update to use unified tables:

#### Update These API Routes:
- [ ] `src/app/api/attendance/route.ts`
- [ ] `src/app/api/organizations/route.ts` 
- [ ] `src/app/api/user-roles/route.ts`
- [ ] `src/app/api/organizations/stats/route.ts`

#### Update These Services:
- [ ] `src/services/multiRoleAuthService.ts` - Switch to unified tables
- [ ] `src/services/supabaseAuthService.ts` - Remove `employees` references

### Phase 3: Testing & Validation
```bash
# Run comprehensive tests after database creation
npm run test:integration
npm run test:rls
npm run test:auth
npm run test:security
```

## 🎯 Recommended Implementation Order

### Option 1: Database-First Approach (RECOMMENDED)
1. **Create database schema** (SQL above)
2. **Update remaining API routes** to use unified tables  
3. **Remove mixed references** in services
4. **Run tests** to validate
5. **Deploy and test** registration flow

### Option 2: Code-First Approach (More Risky)
1. Revert all API routes back to old table structure
2. Create old table schema in database
3. Run system with old architecture
4. Plan proper migration later

## ⚠️ Risk Assessment

### Current Risks:
- **System Non-Functional**: 0% health score, no user registration possible
- **Data Loss Potential**: Mixed table references could cause data corruption
- **Developer Confusion**: Inconsistent codebase structure

### Mitigation:
- ✅ No data loss risk (database is empty)
- ✅ No legacy cleanup needed  
- 🚨 Must choose unified approach consistently

## 📋 Next Steps Checklist

### Immediate (Today):
- [ ] Create unified database schema using SQL above
- [ ] Test database connection with new tables
- [ ] Update API routes to use unified tables

### Short-term (This Week):
- [ ] Complete code unification
- [ ] Run comprehensive test suite
- [ ] Test user registration flow
- [ ] Document final architecture

### Long-term:
- [ ] Add proper database migrations
- [ ] Set up automated backups
- [ ] Implement monitoring for table usage

---

## Conclusion
**The good news**: Database is clean with no legacy tables to remove.  
**The challenge**: Need to complete the migration by creating database schema and unifying code references.

**Recommendation**: Proceed with Database-First approach using the unified identity system as designed.