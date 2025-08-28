# 🔄 Claude 동기화 시스템 사용 가이드

## 📋 사용 시나리오별 워크플로우

### 🎯 기본 원칙
```
SSH Claude ←→ GitHub (auto-sync) ←→ 로컬 Claude
     ↓                                    ↓
서버 개발/배포                    모바일 테스트/디버깅
```

## 1️⃣ 일반적인 개발 워크플로우

### 시나리오 A: 새 기능 개발
```bash
# SSH Claude에서
1. 기능 설계 및 코드 작성
2. 서버 API 개발
3. 자동으로 5초 내 동기화

# 로컬 Claude에서
4. 5초 후 코드 자동 반영
5. Android Studio에서 모바일 앱 테스트
6. 디버깅 및 수정사항 즉시 반영

# SSH Claude에서
7. 로컬 수정사항 자동 반영됨
8. 통합 테스트 및 배포
```

### 시나리오 B: 버그 수정
```bash
# 로컬에서 버그 발견
1. Android Studio에서 디버깅
2. 로컬 Claude가 수정
3. 즉시 테스트 가능

# SSH에서
4. 5초 후 수정사항 자동 반영
5. 서버 환경에서 검증
6. 프로덕션 배포
```

## 2️⃣ 역할 분담 가이드

### 🖥️ SSH Claude가 주로 하는 작업
- **서버/백엔드 개발** ✅
- **API 엔드포인트 구현**
- **데이터베이스 작업**
- **배포 스크립트 실행**
- **서버 환경 설정**
- **CI/CD 파이프라인**
- **프로덕션 빌드**

### 💻 로컬 Claude가 주로 하는 작업
- **모바일 앱 UI 개발** ✅
- **Android/iOS 빌드 및 테스트**
- **실기기 디버깅**
- **UI/UX 개선**
- **성능 프로파일링**
- **로컬 개발 서버 실행**

### 🤝 양쪽 모두 가능한 작업
- **코드 리뷰**
- **문서 작성**
- **테스트 코드 작성**
- **리팩토링**
- **버그 수정**

## 3️⃣ 실제 사용 예시

### 예시 1: Flutter 앱 새 화면 추가
```bash
# SSH Claude
"새로운 프로필 화면을 추가해줘"
→ lib/pages/profile_page.dart 생성
→ API 엔드포인트 구현
→ 5초 후 자동 동기화

# 로컬 (Android Studio)
→ 자동으로 새 파일 감지
→ Hot Reload로 즉시 확인
→ UI 미세조정 가능
→ 실기기에서 테스트

# 문제 발견 시
→ 로컬에서 수정
→ SSH에 자동 반영
→ 통합 테스트 진행
```

### 예시 2: API 버그 수정
```bash
# 로컬에서 API 오류 발견
"로그인 API가 401 에러를 반환해"

# SSH Claude
→ 서버 로그 확인
→ 인증 로직 수정
→ 테스트 실행
→ 5초 후 동기화

# 로컬
→ 자동 반영 확인
→ 모바일 앱에서 재테스트
→ 정상 동작 확인
```

## 4️⃣ 동시 작업 시 주의사항

### ⚠️ 충돌 방지 전략
```bash
# 같은 파일 작업 피하기
SSH: backend/ 폴더 작업
로컬: frontend/ 폴더 작업

# 작업 전환 시
1. 한쪽 작업 완료
2. 5-10초 대기 (동기화 확인)
3. 다른 쪽에서 작업 시작

# 충돌 발생 시
→ sync-all.sh가 자동으로 stash/pop
→ 수동 병합 필요시 알림
```

### 🔄 동기화 상태 확인
```bash
# SSH에서
tail -f ~/DOT/sync.log

# 로컬에서
./sync-all.sh 출력 확인

# 동기화 확인 표시
✓ 코드 동기화됨
✓ Claude 설정 동기화됨
✓ Serena 메모리 동기화됨 (3개)
✓ MCP 설정 동기화됨
```

## 5️⃣ 베스트 프랙티스

### ✅ 권장 사항
1. **명확한 역할 분담**: 서버(SSH) vs 클라이언트(로컬)
2. **작업 시작 전 알림**: "지금부터 프로필 페이지 작업할게"
3. **큰 변경사항 공유**: 아키텍처 변경 시 양쪽 Claude에게 알림
4. **주기적 상태 체크**: git status로 동기화 확인

### ❌ 피해야 할 것
1. **동시에 같은 파일 수정**: 충돌 발생
2. **sync 스크립트 중단**: 동기화 깨짐
3. **master 브랜치 직접 작업**: auto-sync 브랜치 사용
4. **대용량 파일 커밋**: 동기화 지연

## 6️⃣ 문제 해결

### 동기화 안 될 때
```bash
# SSH에서
git status
git pull origin auto-sync --rebase

# 로컬에서
git status
git pull origin auto-sync --rebase
```

### Claude 컨텍스트 안 맞을 때
```bash
# 양쪽 모두에서
1. Claude Code 재시작
2. Cmd+Shift+P → "Reload Window"
3. Serena: activate_project 실행
```

### 충돌 발생 시
```bash
# 우선순위 결정
- 코드: SSH 우선
- 테스트: 로컬 우선
- 문서: 최신 것 우선

# 해결 방법
git fetch origin
git reset --hard origin/auto-sync  # SSH 기준으로 리셋
```

## 7️⃣ 고급 활용

### 병렬 작업
```bash
# SSH Claude
"백엔드 API 3개를 동시에 구현해줘"
→ Task 에이전트 활용
→ 병렬 처리

# 로컬 Claude  
"3개 화면 UI를 동시에 만들어줘"
→ Magic MCP로 컴포넌트 생성
→ 실시간 프리뷰
```

### 크로스 테스팅
```bash
# SSH에서 웹 서버 실행
flutter run -d web-server --web-port=8080

# 로컬에서 ngrok으로 터널링
ngrok http [SSH-IP]:8080

# 모바일에서 접속
→ 양쪽 환경 동시 테스트
```

## 📌 핵심 요약

**주요 변경은 어디서든 가능!** 하지만 효율적인 작업을 위해:

1. **서버/백엔드** → SSH Claude 추천
2. **모바일/프론트엔드** → 로컬 Claude 추천  
3. **테스트/디버깅** → 로컬 Android Studio 필수
4. **배포/운영** → SSH 환경 필수

**가장 중요한 것**: sync-all.sh가 항상 실행 중이어야 함!

```bash
# 작업 시작 시 항상
cd ~/DOT && ./sync-all.sh  # 로컬
cd ~/DOT && ./auto-sync.sh  # SSH
```

이제 양쪽 Claude가 하나의 팀처럼 협업합니다! 🎉