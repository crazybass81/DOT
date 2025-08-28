#!/bin/bash

# 스마트 동기화 스크립트 - 파일 변경 감지 기반
# 불필요한 git 작업을 최소화하여 포커스 문제 해결

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  🔄 스마트 자동 동기화 시작${NC}"
echo -e "${GREEN}  (변경 감지시에만 동기화)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}중지: Ctrl+C${NC}\n"

# 초기 동기화
git pull origin master --quiet

LAST_SYNC=""
CHECK_INTERVAL=2  # 체크 간격 (초)
SYNC_COOLDOWN=30  # 동기화 후 대기 시간 (초)
LAST_SYNC_TIME=0

while true; do
    CURRENT_TIME=$(date +%s)
    
    # 쿨다운 체크
    TIME_SINCE_LAST_SYNC=$((CURRENT_TIME - LAST_SYNC_TIME))
    
    if [ $TIME_SINCE_LAST_SYNC -ge $SYNC_COOLDOWN ]; then
        # 로컬 변경사항 체크 (git status 사용 최소화)
        CURRENT_STATUS=$(git status --porcelain 2>/dev/null | md5)
        
        if [[ "$CURRENT_STATUS" != "$LAST_SYNC" ]] && [[ -n $(git status -s) ]]; then
            echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 변경사항 감지"
            
            # 자동 커밋 및 푸시
            git add -A
            git commit -m "[Auto-sync] $(date '+%Y-%m-%d %H:%M:%S')" --quiet
            
            if git push origin master --quiet 2>/dev/null; then
                echo -e "${GREEN}✓ 동기화 완료${NC}"
            else
                git pull --rebase origin master --quiet
                git push origin master --quiet 2>/dev/null
            fi
            
            LAST_SYNC="$CURRENT_STATUS"
            LAST_SYNC_TIME=$CURRENT_TIME
        fi
        
        # 원격 변경사항 체크 (가끔씩만)
        if [ $((CURRENT_TIME % 60)) -eq 0 ]; then
            git fetch origin --quiet
            LOCAL=$(git rev-parse HEAD 2>/dev/null)
            REMOTE=$(git rev-parse origin/master 2>/dev/null)
            
            if [ "$LOCAL" != "$REMOTE" ]; then
                echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 원격 변경사항 pull"
                git pull origin master --quiet
                LAST_SYNC_TIME=$CURRENT_TIME
            fi
        fi
    fi
    
    sleep $CHECK_INTERVAL
done