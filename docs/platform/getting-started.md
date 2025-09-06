# DOT 플랫폼 시작 가이드

이 가이드는 DOT 플랫폼 개발 환경을 설정하고 첫 번째 기여를 시작하는 방법을 안내합니다.

## ⚡ 빠른 시작

### 1. 사전 요구사항 확인
```bash
# Node.js 18+ 확인
node --version  # v18.0.0+

# npm 확인
npm --version   # 8.0.0+

# Docker 확인 (선택사항)
docker --version

# Git 확인
git --version
```

### 2. 저장소 클론
```bash
git clone https://github.com/your-org/DOT.git
cd DOT
```

### 3. 종속성 설치
```bash
# 루트 및 모든 워크스페이스 의존성 설치
npm install
npm run install:all
```

### 4. 환경 설정
```bash
# 환경 변수 파일 복사
cp .env.example .env

# 필수 환경 변수 설정
nano .env
```

### 5. 개발 서버 시작
```bash
# 모든 서비스 개발 모드로 시작
npm run dev

# 또는 개별 서비스 시작
npm run dev:attendance:web    # http://localhost:3002
npm run dev:marketing         # http://localhost:3003
```

## 🛠️ 환경 설정 상세

### 환경 변수 설정

#### 공통 환경 변수 (`.env`)
```bash
# 개발 환경 설정
NODE_ENV=development
DEBUG=true

# 데이터베이스 (개발용)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key

# AWS 설정 (개발용)
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### Attendance Service 환경 변수
```bash
# services/attendance/.env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

#### Marketing Service 환경 변수
```bash
# services/marketing/.env
AWS_DYNAMODB_TABLE_PREFIX=dev_
YOUTUBE_API_KEY=your-youtube-api-key
GOOGLE_OAUTH_CLIENT_ID=your-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-oauth-secret
```

### Supabase 설정

#### 1. Supabase 프로젝트 생성
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. "New Project" 생성
3. 프로젝트 URL 및 API Key 복사

#### 2. 데이터베이스 스키마 설정
```bash
# Attendance 서비스 데이터베이스 설정
cd services/attendance
npx supabase db reset
npx supabase db push
```

#### 3. RLS (Row Level Security) 설정
```sql
-- 예시: 직원은 자신의 출근 기록만 조회 가능
CREATE POLICY "직원은 자신의 출근기록만 조회"
ON attendance_records FOR SELECT
USING (auth.uid()::text = employee_id);
```

### AWS 설정

#### 1. AWS CLI 설정
```bash
# AWS CLI 설치
npm install -g aws-cli

# AWS 프로필 설정
aws configure --profile dot-dev
```

#### 2. DynamoDB 로컬 설정 (개발용)
```bash
# DynamoDB Local 시작
docker run -p 8000:8000 amazon/dynamodb-local

# 테이블 생성
cd services/marketing
npm run setup:dynamodb-local
```

#### 3. 매개변수 스토어 설정
```bash
cd services/marketing
npm run setup:aws  # Parameter Store 설정
npm run load:env   # 환경 변수 로드
```

## 🐳 Docker 개발 환경

### 전체 스택 실행
```bash
# 개발 환경 시작 (모든 서비스 + 데이터베이스)
docker-compose --profile dev up -d

# 모니터링 스택 추가 시작
docker-compose --profile monitoring up -d

# 로그 확인
docker-compose logs -f attendance marketing
```

### 개별 서비스 실행
```bash
# Attendance 서비스만 실행
docker-compose up attendance-web attendance-db

# Marketing 서비스만 실행
docker-compose up marketing dynamodb-local
```

### Docker 개발 환경 구성
```yaml
# docker-compose.override.yml (로컬 개발용)
version: '3.8'
services:
  attendance-web:
    volumes:
      - ./services/attendance:/app
      - /app/node_modules
    environment:
      - CHOKIDAR_USEPOLLING=true
    ports:
      - "3002:3002"
```

## 📱 모바일 개발 환경

### Flutter 환경 설정
```bash
# Flutter 설치 확인
flutter doctor

# 의존성 설치
cd services/attendance/mobile
flutter pub get

# 개발 서버 실행
flutter run
```

### 모바일 앱 빌드
```bash
# Android 빌드
flutter build apk

# iOS 빌드 (macOS 필요)
flutter build ios

# 웹 빌드
flutter build web
```

## 🧪 테스트 환경

### 테스트 실행
```bash
# 전체 테스트 실행
npm run test

# 서비스별 테스트
npm run test:attendance
npm run test:marketing

# 커버리지 포함 테스트
npm run test:coverage
```

### 테스트 데이터베이스 설정
```bash
# 테스트용 Supabase 환경
cd services/attendance
npm run setup:test-db

# 테스트 사용자 생성
npm run setup:test-user
```

### E2E 테스트
```bash
# Playwright 설치
npx playwright install

# E2E 테스트 실행
npm run test:e2e

# UI 모드로 실행
npm run test:e2e:ui
```

## 🔧 개발 도구

### VSCode 설정
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### 추천 VSCode 확장
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-typescript.typescript",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "supabase.supabase",
    "ms-vscode.vscode-docker"
  ]
}
```

### Context Manager 설정
```bash
# Context Manager 설치
npm install -g @dot/context-manager

# 프로젝트 초기화
context-manager init

# 모니터링 시작
context-manager start --auto-update
```

## 📝 개발 워크플로우

### 1. 기능 개발 프로세스
```bash
# 1. 새 기능 브랜치 생성
git checkout -b feature/attendance-overtime-tracking

# 2. 코드 작성
# ... 개발 진행 ...

# 3. 테스트 실행
npm run test
npm run lint

# 4. 커밋 및 푸시
git add .
git commit -m "feat: 연장근무 추적 기능 추가"
git push origin feature/attendance-overtime-tracking

# 5. PR 생성
gh pr create --title "연장근무 추적 기능" --body "..."
```

### 2. 코드 품질 체크
```bash
# 린트 검사
npm run lint

# 타입 체크
npm run type-check

# 포맷팅 적용
npm run format

# 전체 품질 체크
npm run quality-check
```

### 3. 데이터베이스 마이그레이션
```bash
# 새 마이그레이션 생성
npx supabase migration new add_overtime_table

# 마이그레이션 적용
npx supabase db push

# 마이그레이션 되돌리기
npx supabase db reset
```

## 🚀 배포

### 개발 환경 배포
```bash
# 스테이징 환경 배포
npm run deploy:staging

# 프로덕션 배포
npm run deploy:production
```

### 인프라 배포
```bash
# AWS CDK를 통한 인프라 배포
cd infrastructure
npx cdk deploy --profile dot-prod
```

## ❓ 문제 해결

### 일반적인 문제들

#### 1. 포트 충돌 해결
```bash
# 사용 중인 포트 확인
lsof -i :3002

# 프로세스 종료
kill -9 <PID>
```

#### 2. 의존성 문제 해결
```bash
# node_modules 정리 및 재설치
npm run clean
npm install
npm run install:all
```

#### 3. Supabase 연결 문제
```bash
# Supabase 상태 확인
npx supabase status

# 로컬 Supabase 재시작
npx supabase stop
npx supabase start
```

#### 4. Docker 문제 해결
```bash
# Docker 컨테이너 정리
docker-compose down -v
docker system prune

# 이미지 재빌드
docker-compose build --no-cache
```

### 지원 받기

1. **문서 검색**: `grep -r "키워드" docs/`
2. **이슈 생성**: [GitHub Issues](https://github.com/dot-platform/issues)
3. **디스코드**: [개발자 커뮤니티](https://discord.gg/dot-dev)
4. **Context Manager**: `context-manager analyze --help`

## 🎯 다음 단계

개발 환경 설정이 완료되었다면:

1. **[개발 가이드라인](../development/guidelines.md)** 숙지
2. **[아키텍처 문서](./architecture.md)** 이해
3. **[API 문서](./api-reference.md)** 참조
4. **첫 번째 이슈** 선택하여 기여 시작

---

*개발 환경에 문제가 있나요? [트러블슈팅 가이드](../development/troubleshooting.md)를 확인해보세요.*