# 🚀 로컬 Claude Code 완전 동기화 설정 가이드

**이 문서는 로컬 Claude Code가 SSH Claude와 완전히 같은 컨텍스트와 설정으로 작동하도록 하는 완벽한 가이드입니다.**

## 📋 실행 순서 (반드시 순서대로!)

### 1단계: 프로젝트 클론 및 브랜치 설정

```bash
# 기존 DOT 폴더가 있다면 백업
mv ~/DOT ~/DOT_backup_$(date +%Y%m%d)

# 새로 클론
cd ~
git clone https://github.com/crazybass81/DOT.git
cd DOT

# auto-sync 브랜치로 전환 (중요!)
git fetch origin
git checkout -b auto-sync origin/auto-sync
```

### 2단계: Claude 설정 파일 확인

다음 파일들이 있는지 확인:
```bash
ls -la .claude/
ls -la .serena/
ls -la CLAUDE.md
ls -la .mcp.json
```

모두 있어야 합니다! 없으면 다시 pull:
```bash
git pull origin auto-sync
```

### 3단계: MCP 서버 설정 동기화

**중요: 로컬 Claude Code의 MCP 설정을 SSH와 동일하게 맞춥니다.**

1. Claude Code 설정 열기:
   - Mac: `Cmd + ,`
   - Windows/Linux: `Ctrl + ,`

2. MCP Servers 탭으로 이동

3. 다음 MCP 서버들이 활성화되어 있는지 확인:
   - ✅ Sequential Thinking
   - ✅ Context7
   - ✅ Magic
   - ✅ Morphllm
   - ✅ Serena
   - ✅ Playwright

4. Serena 설정 확인:
   - Project path: `/Users/[your-username]/DOT` (자신의 경로로)
   - Memory 기능 활성화

### 4단계: 실시간 동기화 스크립트 설정

```bash
# 동기화 스크립트 생성
cat > sync-all.sh << 'EOF'
#!/bin/bash

# 완전 동기화 스크립트
# 코드 + Claude 컨텍스트 + Serena 메모리 모두 동기화

SYNC_INTERVAL=5
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  완전 동기화 시작 (코드 + 컨텍스트)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}간격: ${NC}${SYNC_INTERVAL}초"
echo -e "${YELLOW}중지: Ctrl+C${NC}\n"

# 초기 동기화
git pull origin auto-sync --quiet

while true; do
    # 원격 변경사항 확인
    git fetch origin --quiet
    
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/auto-sync)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 동기화 중..."
        
        # 로컬 변경사항 보존
        if [[ -n $(git status -s) ]]; then
            git stash push -m "Local changes $(date '+%Y%m%d_%H%M%S')" --quiet
            STASHED=true
        else
            STASHED=false
        fi
        
        # Pull (코드 + 컨텍스트 모두)
        if git pull origin auto-sync --quiet; then
            echo -e "${GREEN}✓ 코드 동기화됨${NC}"
            
            # Claude 컨텍스트 파일 확인
            if [ -f ".claude/settings.json" ]; then
                echo -e "${GREEN}✓ Claude 설정 동기화됨${NC}"
            fi
            
            # Serena 메모리 확인
            if [ -d ".serena/memories" ]; then
                mem_count=$(ls .serena/memories/ 2>/dev/null | wc -l | tr -d ' ')
                echo -e "${GREEN}✓ Serena 메모리 동기화됨 (${mem_count}개)${NC}"
            fi
            
            # MCP 설정 확인
            if [ -f ".mcp.json" ]; then
                echo -e "${GREEN}✓ MCP 설정 동기화됨${NC}"
            fi
            
            # macOS: Android Studio 새로고침
            if [[ "$OSTYPE" == "darwin"* ]]; then
                osascript -e 'tell application "Android Studio" to activate' 2>/dev/null || true
            fi
            
            # Stash 복원
            if [ "$STASHED" = true ]; then
                git stash pop --quiet 2>/dev/null || echo -e "${YELLOW}⚠ 로컬 변경사항 충돌${NC}"
            fi
            
            echo ""
        fi
    fi
    
    sleep $SYNC_INTERVAL
done
EOF

chmod +x sync-all.sh
```

### 5단계: Android Studio 프로젝트 설정

```bash
# Flutter 모바일 앱 디렉토리로 이동
cd services/attendance/mobile

# Flutter 의존성 설치
flutter pub get

# iOS 설정 (Mac만)
if [[ "$OSTYPE" == "darwin"* ]]; then
    cd ios && pod install && cd ..
fi

# 프로젝트 루트로 돌아가기
cd ~/DOT
```

Android Studio 설정:
1. File → Open → `~/DOT/services/attendance/mobile` 선택
2. Preferences → Build, Execution, Deployment → Compiler
3. "Build project automatically" 체크
4. Registry (Shift+Cmd+A) → "compiler.automake.allow.when.app.running" 체크

### 6단계: Claude Code 프로젝트 열기

**중요: Claude Code도 같은 폴더에서 열어야 합니다!**

1. Claude Code 실행
2. File → Open Folder
3. `~/DOT` 선택 (프로젝트 루트)
4. Trust 허용

### 7단계: 동기화 실행

터미널 창 3개 필요:

**터미널 1 - 완전 동기화:**
```bash
cd ~/DOT
./sync-all.sh
```

**터미널 2 - Flutter 웹 서버 (선택사항):**
```bash
cd ~/DOT/services/attendance/mobile
flutter run -d web-server --web-port=8080
```

**터미널 3 - 작업용:**
```bash
cd ~/DOT
# 일반 작업용
```

### 8단계: 동기화 확인

#### 8.1 코드 동기화 테스트
SSH에서 아무 파일이나 수정 후, 5초 뒤 로컬에서 확인

#### 8.2 Serena 메모리 동기화 확인
```bash
# 메모리 파일 확인
ls -la .serena/memories/
```

#### 8.3 Claude 컨텍스트 확인
로컬 Claude Code에서:
1. 명령 팔레트 열기 (Cmd+Shift+P)
2. "Reload Window" 실행
3. CLAUDE.md 파일의 지시사항이 적용되는지 확인

## 🎯 최종 워크플로우

```
[SSH Claude Code]
    ↓ (코드 작성 + 컨텍스트 생성)
[auto-sync.sh 실행 중]
    ↓ (5초마다 Git push)
[GitHub auto-sync 브랜치]
    ↓
[로컬 sync-all.sh 실행 중]
    ↓ (5초마다 Git pull)
[로컬 Claude Code + Android Studio]
    ↓ (같은 컨텍스트로 작업)
[안드로이드 기기에서 테스트]
```

## ✅ 체크리스트

모든 항목이 ✓ 되어야 완벽한 동기화:

- [ ] auto-sync 브랜치 체크아웃
- [ ] .claude/ 폴더 존재
- [ ] .serena/memories/ 폴더 존재
- [ ] CLAUDE.md 파일 존재
- [ ] .mcp.json 파일 존재
- [ ] sync-all.sh 실행 중
- [ ] Android Studio 자동 빌드 설정
- [ ] Claude Code에서 같은 프로젝트 열림
- [ ] MCP 서버 설정 동일

## 🔥 문제 해결

### Claude가 컨텍스트를 인식 못할 때
```bash
# Claude Code 재시작
# Cmd+Shift+P → "Reload Window"
```

### Serena 메모리가 동기화 안 될 때
```bash
# 수동 동기화
git pull origin auto-sync --force
```

### Android Studio가 변경사항 못 찾을 때
```bash
# File → Invalidate Caches and Restart
```

### 충돌 발생 시
```bash
# SSH 우선으로 덮어쓰기
git fetch origin
git reset --hard origin/auto-sync
```

## 🚀 한 줄 시작 명령어

모든 설정이 완료된 후:
```bash
cd ~/DOT && git checkout auto-sync && git pull origin auto-sync && ./sync-all.sh
```

---

## 📌 중요 사항

1. **절대 master 브랜치에서 작업하지 마세요**
2. **sync-all.sh는 항상 실행 상태로 유지**
3. **로컬에서 큰 변경 시 SSH Claude에게 알려주세요**
4. **주기적으로 master에 병합하세요**

설정 완료! 이제 SSH와 로컬 Claude가 완전히 동일한 컨텍스트를 공유합니다. 🎉

**SSH Claude가 아는 모든 것을 로컬 Claude도 알게 됩니다!**