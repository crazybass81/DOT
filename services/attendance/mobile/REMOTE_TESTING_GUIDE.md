# SSH 환경에서 Flutter 앱 원격 테스트 가이드

## 방법 1: Flutter Web + ngrok (추천) ⭐

SSH 환경에서 안드로이드 기기로 직접 테스트하는 가장 간단한 방법입니다.

### 설정 단계

1. **Flutter Web으로 실행**
```bash
cd services/attendance/mobile
flutter run -d web-server --web-port=8080 --web-hostname=0.0.0.0
```

2. **ngrok 설치 및 실행**
```bash
# ngrok 설치 (한 번만)
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# ngrok 실행
ngrok http 8080
```

3. **안드로이드 기기에서 접속**
- ngrok이 제공하는 URL (예: https://xxxx.ngrok.io)을 안드로이드 브라우저에서 열기
- 실시간 Hot Reload 지원됨!

### 장점
- USB 연결 불필요
- 실시간 Hot Reload 지원
- 여러 기기에서 동시 테스트 가능
- Claude Code에서 계속 개발 가능

### 단점
- 네이티브 기능 일부 제한 (카메라, GPS는 웹 API로 대체)
- 실제 앱과 약간의 차이 존재

---

## 방법 2: ADB over Network + SSH 터널링

네이티브 앱을 실제로 실행하고 싶다면 이 방법을 사용하세요.

### 설정 단계

1. **안드로이드 기기 설정**
- 개발자 옵션 활성화
- USB 디버깅 활성화
- 무선 디버깅 활성화 (Android 11+)
- 같은 Wi-Fi 네트워크에 연결

2. **SSH 서버에서 ADB 설정**
```bash
# ADB 설치
sudo apt-get install android-tools-adb

# 무선 ADB 연결 (기기 IP 필요)
adb connect [DEVICE_IP]:5555
```

3. **SSH 포트 포워딩**
```bash
# 로컬 PC에서 실행
ssh -L 5037:localhost:5037 -L 8080:localhost:8080 user@ssh-server

# 또는 역방향 포워딩
ssh -R 5037:localhost:5037 user@ssh-server
```

4. **Flutter 실행**
```bash
flutter run
# 기기가 연결된 것으로 표시됨
```

### 장점
- 완전한 네이티브 앱 테스트
- 모든 기기 기능 사용 가능
- 실제 성능 테스트 가능

### 단점
- 설정이 복잡함
- 네트워크 지연 발생 가능
- 안정성 이슈 가능

---

## 방법 3: Chrome Remote Debugging

Chrome의 원격 디버깅 기능을 활용하는 방법입니다.

### 설정 단계

1. **Flutter Web 실행**
```bash
flutter run -d chrome --web-port=8080 --web-renderer=html
```

2. **Chrome 원격 디버깅 활성화**
```bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-profile
```

3. **SSH 포트 포워딩**
```bash
# 로컬에서 실행
ssh -L 9222:localhost:9222 -L 8080:localhost:8080 user@ssh-server
```

4. **안드로이드 Chrome에서 접속**
- chrome://inspect 접속
- 원격 타겟 확인 및 디버깅

### 장점
- Chrome DevTools 완전 지원
- 성능 프로파일링 가능
- 네트워크 분석 가능

### 단점
- Chrome 브라우저 한정
- 웹 버전만 가능

---

## 빠른 시작 스크립트

### start_remote_test.sh
```bash
#!/bin/bash

echo "🚀 Flutter Remote Testing Setup"
echo "================================"

# Flutter Web 서버 시작
echo "1. Starting Flutter Web Server..."
flutter run -d web-server --web-port=8080 --web-hostname=0.0.0.0 &
FLUTTER_PID=$!

# ngrok 실행
echo "2. Starting ngrok tunnel..."
ngrok http 8080 &
NGROK_PID=$!

echo "✅ Setup complete!"
echo "Check ngrok URL above and open in your Android device"
echo ""
echo "Press Ctrl+C to stop all services"

# 종료 시 프로세스 정리
trap "kill $FLUTTER_PID $NGROK_PID" EXIT
wait
```

### 사용법
```bash
chmod +x start_remote_test.sh
./start_remote_test.sh
```

---

## VS Code SSH 원격 개발 + 모바일 테스트

VS Code의 Remote-SSH 확장을 사용중이라면:

1. **포트 자동 포워딩 설정**
   - VS Code가 자동으로 포트를 포워딩함
   - settings.json에 추가:
   ```json
   {
     "remote.SSH.defaultForwardedPorts": [
       {"localPort": 8080, "remotePort": 8080}
     ]
   }
   ```

2. **Flutter 실행**
   ```bash
   flutter run -d web-server --web-port=8080
   ```

3. **로컬에서 접속**
   - http://localhost:8080 으로 접속
   - 안드로이드 기기가 같은 네트워크면 PC IP로 접속

---

## 추천 워크플로우

1. **개발 단계**: Flutter Web + ngrok으로 빠른 테스트
2. **통합 테스트**: ADB over Network로 네이티브 테스트
3. **최종 검증**: APK 빌드 후 직접 설치

## 문제 해결

### ngrok 연결 안됨
- 방화벽 확인
- ngrok 계정 등록 (무료)

### ADB 연결 실패
- 기기와 서버가 같은 네트워크인지 확인
- adb kill-server && adb start-server

### Hot Reload 안됨
- --web-hostname=0.0.0.0 옵션 확인
- 브라우저 캐시 삭제

---

## 결론

SSH 환경에서는 **Flutter Web + ngrok** 조합이 가장 실용적입니다.
- 설정이 간단함
- Hot Reload 지원
- Claude Code와 완벽 호환
- 여러 기기 동시 테스트 가능

네이티브 기능이 꼭 필요한 경우에만 ADB over Network를 고려하세요.