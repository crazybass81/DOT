#!/bin/bash

# DOT Marketing MVP Startup Script
# 이 스크립트는 마케팅 서비스 MVP를 실행합니다

set -e

echo "🚀 DOT Marketing MVP 시작 중..."
echo "====================================="

# 1. 환경 확인
echo "📋 환경 점검..."
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local 파일이 없습니다."
    echo "📁 .env.example을 참고하여 .env.local을 생성해주세요."
    exit 1
fi

# 2. 의존성 설치 확인
echo "📦 의존성 점검..."
if [ ! -d "node_modules" ]; then
    echo "📥 의존성 설치 중..."
    npm install
else
    echo "✅ 의존성이 설치되어 있습니다."
fi

# 3. TypeScript 타입 체크
echo "🔍 TypeScript 타입 체크..."
if npm run build > /dev/null 2>&1; then
    echo "✅ 타입 체크 통과"
else
    echo "⚠️  타입 오류가 있지만 개발 모드로 계속 진행합니다."
fi

# 4. 포트 확인
PORT=3003
if lsof -i:$PORT > /dev/null 2>&1; then
    echo "⚠️  포트 $PORT가 사용 중입니다."
    echo "🔄 기존 프로세스를 종료하시겠습니까? (y/n)"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        pkill -f "next dev" || true
        sleep 2
    fi
fi

# 5. 개발 서버 실행
echo "🎯 개발 서버 실행 중... (포트: $PORT)"
echo "📱 브라우저에서 http://localhost:$PORT 접속"
echo "====================================="
echo "">
echo "💡 사용 가능한 API 엔드포인트:"
echo "   GET  /api/analyze - API 상태 확인"
echo "   POST /api/analyze - SmartPlace 분석"
echo "   GET  /api/results/[id] - 분석 결과 조회"
echo "   GET  /api/youtube/search - YouTube 크리에이터 검색"
echo "   GET  /api/smartplace/analyze - SmartPlace 상태 확인"
echo ""
echo "🛑 종료하려면 Ctrl+C를 누르세요"
echo "====================================="

# 개발 서버 시작
npm run dev