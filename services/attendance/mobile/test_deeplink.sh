#!/bin/bash

# Test deep links for DOT Attendance app

echo "Testing DOT Attendance Deep Links..."
echo "====================================="

# Test 1: Custom scheme
echo "Test 1: Custom scheme (dotattendance://)"
adb shell am start -W -a android.intent.action.VIEW -d "dotattendance://login?token=TEST123456" com.dot.attendance

sleep 2

# Test 2: Simple custom scheme without action
echo "Test 2: Simple custom scheme"
adb shell am start -W -a android.intent.action.VIEW -d "dotattendance://login?token=SIMPLE789" com.dot.attendance

# Note: For web URLs to work, you need to set up App Links verification
# which requires a real domain with assetlinks.json file

echo "====================================="
echo "Deep link tests completed!"
echo ""
echo "For QR code testing:"
echo "1. Generate a QR code with: dotattendance://login?token=YOUR_TOKEN"
echo "2. Scan with your phone's camera"
echo "3. The app should open automatically and log you in"