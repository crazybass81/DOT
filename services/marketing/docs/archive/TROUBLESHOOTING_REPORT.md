# Marketing Service Troubleshooting Report

## 🔍 진단 결과

### 1. 빌드 상태
✅ **정상**: Next.js 빌드 성공
- 빌드 시간: 6.2초
- 번들 사이즈: First Load JS 102KB (적정)
- 정적 페이지 생성 완료 (4/4)

⚠️ **경고**: ESLint 미설치
```bash
# 해결 방법
cd services/marketing
npm install --save-dev eslint eslint-config-next
npx eslint --init
```

### 2. 의존성 문제

#### 발견된 이슈:
1. **공유 패키지 미연결**
   - `@dot/shared`, `@dot/ui` 패키지가 package.json에 선언되었으나 실제 사용 없음
   - 모노레포 워크스페이스 설정은 완료

2. **테스트 프레임워크 부재**
   - Jest, Testing Library 미설치
   - 테스트 파일 없음

### 3. 보안 취약점

#### 🔴 **심각 - API 키 노출**
```typescript
// 문제: lib/youtube-api.ts:3
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
```

**영향**: 
- 클라이언트 사이드에서 API 키 접근 가능
- 브라우저 개발자 도구에서 키 확인 가능
- API 할당량 도용 위험

**해결 방안**:

#### 방안 1: API Routes 사용 (권장)
```typescript
// app/api/youtube/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // NEXT_PUBLIC 제거

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?q=${query}&key=${YOUTUBE_API_KEY}`
  );
  
  return NextResponse.json(await response.json());
}
```

#### 방안 2: 환경변수 수정
```bash
# .env.local
YOUTUBE_API_KEY=YOUR_KEY_HERE  # 서버 전용
# NEXT_PUBLIC_YOUTUBE_API_KEY 제거
```

### 4. 설정 파일 문제

#### `.env.local` 보안 설정
```bash
# 현재 (위험)
NEXT_PUBLIC_YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY_HERE

# 수정 필요
YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY_HERE  # 서버 전용
```

### 5. 런타임 에러 가능성

#### 발견된 잠재적 문제:

1. **Null/Undefined 처리 부족**
```typescript
// lib/youtube-api.ts:86-91
channelName: snippet.title || 'Unknown',  // ✅ 안전
subscriberCount: parseInt(statistics.subscriberCount || '0'),  // ✅ 안전
category: this.detectCategory(snippet.title, snippet.description),  // ⚠️ description이 undefined일 수 있음
```

2. **에러 핸들링 개선 필요**
```typescript
// 현재
catch (error) {
  console.error('YouTube API search error:', error);
  return [];  // 에러 정보 손실
}

// 권장
catch (error) {
  console.error('YouTube API search error:', error);
  throw new YouTubeAPIError('Search failed', error);  // 에러 전파
}
```

## 🛠️ 즉시 적용 가능한 수정사항

### 1. ESLint 설정
```bash
cd services/marketing
npm install --save-dev eslint eslint-config-next @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

`.eslintrc.json` 생성:
```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### 2. 테스트 환경 구축
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

`jest.config.js` 생성:
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

### 3. 타입 안정성 강화
```typescript
// lib/youtube-api.ts 개선
private detectCategory(title?: string, description?: string): string {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  // ... 나머지 로직
}
```

### 4. 환경변수 검증
```typescript
// lib/config.ts 생성
import { z } from 'zod';

const envSchema = z.object({
  YOUTUBE_API_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  DYNAMODB_CREATORS_TABLE: z.string().min(1),
});

export const config = envSchema.parse({
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  AWS_REGION: process.env.AWS_REGION,
  DYNAMODB_CREATORS_TABLE: process.env.DYNAMODB_CREATORS_TABLE,
});
```

## 📋 우선순위별 액션 아이템

### P0 (즉시)
- [ ] YouTube API 키를 서버 전용으로 변경
- [ ] API Routes 구현으로 보안 강화
- [ ] ESLint 설치 및 설정

### P1 (1주 내)
- [ ] Jest 테스트 환경 구축
- [ ] 입력 검증 라이브러리(Zod) 적용
- [ ] 에러 바운더리 구현

### P2 (2주 내)
- [ ] 공유 패키지 실제 활용
- [ ] 모니터링 시스템 구축
- [ ] Rate Limiting 구현

## ✅ 현재 정상 동작 항목
- Next.js 빌드 프로세스
- TypeScript 컴파일
- 기본 라우팅
- 컴포넌트 렌더링
- 의존성 설치

## 🎯 결론
서비스는 **기본적으로 동작**하나, **프로덕션 배포 전 보안 수정 필수**입니다.
특히 API 키 노출 문제는 즉시 수정이 필요합니다.