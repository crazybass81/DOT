# Firebase Android 앱 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 만들기" 클릭
3. 프로젝트 이름 입력 (예: "DOT-Attendance")
4. Google Analytics 설정 (선택사항)

## 2. Android 앱 추가

1. Firebase 프로젝트 대시보드에서 Android 아이콘 클릭
2. Android 패키지 이름 입력: `com.dot.attendance`
3. 앱 닉네임: "DOT Attendance" (선택사항)
4. SHA-1 인증서 지문 추가 (선택사항, 나중에 추가 가능)

## 3. google-services.json 다운로드 및 설치

1. `google-services.json` 파일 다운로드
2. 다운로드한 파일을 다음 위치에 복사:
   ```
   /Users/t/Desktop/DOT/services/attendance/mobile/android/app/google-services.json
   ```

## 4. Firebase Authentication 활성화

1. Firebase Console에서 왼쪽 메뉴의 "Authentication" 클릭
2. "시작하기" 클릭
3. "Sign-in method" 탭에서 "이메일/비밀번호" 활성화

## 5. 테스트 계정 생성

1. Authentication > Users 탭으로 이동
2. "사용자 추가" 클릭
3. 다음 정보로 계정 생성:
   - 이메일: `archt723@gmail.com`
   - 비밀번호: `1q2w3e2w1q!`

## 6. Firestore Database 설정

1. Firebase Console에서 "Firestore Database" 클릭
2. "데이터베이스 만들기" 클릭
3. "프로덕션 모드"로 시작 (나중에 규칙 수정)
4. 위치 선택 (asia-northeast3 - 서울 권장)

## 7. Firestore 보안 규칙 설정

Firestore > Rules 탭에서 다음 규칙 적용:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증된 사용자만 접근 가능
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 8. Android 빌드 설정 확인

`android/build.gradle` 파일에 다음 내용이 있는지 확인:

```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.4.0'
}
```

`android/app/build.gradle` 파일 맨 아래에:

```gradle
apply plugin: 'com.google.gms.google-services'
```

## 9. 앱 실행 테스트

1. 터미널에서 다음 명령 실행:
   ```bash
   flutter clean
   flutter pub get
   cd android && ./gradlew clean && cd ..
   flutter run
   ```

2. 로그인 테스트:
   - 이메일: `archt723@gmail.com`
   - 비밀번호: `1q2w3e2w1q!`

## 문제 해결

### "google-services.json not found" 오류
- `android/app/` 디렉토리에 `google-services.json` 파일이 있는지 확인

### "Invalid credentials" 오류
- Firebase Console에서 이메일/비밀번호 인증이 활성화되었는지 확인
- 사용자가 생성되었는지 확인

### 빌드 오류
- `flutter clean` 실행
- `android/` 폴더에서 `./gradlew clean` 실행
- `.gradle` 폴더 삭제 후 재빌드

## 다음 단계

Firebase 설정이 완료되면:
1. MASTER_ADMIN 역할 설정을 위해 Firestore에 사용자 문서 생성
2. 실제 QR 코드 스캔 테스트
3. 출퇴근 기록 저장 확인