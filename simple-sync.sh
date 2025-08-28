#!/bin/bash

# 간단한 동기화 스크립트 (타이머 기반)
# main 브랜치 사용

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  🔄 간단한 자동 동기화 시작 (main)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}중지: Ctrl+C${NC}\n"

# 초기 pull
git pull origin main --quiet 2>/dev/null

while true; do
    # 변경사항 체크
    if [[ -n $(git status -s 2>/dev/null) ]]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 변경사항 감지"
        
        # 커밋 및 푸시
        git add -A
        git commit -m "[Auto-sync] $(date '+%Y-%m-%d %H:%M:%S')" --quiet
        
        if git push origin main --quiet 2>/dev/null; then
            echo -e "${GREEN}✓ 동기화 완료${NC}"
        else
            echo -e "${YELLOW}⚠ Push 실패 - Pull 후 재시도${NC}"
            git pull --rebase origin main --quiet
            git push origin main --quiet 2>/dev/null && echo -e "${GREEN}✓ 동기화 완료${NC}"
        fi
    fi
    
    # 원격 변경사항 체크
    git fetch origin --quiet
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 원격 변경사항"
        git pull origin main --quiet
        echo -e "${GREEN}✓ Pull 완료${NC}"
    fi
    
    sleep 30  # 30초마다 체크
done