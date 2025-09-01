# QR 기반 근태관리 시스템 v1.0 기능 명세서

## 1. 시스템 아키텍처 개요

### 1.1 주요 구성 요소
- **마스터 어드민 시스템**: QR 코드 생성 및 관리
- **사용자 인증 시스템**: 토큰 기반 인증
- **근태 관리 시스템**: 출근/퇴근/휴게 시간 관리
- **데이터베이스**: 지점별 사용자 및 근태 데이터 저장

### 1.2 기술 스택 권장사항
- **프론트엔드**: React/Next.js (모바일 반응형)
- **백엔드**: Node.js/Express 또는 Python/FastAPI
- **데이터베이스**: PostgreSQL 또는 MongoDB
- **인증**: JWT 토큰
- **QR 라이브러리**: qrcode.js

## 2. 마스터 어드민 기능

### 2.1 어드민 로그인
```
기능: 마스터 어드민 인증
경로: /admin/login
입력:
  - username: string (필수)
  - password: string (필수)
출력:
  - adminToken: JWT
  - redirectTo: /admin/dashboard
```

### 2.2 QR 코드 생성
```
기능: 지점별 고정 QR 코드 생성
경로: /admin/qr/generate
권한: 마스터 어드민 only
입력:
  - branchId: string (지점 ID)
  - branchName: string (지점명)
출력:
  - qrImageUrl: string (다운로드 가능한 이미지 URL)
  - qrData: {
      branchId: string,
      qrCode: string (unique),
      createdAt: timestamp
    }
저장: branches 테이블에 QR 정보 저장
```

## 3. 사용자 등록 플로우

### 3.1 최초 QR 스캔
```
기능: QR 코드 스캔 및 사용자 상태 확인
경로: /qr/scan
입력:
  - qrCode: string
  - deviceId: string (디바이스 식별자)
처리:
  1. QR 코드 유효성 검증
  2. 디바이스에 저장된 토큰 확인
  3. 분기 처리:
     - 토큰 없음 → /register 리다이렉트
     - 토큰 있음 → /dashboard 리다이렉트
```

### 3.2 신규 사용자 등록
```
기능: 사용자 정보 등록 및 토큰 발급
경로: /register
입력:
  - name: string (필수, 2-50자)
  - phone: string (필수, 정규식: /^010-\d{4}-\d{4}$/)
  - email: string (필수, 이메일 형식)
  - birthDate: date (필수, YYYY-MM-DD)
  - branchId: string (QR에서 전달)
  - deviceId: string
출력:
  - userToken: JWT (디바이스에 저장)
  - userId: string
  - redirectTo: /dashboard
저장:
  - users 테이블: 사용자 기본 정보
  - user_devices 테이블: 디바이스-토큰 매핑
```

## 4. 근태 관리 핵심 기능

### 4.1 대시보드 진입 및 자동 출근
```
기능: 사용자 대시보드 접속 및 상태 확인
경로: /dashboard
입력:
  - userToken: JWT
처리:
  1. 토큰 검증 및 사용자 식별
  2. 현재 근무 상태 조회
  3. 상태별 처리:
     - 미출근 → 자동 출근 처리
     - 출근중 → 액션 선택 화면
     - 휴게중 → 휴게 종료 확인 화면
출력:
  - currentStatus: 'NOT_WORKING' | 'WORKING' | 'ON_BREAK'
  - workingMinutes: number
  - breakMinutes: number
  - todayRecords: array
```

### 4.2 출근 처리
```
기능: 출근 시간 기록 시작
테이블: attendance_records
데이터:
  - userId: string
  - date: date
  - checkInTime: timestamp
  - status: 'WORKING'
  - workingMinutes: 0 (카운팅 시작)
```

### 4.3 휴게 관리
```
기능: 휴게 시작/종료
경로: /attendance/break
입력:
  - action: 'START' | 'END'
  - userToken: JWT
처리:
  START:
    - workingMinutes 카운팅 일시정지
    - breakMinutes 카운팅 시작
    - status: 'ON_BREAK'
  END:
    - breakMinutes 카운팅 정지
    - workingMinutes 카운팅 재개
    - status: 'WORKING'
저장:
  - break_records 테이블에 휴게 기록
```

### 4.4 퇴근 처리
```
기능: 근무 종료 및 일일 근태 확정
경로: /attendance/checkout
입력:
  - userToken: JWT
처리:
  1. workingMinutes 카운팅 종료
  2. 일일 근태 데이터 계산:
     - totalWorkMinutes: number
     - totalBreakMinutes: number
     - actualWorkMinutes: number (총근무 - 휴게)
  3. attendance_records 업데이트:
     - checkOutTime: timestamp
     - status: 'COMPLETED'
```

## 5. 데이터베이스 스키마

### 5.1 핵심 테이블 구조
```sql
-- 지점 정보
branches:
  - id: UUID
  - name: VARCHAR(100)
  - qrCode: VARCHAR(255) UNIQUE
  - createdAt: TIMESTAMP

-- 사용자 정보
users:
  - id: UUID
  - branchId: UUID (FK)
  - name: VARCHAR(50)
  - phone: VARCHAR(20)
  - email: VARCHAR(100)
  - birthDate: DATE
  - createdAt: TIMESTAMP

-- 디바이스-토큰 매핑
user_devices:
  - userId: UUID (FK)
  - deviceId: VARCHAR(255)
  - token: TEXT
  - lastUsed: TIMESTAMP

-- 출퇴근 기록
attendance_records:
  - id: UUID
  - userId: UUID (FK)
  - date: DATE
  - checkInTime: TIMESTAMP
  - checkOutTime: TIMESTAMP NULL
  - totalWorkMinutes: INTEGER
  - totalBreakMinutes: INTEGER
  - status: ENUM('WORKING', 'ON_BREAK', 'COMPLETED')

-- 휴게 기록
break_records:
  - id: UUID
  - attendanceId: UUID (FK)
  - startTime: TIMESTAMP
  - endTime: TIMESTAMP NULL
  - durationMinutes: INTEGER
```

## 6. 시간 카운팅 로직

### 6.1 실시간 카운팅 구현
```javascript
// 프론트엔드 타이머 예시
const TimeCounter = {
  // 1분마다 업데이트
  interval: 60000,
  
  // 근무시간 카운터
  workCounter: {
    start: checkInTime,
    current: 0,
    isPaused: false
  },
  
  // 휴게시간 카운터
  breakCounter: {
    start: null,
    current: 0,
    isActive: false
  },
  
  // 백엔드 동기화 (5분마다)
  syncInterval: 300000
};
```

## 7. API 엔드포인트 요약

```
POST   /admin/login              # 어드민 로그인
POST   /admin/qr/generate        # QR 생성

POST   /qr/scan                  # QR 스캔
POST   /register                 # 사용자 등록

GET    /dashboard                # 대시보드
POST   /attendance/checkin       # 출근 (자동)
POST   /attendance/break         # 휴게 시작/종료  
POST   /attendance/checkout      # 퇴근

GET    /attendance/status        # 현재 상태 조회
GET    /attendance/history       # 근태 이력
```

## 8. 상태 전이 다이어그램

```
[미출근] --QR스캔--> [출근/근무중]
                          |
                          ├--휴게시작--> [휴게중]
                          |                  |
                          |                  └--휴게종료--> [근무중]
                          |
                          └--퇴근--> [퇴근완료]
```

## 9. 구현 우선순위

1. **Phase 1 (필수)**
   - 마스터 어드민 로그인
   - QR 코드 생성/저장
   - 사용자 등록/토큰 발급

2. **Phase 2 (핵심)**
   - 자동 출근 처리
   - 실시간 시간 카운팅
   - 휴게/퇴근 처리

3. **Phase 3 (데이터)**
   - 근태 기록 저장
   - 대시보드 표시
   - 이력 조회

이 명세서를 기반으로 Claude Code에게 각 기능을 단계별로 구현 요청하시면 됩니다. 예를 들어 "Phase 1의 마스터 어드민 로그인 기능을 구현해줘"와 같이 요청하시면 정확한 코드 생성이 가능합니다.