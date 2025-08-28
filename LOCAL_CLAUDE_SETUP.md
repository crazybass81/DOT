# 🚀 로컬 Claude Code 실시간 동기화 설정

**이 문서는 로컬 Claude Code가 실행해야 할 모든 지침입니다.**

SSH 환경에서 개발 중인 코드를 실시간으로 받아서 Android Studio에서 테스트할 수 있도록 설정합니다.

## 📋 실행해야 할 작업

### 1. 프로젝트 클론 (이미 했다면 스킵)
```bash
cd ~
git clone https://github.com/crazybass81/DOT.git
cd DOT
```

### 2. auto-sync 브랜치로 전환
```bash
git fetch origin
git checkout -b auto-sync origin/auto-sync
```

### 3. 실시간 동기화 스크립트 생성

다음 내용으로 `local-pull.sh` 파일을 생성하세요:

```bash
cat > local-pull.sh << 'EOF'
#!/bin/bash

# 로컬 Claude Code용 자동 동기화 스크립트
# SSH에서 푸시된 변경사항을 5초마다 자동으로 받아옵니다

SYNC_INTERVAL=5
BRANCH="auto-sync"

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  로컬 자동 동기화 시작${NC}"
echo -e "${GREEN}==================================${NC}"
echo -e "${BLUE}브랜치: ${NC}$BRANCH"
echo -e "${BLUE}간격: ${NC}${SYNC_INTERVAL}초"
echo -e "${YELLOW}중지: Ctrl+C${NC}\n"

# 메인 루프
while true; do
    # 원격 변경사항 확인
    git fetch origin --quiet
    
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$BRANCH)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 변경사항 발견"
        
        # 로컬 변경사항 임시 저장
        if [[ -n $(git status -s) ]]; then
            git stash push -m "Auto-stash $(date '+%Y%m%d_%H%M%S')" --quiet
            STASHED=true
        else
            STASHED=false
        fi
        
        # Pull
        if git pull origin $BRANCH --quiet; then
            echo -e "${GREEN}✓ 동기화 완료${NC}"
            
            # macOS인 경우 Android Studio 새로고침
            if [[ "$OSTYPE" == "darwin"* ]]; then
                osascript -e 'tell application "Android Studio" to activate' 2>/dev/null || true
            fi
            
            # Stash 복원
            if [ "$STASHED" = true ]; then
                git stash pop --quiet 2>/dev/null || echo -e "${YELLOW}⚠ 로컬 변경사항 충돌${NC}"
            fi
        fi
    fi
    
    sleep $SYNC_INTERVAL
done
EOF

chmod +x local-pull.sh
```

### 4. Android Studio 설정

#### 4.1 프로젝트 열기
1. Android Studio 실행
2. File → Open
3. `DOT/services/attendance/mobile` 선택

#### 4.2 자동 새로고침 설정
1. **Preferences** (Mac) / **Settings** (Windows/Linux) 열기
2. **Build, Execution, Deployment → Compiler** 이동
3. **"Build project automatically"** 체크
4. **Apply** 클릭

#### 4.3 Registry 설정 (중요!)
1. **Shift + Cmd + A** (Mac) / **Shift + Ctrl + A** (Windows/Linux)
2. "Registry" 입력 후 선택
3. **"compiler.automake.allow.when.app.running"** 찾아서 체크
4. 닫기

### 5. Flutter 설정

```bash
cd services/attendance/mobile

# Flutter 의존성 설치
flutter pub get

# iOS 설정 (Mac만)
cd ios && pod install && cd ..
```

### 6. 실행 순서

#### Step 1: 동기화 시작
새 터미널 창에서:
```bash
cd ~/DOT
./local-pull.sh
```
이 스크립트를 계속 실행 상태로 둡니다.

#### Step 2: Android Studio에서 앱 실행
1. Android 기기 연결 또는 에뮬레이터 시작
2. Run 버튼 클릭 또는 `Shift + F10`

### 7. 테스트 워크플로우

이제 설정이 완료되었습니다! 

**작동 방식:**
1. SSH Claude Code에서 코드 수정
2. 5초 내에 자동으로 로컬에 동기화
3. Android Studio가 자동으로 변경사항 감지
4. Flutter Hot Reload로 즉시 반영

### 8. 유용한 명령어

```bash
# 동기화 상태 확인
git status

# 최신 커밋 확인
git log --oneline -5

# 로컬 변경사항 임시 저장
git stash

# 로컬 변경사항 복원
git stash pop

# 충돌 해결 후
git add .
git commit -m "Resolved conflicts"
```

## ⚠️ 주의사항

1. **로컬에서 코드 수정 시**: 
   - 동기화 스크립트가 자동으로 stash/pop 처리
   - 충돌 시 수동 해결 필요

2. **Android Studio 느려짐**:
   - File → Invalidate Caches and Restart

3. **Flutter 에러**:
   ```bash
   flutter clean
   flutter pub get
   ```

## 🎯 최종 확인

모든 설정이 완료되면:
1. SSH에서 파일 수정
2. 5초 후 로컬에 자동 반영
3. Android Studio에서 즉시 확인

**문제가 있으면 다음을 확인:**
- `local-pull.sh`가 실행 중인지
- auto-sync 브랜치인지
- Android Studio 자동 빌드 설정

---

## 빠른 시작 명령어 (복사해서 실행)

```bash
# 한 번에 모든 설정 실행
cd ~/DOT && \
git fetch origin && \
git checkout -b auto-sync origin/auto-sync && \
./local-pull.sh
```

설정 완료! 이제 SSH에서 개발하고 로컬에서 실시간 테스트가 가능합니다. 🚀