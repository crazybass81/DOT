# 🚀 개발자 설정 가이드 (필수)

## 📌 당신이 직접 해야 할 일들

### Step 1: Google Cloud Console 프로젝트 생성
1. https://console.cloud.google.com 접속
2. "새 프로젝트" 클릭
3. 프로젝트 이름: "DOT-Marketing" (예시)
4. 프로젝트 생성 완료

### Step 2: 필요한 API 활성화
프로젝트 대시보드에서 "API 및 서비스" → "라이브러리"

#### 필수 API들:
- ✅ **YouTube Data API v3** (검색: "YouTube Data")
- ✅ **Places API** (검색: "Places API") 
- ✅ **Maps JavaScript API** (선택사항)
- ✅ **Geocoding API** (선택사항)

각 API 클릭 → "사용" 버튼 클릭

### Step 3: OAuth 2.0 클라이언트 생성
1. "API 및 서비스" → "사용자 인증 정보"
2. "사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"
3. 처음이면 "OAuth 동의 화면 구성" 먼저:
   - User Type: "외부"
   - 앱 이름: "DOT Marketing"
   - 지원 이메일: 당신의 이메일
   - 개발자 연락처: 당신의 이메일
4. OAuth 클라이언트 ID 생성:
   - 애플리케이션 유형: "웹 애플리케이션"
   - 이름: "DOT Marketing Web Client"
   - 승인된 JavaScript 원본:
     ```
     http://localhost:3000
     https://your-domain.com (배포 시)
     ```
   - 승인된 리디렉션 URI:
     ```
     http://localhost:3000/api/auth/callback/google
     https://your-domain.com/api/auth/callback/google (배포 시)
     ```
5. 생성 완료 → **Client ID와 Client Secret 복사**

### Step 4: Google Maps API 키 생성
1. "API 및 서비스" → "사용자 인증 정보"
2. "사용자 인증 정보 만들기" → "API 키"
3. API 키 생성됨 → 복사
4. (권장) API 키 제한:
   - "키 제한" 클릭
   - API 제한: Places API, Maps JavaScript API만 선택
   - 웹사이트 제한: localhost:3000, your-domain.com

### Step 5: 환경변수 파일 생성
프로젝트 루트에 `.env.local` 파일 생성:

```bash
# .env.local
GOOGLE_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-1234567890abcdefgh
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here-32-chars-min
GOOGLE_MAPS_API_KEY=AIzaSyA1234567890abcdefgh

# AWS DynamoDB (선택사항)
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-aws-key (선택)
AWS_SECRET_ACCESS_KEY=your-aws-secret (선택)
```

### Step 6: NextAuth Secret 생성
터미널에서 랜덤 시크릿 생성:
```bash
openssl rand -base64 32
# 또는
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 💰 비용 정보

### 무료 한도
| 서비스 | 무료 한도 | 초과 시 |
|--------|----------|---------|
| YouTube Data API | 10,000 units/일/사용자 | 사용자가 부담 |
| Google Places API | $200/월 크레딧 | 개발자 부담 |
| Google OAuth | 무제한 무료 | - |

### 예상 비용
- **사용자 100명**: $0 (YouTube는 각자 할당량)
- **사용자 1,000명**: $0 (YouTube는 각자 할당량)
- **Places API**: 월 6,000회 무료 (충분함)

## 🔍 확인 사항

### Google Cloud Console에서 확인
1. ✅ YouTube Data API v3 활성화됨
2. ✅ Places API 활성화됨
3. ✅ OAuth 2.0 클라이언트 생성됨
4. ✅ API 키 생성됨
5. ✅ OAuth 동의 화면 구성됨

### 로컬에서 확인
```bash
# .env.local 파일에 다음 값들이 있는지 확인
cat .env.local | grep GOOGLE

# 있어야 할 값들:
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_MAPS_API_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

## 🚨 자주 발생하는 오류

### 1. "Google OAuth Error: invalid_client"
→ Client Secret이 잘못됨. 다시 복사하거나 새로 생성

### 2. "Google OAuth Error: redirect_uri_mismatch"
→ OAuth 클라이언트의 리디렉션 URI 확인:
- 정확히: `http://localhost:3000/api/auth/callback/google`
- 마지막 슬래시(/) 없음 주의!

### 3. "Places API: REQUEST_DENIED"
→ API 키가 잘못되었거나 Places API가 활성화되지 않음

### 4. "YouTube quota exceeded"
→ 정상. 사용자가 일일 할당량 초과. 내일 자동 리셋

## 📝 체크리스트

개발 시작 전 확인:
- [ ] Google Cloud 프로젝트 생성
- [ ] YouTube Data API v3 활성화
- [ ] Places API 활성화
- [ ] OAuth 2.0 클라이언트 생성
- [ ] API 키 생성
- [ ] .env.local 파일 생성
- [ ] 모든 환경변수 입력
- [ ] npm install 실행
- [ ] npm run dev로 테스트

## 🎯 완료!
이제 `npm run dev`로 실행하고 http://localhost:3000 에서 테스트하세요!