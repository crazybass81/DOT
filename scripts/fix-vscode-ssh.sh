#!/bin/bash

# VS Code Remote SSH 연결 문제 해결 스크립트

echo "🔧 VS Code Remote SSH 문제 해결 시작..."
echo "========================================="

# 1. 로컬 VS Code 캐시 정리
echo "1. 로컬 VS Code SSH 캐시 정리..."
rm -rf ~/Library/Application\ Support/Code/User/globalStorage/ms-vscode-remote.remote-ssh/
rm -rf ~/.vscode-server/
rm -f ~/.vscode-server/.*.log

# 2. SSH 제어 소켓 정리
echo "2. SSH 제어 소켓 정리..."
rm -rf ~/.ssh/control-*
rm -f ~/.ssh/known_hosts.old

# 3. 원격 서버 VS Code Server 정리
echo "3. 원격 서버 VS Code Server 재설치..."
ssh 021.dev << 'ENDSSH'
echo "원격 서버 정리 시작..."

# VS Code Server 완전 제거
rm -rf ~/.vscode-server
rm -rf ~/.vscode-remote
rm -rf ~/.vscode

# 임시 파일 정리
rm -rf /tmp/vscode-*
rm -rf /tmp/.vscode-*

# 권한 문제 해결을 위한 홈 디렉토리 권한 수정
chmod 700 ~
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys 2>/dev/null

echo "✅ 원격 서버 정리 완료"
ENDSSH

# 4. SSH 설정 최적화 (VS Code 호환)
echo "4. SSH 설정 VS Code 최적화..."
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
  StrictHostKeyChecking accept-new
  ControlMaster auto
  ControlPath ~/.ssh/control-%r@%h:%p
  ControlPersist 600
  ForwardAgent yes
  AddKeysToAgent yes
  UseKeychain yes
  Compression yes
  
  # VS Code specific
  RemoteCommand none
  RequestTTY yes
  
Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_rsa
EOF

# 5. 권한 설정
echo "5. 권한 설정 확인..."
chmod 700 ~/.ssh
chmod 600 ~/.ssh/config
chmod 400 ~/.ssh/*.pem 2>/dev/null

# 6. SSH 연결 테스트
echo -e "\n6. SSH 연결 테스트..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 021.dev "echo '✅ SSH 연결 성공'" 2>/dev/null; then
    echo "SSH 연결 정상"
else
    echo "⚠️ SSH 연결 실패 - 수동 확인 필요"
fi

# 7. VS Code 설정 파일 생성
echo -e "\n7. VS Code 설정 파일 생성..."
mkdir -p ~/Library/Application\ Support/Code/User/
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
        "021.dev": "~/.vscode-server"
    }
}
EOF

echo -e "\n✅ VS Code Remote SSH 설정 완료!"
echo "========================================="
echo ""
echo "🚀 다음 단계:"
echo "1. VS Code를 완전히 종료하고 다시 시작"
echo "2. Command Palette (Cmd+Shift+P) 열기"
echo "3. 'Remote-SSH: Kill VS Code Server on Host' 실행"
echo "4. 'Remote-SSH: Connect to Host' → '021.dev' 선택"
echo ""
echo "💡 추가 문제 해결:"
echo "- VS Code 재시작 후에도 문제가 지속되면:"
echo "  - VS Code 완전 재설치"
echo "  - Remote-SSH 확장 재설치"
echo "  - ssh 021.dev 명령으로 수동 접속 확인"