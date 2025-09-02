#!/bin/bash

# SSH 접속 문제 해결 스크립트

echo "🔧 SSH 접속 문제 해결 시작..."

# 1. known_hosts 정리
echo "1. known_hosts 파일 정리..."
ssh-keygen -R 100.25.70.173 2>/dev/null
ssh-keygen -R 021.dev 2>/dev/null

# 2. SSH 설정 수정
echo "2. SSH 설정 최적화..."
cat > ~/.ssh/config << 'EOF'
Host 021.dev
  HostName 100.25.70.173
  User ec2-user
  IdentityFile ~/.ssh/021.dev.pem
  IdentitiesOnly yes
  ServerAliveInterval 30
  ServerAliveCountMax 3
  ConnectTimeout 30
  TCPKeepAlive yes
  StrictHostKeyChecking accept-new
  ControlMaster auto
  ControlPath ~/.ssh/control-%h-%p-%r
  ControlPersist 10m
  ForwardAgent yes
  Compression yes
  CompressionLevel 6
EOF

# 3. 권한 설정
echo "3. 권한 설정 확인..."
chmod 700 ~/.ssh
chmod 600 ~/.ssh/config
chmod 400 ~/.ssh/021.dev.pem

# 4. SSH 에이전트 확인
echo "4. SSH 에이전트 상태 확인..."
if [ -z "$SSH_AUTH_SOCK" ]; then
    eval $(ssh-agent -s)
fi

# 5. 연결 테스트
echo -e "\n5. 연결 테스트..."
echo "========================================="

# 간단한 연결 테스트
if ssh -o BatchMode=yes -o ConnectTimeout=5 021.dev exit 2>/dev/null; then
    echo "✅ SSH 연결 성공!"
else
    echo "❌ SSH 연결 실패. 상세 정보:"
    ssh -vvv 021.dev exit 2>&1 | grep -E "(debug1:|error:|Permission|refused|timeout)"
fi

echo -e "\n6. 대화형 접속 테스트..."
echo "다음 명령으로 접속해보세요:"
echo "  ssh 021.dev"
echo ""
echo "또는 강제 TTY 할당:"
echo "  ssh -tt 021.dev"
echo ""
echo "또는 직접 명령 실행:"
echo "  ssh 021.dev 'bash -l'"

# 7. 별칭 설정
echo -e "\n7. 편의 별칭 추가 (선택사항)..."
echo "alias sshdev='ssh -tt 021.dev'" >> ~/.zshrc 2>/dev/null || echo "alias sshdev='ssh -tt 021.dev'" >> ~/.bashrc

echo -e "\n✅ SSH 설정 완료!"
echo "========================================="
echo "접속 명령: ssh 021.dev"
echo "강제 TTY: ssh -tt 021.dev"
echo "별칭 사용: sshdev (다음 세션부터)"