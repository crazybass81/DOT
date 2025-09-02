#!/bin/bash

# 원래 설정으로 복원 스크립트

echo "🔄 원래 설정으로 복원 시작..."
echo "========================================="

# 1. 기존 SSH 프로세스 정리
echo "1. SSH 프로세스 정리..."
pkill -f "ssh.*021.dev" 2>/dev/null
pkill -f "Code Helper" 2>/dev/null
rm -rf ~/.ssh/control-*
rm -rf /tmp/ssh-*

# 2. SSH 설정 원래대로 복원 (간단한 버전)
echo "2. SSH 설정 원래대로 복원..."
cat > ~/.ssh/config << 'EOF'
Host 021.dev
  HostName 100.25.70.173
  User ec2-user
  IdentityFile ~/.ssh/021.dev.pem
EOF

# 3. VS Code 설정 제거 (기본값 사용)
echo "3. VS Code 설정 초기화..."
rm -f ~/Library/Application\ Support/Code/User/settings.json

# VS Code 원격 SSH 캐시 정리
rm -rf ~/Library/Application\ Support/Code/User/globalStorage/ms-vscode-remote.remote-ssh/

# 4. 권한 재설정
echo "4. 권한 설정..."
chmod 700 ~/.ssh
chmod 600 ~/.ssh/config
chmod 400 ~/.ssh/021.dev.pem

# 5. 원격 서버 VS Code Server 정리
echo "5. 원격 서버 정리..."
ssh 021.dev << 'ENDSSH'
# VS Code Server 제거
rm -rf ~/.vscode-server
rm -rf ~/.vscode-remote
rm -rf ~/.vscode

echo "✅ 원격 서버 정리 완료"
ENDSSH

# 6. 연결 테스트
echo -e "\n6. SSH 기본 연결 테스트..."
if ssh -o ConnectTimeout=5 021.dev "echo '✅ SSH 연결 성공'" 2>/dev/null; then
    echo "SSH 연결 정상"
else
    echo "⚠️ SSH 연결 실패"
fi

echo -e "\n✅ 원래 설정으로 복원 완료!"
echo "========================================="
echo ""
echo "🚀 이제 다음 단계를 수행하세요:"
echo ""
echo "1. VS Code 완전히 종료 (Cmd+Q)"
echo "2. 10초 대기"
echo "3. VS Code 다시 시작"
echo "4. Remote-SSH 확장 프로그램에서 021.dev 연결"
echo ""
echo "💡 터미널에서 테스트:"
echo "   ssh 021.dev"