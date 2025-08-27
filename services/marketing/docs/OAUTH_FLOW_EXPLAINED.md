# OAuth 플로우 상세 설명

## 🎯 핵심: 사용자는 아무것도 설정할 필요 없음!

### 📝 설정 주체별 정리

| 구분 | 개발자(서비스 제공자) | 사용자 |
|------|---------------------|--------|
| Google Cloud Console 프로젝트 생성 | ✅ 필요 | ❌ 불필요 |
| OAuth 2.0 Client ID/Secret 발급 | ✅ 필요 | ❌ 불필요 |
| API 활성화 (YouTube, Maps) | ✅ 필요 | ❌ 불필요 |
| 환경변수 설정 | ✅ 필요 | ❌ 불필요 |
| Google 계정 | ✅ 필요 (개발용) | ✅ 필요 (로그인용) |
| API 키 입력 | ❌ 불필요 | ❌ 불필요 |

## 🔄 상세 플로우

### Step 1: 개발자 사전 설정 (1회만)
```bash
# 1. Google Cloud Console에서
- 프로젝트 생성
- YouTube Data API v3 활성화
- Google Places API 활성화
- OAuth 2.0 클라이언트 생성
  → Client ID: "123456.apps.googleusercontent.com"
  → Client Secret: "GOCSPX-abc123..."

# 2. 프로젝트 .env.local에 저장
GOOGLE_CLIENT_ID=123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123...
NEXTAUTH_SECRET=my_random_secret_123
GOOGLE_MAPS_API_KEY=AIzaSy...
```

### Step 2: 사용자 로그인 과정
```javascript
// 1. 사용자가 "Google로 로그인" 클릭
<button onClick={() => signIn('google')}>
  Google로 로그인
</button>

// 2. Google 로그인 화면으로 리다이렉트
// → 사용자: Google 계정 선택
// → 사용자: 권한 동의 (YouTube 읽기 권한 등)

// 3. Google이 우리 앱으로 리다이렉트 + 인증 코드 전달
// http://localhost:3000/api/auth/callback/google?code=4/0AY0e...

// 4. NextAuth가 자동으로 처리 (사용자는 모름)
// - 인증 코드 → Access Token 교환
// - Access Token → 세션에 저장
// - 사용자 정보 → DB에 저장

// 5. 사용자는 로그인 완료!
```

### Step 3: API 호출 시
```javascript
// 사용자가 "분석하기" 버튼 클릭
async function analyzeStore(input: string) {
  // NextAuth가 세션에서 자동으로 토큰 가져옴
  const session = await getSession();
  const userToken = session.accessToken; // "ya29.a0ARrdaM..."
  
  // YouTube API - 사용자의 토큰으로 호출
  fetch('https://www.googleapis.com/youtube/v3/search', {
    headers: {
      'Authorization': `Bearer ${userToken}` // 사용자 할당량 사용!
    }
  });
  
  // Places API - 서버 API 키로 호출 (OAuth 미지원)
  fetch(`https://maps.googleapis.com/maps/api/place/details/json?key=${GOOGLE_MAPS_API_KEY}`);
}
```

## 💡 핵심 이해

### 사용자 관점
```
1. Google 계정으로 로그인 → 끝!
2. API 키? 몰라도 됨
3. Client ID? 몰라도 됨
4. 환경변수? 몰라도 됨
5. 그냥 로그인하고 사용하면 됨
```

### 개발자 관점
```
1. Google Cloud Console 설정 (1회)
2. 환경변수 설정 (1회)
3. 배포
4. 사용자들이 각자 할당량으로 사용
```

## 🎯 비유로 이해하기

### 기존 방식 (API 키 직접 입력)
```
카페 주인: "와이파이 쓰려면 비밀번호 입력하세요"
손님: "비밀번호가 뭔데요?"
카페 주인: "직접 통신사 가서 계약하고 비밀번호 받아오세요"
손님: "😱 복잡해..."
```

### OAuth 방식 (우리 구현)
```
카페 주인: "와이파이 쓰려면 Google 계정으로 로그인하세요"
손님: "OK" [Google 로그인]
카페 주인: "연결됐습니다! 사용하세요"
손님: "😊 간단하네!"
```

## 🔒 보안 측면

### 환경변수 노출 걱정?
- **Client ID**: 공개되어도 OK (public)
- **Client Secret**: 서버에서만 사용 (절대 클라이언트 노출 X)
- **User Access Token**: 세션에 암호화 저장
- **NEXTAUTH_SECRET**: 세션 암호화 키 (절대 노출 X)

### 사용자 데이터 보호
- 사용자 Google 비밀번호: 우리는 절대 모름
- Access Token: 임시 토큰 (1시간 후 만료)
- Refresh Token: 암호화하여 저장
- 권한: 읽기 권한만 (쓰기 불가)

## 📊 비용 구조

### 누가 비용을 부담하나?
| API | 비용 부담자 | 이유 |
|-----|-----------|------|
| YouTube Data API | 사용자 (무료 할당량) | OAuth로 사용자 할당량 사용 |
| Google Places API | 개발자 (월 $200 무료) | OAuth 미지원, 서버 키 필요 |

### 확장 시나리오
- 사용자 1,000명 = YouTube 비용 $0 (각자 할당량)
- 사용자 10,000명 = YouTube 비용 $0 (각자 할당량)
- Places API는 서버 부담 (하지만 캐싱으로 최적화 가능)

## ✅ 결론

**사용자는 그냥 Google 로그인만 하면 끝!**
- API 키 입력 ❌
- 복잡한 설정 ❌
- 비용 부담 ❌
- 그냥 로그인 → 사용 ✅