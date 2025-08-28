#!/bin/bash

# Flutter Remote Testing Script for SSH Development
# Author: DOT Team
# Description: Enables mobile testing from SSH environment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WEB_PORT=8080
PROJECT_PATH="/home/ec2-user/DOT/services/attendance/mobile"

echo -e "${BLUE}🚀 Flutter Remote Testing Setup${NC}"
echo "================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    if [ ! -z "$FLUTTER_PID" ]; then
        kill $FLUTTER_PID 2>/dev/null || true
    fi
    if [ ! -z "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

trap cleanup EXIT

# Check Flutter installation
if ! command_exists flutter; then
    echo -e "${RED}❌ Flutter is not installed${NC}"
    echo "Please install Flutter first: https://flutter.dev/docs/get-started/install"
    exit 1
fi

# Check ngrok installation
if ! command_exists ngrok; then
    echo -e "${YELLOW}⚠️  ngrok is not installed. Installing...${NC}"
    
    # Install ngrok
    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
    sudo apt update && sudo apt install -y ngrok
    
    echo -e "${GREEN}✅ ngrok installed${NC}"
fi

# Navigate to project directory
cd "$PROJECT_PATH"

# Check if pubspec.yaml exists
if [ ! -f "pubspec.yaml" ]; then
    echo -e "${RED}❌ Not a Flutter project directory${NC}"
    exit 1
fi

# Get dependencies
echo -e "${BLUE}📦 Getting Flutter dependencies...${NC}"
flutter pub get

# Start Flutter Web Server
echo -e "${BLUE}🌐 Starting Flutter Web Server on port $WEB_PORT...${NC}"
flutter run -d web-server \
    --web-port=$WEB_PORT \
    --web-hostname=0.0.0.0 \
    --dart-define=IS_REMOTE_TEST=true \
    --release &
FLUTTER_PID=$!

# Wait for Flutter to start
echo -e "${YELLOW}⏳ Waiting for Flutter server to start...${NC}"
sleep 10

# Check if Flutter is running
if ! ps -p $FLUTTER_PID > /dev/null; then
    echo -e "${RED}❌ Flutter failed to start${NC}"
    exit 1
fi

# Start ngrok
echo -e "${BLUE}🌍 Starting ngrok tunnel...${NC}"
ngrok http $WEB_PORT --log=stdout --log-level=info &
NGROK_PID=$!

# Wait for ngrok to establish connection
sleep 5

# Get ngrok URL
echo -e "${YELLOW}⏳ Fetching ngrok URL...${NC}"
NGROK_URL=$(curl -s localhost:4040/api/tunnels | grep -o "https://[0-9a-z]*\.ngrok\.io" | head -1)

if [ -z "$NGROK_URL" ]; then
    echo -e "${YELLOW}Trying alternative method...${NC}"
    # Alternative method using ngrok API
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null || echo "")
fi

# Display connection info
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Remote Testing Environment Ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📱 Access your app from Android device:${NC}"
echo -e "${YELLOW}   $NGROK_URL${NC}"
echo ""
echo -e "${BLUE}💻 Local access:${NC}"
echo -e "${YELLOW}   http://localhost:$WEB_PORT${NC}"
echo ""
echo -e "${GREEN}Hot Reload: Press 'r' in this terminal${NC}"
echo -e "${GREEN}Hot Restart: Press 'R' in this terminal${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"

# Generate QR code if qrencode is available
if command_exists qrencode; then
    echo ""
    echo -e "${BLUE}📷 Scan QR code with your Android device:${NC}"
    qrencode -t ANSIUTF8 "$NGROK_URL"
else
    echo -e "${YELLOW}💡 Tip: Install qrencode to generate QR codes: sudo apt-get install qrencode${NC}"
fi

# Keep script running
wait $FLUTTER_PID