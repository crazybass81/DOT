#!/bin/bash

# 자동 동기화 설정 스크립트 (로컬/SSH 공용)
# 이 스크립트를 실행하면 현재 환경에 맞는 자동 동기화가 설정됩니다

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  자동 동기화 설정 (로컬/SSH 자동 감지)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"

# 환경 감지
if [[ "$HOSTNAME" == *"ec2"* ]] || [[ "$USER" == "ec2-user" ]] || [[ -f /etc/ec2-release ]]; then
    ENV_TYPE="SSH"
    echo -e "${BLUE}환경: SSH 서버${NC}"
else
    ENV_TYPE="LOCAL"
    echo -e "${BLUE}환경: 로컬 (Mac/Linux)${NC}"
fi

# 1. tmux 설치 확인
echo -e "\n${BLUE}1. tmux 설치 확인...${NC}"
if ! command -v tmux &> /dev/null; then
    echo -e "${YELLOW}tmux 설치 중...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo yum install -y tmux 2>/dev/null || sudo apt-get install -y tmux
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install tmux
    fi
fi
echo -e "${GREEN}✓ tmux 설치됨${NC}"

# 2. 현재 쉘 확인
SHELL_RC=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    echo -e "${BLUE}2. 쉘 감지: zsh${NC}"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    echo -e "${BLUE}2. 쉘 감지: bash${NC}"
fi

# 3. 자동 시작 설정 추가
echo -e "\n${BLUE}3. 자동 시작 설정 추가 중...${NC}"

# 기존 설정 제거 (중복 방지)
sed -i '/# DOT 프로젝트 자동 동기화/,/^$/d' "$SHELL_RC" 2>/dev/null

# 새 설정 추가
cat >> "$SHELL_RC" << 'EOF'

# DOT 프로젝트 자동 동기화 설정
if [ "$ENV_TYPE" == "SSH" ]; then
    # SSH 서버용 설정
    if [ -d ~/DOT ]; then
        cd ~/DOT
        if ! tmux has-session -t sync-ssh 2>/dev/null; then
            tmux new-session -d -s sync-ssh './ssh-sync.sh'
            echo "✅ SSH ↔️ GitHub 동기화 시작됨 (tmux: sync-ssh)"
        fi
        echo "📊 동기화 상태: tmux ls"
        echo "📺 로그 보기: tmux attach -t sync-ssh"
    fi
else
    # 로컬용 설정  
    if [ -d ~/Desktop/DOT ]; then
        cd ~/Desktop/DOT
        if ! tmux has-session -t sync-local 2>/dev/null; then
            tmux new-session -d -s sync-local './local-sync.sh'
            echo "✅ 로컬 ↔️ GitHub 동기화 시작됨 (tmux: sync-local)"
        fi
        echo "📊 동기화 상태: tmux ls"
        echo "📺 로그 보기: tmux attach -t sync-local"
        cd - > /dev/null
    fi
fi
EOF

echo -e "${GREEN}✓ $SHELL_RC에 자동 시작 설정 추가됨${NC}"

# 4. 즉시 실행
echo -e "\n${BLUE}4. 동기화 서비스 시작 중...${NC}"

if [ "$ENV_TYPE" == "SSH" ]; then
    cd ~/DOT
    tmux kill-session -t sync-ssh 2>/dev/null
    tmux new-session -d -s sync-ssh './ssh-sync.sh'
    echo -e "${GREEN}✓ SSH ↔️ GitHub 동기화 시작됨${NC}"
else
    cd ~/Desktop/DOT
    tmux kill-session -t sync-local 2>/dev/null  
    tmux new-session -d -s sync-local './local-sync.sh'
    echo -e "${GREEN}✓ 로컬 ↔️ GitHub 동기화 시작됨${NC}"
fi

# 5. 상태 확인
echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  설정 완료!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
tmux ls
echo ""
echo -e "${YELLOW}유용한 명령어:${NC}"
echo "  tmux attach -t sync-ssh    # 로그 보기"
echo "  tmux ls                    # 세션 목록"
echo "  tmux kill-session -t sync-ssh  # 종료"
echo ""
echo -e "${GREEN}이제 터미널을 열 때마다 자동으로 동기화가 시작됩니다!${NC}"