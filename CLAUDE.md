# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DOT is a comprehensive business platform for restaurant digital transformation, built as a microservices-based monorepo. The platform provides integrated solutions for attendance management, marketing automation, and scheduling.

## Architecture

### Monorepo Structure
- **services/**: Independent microservices (attendance, marketing, scheduler)
- **packages/**: Shared libraries (shared, ui, utils, context-manager)
- **infrastructure/**: AWS CDK deployment configurations
- **docker/**: Local development environment setup
- **monitoring/**: Prometheus/Grafana monitoring stack

### Services Overview
- **Attendance Service** (Port 3002): GPS-based attendance with web dashboard + Flutter mobile app
- **Marketing Service** (Port 3003): YouTube creator marketing automation platform
- **Scheduler Service**: Employee scheduling and shift management (in planning)

## Development Commands

### Workspace Management
- `npm install` - Install root dependencies and setup workspaces
- `npm run install:all` - Install all workspace dependencies
- `npm run clean` - Clean all build artifacts and node_modules

### Service Development
- `npm run dev` - Start all services in development mode
- `npm run dev:attendance:web` - Start attendance web service (port 3002)
- `npm run dev:attendance:mobile` - Start Flutter mobile app development
- `npm run dev:marketing` - Start marketing service (port 3003)

### Build & Test
- `npm run build` - Build all services for production
- `npm run build:attendance` - Build attendance service only
- `npm run build:marketing` - Build marketing service only
- `npm run test` - Run all tests across services
- `npm run lint` - Run linting across all services

### Service-Specific Commands

#### Attendance Service
```bash
cd services/attendance/web
npm run dev              # Web dashboard (port 3002)
npm run dev:clean        # Clean dev server with cache clear
npm run test             # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests with Supabase
npm run test:rls         # Row Level Security tests
npm run test:master-admin # Master admin functionality tests
npm run test:workflow    # Full workflow tests
npm run test:security    # Security-related tests
npm run test:performance # Performance tests
npm run setup:test-user  # Setup test user for development
npm run test:auth        # Test authentication flow
npm run deploy           # Deploy to production

cd services/attendance/mobile
flutter pub get          # Install Flutter dependencies
flutter run              # Run mobile app
flutter test             # Run Flutter tests
flutter build web       # Build for web deployment
```

#### Marketing Service
```bash
cd services/marketing
npm run dev              # Development server (port 3003)
npm run setup:aws        # Setup AWS Parameter Store
npm run load:env         # Load environment from AWS
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Infrastructure & DevOps
- `docker-compose up -d --profile dev` - Start local development environment
- `docker-compose up -d --profile monitoring` - Start monitoring stack
- `./scripts/setup-hybrid-database.sh` - Setup hybrid database architecture

## Technology Stack

### Frontend
- **Next.js 15.5** with React 19 - Web applications
- **Flutter 3.10+** - Mobile application development
- **TypeScript 5.9** - Type safety across all services
- **Tailwind CSS 3.4** - Utility-first CSS framework

### Backend & Infrastructure
- **Supabase** - Primary backend for attendance service (Auth, Realtime, Database)
- **AWS Services** - Lambda, DynamoDB, API Gateway, Cognito for marketing service
- **AWS CDK** - Infrastructure as Code
- **Docker** - Local development environment

### Testing & Quality
- **Jest** - Unit and integration testing
- **Playwright** - E2E testing
- **ESLint** - Code linting
- **TypeScript** - Static type checking