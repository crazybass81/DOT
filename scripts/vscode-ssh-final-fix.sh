#!/bin/bash

# VS Code Remote SSH 최종 수정 스크립트

echo "🔧 VS Code Remote SSH 최종 설정..."
echo "========================================="

# 1. VS Code 설정 수정 (절대 경로 사용)
echo "1. VS Code 설정 업데이트 (절대 경로)..."
cat > ~/Library/Application\ Support/Code/User/settings.json << 'EOF'
{
    "remote.SSH.showLoginTerminal": true,
    "remote.SSH.useLocalServer": false,
    "remote.SSH.remotePlatform": {
        "021.dev": "linux"
    },
    "remote.SSH.connectTimeout": 60,
    "remote.SSH.maxReconnectionAttempts": 10,
    "remote.SSH.enableDynamicForwarding": false,
    "remote.SSH.serverInstallPath": {
        "021.dev": "/home/ec2-user/.vscode-server"
    },
    "remote.SSH.path": "/usr/bin/ssh",
    "remote.SSH.configFile": "~/.ssh/config",
    "remote.SSH.lockfilesInTmp": true,
    "remote.SSH.useExecServer": true
}
EOF

# 2. SSH 설정 재확인
echo "2. SSH 설정 확인..."
cat > ~/.ssh/config << 'EOF'
Host 021.dev
  HostName 100.25.70.173
  User ec2-user
  Port 22
  IdentityFile ~/.ssh/021.dev.pem
  IdentitiesOnly yes
  ServerAliveInterval 60
  ServerAliveCountMax 10
  ConnectTimeout 60
  TCPKeepAlive yes
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
  ControlMaster auto
  ControlPath ~/.ssh/control-%r@%h:%p
  ControlPersist 600
  ForwardAgent yes
EOF

# 3. 권한 재설정
echo "3. 권한 설정..."
chmod 700 ~/.ssh
chmod 600 ~/.ssh/config
chmod 400 ~/.ssh/021.dev.pem

# 4. 원격 서버 준비
echo "4. 원격 서버 준비..."
ssh 021.dev << 'ENDSSH'
# 디렉토리 생성 및 권한 설정
mkdir -p /home/ec2-user/.vscode-server
chmod 755 /home/ec2-user/.vscode-server

# 홈 디렉토리 권한 확인
chmod 755 /home/ec2-user
chmod 700 /home/ec2-user/.ssh

echo "✅ 원격 서버 준비 완료"
ENDSSH

# 5. VS Code 프로세스 정리
echo "5. VS Code 프로세스 정리..."
pkill -f "Code Helper" 2>/dev/null || true
pkill -f "Visual Studio Code" 2>/dev/null || true

echo -e "\n✅ 설정 완료!"
echo "========================================="
echo ""
echo "🚀 이제 다음 단계를 수행하세요:"
echo ""
echo "1. VS Code 완전히 종료 (Cmd+Q)"
echo "2. 10초 대기"
echo "3. VS Code 다시 시작"
echo "4. Command Palette (Cmd+Shift+P) 열기"
echo "5. 'Remote-SSH: Kill VS Code Server on Host' 실행"
echo "6. 'Remote-SSH: Connect to Host' → '021.dev' 선택"
echo ""
echo "💡 팁: 문제가 지속되면 VS Code를 완전히 재시작하세요"