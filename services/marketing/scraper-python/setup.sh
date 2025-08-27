#!/bin/bash

# Python 가상환경 설정 및 Lambda 배포 패키지 생성 스크립트

echo "==================================="
echo "SmartPlace Scraper Setup"
echo "==================================="

# 1. 가상환경 생성
echo "1. Creating virtual environment..."
python3 -m venv venv

# 2. 가상환경 활성화
source venv/bin/activate

# 3. 의존성 설치
echo "2. Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Playwright 브라우저 설치
echo "3. Installing Playwright browsers..."
playwright install chromium

# 5. 테스트 실행
if [ "$1" == "test" ]; then
    echo "4. Running test..."
    python smartplace_scraper.py "https://naver.me/5k7f2jv9"
fi

echo "==================================="
echo "Setup completed!"
echo "==================================="
echo ""
echo "To activate the virtual environment:"
echo "  source venv/bin/activate"
echo ""
echo "To run the scraper:"
echo "  python smartplace_scraper.py <URL>"