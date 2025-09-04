# DOT Attendance CI/CD Pipeline Documentation

A comprehensive DevOps solution for the DOT Attendance Flutter application with automated testing, building, and deployment to multiple platforms.

## 🏗️ Pipeline Architecture

### Workflow Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│ • Feature Branch│───▶│ • Auto Deploy  │───▶│ • Manual Deploy│
│ • Pull Request │    │ • Integration   │    │ • Release Tags  │
│ • Code Review   │    │ • Testing       │    │ • Store Deploy │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Pipeline Components

1. **Continuous Integration (CI)**
   - Code quality checks (lint, format, analyze)
   - Security scanning (OWASP, Trivy)
   - Automated testing (unit, widget, integration)
   - Performance and accessibility testing

2. **Continuous Deployment (CD)**
   - Multi-platform builds (iOS, Android, Web)
   - Environment-specific configurations
   - Automated app store deployments
   - Firebase Functions deployment

3. **Infrastructure as Code**
   - Terraform for AWS and GCP resources
   - Multi-environment provisioning
   - Security compliance scanning

4. **Monitoring & Alerting**
   - Health checks and performance monitoring
   - Security vulnerability scanning
   - Real-time alerting and incident management

## 📋 Workflow Files

### Core Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR, Push to main/develop | Code quality, testing, security |
| `cd-android.yml` | Push to main, Tags | Android builds and deployments |
| `cd-ios.yml` | Push to main, Tags | iOS builds and deployments |
| `cd-firebase.yml` | Functions changes | Firebase services deployment |
| `infrastructure.yml` | Infrastructure changes | Terraform deployments |
| `monitoring.yml` | Schedule, Manual | Health checks and monitoring |
| `release.yml` | Tags, Manual | Release management |

### Workflow Features

#### CI Pipeline (`ci.yml`)
- **Parallel execution** for optimal performance
- **Security-first** approach with multiple scanners
- **Quality gates** that prevent broken code merging
- **Multi-environment testing** (unit, widget, integration)
- **Performance benchmarking** and accessibility validation

#### Android CD (`cd-android.yml`)
- **Environment-specific builds** (staging/production)
- **Code signing** with secure certificate management
- **Play Store deployment** with beta track support
- **Debug symbols upload** for crash analysis
- **Automated versioning** and changelog generation

#### iOS CD (`cd-ios.yml`)
- **Xcode integration** with latest toolchain
- **TestFlight deployment** for beta testing
- **App Store Connect** automation
- **Code signing** with provisioning profiles
- **Firebase App Distribution** for internal testing

#### Firebase CD (`cd-firebase.yml`)
- **Functions deployment** with TypeScript support
- **Firestore rules** and security validation
- **Storage rules** configuration
- **Multi-project support** (staging/production)
- **Rollback capabilities** on deployment failure

## 🔐 Security Configuration

### Repository Secrets

#### Firebase Configuration
```bash
# Production Firebase configs (Base64 encoded)
FIREBASE_CONFIG_PROD              # Android google-services.json
FIREBASE_CONFIG_IOS_PROD          # iOS GoogleService-Info.plist
FIREBASE_SERVICE_ACCOUNT_PROD     # Service account for production
FIREBASE_PROJECT_PROD_ID          # Production project ID

# Staging Firebase configs
FIREBASE_CONFIG_STAGING           # Staging Android config
FIREBASE_CONFIG_IOS_STAGING       # Staging iOS config
FIREBASE_SERVICE_ACCOUNT_STAGING  # Staging service account
FIREBASE_PROJECT_STAGING_ID       # Staging project ID
```

#### Android Code Signing
```bash
ANDROID_KEYSTORE                  # Base64 encoded keystore.jks
ANDROID_STORE_PASSWORD           # Keystore password
ANDROID_KEY_PASSWORD             # Key password
ANDROID_KEY_ALIAS               # Key alias
```

#### iOS Code Signing
```bash
BUILD_CERTIFICATE_BASE64         # Base64 encoded .p12 certificate
P12_PASSWORD                    # Certificate password
PROVISIONING_PROFILE_BASE64     # Base64 encoded provisioning profile
KEYCHAIN_PASSWORD              # Keychain password
TEAM_ID                        # Apple Developer Team ID
APPLE_ID                       # Apple ID for uploads
APPLE_ID_PASSWORD              # App-specific password
```

#### App Store Deployment
```bash
# Google Play Store
GOOGLE_PLAY_SERVICE_ACCOUNT      # Service account JSON

# Apple App Store
APPSTORE_CONNECT_PRIVATE_KEY     # Base64 encoded AuthKey.p8
APPSTORE_CONNECT_KEY_ID         # Key ID
APPSTORE_CONNECT_ISSUER_ID      # Issuer ID
```

#### Infrastructure
```bash
# AWS
AWS_ACCESS_KEY_ID               # AWS access key
AWS_SECRET_ACCESS_KEY           # AWS secret key
TF_STATE_BUCKET                 # Terraform state bucket

# Google Cloud
GCP_SERVICE_ACCOUNT_KEY         # GCP service account JSON
GCP_PROJECT_ID                  # GCP project ID

# Terraform
TF_API_TOKEN                    # Terraform Cloud token
```

### Variables Configuration

#### Repository Variables
```bash
AWS_REGION=us-west-2            # Default AWS region
DOMAIN_NAME=dotattendance.com   # Application domain
```

#### Environment Variables
```bash
# Staging
FIREBASE_FUNCTIONS_URL_STAGING  # Staging functions URL

# Production  
FIREBASE_FUNCTIONS_URL_PROD     # Production functions URL
```

## 🚀 Deployment Strategy

### Environment Flow
```
Feature Branch ──┐
                 ├── Pull Request ── Code Review ── Merge
Development ─────┘                                    │
                                                      ▼
                                              ┌─────────────┐
                                              │   Staging   │
                                              │             │
                                              │ Auto Deploy │
                                              │ Integration │
                                              │ Testing     │
                                              └─────┬───────┘
                                                    │
                                              Manual Approval
                                                    │
                                                    ▼
                                              ┌─────────────┐
                                              │ Production  │
                                              │             │
                                              │ Tag Release │
                                              │ Store Deploy│
                                              └─────────────┘
```

### Deployment Triggers

#### Automatic Deployments
- **Staging**: Every push to `main` branch
- **Functions**: Changes to `functions/` directory
- **Infrastructure**: Changes to `infrastructure/` directory

#### Manual Deployments
- **Production**: Manual workflow dispatch or version tags
- **Release**: Create release tags (`v1.2.3`) 
- **Rollback**: Manual trigger with previous version

### Version Management

#### Semantic Versioning
- **Major** (v2.0.0): Breaking changes
- **Minor** (v1.1.0): New features, backward compatible
- **Patch** (v1.0.1): Bug fixes

#### Build Numbers
- Auto-incremented using GitHub run number
- Format: `version+build` (e.g., `1.2.3+42`)

## 📊 Monitoring & Observability

### Health Checks
- **Endpoint monitoring** every 15 minutes
- **Response time tracking** with alerting
- **Error rate monitoring** with thresholds

### Performance Monitoring
- **Load testing** with Artillery
- **Response time analysis** (P95 < 2000ms)
- **Error rate tracking** (< 1% for production)

### Security Monitoring
- **OWASP ZAP** automated security scanning
- **SSL/TLS certificate** validation
- **Security headers** compliance checking
- **Dependency vulnerability** scanning

### Alerting Rules
```yaml
# High Priority
- Service Down (1 minute)
- High Error Rate (5 minutes)
- SSL Certificate Expiring (30 days)

# Medium Priority  
- High Response Time (5 minutes)
- High CPU/Memory Usage (10 minutes)
- Database Connection Issues (2 minutes)

# Low Priority
- Performance Degradation
- Security Header Missing
- High Cold Start Rate
```

## 🛠️ Development Workflow

### Local Development Setup

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd DOT/mobile/dot_attendance
   ./scripts/setup_ci.sh
   ```

2. **Docker Development**
   ```bash
   # Start development environment
   docker-compose --profile dev up
   
   # Run tests
   docker-compose --profile test up
   
   # Code analysis
   docker-compose --profile analyze up
   
   # Monitoring stack
   docker-compose --profile monitoring up
   ```

3. **Firebase Emulators**
   ```bash
   # Start Firebase emulators
   firebase emulators:start
   
   # Access emulator UI
   open http://localhost:4000
   ```

### Testing Strategy

#### Test Pyramid
```
                    ┌─────────────┐
                    │     E2E     │ ── 10%
                    └─────────────┘
                  ┌─────────────────┐
                  │  Integration    │ ── 20%
                  └─────────────────┘
              ┌─────────────────────────┐
              │       Unit Tests        │ ── 70%
              └─────────────────────────┘
```

#### Test Types
- **Unit Tests** (`test/unit/`): Business logic validation
- **Widget Tests** (`test/widget/`): UI component testing  
- **Integration Tests** (`integration_test/`): End-to-end flows
- **Performance Tests** (`test/performance/`): Benchmark validation
- **Accessibility Tests** (`test/accessibility/`): A11y compliance

### Code Quality Gates

#### Pre-merge Requirements
- ✅ All tests passing
- ✅ Code coverage > 80%
- ✅ No lint warnings
- ✅ Security scan clean
- ✅ Code review approved

#### Quality Metrics
- **Maintainability Index**: > 60
- **Cyclomatic Complexity**: < 10
- **Technical Debt Ratio**: < 5%
- **Duplication**: < 3%

## 🎯 Performance Benchmarks

### Mobile App Performance
- **App startup time**: < 3 seconds
- **Screen transition**: < 500ms
- **API response time**: < 1 second
- **Memory usage**: < 100MB
- **Battery drain**: < 5%/hour

### Backend Performance  
- **API response time**: P95 < 500ms
- **Function cold start**: < 2 seconds
- **Database query time**: < 100ms
- **Throughput**: > 1000 RPS

### Infrastructure Performance
- **Availability**: > 99.9%
- **Error rate**: < 0.1%
- **Scale-up time**: < 2 minutes
- **Recovery time**: < 5 minutes

## 🔄 Disaster Recovery

### Backup Strategy
- **Database**: Daily automated backups
- **Storage**: Cross-region replication
- **Code**: Git repository with multiple remotes
- **Infrastructure**: Terraform state backup

### Recovery Procedures
1. **Service Degradation**: Auto-scaling activation
2. **Service Outage**: Automatic failover to backup region
3. **Data Loss**: Point-in-time recovery from backups
4. **Complete Disaster**: Full infrastructure recreation from Terraform

### Recovery Time Objectives
- **RTO (Recovery Time)**: 5 minutes
- **RPO (Recovery Point)**: 15 minutes
- **Data Recovery**: 1 hour
- **Full Service**: 4 hours

## 📚 Troubleshooting Guide

### Common Issues

#### Build Failures
```bash
# Flutter dependency issues
flutter clean
flutter pub get
dart run build_runner build --delete-conflicting-outputs

# Android build issues
cd android && ./gradlew clean
cd .. && flutter build android

# iOS build issues  
cd ios && pod clean && pod install
cd .. && flutter build ios
```

#### Deployment Failures
```bash
# Check secrets configuration
gh secret list

# Verify Firebase configuration
firebase projects:list
firebase use <project-id>

# Test code signing
security find-identity -v -p codesigning
```

#### Test Failures
```bash
# Run specific test suite
flutter test test/unit/
flutter test test/widget/
flutter test integration_test/

# Debug test issues
flutter test --reporter=verbose
flutter logs
```

### Performance Issues
```bash
# Profile Flutter app
flutter run --profile
flutter run --release --observe

# Analyze bundle size  
flutter build appbundle --analyze-size
flutter build web --analyze-size

# Check memory usage
flutter run --memory-profile
```

## 📞 Support & Contacts

### Team Responsibilities
- **DevOps Team**: CI/CD pipeline maintenance
- **QA Team**: Test automation and quality gates
- **Security Team**: Security scanning and compliance  
- **Mobile Team**: Flutter app development
- **Backend Team**: Firebase Functions and infrastructure

### Emergency Contacts
- **On-call Engineer**: DevOps rotation
- **Security Incident**: Security team lead
- **Service Outage**: SRE team
- **App Store Issues**: Release manager

### Documentation Links
- [Flutter CI/CD Guide](https://docs.flutter.dev/deployment/ci)
- [Firebase CI/CD](https://firebase.google.com/docs/cli/ci)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Terraform Cloud](https://www.terraform.io/cloud)

---

**Last Updated**: August 2024  
**Version**: 1.0.0  
**Maintainer**: DevOps Team