# Supabase Setup Guide

## Overview

This guide provides complete setup instructions for the DOT Attendance Service using Supabase as the unified backend platform.

## Prerequisites

- Node.js 18+
- Supabase account (https://supabase.com)
- Flutter SDK 3.10+ (for mobile development)

## Supabase Project Setup

### 1. Create Supabase Project

1. Sign up at https://supabase.com
2. Create a new project
3. Note your project URL and anon key

### 2. Database Schema Setup

Run the following migrations in Supabase SQL Editor:

```sql
-- Create tables
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  department_id UUID REFERENCES departments(id),
  employee_code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'manager', 'employee')),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, employee_code)
);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  organization_id UUID REFERENCES organizations(id),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_location JSONB,
  check_out_location JSONB,
  check_in_device JSONB,
  check_out_device JSONB,
  verification_method TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  organization_id UUID REFERENCES organizations(id),
  date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  schedule_type TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_org ON attendance_records(organization_id);
CREATE INDEX idx_attendance_date ON attendance_records(created_at);
CREATE INDEX idx_schedules_employee ON schedules(employee_id);
CREATE INDEX idx_schedules_date ON schedules(date);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
```

### 3. Row Level Security Policies

```sql
-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM employees 
      WHERE auth_id = auth.uid()
    )
  );

-- Employees policies
CREATE POLICY "Users can view employees in their org" ON employees
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE auth_id = auth.uid()
    )
  );

-- Attendance policies
CREATE POLICY "Users can view their attendance" ON attendance_records
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their attendance" ON attendance_records
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE auth_id = auth.uid()
    )
  );

-- Admin policies
CREATE POLICY "Admins can manage organization data" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_id = auth.uid() 
      AND role = 'admin'
      AND organization_id = employees.organization_id
    )
  );
```

## Application Configuration

### Web Application Setup

1. **Environment Variables**

Create `.env.local` in the web directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

2. **Install Dependencies**

```bash
cd services/attendance/web
npm install
```

3. **Run Development Server**

```bash
npm run dev
```

### Mobile Application Setup

1. **Configure Supabase**

Update `lib/config/supabase.dart`:

```dart
class SupabaseConfig {
  static const String url = 'https://your-project.supabase.co';
  static const String anonKey = 'your-anon-key';
}
```

2. **Install Dependencies**

```bash
cd services/attendance/mobile
flutter pub get
```

3. **Run Mobile App**

```bash
flutter run
```

## Authentication Setup

### Email Authentication

1. Enable email authentication in Supabase Dashboard
2. Configure email templates for:
   - Sign up confirmation
   - Password reset
   - Email change

### OAuth Providers (Optional)

Configure OAuth providers in Supabase Dashboard:
- Google
- GitHub
- Apple (for iOS)

## Real-time Features

Enable real-time subscriptions for:

```javascript
// Subscribe to attendance updates
const subscription = supabase
  .channel('attendance_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'attendance_records'
  }, (payload) => {
    console.log('Attendance update:', payload)
  })
  .subscribe()
```

## Edge Functions

Deploy Edge Functions for:
- QR code generation
- Attendance validation
- Report generation

```bash
supabase functions deploy generate-qr
supabase functions deploy validate-attendance
supabase functions deploy generate-report
```

## Storage Setup

Configure storage buckets for:
- Profile photos
- QR codes
- Reports

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('qr-codes', 'qr-codes', false),
  ('reports', 'reports', false);
```

## Monitoring & Analytics

1. Enable database insights in Supabase Dashboard
2. Set up alerts for:
   - High query load
   - Failed authentication attempts
   - Storage quota usage

## Security Best Practices

1. **API Keys**
   - Never expose service role key in client code
   - Use anon key for client-side operations
   - Rotate keys regularly

2. **RLS Policies**
   - Always enable RLS on all tables
   - Test policies thoroughly
   - Use service role only for admin operations

3. **Data Validation**
   - Validate input on both client and server
   - Use database constraints
   - Implement rate limiting

## Deployment

### Production Checklist

- [ ] Configure production environment variables
- [ ] Enable SSL/TLS
- [ ] Set up backup strategy
- [ ] Configure monitoring
- [ ] Test RLS policies
- [ ] Enable audit logging
- [ ] Set up CI/CD pipeline

### Deployment Platforms

**Web Application:**
- Vercel (recommended)
- Netlify
- AWS Amplify

**Mobile Application:**
- iOS: App Store
- Android: Google Play Store

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check API keys configuration
   - Verify RLS policies
   - Check user permissions

2. **Database Connection**
   - Verify Supabase URL
   - Check network connectivity
   - Review connection pooling settings

3. **Real-time Not Working**
   - Enable real-time for tables
   - Check WebSocket connection
   - Verify subscription syntax

## Support

- Supabase Documentation: https://supabase.com/docs
- Project Issues: GitHub Issues
- Community: Discord/Slack

## Next Steps

1. Complete database setup
2. Configure authentication
3. Deploy Edge Functions
4. Set up monitoring
5. Test all features
6. Deploy to production