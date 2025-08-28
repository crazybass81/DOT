# DOT Attendance Service - DynamoDB Implementation

## 📋 Overview

Complete DynamoDB implementation for the DOT attendance management system, designed for Korean restaurant businesses. This service provides comprehensive attendance tracking, employee management, and scheduling capabilities using AWS DynamoDB.

## 🏗️ Architecture

### Database Design

The system uses a single-table design pattern with composite keys and Global Secondary Indexes (GSIs) for efficient querying:

#### Tables
1. **dot-attendance** - Main attendance records
2. **dot-employees** - Employee information
3. **dot-schedules** - Work schedules

#### Key Patterns
- **Primary Key (PK)**: `ATTENDANCE#<uuid>`, `EMPLOYEE#<id>`, `SCHEDULE#<id>`
- **Sort Key (SK)**: `EMPLOYEE#<id>`, `ORG#<id>`, `DATE#<date>`

#### Global Secondary Indexes
- **employee-date-index**: Query attendance by employee and date range
- **date-status-index**: Query all attendance for a specific date
- **organization-index**: Query employees by organization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- AWS Account (for production)

### Local Development Setup

1. **Start Local DynamoDB**
```bash
docker-compose up -d dynamodb-local dynamodb-admin
```

2. **Install Dependencies**
```bash
cd services/attendance
npm install
```

3. **Set Environment Variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Create Tables**
```bash
npm run db:create-tables
```

5. **Run Tests**
```bash
npm test
```

## 📦 Features Implemented

### ✅ Complete Features

#### 1. **DynamoDB Client Configuration** (`dynamodb-client.ts`)
- Auto-detection of local vs AWS environment
- Optimized retry and marshalling settings
- Connection pooling for performance

#### 2. **Data Models** (`models/attendance.model.ts`)
- AttendanceRecord with location tracking
- Employee with role-based access
- Schedule with recurring patterns
- Statistics aggregation model

#### 3. **Repository Layer** (`repositories/`)
- **AttendanceRepository**
  - Check-in/Check-out operations
  - Attendance history queries
  - Statistics calculation
  - Batch operations
  - Status updates
  
- **EmployeeRepository**
  - CRUD operations
  - Organization/Department queries
  - Search functionality
  - Batch get operations
  - Soft delete support

#### 4. **API Endpoints** (`api/attendance.api.ts`)
- RESTful Lambda functions
- CORS configuration
- Error handling
- Request validation

#### 5. **Local Development**
- Docker Compose setup
- DynamoDB Admin GUI (port 8001)
- LocalStack option for full AWS simulation

#### 6. **Testing Suite**
- Repository unit tests
- Integration tests
- Mock data generators

## 🔧 API Endpoints

### Attendance Operations

```typescript
POST   /attendance/check-in
POST   /attendance/check-out
GET    /attendance/today/{employeeId}
GET    /attendance/history/{employeeId}?startDate=&endDate=
GET    /attendance/date/{date}?organizationId=
GET    /attendance/statistics/{employeeId}?period=
PUT    /attendance/status/{attendanceId}
POST   /attendance/batch
DELETE /attendance/{attendanceId}?employeeId=
```

### Employee Operations

```typescript
POST   /employees
GET    /employees/{employeeId}?organizationId=
GET    /employees/organization/{organizationId}
GET    /employees/department/{departmentId}
GET    /employees/search?organizationId=&q=
PUT    /employees/{employeeId}
DELETE /employees/{employeeId}?organizationId=
```

## 💻 Usage Examples

### Check-in Operation
```typescript
const attendanceRepo = new AttendanceRepository();

const result = await attendanceRepo.checkIn(
  'employee-123',
  'org-456',
  { latitude: 37.5665, longitude: 126.9780 }, // Seoul
  { deviceId: 'mobile-001', deviceType: 'iOS' }
);
```

### Get Monthly Statistics
```typescript
const stats = await attendanceRepo.getAttendanceStatistics(
  'employee-123',
  '2024-01' // YYYY-MM format
);

console.log(`Attendance Rate: ${stats.attendanceRate}%`);
console.log(`Total Work Hours: ${stats.totalWorkHours}`);
```

### Search Employees
```typescript
const employeeRepo = new EmployeeRepository();

const results = await employeeRepo.searchEmployees(
  'org-456',
  '김' // Search Korean names
);
```

## 🛠️ Development Commands

```bash
# Start local DynamoDB
npm run db:local

# Create tables
npm run db:create-tables

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Deploy to AWS
npm run deploy

# View DynamoDB Admin
open http://localhost:8001
```

## 📊 Performance Optimizations

1. **Composite Keys**: Efficient querying without table scans
2. **GSI Design**: Optimized for common access patterns
3. **Batch Operations**: Reduce API calls for bulk operations
4. **Connection Reuse**: DynamoDB client singleton pattern
5. **Adaptive Retry**: Automatic retry with exponential backoff

## 🔒 Security Features

- Cognito integration for authentication
- Role-based access control (RBAC)
- Location verification for check-ins
- Device fingerprinting
- Audit trails for all modifications

## 🌏 Localization

- Korean timezone support (Asia/Seoul)
- Korean language ready
- Local date/time formatting
- Cultural business rules (Korean work week)

## 📈 Monitoring

### CloudWatch Metrics
- Request latency
- Error rates
- Throttling events
- Consumed capacity

### Application Metrics
- Check-in/out success rates
- Average response times
- Daily active users
- Peak usage hours

## 🚨 Error Handling

All errors are properly caught and returned with appropriate HTTP status codes:

- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate operations)
- `500` - Internal Server Error

## 🔄 Migration Guide

### From RDS/MySQL
1. Export existing data to JSON
2. Transform to DynamoDB format
3. Use batch import scripts
4. Verify data integrity

### Table Creation Script
```bash
cd services/attendance/scripts
npx ts-node create-dynamodb-tables.ts
```

## 📝 Environment Variables

```env
# Required
AWS_REGION=ap-northeast-2
ATTENDANCE_TABLE_NAME=dot-attendance
EMPLOYEES_TABLE_NAME=dot-employees

# Optional
DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000
ENABLE_XRAY=true
LOG_LEVEL=debug
```

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run test:load
```

## 📚 Additional Resources

- [AWS DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [DynamoDB Toolbox](https://github.com/jeremydaly/dynamodb-toolbox)

## 👥 Support

For issues or questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting guide

## 📄 License

Internal use only - Proprietary