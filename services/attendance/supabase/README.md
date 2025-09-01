# DOT Attendance System - Supabase Implementation

## 🚀 Overview

This is the Supabase backend implementation for the DOT Attendance System, featuring Edge Functions, PostgreSQL database with Row Level Security, and real-time capabilities.

## 📋 Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Supabase account and project created
- Node.js 18+ (for local development)
- Deno 1.30+ (for Edge Functions)

## 🏗️ Architecture

### Edge Functions

The system uses Supabase Edge Functions (Deno runtime) following SOLID principles:

```
functions/
├── attendance-checkin/      # Employee check-in
├── attendance-checkout/     # Employee check-out
├── attendance-break/        # Break management (start/end)
├── attendance-status/       # Current attendance status
├── attendance-history/      # Historical attendance records
├── employee-register/       # New employee registration
├── employee-approve/        # Approve pending employees
├── employee-reject/         # Reject pending employees
├── employee-pending/        # List pending approvals
└── _shared/                # Shared services and utilities
    ├── cors.ts             # CORS configuration
    ├── interfaces/         # TypeScript interfaces
    ├── models/            # Data models
    └── services/          # Business logic services
        ├── attendance.service.ts
        ├── approval.service.ts
        ├── auth.service.ts
        └── validation.service.ts
```

### Database Schema

- **employees** - Employee profiles with approval workflow
- **attendance** - Daily attendance records
- **breaks** - Break time tracking
- **organizations** - Company/organization data
- **branches** - Office locations
- **departments** - Organizational units
- **positions** - Job positions/roles
- **locations** - Valid check-in/out locations
- **approval_history** - Audit trail for approvals
- **qr_codes** - QR code management

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/dot-attendance.git
cd dot-attendance/services/attendance/supabase
```

### 2. Configure Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

### 3. Environment Variables

Create `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Edge Functions
EDGE_FUNCTION_URL=https://your-project.supabase.co/functions/v1
```

### 4. Database Migration

```bash
# Run migrations
supabase db push

# Or apply specific migration
supabase db push --file migrations/001_initial_schema.sql

# Check migration status
supabase db migrations list
```

### 5. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy attendance-checkin

# Deploy with environment variables
supabase functions deploy --env-file .env
```

### 6. Set Function Secrets

```bash
# Set secrets for Edge Functions
supabase secrets set SUPABASE_URL=your-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
```

## 🧪 Testing

### Run Tests Locally

```bash
# Install Deno if not already installed
curl -fsSL https://deno.land/x/install/install.sh | sh

# Run tests
deno test --allow-net --allow-env functions/tests/

# Run specific test file
deno test --allow-net --allow-env functions/tests/attendance.test.ts

# Run with coverage
deno test --allow-net --allow-env --coverage=coverage functions/tests/
```

### Test with Supabase CLI

```bash
# Serve functions locally
supabase functions serve

# In another terminal, test a function
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/attendance-checkin' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"employeeId":"test-id","locationId":"main-office","latitude":37.5665,"longitude":126.9780}'
```

## 📱 Mobile App Integration

### Flutter Configuration

Update your Flutter app's configuration:

```dart
// lib/core/config/app_config.dart
class AppConfig {
  static const String supabaseUrl = 'https://your-project.supabase.co';
  static const String supabaseAnonKey = 'your-anon-key';
  
  static const String functionsUrl = 'https://your-project.supabase.co/functions/v1';
}
```

### Initialize Supabase

```dart
// main.dart
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
  );
  
  runApp(MyApp());
}
```

## 🔒 Security

### Row Level Security (RLS)

All tables have RLS enabled with policies:

- Employees can only view/edit their own data
- Master admins have full access
- Managers can view their team's data
- Unauthenticated users cannot access any data

### Authentication Flow

1. **Registration**: Employee registers via QR scan → Creates pending employee record
2. **Approval**: Master admin approves/rejects → Updates employee status
3. **Authentication**: Approved employee can log in → Gets JWT token
4. **Authorization**: JWT token validates API access → RLS policies enforce data access

## 📊 API Endpoints

### Attendance Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/attendance-checkin` | POST | Check in for work |
| `/attendance-checkout` | POST | Check out from work |
| `/attendance-break` | POST | Start/end break |
| `/attendance-status` | GET | Get current status |
| `/attendance-history` | GET | Get attendance history |

### Employee Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/employee-register` | POST | Register new employee |
| `/employee-approve` | POST | Approve pending employee |
| `/employee-reject` | POST | Reject pending employee |
| `/employee-pending` | GET | List pending approvals |

## 📈 Monitoring

### View Logs

```bash
# View function logs
supabase functions logs attendance-checkin

# Follow logs in real-time
supabase functions logs attendance-checkin --follow

# Filter by error level
supabase functions logs attendance-checkin --level error
```

### Database Monitoring

```sql
-- Check attendance records
SELECT * FROM attendance 
WHERE date = CURRENT_DATE 
ORDER BY check_in_time DESC;

-- View pending approvals
SELECT * FROM v_pending_approvals;

-- Check system health
SELECT 
  COUNT(*) as total_employees,
  COUNT(CASE WHEN approval_status = 'APPROVED' THEN 1 END) as approved,
  COUNT(CASE WHEN approval_status = 'PENDING' THEN 1 END) as pending
FROM employees;
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure CORS headers are properly configured in `_shared/cors.ts`
   - Check allowed origins match your frontend URL

2. **Authentication Errors**
   - Verify JWT token is valid and not expired
   - Check RLS policies allow the operation

3. **Function Timeout**
   - Edge Functions have a 150-second timeout
   - Optimize database queries and reduce payload size

4. **Database Connection**
   - Ensure service role key is set in secrets
   - Check database URL is correct

### Debug Mode

Enable debug logging:

```typescript
// In Edge Function
console.log('Debug:', JSON.stringify(data, null, 2));
```

View debug logs:

```bash
supabase functions logs function-name --level debug
```

## 📝 Development Workflow

### Local Development

1. Start Supabase locally:
```bash
supabase start
```

2. Apply migrations:
```bash
supabase db reset
```

3. Serve functions:
```bash
supabase functions serve
```

4. Test with local URLs:
```
API URL: http://localhost:54321
Functions: http://localhost:54321/functions/v1
```

### Deployment

1. Push database changes:
```bash
supabase db push
```

2. Deploy functions:
```bash
supabase functions deploy
```

3. Verify deployment:
```bash
supabase functions list
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Deno Documentation](https://deno.land/manual)

## 🤝 Contributing

1. Create feature branch
2. Make changes following SOLID principles
3. Write/update tests
4. Submit pull request

## 📄 License

MIT License - See LICENSE file for details