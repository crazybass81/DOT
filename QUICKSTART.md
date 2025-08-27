# 🚀 DOT DynamoDB Quick Start Guide

## 즉시 시작하기 (5분 안에 실행!)

### 1️⃣ Local DynamoDB 실행
```bash
cd /home/ec2-user/DOT
docker-compose up -d dynamodb-local dynamodb-admin
```

### 2️⃣ 테이블 생성
```bash
cd services/attendance
npm run db:create-tables
```

### 3️⃣ DynamoDB Admin 확인
```bash
open http://localhost:8001
```

## ✨ 구현된 기능

### 📊 **DynamoDB 완전 구현**
- ✅ AWS SDK v3 통합
- ✅ 로컬 개발 환경 (Docker)
- ✅ 테이블 자동 생성 스크립트
- ✅ Global Secondary Indexes (GSI)
- ✅ 배치 작업 최적화

### 🏢 **근태 관리 시스템**
```typescript
// 체크인
await attendanceRepo.checkIn(employeeId, organizationId, location);

// 체크아웃
await attendanceRepo.checkOut(employeeId, location);

// 통계 조회
await attendanceRepo.getAttendanceStatistics(employeeId, "2024-01");
```

### 👥 **직원 관리**
```typescript
// 직원 생성
await employeeRepo.createEmployee({
  name: "김철수",
  email: "kim@company.com",
  organizationId: "org-123",
  role: EmployeeRole.EMPLOYEE
});

// 직원 검색 (한글 지원)
await employeeRepo.searchEmployees("org-123", "김");
```

### 🔌 **API 엔드포인트**
- `POST /attendance/check-in` - 출근 체크
- `POST /attendance/check-out` - 퇴근 체크
- `GET /attendance/statistics/{employeeId}` - 근태 통계
- `GET /employees/organization/{orgId}` - 조직 직원 목록

## 📁 프로젝트 구조

```
services/attendance/
├── src/
│   ├── lib/
│   │   └── database/
│   │       ├── dynamodb-client.ts      # DynamoDB 클라이언트
│   │       ├── models/                 # 데이터 모델
│   │       └── repositories/           # CRUD 작업
│   └── api/
│       └── attendance.api.ts           # Lambda 핸들러
├── scripts/
│   └── create-dynamodb-tables.ts       # 테이블 생성
├── tests/
│   └── attendance.repository.test.ts   # 테스트
└── docker-compose.yml                  # 로컬 DynamoDB
```

## 🛠️ 개발 명령어

```bash
# 로컬 DynamoDB 시작
npm run db:local

# 테이블 생성
npm run db:create-tables

# 테스트 실행
npm test

# API 서버 시작
npm run dev
```

## 🌟 주요 특징

### 성능 최적화
- **Composite Keys**: 스캔 없는 효율적 쿼리
- **GSI 설계**: 일반 액세스 패턴 최적화
- **배치 작업**: API 호출 최소화
- **연결 재사용**: 싱글톤 패턴

### 한국 시장 최적화
- 🇰🇷 서울 리전 (ap-northeast-2)
- 🕐 한국 시간대 지원
- 🏪 한국 음식점 비즈니스 로직
- 📱 QR 코드 체크인

### 보안
- 🔐 AWS Cognito 인증
- 📍 위치 기반 검증
- 🔏 역할 기반 접근 제어
- 📝 감사 추적

## 🎯 테스트

```bash
# 단위 테스트
npm run test:unit

# 통합 테스트  
npm run test:integration

# 커버리지 리포트
npm run test:coverage
```

## 📚 추가 리소스

- [DynamoDB 모범 사례](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [AWS SDK v3 문서](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)

---

**완료!** 모든 DynamoDB 기능이 구현되었습니다. 🎉