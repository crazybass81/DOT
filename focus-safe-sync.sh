#!/bin/bash

# 포커스 안전 동기화 스크립트
# .git 작업을 최소화하여 에디터 포커스 유지

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  🔄 포커스 안전 동기화 시작${NC}"
echo -e "${GREEN}  (에디터 포커스 유지)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}중지: Ctrl+C${NC}\n"

# 초기 동기화
git pull origin master --quiet

LAST_HASH=""
SYNC_INTERVAL=60  # 기본 60초 간격

while true; do
    # 현재 작업 디렉토리 저장
    CURRENT_DIR=$(pwd)
    
    # .git 디렉토리로 이동하여 작업 (에디터가 감지 못함)
    cd .git 2>/dev/null || cd $CURRENT_DIR
    
    # 변경사항 해시로 체크 (가벼운 작업)
    CURRENT_HASH=$(git -C .. diff --stat 2>/dev/null | md5)
    
    if [[ "$CURRENT_HASH" != "$LAST_HASH" ]] && [[ -n "$CURRENT_HASH" ]]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 변경사항 감지"
        
        # 원래 디렉토리로 돌아가서 커밋
        cd $CURRENT_DIR
        
        # 특정 파일들만 추가 (전체 스캔 방지)
        git add *.* 2>/dev/null
        git add */*.* 2>/dev/null
        git add */*/*.* 2>/dev/null
        git add .github/ 2>/dev/null
        git add services/ 2>/dev/null
        git add infrastructure/ 2>/dev/null
        
        # 조용히 커밋
        git commit -m "[Auto-sync] $(date '+%Y-%m-%d %H:%M:%S')" --quiet 2>/dev/null
        
        # 백그라운드에서 푸시
        (git push origin master --quiet 2>/dev/null && echo -e "${GREEN}✓ 동기화 완료${NC}") &
        
        LAST_HASH="$CURRENT_HASH"
    fi
    
    # 원격 체크는 2분마다
    if [ $(($(date +%s) % 120)) -eq 0 ]; then
        git fetch origin --quiet 2>/dev/null
        LOCAL=$(git rev-parse HEAD 2>/dev/null)
        REMOTE=$(git rev-parse origin/master 2>/dev/null)
        
        if [ "$LOCAL" != "$REMOTE" ] 2>/dev/null; then
            echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 원격 변경사항"
            (git pull origin master --quiet 2>/dev/null) &
        fi
    fi
    
    sleep $SYNC_INTERVAL
done