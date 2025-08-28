#!/bin/bash

# 포커스 손실 없는 동기화 스크립트
# git 명령을 최소화하고 백그라운드 처리

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  🔄 포커스 손실 없는 동기화${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}중지: Ctrl+C${NC}\n"

# 초기 pull
git pull origin master --quiet 2>/dev/null

# 동기화 함수
sync_changes() {
    # GIT_OPTIONAL_LOCKS=0으로 lock 파일 생성 방지
    export GIT_OPTIONAL_LOCKS=0
    
    # 변경사항이 있는지 빠르게 체크
    if [[ -n $(GIT_OPTIONAL_LOCKS=0 git status --porcelain 2>/dev/null) ]]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 동기화 중..."
        
        # 백그라운드에서 처리
        (
            GIT_OPTIONAL_LOCKS=0 git add -A 2>/dev/null
            GIT_OPTIONAL_LOCKS=0 git commit -m "[Auto-sync] $(date '+%Y-%m-%d %H:%M:%S')" --quiet 2>/dev/null
            GIT_OPTIONAL_LOCKS=0 git push origin master --quiet 2>/dev/null
            echo -e "${GREEN}✓ 동기화 완료${NC}"
        ) &
    fi
}

# macOS의 경우 fswatch 사용
if command -v fswatch &> /dev/null; then
    echo "파일 감시 모드 (fswatch) 시작..."
    
    # 특정 디렉토리만 감시 (git 제외)
    fswatch -r -e "\.git" -e "node_modules" -e "\.DS_Store" \
            --batch-marker=EOF \
            --latency 5 \
            . | while read line; do
        if [[ "$line" == "EOF" ]]; then
            sync_changes
        fi
    done
    
# Linux의 경우 inotifywait 사용
elif command -v inotifywait &> /dev/null; then
    echo "파일 감시 모드 (inotify) 시작..."
    
    while true; do
        inotifywait -r -e modify,create,delete,move \
                    --exclude '.git|node_modules|.DS_Store' \
                    . --quiet --quiet
        sleep 2  # 변경사항 누적 대기
        sync_changes
    done
    
# fswatch/inotify가 없는 경우 타이머 기반 (하지만 최적화됨)
else
    echo "타이머 모드 시작 (60초 간격)..."
    
    while true; do
        sleep 60
        
        # 백그라운드에서 체크
        (
            if [[ -n $(GIT_OPTIONAL_LOCKS=0 git status --porcelain 2>/dev/null) ]]; then
                sync_changes
            fi
            
            # 원격 체크
            GIT_OPTIONAL_LOCKS=0 git fetch origin --quiet 2>/dev/null
            LOCAL=$(git rev-parse HEAD 2>/dev/null)
            REMOTE=$(git rev-parse origin/master 2>/dev/null)
            
            if [ "$LOCAL" != "$REMOTE" ]; then
                GIT_OPTIONAL_LOCKS=0 git pull origin master --quiet 2>/dev/null &
            fi
        ) &
    done
fi