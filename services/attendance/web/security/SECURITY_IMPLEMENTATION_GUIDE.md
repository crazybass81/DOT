# DOT 근태관리 시스템 보안 구현 가이드

## 🚨 즉시 적용 필요한 보안 수정사항

### 1. 미들웨어 교체 (최우선)

현재 `/middleware.ts` 파일을 새로운 보안 강화 버전으로 교체:

```bash
# 백업
cp middleware.ts middleware.ts.backup

# 새 미들웨어 적용
cp src/lib/security/secure-middleware.ts middleware.ts
```

**수정 내용:**
```typescript
// middleware.ts
export { securityMiddleware as middleware } from '@/lib/security/secure-middleware';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 2. 환경변수 설정

`.env.local` 파일에 추가:

```env
# Security Configuration
JWT_SECRET=your-strong-secret-key-min-32-chars
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
ENABLE_SECURITY_HEADERS=true
MAX_REQUEST_SIZE=1048576
NODE_ENV=production

# Supabase (기존)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 3. API 라우트 보안 강화

#### 3.1 마스터 어드민 API 수정

`/app/api/master-admin/organizations/[id]/status/route.ts` 수정:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withRBAC } from '@/lib/security/rbac-middleware';
import { ValidationSchemas } from '@/lib/security/input-validator';
import { RoleType } from '@/types/multi-role';

const statusChangeSchema = z.object({
  newStatus: ValidationSchemas.organizationStatus,
  reason: ValidationSchemas.reason,
  changedBy: ValidationSchemas.uuid,
});

export const PATCH = withRBAC(
  async (request: NextRequest, user: any) => {
    try {
      // 입력 검증
      const body = await request.json();
      const validated = statusChangeSchema.parse(body);
      
      // 기존 로직...
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        }, { status: 400 });
      }
      
      // 에러 메시지 일반화
      console.error('Status change error:', error);
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
      }, { status: 500 });
    }
  },
  {
    requiredRoles: [RoleType.MASTER_ADMIN],
    enableAuditLog: true,
    action: 'write',
  }
);

// CORS 설정 수정
export async function OPTIONS() {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'null',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

### 4. 패키지 설치

필요한 보안 패키지 설치:

```bash
npm install \
  jose@^5.2.0 \
  isomorphic-dompurify@^2.0.0 \
  validator@^13.11.0 \
  zod@^3.22.0
```

### 5. Next.js 설정 업데이트

`next.config.js` 수정:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 기존 설정...
  
  // 보안 헤더 추가
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // 추가 보안 설정
  poweredByHeader: false,
  compress: true,
  
  // 실험적 보안 기능
  experimental: {
    // Strict Mode
    reactStrictMode: true,
  },
};

module.exports = nextConfig;
```

## 📋 체크리스트

### 즉시 조치 (24시간 내)
- [ ] 새로운 보안 미들웨어 적용
- [ ] JWT 검증 로직 구현
- [ ] CORS 설정 수정 (와일드카드 제거)
- [ ] Rate Limiting 적용
- [ ] 환경변수 보안 설정

### 단기 조치 (1주일 내)
- [ ] 모든 API 엔드포인트에 입력 검증 적용
- [ ] 보안 헤더 구성
- [ ] 에러 메시지 일반화
- [ ] 감사 로깅 강화
- [ ] 보안 테스트 실행

### 중기 조치 (1개월 내)
- [ ] WAF 도입 검토
- [ ] 보안 모니터링 대시보드 구축
- [ ] 정기 보안 스캔 자동화
- [ ] 침투 테스트 실시
- [ ] 보안 정책 문서화

## 🔧 구현 순서

### Step 1: 백업
```bash
# 전체 프로젝트 백업
tar -czf backup-$(date +%Y%m%d).tar.gz .
```

### Step 2: 의존성 설치
```bash
npm install jose isomorphic-dompurify validator zod
```

### Step 3: 보안 모듈 복사
```bash
# 보안 라이브러리 디렉토리 생성
mkdir -p src/lib/security

# 파일 복사 (이미 생성된 파일들)
# - jwt-validator.ts
# - rate-limiter.ts  
# - input-validator.ts
# - secure-middleware.ts
```

### Step 4: 미들웨어 적용
```bash
# 기존 미들웨어 백업
mv middleware.ts middleware.ts.backup

# 새 미들웨어 연결
echo "export { securityMiddleware as middleware } from '@/lib/security/secure-middleware';" > middleware.ts
```

### Step 5: API 라우트 수정
각 API 라우트에 보안 검증 적용:
- 입력 검증 (Zod 스키마)
- Rate Limiting
- RBAC 권한 체크
- 에러 처리 일반화

### Step 6: 테스트 실행
```bash
# 보안 테스트 실행
npm test tests/security/security-audit.test.ts

# 전체 테스트
npm test
```

### Step 7: 배포 전 체크
```bash
# 보안 감사
npm audit

# 취약점 수정
npm audit fix

# 프로덕션 빌드
npm run build
```

## 🚀 배포 시 주의사항

### 1. 단계적 배포
- 개발 환경에서 먼저 테스트
- 스테이징 환경에서 검증
- 프로덕션 배포는 트래픽이 적은 시간대에

### 2. 롤백 계획
```bash
# 롤백 스크립트 준비
#!/bin/bash
cp middleware.ts.backup middleware.ts
git checkout -- app/api/
npm run build
npm run start
```

### 3. 모니터링
- 에러율 모니터링
- 응답 시간 체크
- 보안 로그 확인
- Rate Limit 임계값 조정

## 📊 성능 영향

예상 성능 영향:
- JWT 검증: +2-5ms per request
- Rate Limiting: +1-2ms per request
- Input Validation: +1-3ms per request
- Security Headers: 무시할 수 있는 수준

총 예상 오버헤드: 5-10ms per request

## 🔍 검증 방법

### 1. 보안 스캔
```bash
# OWASP ZAP 스캔
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000

# npm 취약점 스캔
npm audit
```

### 2. 수동 테스트
```bash
# JWT 검증 테스트
curl -X GET http://localhost:3000/api/master-admin/organizations \
  -H "Authorization: Bearer invalid_token"
# Expected: 401 Unauthorized

# Rate Limiting 테스트
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
done
# Expected: 429 Too Many Requests after 5 attempts

# CORS 테스트
curl -X OPTIONS http://localhost:3000/api/test \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST"
# Expected: 403 Forbidden
```

### 3. 자동화 테스트
```bash
npm test tests/security/
```

## 📞 지원 및 문의

보안 이슈 발견 시:
1. 즉시 보안팀에 보고
2. 임시 조치 적용 (해당 엔드포인트 비활성화)
3. 패치 개발 및 테스트
4. 긴급 배포

---

**중요**: 이 가이드는 DOT 근태관리 시스템의 보안 강화를 위한 것입니다. 
모든 변경사항은 테스트 환경에서 충분히 검증 후 프로덕션에 적용하세요.