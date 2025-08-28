#!/bin/bash

# DOT 프로젝트 로컬-SSH 동기화 스크립트
# 양방향 동기화를 지원합니다

SSH_HOST="021.dev"
SSH_USER="ec2-user"
REMOTE_DIR="~/DOT"
LOCAL_DIR="/Users/t/Desktop/DOT"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 DOT 프로젝트 동기화 시작${NC}"

# 동기화 방향 선택
echo "동기화 방향을 선택하세요:"
echo "1) 로컬 → SSH (로컬 변경사항을 SSH로)"
echo "2) SSH → 로컬 (SSH 변경사항을 로컬로)"
echo "3) 양방향 동기화 (신중히 사용)"
echo "4) Git 상태 확인"
echo "5) 종료"

read -p "선택 (1-5): " choice

case $choice in
    1)
        echo -e "${YELLOW}📤 로컬 → SSH 동기화 중...${NC}"
        
        # Git 커밋 확인
        cd "$LOCAL_DIR"
        if [[ -n $(git status -s) ]]; then
            echo -e "${YELLOW}⚠️  커밋되지 않은 변경사항이 있습니다:${NC}"
            git status -s
            read -p "계속하시겠습니까? (y/n): " confirm
            if [ "$confirm" != "y" ]; then
                echo "동기화 취소됨"
                exit 0
            fi
        fi
        
        # rsync로 로컬 → SSH 동기화
        rsync -avz --delete \
            --exclude '.git' \
            --exclude 'node_modules' \
            --exclude '.env' \
            --exclude '*.log' \
            --exclude '.DS_Store' \
            "$LOCAL_DIR/" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"
        
        echo -e "${GREEN}✅ 로컬 → SSH 동기화 완료${NC}"
        
        # SSH에서 git status 확인
        echo -e "${YELLOW}SSH 서버 Git 상태:${NC}"
        ssh "$SSH_USER@$SSH_HOST" "cd $REMOTE_DIR && git status"
        ;;
        
    2)
        echo -e "${YELLOW}📥 SSH → 로컬 동기화 중...${NC}"
        
        # rsync로 SSH → 로컬 동기화
        rsync -avz --delete \
            --exclude '.git' \
            --exclude 'node_modules' \
            --exclude '.env' \
            --exclude '*.log' \
            --exclude '.DS_Store' \
            "$SSH_USER@$SSH_HOST:$REMOTE_DIR/" "$LOCAL_DIR/"
        
        echo -e "${GREEN}✅ SSH → 로컬 동기화 완료${NC}"
        
        # 로컬 git status 확인
        echo -e "${YELLOW}로컬 Git 상태:${NC}"
        cd "$LOCAL_DIR" && git status
        ;;
        
    3)
        echo -e "${RED}⚠️  양방향 동기화는 충돌을 일으킬 수 있습니다!${NC}"
        read -p "정말 계속하시겠습니까? (yes 입력): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "동기화 취소됨"
            exit 0
        fi
        
        echo -e "${YELLOW}🔄 양방향 동기화 중...${NC}"
        
        # unison 사용 (설치 필요: brew install unison)
        if ! command -v unison &> /dev/null; then
            echo -e "${RED}Unison이 설치되어 있지 않습니다.${NC}"
            echo "설치: brew install unison"
            exit 1
        fi
        
        unison "$LOCAL_DIR" "ssh://$SSH_USER@$SSH_HOST/$REMOTE_DIR" \
            -ignore "Path .git" \
            -ignore "Path node_modules" \
            -ignore "Path .env" \
            -ignore "Name *.log" \
            -ignore "Name .DS_Store" \
            -auto -batch
        
        echo -e "${GREEN}✅ 양방향 동기화 완료${NC}"
        ;;
        
    4)
        echo -e "${YELLOW}📊 Git 상태 확인${NC}"
        echo -e "\n${GREEN}로컬 Git 상태:${NC}"
        cd "$LOCAL_DIR" && git status
        
        echo -e "\n${GREEN}SSH Git 상태:${NC}"
        ssh "$SSH_USER@$SSH_HOST" "cd $REMOTE_DIR && git status"
        
        echo -e "\n${GREEN}최근 커밋:${NC}"
        cd "$LOCAL_DIR" && git log --oneline -5
        ;;
        
    5)
        echo "종료합니다."
        exit 0
        ;;
        
    *)
        echo -e "${RED}잘못된 선택입니다.${NC}"
        exit 1
        ;;
esac

# 동기화 후 정보 표시
echo -e "\n${GREEN}동기화 정보:${NC}"
echo "로컬 디렉토리: $LOCAL_DIR"
echo "원격 디렉토리: $SSH_USER@$SSH_HOST:$REMOTE_DIR"
echo -e "${YELLOW}팁: GitHub과 동기화하려면 git push/pull을 사용하세요.${NC}"