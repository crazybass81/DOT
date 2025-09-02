# 로그인 디버깅 가이드

## 1. Flutter 로그 확인 방법

### 방법 1: flutter run 터미널에서 직접 확인
```bash
flutter run
```
실행한 터미널 창에서 로그가 실시간으로 출력됩니다.

### 방법 2: flutter logs 명령어 사용
새 터미널 창을 열고:
```bash
flutter logs
```
이 명령어는 연결된 디바이스의 로그를 실시간으로 보여줍니다.

### 방법 3: Android Studio Logcat
1. Android Studio 하단의 "Logcat" 탭 클릭
2. 필터에 "flutter" 입력
3. 로그 레벨을 "Verbose"로 설정

### 방법 4: VS Code Debug Console
1. VS Code에서 F5로 디버그 실행
2. 하단 "DEBUG CONSOLE" 탭에서 로그 확인

## 2. 로그인 문제 직접 테스트

터미널에서 다음 명령어를 실행해서 Firebase 인증을 직접 테스트해보세요:

```bash
flutter run -t lib/test_firebase.dart
```

이 테스트 파일은 Firebase 연결과 로그인을 단계별로 테스트합니다.

## 3. 수동으로 로그 확인

로그인 버튼을 누른 후 확인할 사항:

1. **이메일이 제대로 입력되었는지**
   - 콘솔에 `🔐 로그인 시도: archt723@gmail.com` 이 나오는지 확인

2. **Firebase 에러 메시지**
   - `Firebase Auth Error:` 로 시작하는 메시지
   - `invalid-credential` - 이메일/비밀번호가 틀림
   - `user-not-found` - 사용자가 없음
   - `network-request-failed` - 네트워크 문제

3. **Firestore 연결 확인**
   - `User document found in Firestore` - 사용자 문서 찾음
   - `User document not found` - 사용자 문서 없음

## 4. 일반적인 문제와 해결책

### 문제 1: "invalid-credential" 에러
**원인**: Firebase Console에서 사용자가 생성되지 않았거나 비밀번호가 틀림
**해결**: 
1. Firebase Console > Authentication > Users 확인
2. archt723@gmail.com 계정이 있는지 확인
3. 없으면 "사용자 추가"로 생성

### 문제 2: "network-request-failed" 에러
**원인**: 인터넷 연결 문제 또는 Firebase 프로젝트 설정 문제
**해결**:
1. 에뮬레이터의 인터넷 연결 확인
2. google-services.json 파일이 올바른지 확인

### 문제 3: 로그인 성공했는데 화면이 안 바뀜
**원인**: 라우터 설정 문제
**해결**: 
1. 콘솔에 "✅ 로그인 성공! 대시보드로 이동" 메시지 확인
2. 메시지가 나오는데 화면이 안 바뀌면 라우터 문제

## 5. 빠른 테스트 방법

Firebase 없이 테스트하려면 login_page.dart의 _handleLogin을 임시로 수정:

```dart
Future<void> _handleLogin() async {
  // 임시 테스트용 - Firebase 건너뛰기
  if (_emailController.text == 'archt723@gmail.com' && 
      _passwordController.text == '1q2w3e2w1q!') {
    print('✅ 테스트 로그인 성공!');
    context.go('/main/dashboard');
    return;
  }
  
  // 원래 코드...
}
```

이렇게 하면 Firebase 없이도 화면 전환을 테스트할 수 있습니다.