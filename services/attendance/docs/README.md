# DOT Attendance Service Documentation

## 📚 Documentation Structure

### Core Documentation
- [**Project Overview**](../README.md) - Main project README with architecture and features
- [**API Reference**](./API.md) - Complete REST API documentation with examples
- [**OpenAPI Specification**](./openapi.yml) - Machine-readable API specification (Swagger)
- [**Supabase Setup Guide**](./SUPABASE_SETUP.md) - Complete Supabase configuration and deployment

### Feature Documentation
- [**Admin Dashboard**](./features/ADMIN_DASHBOARD_SUMMARY.md) - Admin panel features and implementation
- [**Approval Workflow**](./features/APPROVAL_WORKFLOW_SUMMARY.md) - Leave and attendance approval system
- [**Real-time Features**](./features/REALTIME_IMPLEMENTATION.md) - WebSocket and real-time updates
- [**QR Code System**](./features/qr_code_implementation_summary.md) - QR-based check-in/out
- [**Mobile Approval**](./features/mobile_approval_system.md) - Mobile app approval features

### Development Guides
- [**Implementation Workflow**](./guides/IMPLEMENTATION_WORKFLOW.md) - Step-by-step development guide
- [**Quick Start**](./guides/WORKFLOW_QUICKSTART.md) - Fast setup for developers
- [**Supabase Setup**](./guides/supabase-setup.md) - Database and auth configuration
- [**Mobile Debug**](./guides/mobile_debug_login.md) - Mobile app debugging guide

### Architecture
- [**Database Schema**](./architecture/database_schema_extension.md) - PostgreSQL schema design
- [**Mobile Stack**](./architecture/mobile_recommended_stack.md) - Flutter app architecture

### Testing & Performance
- [**QR Deep Link Testing**](./testing/test_qr_deeplink.md) - Testing QR code functionality
- [**Performance Benchmarks**](../tests/benchmarks/database-performance.test.ts) - Database query performance tests
- [**Unit Tests**](../tests/) - Comprehensive test suite with security validation

## 🚀 Quick Start

### For Developers
1. Start with [Quick Start Guide](./guides/WORKFLOW_QUICKSTART.md)
2. Follow [Supabase Setup](./SUPABASE_SETUP.md)
3. Review [Implementation Workflow](./guides/IMPLEMENTATION_WORKFLOW.md)

### For System Administrators
1. Read [Supabase Setup Guide](./SUPABASE_SETUP.md)
2. Configure database using schema in [Database Schema](./architecture/database_schema_extension.md)
3. Deploy using production checklist

### For Mobile Developers
1. Review [Mobile Stack](./architecture/mobile_recommended_stack.md)
2. Follow [Mobile Debug Guide](./guides/mobile_debug_login.md)
3. Implement [Mobile Approval System](./features/mobile_approval_system.md)

## 🏗️ Technology Stack

### Backend
- **Platform**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **API**: RESTful + GraphQL via PostgREST
- **Functions**: Supabase Edge Functions (Deno)
- **Security**: Row Level Security (RLS)

### Web Frontend
- **Framework**: Next.js 15.5
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Hooks
- **Auth**: Supabase Auth

### Mobile
- **Framework**: Flutter 3.x
- **Language**: Dart
- **State**: Riverpod
- **Features**: QR Scanner, Biometric Auth, GPS

## 📋 Features

### Core Features
- ✅ QR Code check-in/out
- ✅ GPS location verification
- ✅ Real-time attendance tracking
- ✅ Admin dashboard
- ✅ Mobile app support
- ✅ Biometric authentication
- ✅ Offline mode with sync
- ✅ Multi-organization support

### Admin Features
- ✅ Employee management
- ✅ Attendance reports
- ✅ Schedule management
- ✅ Department organization
- ✅ Real-time monitoring
- ✅ Approval workflows

### Security Features
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Row Level Security
- ✅ Device fingerprinting
- ✅ GPS spoofing prevention

## 🔧 Development

### Prerequisites
- Node.js 18+
- Flutter SDK 3.10+
- Supabase account
- Git

### Setup Steps
1. Clone repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Setup Supabase project
5. Run development server: `npm run dev`

### Testing
```bash
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:e2e       # End-to-end tests
npm run test:coverage  # Coverage report
```

## 📦 Deployment

### Web Deployment
- **Platform**: Vercel / Netlify
- **Build**: `npm run build`
- **Deploy**: `npm run deploy`

### Mobile Deployment
- **iOS**: App Store Connect
- **Android**: Google Play Console
- **Build**: `flutter build [ios|apk]`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Follow coding standards
4. Write tests
5. Submit pull request

## 📞 Support

- **Documentation**: This directory
- **Issues**: GitHub Issues
- **Community**: Discord/Slack
- **Email**: support@dot-platform.com

## 📄 License

Proprietary - DOT Platform

---

*Last Updated: 2025*