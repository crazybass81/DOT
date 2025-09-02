# AWS to Supabase Migration Guide

## 🎯 Migration Overview

This document outlines the complete migration from AWS services to Supabase for the DOT Attendance System.

## 📊 Migration Summary

### Services Replaced

| AWS Service | Supabase Replacement | Status |
|------------|---------------------|---------|
| AWS Cognito | Supabase Auth | ✅ Completed |
| DynamoDB | Supabase Database (PostgreSQL) | ✅ Completed |
| Lambda Functions | Supabase Edge Functions | ✅ Completed |
| API Gateway | Supabase REST API | ✅ Completed |
| AWS Amplify | Vercel/Netlify | ✅ Completed |

## 🔄 What Changed

### 1. Authentication System
**Before (AWS Cognito):**
- Complex configuration
- Separate user pools
- Custom JWT handling
- Migration complexity

**After (Supabase Auth):**
- Simple configuration
- Unified auth system
- Built-in JWT handling
- OAuth providers support
- Row Level Security integration

### 2. Database
**Before (DynamoDB):**
- NoSQL single-table design
- Complex query patterns
- GSI management
- Manual scaling

**After (Supabase/PostgreSQL):**
- Relational database
- Simple SQL queries
- Built-in indexes
- Auto-scaling
- Real-time subscriptions
- Row Level Security

### 3. API Layer
**Before (AWS Lambda + API Gateway):**
- Serverless functions
- Cold start issues
- Complex deployment
- API Gateway configuration

**After (Supabase):**
- REST API auto-generated
- Edge Functions for custom logic
- No cold starts
- Simple deployment

## 📁 Files Changed/Removed

### Removed Files
```
✗ src/lib/services/aws-attendance.ts
✗ src/lib/database/dynamodb-client.ts
✗ src/services/cognitoAuthService.ts
✗ src/services/authService.ts
✗ src/services/migrationService.ts
✗ docs/deprecated/aws-scripts/
✗ src/lib/database/repositories/attendance.repository.ts (old DynamoDB version)
✗ src/lib/database/repositories/employee.repository.ts (old DynamoDB version)
```

### Modified Files
```
✓ src/services/unifiedAuthService.ts → Supabase-only implementation
✓ src/lib/database/models/attendance.model.ts → Supabase models
✓ src/api/attendance.api.ts → Next.js API routes
✓ package.json → Removed AWS dependencies
✓ README.md → Updated documentation
```

### New Files
```
+ src/lib/database/repositories/attendance.repository.ts (Supabase version)
+ .env.template → Supabase configuration
+ docs/AWS_TO_SUPABASE_MIGRATION.md → This file
```

## 🔧 Configuration Changes

### Environment Variables

**Old (.env with AWS):**
```env
NEXT_PUBLIC_AWS_REGION=ap-northeast-2
NEXT_PUBLIC_COGNITO_USER_POOL_ID=xxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

**New (.env with Supabase):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## 🗄️ Database Migration

### Schema Transformation

**DynamoDB Single Table:**
```
PK: ATTENDANCE#<uuid>
SK: EMPLOYEE#<employeeId>
GSI1: EMPLOYEE#<id>#DATE#<date>
GSI2: DATE#<date>#STATUS#<status>
```

**Supabase Relational Tables:**
```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  organization_id UUID REFERENCES organizations(id),
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Deployment Changes

### Old Deployment (AWS)
```bash
# AWS Amplify deployment
amplify push
amplify publish
```

### New Deployment (Supabase + Vercel)
```bash
# Database migrations
supabase db push

# Deploy to Vercel
vercel deploy --prod
```

## ✅ Benefits of Migration

1. **Cost Reduction**
   - Single platform billing
   - No AWS service sprawl
   - Predictable pricing

2. **Simplified Architecture**
   - One authentication system
   - Unified database and API
   - Built-in real-time features

3. **Developer Experience**
   - Simpler local development
   - Better documentation
   - Faster iteration

4. **Performance**
   - No Lambda cold starts
   - Faster queries with PostgreSQL
   - Real-time subscriptions

5. **Security**
   - Row Level Security
   - Built-in RBAC
   - Automatic SSL

## 📝 Migration Checklist

- [x] Remove AWS SDK dependencies
- [x] Remove Cognito authentication code
- [x] Remove DynamoDB repositories
- [x] Implement Supabase Auth
- [x] Create Supabase repositories
- [x] Update API endpoints
- [x] Update environment variables
- [x] Update documentation
- [x] Clean package.json

## 🔍 Testing After Migration

1. **Authentication Tests**
   ```bash
   npm run test:auth
   ```

2. **Database Operations**
   ```bash
   npm run test:integration
   ```

3. **API Endpoints**
   ```bash
   npm run test:api
   ```

## 🆘 Rollback Plan

If issues occur, the Git history maintains all AWS code:
```bash
# To view AWS implementation
git log --oneline | grep AWS
git checkout <commit-before-migration>
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [Migration Best Practices](https://supabase.com/docs/guides/migrations)

---

**Migration Date**: 2025-09-02
**Migrated By**: System Administrator
**Status**: ✅ Complete