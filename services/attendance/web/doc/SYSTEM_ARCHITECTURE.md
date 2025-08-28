# DOT Attendance Web - 시스템 아키텍처

## 📱 시스템 개요

외식업 특화 근태관리 웹 애플리케이션으로 관리자와 직원을 위한 종합 대시보드를 제공합니다.

## 🏗️ 기술 아키텍처

### Frontend Stack
- **Framework**: Next.js 15.5 (App Router)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS
- **State**: React Hooks
- **Auth**: AWS Amplify + Cognito

### Backend Services
- **Database**: AWS DynamoDB (Single Table Design)
- **API**: AWS API Gateway + Lambda
- **Auth**: AWS Cognito User Pools
- **Storage**: AWS S3

### Infrastructure
- **Deployment**: AWS Amplify / Vercel
- **CDN**: CloudFront
- **Monitoring**: CloudWatch

## 🎨 UI/UX 디자인

### 네오브루탈리즘 디자인 시스템
- **Bold Borders**: 3-5px 두꺼운 검정 테두리
- **Solid Colors**: 채도 높은 단색 배경
- **Hard Shadows**: 부드럽지 않은 그림자 효과
- **Typography**: 굵고 명확한 타이포그래피

### 색상 팔레트
```css
--primary: #FFE500;     /* 메인 노란색 */
--secondary: #00D9FF;   /* 보조 파란색 */
--success: #51FF00;     /* 성공 초록색 */
--danger: #FF3838;      /* 위험 빨간색 */
--neutral: #1A1A1A;     /* 기본 검정색 */
--background: #FFFFFF;   /* 배경 흰색 */
```

## 📄 페이지 구조

### 1. 인증 페이지 (/login, /register)
- 이메일/비밀번호 로그인
- 소셜 로그인 (Google, Kakao)
- 회원가입 및 비밀번호 재설정

### 2. 직원 페이지
- **/attendance**: QR 체크인/아웃
- **/attendance/success**: 출퇴근 완료
- **/attendance/history**: 근태 이력

### 3. 관리자 페이지
- **/admin/dashboard**: 실시간 현황 대시보드
- **/admin/employees**: 직원 관리
- **/admin/attendance**: 근태 현황
- **/admin/qr-display**: QR 코드 표시
- **/admin/approvals**: 근태 승인
- **/admin/manual-attendance**: 수동 근태 입력

### 4. 슈퍼 관리자
- **/super-admin/dashboard**: 전체 조직 관리

## 💾 데이터 모델

### DynamoDB Single Table Design

```typescript
// Primary Key Pattern
PK: "ATTENDANCE#<uuid>" | "EMPLOYEE#<id>" | "ORGANIZATION#<id>"
SK: "DATE#<date>" | "EMPLOYEE#<id>" | "ORG#<id>"

// GSI Patterns
GSI1PK: "EMPLOYEE#<id>"
GSI1SK: "DATE#<date>"

GSI2PK: "ORG#<id>"  
GSI2SK: "DATE#<date>"
```

## 🔐 보안

### 인증 및 권한
- JWT 기반 인증
- Role-Based Access Control (RBAC)
- MFA 지원

### 데이터 보호
- HTTPS 전송 암호화
- DynamoDB 저장 시 암호화
- 민감 정보 마스킹

## 🚀 배포

### 환경 구성
- **Development**: localhost:3002
- **Staging**: staging.dot-attendance.com
- **Production**: app.dot-attendance.com

### CI/CD Pipeline
1. GitHub Actions 트리거
2. 자동 테스트 실행
3. Docker 이미지 빌드
4. AWS Amplify 배포

## 📊 모니터링

### 메트릭
- 응답 시간 모니터링
- 에러율 추적
- 사용자 활동 분석

### 알림
- CloudWatch Alarms
- 에러 임계값 알림
- 시스템 다운타임 알림

## 🔄 API 엔드포인트

### 주요 API
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/attendance/status
POST   /api/attendance/check-in
POST   /api/attendance/check-out
GET    /api/attendance/history
GET    /api/admin/employees
POST   /api/admin/attendance/approve
```

## 📝 개발 가이드

### 폴더 구조
```
web/
├── app/              # Next.js App Router
├── components/       # React 컴포넌트
├── lib/             # 비즈니스 로직
│   ├── services/    # API 서비스
│   └── database/    # DB 레포지토리
├── hooks/           # Custom React Hooks
└── scripts/         # 유틸리티 스크립트
```

### 코딩 컨벤션
- ESLint + Prettier 설정 준수
- TypeScript strict mode
- 함수형 컴포넌트 사용
- Custom Hooks로 로직 분리

---

Last Updated: 2025-08-28