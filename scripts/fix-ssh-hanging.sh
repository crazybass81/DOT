#!/bin/bash

# SSH 연결 멈춤 문제 해결 스크립트

echo "🔧 SSH 연결 멈춤 문제 해결..."
echo "========================================="

# 1. 기존 SSH 프로세스 종료
echo "1. 기존 SSH 연결 정리..."
pkill -f "ssh.*021.dev" 2>/dev/null
pkill -f "ssh-agent" 2>/dev/null

# 2. SSH 에이전트 재시작
echo "2. SSH 에이전트 재시작..."
eval $(ssh-agent -k) 2>/dev/null
eval $(ssh-agent -s)

# 3. SSH 설정 수정 (RequestTTY 제거)
echo "3. SSH 설정 최적화..."
cat > ~/.ssh/config << 'EOF'
Host 021.dev
  HostName 100.25.70.173
  User ec2-user
  Port 22
  IdentityFile ~/.ssh/021.dev.pem
  IdentitiesOnly yes
  ServerAliveInterval 30
  ServerAliveCountMax 3
  ConnectTimeout 30
  TCPKeepAlive yes
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
  ControlMaster auto
  ControlPath ~/.ssh/control-%r@%h:%p
  ControlPersist 10m
  ForwardAgent no
  AddKeysToAgent no
  UseKeychain no
EOF

# 4. 제어 소켓 정리
echo "4. SSH 제어 소켓 정리..."
rm -rf ~/.ssh/control-*
rm -rf /tmp/ssh-*

# 5. VS Code 설정 업데이트
echo "5. VS Code 설정 업데이트..."
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
    "remote.SSH.useExecServer": false,
    "remote.SSH.enableAgentForwarding": false,
    "remote.SSH.enableX11Forwarding": false
}
EOF

# 6. 권한 재설정
echo "6. 권한 설정..."
chmod 700 ~/.ssh
chmod 600 ~/.ssh/config
chmod 400 ~/.ssh/021.dev.pem

# 7. 연결 테스트
echo -e "\n7. SSH 연결 테스트..."
if timeout 5 ssh -o BatchMode=yes 021.dev "echo '✅ SSH 연결 성공'" 2>/dev/null; then
    echo "SSH 연결 정상"
else
    echo "⚠️ SSH 연결 실패 - 재시도 필요"
fi

echo -e "\n✅ 설정 완료!"
echo "========================================="
echo ""
echo "🚀 이제 다음 단계를 수행하세요:"
echo ""
echo "1. VS Code 모든 창 닫기"
echo "2. 터미널에서 실행: pkill -f 'Visual Studio Code'"
echo "3. 10초 대기"
echo "4. VS Code 다시 시작"
echo "5. Remote-SSH: Connect to Host → 021.dev"
echo ""
echo "💡 또는 터미널에서 직접 연결:"
echo "   ssh -tt 021.dev"