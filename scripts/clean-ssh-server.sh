#!/bin/bash

# SSH 서버 디스크 공간 정리 스크립트

echo "🧹 SSH 서버 디스크 공간 정리 시작..."
echo "현재 디스크 사용률: 92% (28GB/30GB)"
echo "========================================="

# SSH 설정 수정 (CompressionLevel 제거)
echo "1. SSH 설정 수정..."
sed -i.bak '/CompressionLevel/d' ~/.ssh/config

# 서버 정리 명령 실행
echo -e "\n2. 서버 디스크 정리 시작..."

ssh 021.dev << 'ENDSSH'
echo "📊 정리 전 디스크 상태:"
df -h /

echo -e "\n🗑️ 1. 시스템 로그 정리 (600MB)..."
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=100M

echo -e "\n🗑️ 2. APT 캐시 정리..."
sudo apt-get clean 2>/dev/null || sudo yum clean all 2>/dev/null
sudo apt-get autoremove -y 2>/dev/null || true

echo -e "\n🗑️ 3. 임시 파일 정리..."
sudo rm -rf /tmp/* 2>/dev/null
sudo rm -rf /var/tmp/* 2>/dev/null

echo -e "\n🗑️ 4. 오래된 로그 파일 정리..."
sudo find /var/log -type f -name "*.log" -mtime +30 -delete 2>/dev/null
sudo find /var/log -type f -name "*.gz" -delete 2>/dev/null

echo -e "\n🗑️ 5. Docker 정리 (있는 경우)..."
if command -v docker &> /dev/null; then
    docker system prune -af --volumes 2>/dev/null || true
fi

echo -e "\n🗑️ 6. 사용자 디렉토리 정리..."
# Node modules 정리
find ~/DOT -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
find ~/DOT -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
find ~/DOT -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
find ~/DOT -type d -name "build" -exec rm -rf {} + 2>/dev/null || true

# Git 정리
cd ~/DOT 2>/dev/null && git gc --aggressive --prune=now 2>/dev/null || true

echo -e "\n📊 정리 후 디스크 상태:"
df -h /
echo ""
echo "🔍 큰 디렉토리 확인:"
du -sh ~/* 2>/dev/null | sort -rh | head -5
ENDSSH

echo -e "\n✅ 디스크 정리 완료!"
echo "========================================="

# 최종 상태 확인
echo -e "\n📊 최종 디스크 사용량:"
ssh 021.dev "df -h / | tail -1"