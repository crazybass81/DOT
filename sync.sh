#!/bin/bash

# DOT 프로젝트 자동 동기화
# 로컬과 SSH 서버 간 양방향 동기화
# 포커스 손실 없는 백그라운드 처리

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 환경 감지
if [[ "$HOSTNAME" == *"ec2"* ]] || [[ "$USER" == "ec2-user" ]]; then
    LOCATION="SSH 서버"
    SYNC_INTERVAL=5
else
    LOCATION="로컬 Mac"
    SYNC_INTERVAL=30
fi

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  🔄 자동 동기화 시작${NC}"
echo -e "${GREEN}  📍 위치: ${LOCATION}${NC}"
echo -e "${GREEN}  ⏱️  간격: ${SYNC_INTERVAL}초${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}중지: Ctrl+C${NC}\n"

# Git 설정 (포커스 손실 방지)
export GIT_OPTIONAL_LOCKS=0

# 초기 동기화
git pull origin main --quiet 2>/dev/null

# 메인 동기화 루프
while true; do
    # 변경사항 체크 (조용히)
    if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 변경사항 감지"
        
        # 백그라운드에서 커밋 및 푸시
        (
            git add -A 2>/dev/null
            git commit -m "[Auto-sync] $(date '+%Y-%m-%d %H:%M:%S')" --quiet 2>/dev/null
            git push origin main --quiet 2>/dev/null && echo -e "${GREEN}✓ Push 완료${NC}"
        ) &
    fi
    
    # 원격 변경사항 체크
    git fetch origin --quiet 2>/dev/null
    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse origin/main 2>/dev/null)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "${BLUE}$(date '+%H:%M:%S')${NC} - 원격 변경사항"
        git pull origin main --quiet 2>/dev/null && echo -e "${GREEN}✓ Pull 완료${NC}"
    fi
    
    sleep $SYNC_INTERVAL
done