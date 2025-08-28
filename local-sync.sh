#!/bin/bash

# 양방향 완전 동기화 스크립트 (로컬용)
# 코드 + Claude 컨텍스트 + Serena 메모리 모두 자동 동기화
# Push + Pull 모두 자동화

SYNC_INTERVAL=30
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  🔄 양방향 자동 동기화 시작${NC}"
echo -e "${GREEN}  (로컬 ↔️ GitHub ↔️ SSH)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}간격: ${NC}${SYNC_INTERVAL}초"
echo -e "${YELLOW}중지: Ctrl+C${NC}\n"

# 초기 동기화
git pull origin master --quiet

while true; do
    # 1. 로컬 변경사항 자동 Push
    if [[ -n $(git status -s) ]]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 로컬 변경사항 감지"
        
        # 자동 커밋
        git add -A
        git commit -m "[Auto-sync] $(date '+%Y-%m-%d %H:%M:%S') - $(git status -s | wc -l | tr -d ' ') files changed" --quiet
        
        # Push
        if git push origin master --quiet 2>/dev/null; then
            echo -e "${GREEN}✓ 로컬 → GitHub 푸시 완료${NC}"
        else
            echo -e "${YELLOW}⚠ Push 충돌 - Pull 먼저 시도${NC}"
            git pull --rebase origin master --quiet
            git push origin master --quiet 2>/dev/null && echo -e "${GREEN}✓ 충돌 해결 후 푸시 완료${NC}"
        fi
    fi
    
    # 2. 원격 변경사항 자동 Pull
    git fetch origin --quiet
    
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/master)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 원격 변경사항 감지"
        
        # Pull (코드 + 컨텍스트 모두)
        if git pull origin master --quiet; then
            echo -e "${GREEN}✓ GitHub → 로컬 동기화 완료${NC}"
            
            # Claude 컨텍스트 파일 확인
            if [ -f ".claude/settings.json" ]; then
                echo -e "${GREEN}  ✓ Claude 설정 동기화됨${NC}"
            fi
            
            # Serena 메모리 확인
            if [ -d ".serena/memories" ]; then
                mem_count=$(ls .serena/memories/ 2>/dev/null | wc -l | tr -d ' ')
                echo -e "${GREEN}  ✓ Serena 메모리 동기화됨 (${mem_count}개)${NC}"
            fi
            
            # MCP 설정 확인
            if [ -f ".mcp.json" ]; then
                echo -e "${GREEN}  ✓ MCP 설정 동기화됨${NC}"
            fi
            
            # macOS: Android Studio 새로고침 (선택적)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                osascript -e 'tell application "Android Studio" to activate' 2>/dev/null || true
            fi
        fi
        echo ""
    fi
    
    sleep $SYNC_INTERVAL
done