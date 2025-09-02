# Firebase 간단 설정 가이드

## 📱 Firebase에 Android 앱 추가하기

### 1단계: Firebase Console 접속
1. https://console.firebase.google.com/ 접속
2. "프로젝트 만들기" 클릭
3. 프로젝트 이름: **DOT-Attendance** (또는 원하는 이름)
4. Google Analytics는 **사용 안함** 선택해도 됩니다

### 2단계: Android 앱 추가
Firebase 프로젝트가 만들어지면:

1. **Android 아이콘** 클릭
2. 입력할 정보:
   - **Android 패키지 이름**: `com.dot.attendance`
   - **앱 닉네임**: DOT Attendance (선택사항)
   - **디버그 서명 인증서 SHA-1**: **건너뛰기** (나중에 추가 가능)

3. "앱 등록" 클릭

### 3단계: google-services.json 다운로드
1. **google-services.json 다운로드** 버튼 클릭
2. 다운로드한 파일을 다음 폴더에 넣기:
   ```
   /Users/t/Desktop/DOT/services/attendance/mobile/android/app/
   ```
   ⚠️ **중요**: `android/app/` 폴더 안에 넣어야 합니다!

### 4단계: Firebase SDK는 이미 추가됨
- 이미 설정 완료했으니 **"다음" 클릭**하면 됩니다

### 5단계: 인증 기능 활성화
1. Firebase Console 왼쪽 메뉴에서 **Authentication** 클릭
2. **"시작하기"** 클릭
3. **Sign-in method** 탭 클릭
4. **이메일/비밀번호** 클릭 → **사용 설정** 켜기 → **저장**

### 6단계: 테스트 계정 만들기
1. **Users** 탭 클릭
2. **"사용자 추가"** 클릭
3. 입력:
   - 이메일: `archt723@gmail.com`
   - 비밀번호: `1q2w3e2w1q!`
4. **"사용자 추가"** 클릭

### 7단계: Firestore 데이터베이스 만들기
1. 왼쪽 메뉴에서 **Firestore Database** 클릭
2. **"데이터베이스 만들기"** 클릭
3. **"테스트 모드에서 시작"** 선택 (개발 중이니까)
4. 위치: **asia-northeast3 (Seoul)** 선택
5. **"만들기"** 클릭

## 🔧 SHA-1 인증서 (선택사항)

만약 SHA-1이 필요하다면 터미널에서:

```bash
cd /Users/t/Desktop/DOT/services/attendance/mobile/android
./gradlew signingReport
```

결과에서 다음과 같은 부분 찾기:
```
Variant: debug
SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

이 SHA1 값을 Firebase Console에서:
1. 프로젝트 설정 (톱니바퀴 아이콘)
2. 앱 설정에서 **"SHA 인증서 지문"** 
3. **"지문 추가"** 클릭하여 붙여넣기

## ✅ 앱 실행 테스트

```bash
cd /Users/t/Desktop/DOT/services/attendance/mobile
flutter clean
flutter pub get
flutter run
```

## 🎯 로그인 테스트
앱이 실행되면:
- 이메일: `archt723@gmail.com`
- 비밀번호: `1q2w3e2w1q!`

로그인이 성공하면 Firebase 설정 완료!

## ❓ 문제 해결

### "google-services.json을 찾을 수 없음" 오류
→ 파일이 `android/app/` 폴더에 있는지 확인

### "CONFIGURATION_NOT_FOUND" 오류  
→ 패키지 이름이 `com.dot.attendance`인지 확인

### 로그인이 안 될 때
→ Firebase Console에서 이메일/비밀번호 인증이 켜져있는지 확인