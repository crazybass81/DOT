#!/bin/bash

# DOT 프로젝트 동기화 설정
# 로컬과 SSH 서버 모두에서 실행 가능

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  🛠️  동기화 자동 설정${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"

# 스크립트 실행 권한 부여
chmod +x sync.sh

# 환경 감지
if [[ "$HOSTNAME" == *"ec2"* ]] || [[ "$USER" == "ec2-user" ]]; then
    ENV_TYPE="SSH"
    SHELL_RC="$HOME/.bashrc"
    echo -e "${BLUE}환경: SSH 서버${NC}"
else
    ENV_TYPE="LOCAL"
    SHELL_RC="$HOME/.zshrc"
    echo -e "${BLUE}환경: 로컬 Mac${NC}"
fi

# tmux 설치 확인
if ! command -v tmux &> /dev/null; then
    echo -e "${YELLOW}tmux 설치 중...${NC}"
    if [[ "$ENV_TYPE" == "LOCAL" ]]; then
        brew install tmux
    else
        sudo yum install -y tmux 2>/dev/null || sudo apt-get install -y tmux
    fi
fi

# 기존 tmux 세션 종료
tmux kill-session -t dot-sync 2>/dev/null

# 새 tmux 세션 시작
tmux new-session -d -s dot-sync './sync.sh'
echo -e "${GREEN}✅ tmux 세션 'dot-sync' 시작됨${NC}"

# 자동 시작 설정
AUTOSTART_CODE='
# DOT 프로젝트 자동 동기화
if [ -d ~/Desktop/DOT ] || [ -d ~/DOT ]; then
    PROJECT_DIR=$([ -d ~/Desktop/DOT ] && echo ~/Desktop/DOT || echo ~/DOT)
    cd "$PROJECT_DIR"
    if ! tmux has-session -t dot-sync 2>/dev/null; then
        tmux new-session -d -s dot-sync "./sync.sh"
    fi
    cd - > /dev/null 2>&1
fi'

# 자동 시작 코드가 없으면 추가
if ! grep -q "dot-sync" "$SHELL_RC" 2>/dev/null; then
    echo "$AUTOSTART_CODE" >> "$SHELL_RC"
    echo -e "${GREEN}✅ 자동 시작 설정 완료 ($SHELL_RC)${NC}"
else
    echo -e "${YELLOW}ℹ️  자동 시작 이미 설정됨${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ 설정 완료!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "📝 사용법:"
echo "  • 상태 확인: tmux attach -t dot-sync"
echo "  • 종료: tmux kill-session -t dot-sync"
echo "  • 재시작: ./setup.sh"
echo ""
echo "다음 터미널 시작 시 자동으로 동기화가 시작됩니다."