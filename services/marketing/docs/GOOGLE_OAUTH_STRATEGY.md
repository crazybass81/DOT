# Google OAuth를 활용한 사용자 API 할당량 전략

## 🎯 핵심 아이디어
사용자가 자신의 Google 계정으로 로그인하여, **자신의 API 할당량**을 사용하도록 하는 방식

## ✅ 장점
1. **API 키 관리 불필요** - 사용자가 직접 인증
2. **무제한 확장 가능** - 각 사용자가 자신의 할당량 사용
3. **비용 절감** - 서비스 제공자의 API 비용 없음
4. **통합 인증** - Google Maps, YouTube, Google My Business 모두 하나의 로그인으로

## 🔧 기술 구현

### 1. Google Cloud Console 설정
```javascript
// OAuth 2.0 Client ID 생성
{
  "web": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost:3000/api/auth/callback/google"]
  }
}
```

### 2. 필요한 OAuth Scopes
```javascript
const SCOPES = [
  // YouTube Data API
  'https://www.googleapis.com/auth/youtube.readonly',
  
  // Google Maps/Places (사용자 인증 불필요 - API 키만 사용)
  // 단, Google My Business는 OAuth 필요
  'https://www.googleapis.com/auth/business.manage',
  
  // 사용자 프로필
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];
```

### 3. NextAuth.js 구현
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SCOPES.join(' '),
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    }
  }
};
```

### 4. API 호출 시 사용자 토큰 사용
```typescript
// 사용자 토큰으로 YouTube API 호출
async function searchYouTubeWithUserToken(query: string, accessToken: string) {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?` +
    `part=snippet&q=${query}&type=channel&maxResults=10`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.json();
}

// Google My Business API (OAuth 필수)
async function getBusinessInfo(accessToken: string) {
  const response = await fetch(
    'https://mybusiness.googleapis.com/v4/accounts',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.json();
}
```

## 🚨 중요 고려사항

### Google Maps Places API 특이사항
- **Places API는 OAuth를 지원하지 않음** - API 키만 사용
- **하지만** Google My Business API는 OAuth 지원
- 해결책: Places API는 서버 API 키 사용, YouTube는 사용자 OAuth 사용

### 할당량 정책
| API | 무료 할당량 | OAuth 지원 |
|-----|----------|-----------|
| YouTube Data API | 10,000 units/day/user | ✅ Yes |
| Google Places API | $200 credit/month | ❌ No (API key only) |
| Google My Business | Request based | ✅ Yes |

## 📊 하이브리드 접근법 (권장)

```typescript
class GoogleAPIService {
  // Places API - 서버 API 키 사용 (OAuth 불가)
  async searchPlaces(query: string) {
    return fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?` +
      `query=${query}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
  }
  
  // YouTube API - 사용자 OAuth 토큰 사용
  async searchYouTubeCreators(query: string, userAccessToken: string) {
    return fetch('https://www.googleapis.com/youtube/v3/search', {
      headers: { 'Authorization': `Bearer ${userAccessToken}` }
    });
  }
  
  // Google My Business - 사용자 OAuth 토큰 사용
  async getMyBusinessData(userAccessToken: string) {
    return fetch('https://mybusiness.googleapis.com/v4/accounts', {
      headers: { 'Authorization': `Bearer ${userAccessToken}` }
    });
  }
}
```

## 🎯 최종 추천 아키텍처

1. **사용자 로그인**: Google OAuth 2.0으로 인증
2. **YouTube 검색**: 사용자 토큰으로 할당량 사용
3. **Places 검색**: 서버 API 키 사용 (제한적)
4. **Google My Business**: 사용자 토큰으로 자신의 비즈니스 정보 접근

## 💡 추가 아이디어

### 프리미엄 모델
- **무료 사용자**: 자신의 Google 계정 할당량 사용
- **프리미엄 사용자**: 서비스 제공 API 키로 더 많은 요청 제공

### 할당량 모니터링
```typescript
// 사용자별 API 사용량 추적
interface UserQuota {
  userId: string;
  youtubeQuotaUsed: number;
  lastReset: Date;
  dailyLimit: 10000;
}
```

## 🚀 구현 단계

1. **Phase 1**: Google OAuth 로그인 구현
2. **Phase 2**: YouTube API 사용자 토큰 연동
3. **Phase 3**: Places API 하이브리드 구현
4. **Phase 4**: 할당량 모니터링 대시보드
5. **Phase 5**: Google My Business 연동 (선택)