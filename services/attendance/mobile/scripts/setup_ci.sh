#!/bin/bash

# DOT Attendance - CI/CD Setup Script
# This script sets up the necessary files and configurations for CI/CD

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Setting up CI/CD for DOT Attendance..."

# Create Android directory if it doesn't exist
if [[ ! -d "$PROJECT_ROOT/android" ]]; then
    echo "📱 Initializing Android project..."
    cd "$PROJECT_ROOT"
    flutter create --platforms android .
fi

# Create iOS directory if it doesn't exist
if [[ ! -d "$PROJECT_ROOT/ios" ]]; then
    echo "🍎 Initializing iOS project..."
    cd "$PROJECT_ROOT"
    flutter create --platforms ios .
fi

# Create necessary directories
mkdir -p "$PROJECT_ROOT/test/unit"
mkdir -p "$PROJECT_ROOT/test/widget"
mkdir -p "$PROJECT_ROOT/test/integration"
mkdir -p "$PROJECT_ROOT/test/performance"
mkdir -p "$PROJECT_ROOT/test/accessibility"
mkdir -p "$PROJECT_ROOT/integration_test"
mkdir -p "$PROJECT_ROOT/distribution/whatsnew"

# Create test files if they don't exist
if [[ ! -f "$PROJECT_ROOT/test/unit/example_test.dart" ]]; then
    cat > "$PROJECT_ROOT/test/unit/example_test.dart" << 'EOF'
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Example Unit Tests', () {
    test('should pass basic test', () {
      expect(1 + 1, equals(2));
    });
    
    test('should validate string operations', () {
      const testString = 'DOT Attendance';
      expect(testString.toLowerCase(), equals('dot attendance'));
      expect(testString.length, equals(14));
    });
  });
}
EOF
fi

if [[ ! -f "$PROJECT_ROOT/test/widget/widget_test.dart" ]]; then
    cat > "$PROJECT_ROOT/test/widget/widget_test.dart" << 'EOF'
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dot_attendance/main.dart';

void main() {
  group('Widget Tests', () {
    testWidgets('App should render without crashing', (WidgetTester tester) async {
      await tester.pumpWidget(const MyApp());
      await tester.pumpAndSettle();
      
      // Verify the app renders
      expect(find.byType(MaterialApp), findsOneWidget);
    });
  });
}
EOF
fi

if [[ ! -f "$PROJECT_ROOT/test/performance/benchmark_test.dart" ]]; then
    cat > "$PROJECT_ROOT/test/performance/benchmark_test.dart" << 'EOF'
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

void main() {
  group('Performance Tests', () {
    test('List scrolling performance', () async {
      // Simulate performance test
      final stopwatch = Stopwatch()..start();
      
      // Simulate some work
      final list = List.generate(1000, (index) => 'Item $index');
      list.where((item) => item.contains('5')).toList();
      
      stopwatch.stop();
      
      // Assert performance is within acceptable range
      expect(stopwatch.elapsedMilliseconds, lessThan(100));
    });
  });
}
EOF
fi

if [[ ! -f "$PROJECT_ROOT/test/accessibility/accessibility_test.dart" ]]; then
    cat > "$PROJECT_ROOT/test/accessibility/accessibility_test.dart" << 'EOF'
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dot_attendance/main.dart';

void main() {
  group('Accessibility Tests', () {
    testWidgets('App should meet accessibility guidelines', (WidgetTester tester) async {
      await tester.pumpWidget(const MyApp());
      await tester.pumpAndSettle();
      
      // Check for semantic labels
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpAndSettle();
      
      // Verify accessibility
      expect(tester, meetsGuideline(androidTapTargetGuideline));
      expect(tester, meetsGuideline(iOSTapTargetGuideline));
      expect(tester, meetsGuideline(labeledTapTargetGuideline));
      expect(tester, meetsGuideline(textContrastGuideline));
      
      handle.dispose();
    });
  });
}
EOF
fi

# Create integration test
if [[ ! -f "$PROJECT_ROOT/integration_test/app_test.dart" ]]; then
    cat > "$PROJECT_ROOT/integration_test/app_test.dart" << 'EOF'
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:dot_attendance/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('App Integration Tests', () {
    testWidgets('Full app flow test', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();
      
      // Test basic app functionality
      expect(find.byType(MaterialApp), findsOneWidget);
      
      // Add more integration tests here
    });
  });
}
EOF
fi

# Create what's new files for app store releases
echo "🆕 What's new in this version" > "$PROJECT_ROOT/distribution/whatsnew/whatsnew-en-US"

# Create Firebase configuration files if they don't exist
if [[ ! -f "$PROJECT_ROOT/android/app/google-services.json" ]]; then
    cat > "$PROJECT_ROOT/android/app/google-services.json" << 'EOF'
{
  "project_info": {
    "project_number": "YOUR_PROJECT_NUMBER",
    "project_id": "YOUR_PROJECT_ID",
    "storage_bucket": "YOUR_PROJECT_ID.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:YOUR_PROJECT_NUMBER:android:YOUR_APP_ID",
        "android_client_info": {
          "package_name": "com.dot.attendance"
        }
      }
    }
  ]
}
EOF
    echo "⚠️  Please update android/app/google-services.json with your Firebase configuration"
fi

if [[ ! -f "$PROJECT_ROOT/ios/Runner/GoogleService-Info.plist" ]]; then
    cat > "$PROJECT_ROOT/ios/Runner/GoogleService-Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CLIENT_ID</key>
  <string>YOUR_CLIENT_ID</string>
  <key>REVERSED_CLIENT_ID</key>
  <string>YOUR_REVERSED_CLIENT_ID</string>
  <key>API_KEY</key>
  <string>YOUR_API_KEY</string>
  <key>GCM_SENDER_ID</key>
  <string>YOUR_GCM_SENDER_ID</string>
  <key>PLIST_VERSION</key>
  <string>1</string>
  <key>BUNDLE_ID</key>
  <string>com.dot.attendance</string>
  <key>PROJECT_ID</key>
  <string>YOUR_PROJECT_ID</string>
  <key>STORAGE_BUCKET</key>
  <string>YOUR_PROJECT_ID.appspot.com</string>
</dict>
</plist>
EOF
    echo "⚠️  Please update ios/Runner/GoogleService-Info.plist with your Firebase configuration"
fi

# Create environment configuration files
mkdir -p "$PROJECT_ROOT/lib/core/config"
if [[ ! -f "$PROJECT_ROOT/lib/core/config/env_config.dart" ]]; then
    cat > "$PROJECT_ROOT/lib/core/config/env_config.dart" << 'EOF'
// Environment configuration - this file is generated by CI/CD
const String baseUrl = String.fromEnvironment('BASE_URL', defaultValue: 'https://api.dotattendance.com');
const String environment = String.fromEnvironment('ENVIRONMENT', defaultValue: 'development');

class EnvConfig {
  static const String baseUrl = baseUrl;
  static const String environment = environment;
  
  static bool get isDevelopment => environment == 'development';
  static bool get isStaging => environment == 'staging';
  static bool get isProduction => environment == 'production';
}
EOF
fi

# Create signing configuration for Android
mkdir -p "$PROJECT_ROOT/android/app"
if [[ ! -f "$PROJECT_ROOT/android/app/build.gradle" ]]; then
    echo "⚠️  Android build.gradle not found. Please ensure you have initialized the Android project."
fi

# Add signing configuration to build.gradle if it doesn't exist
if [[ -f "$PROJECT_ROOT/android/app/build.gradle" ]] && ! grep -q "signingConfigs" "$PROJECT_ROOT/android/app/build.gradle"; then
    cat >> "$PROJECT_ROOT/android/app/build.gradle" << 'EOF'

// Signing configuration for release builds
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
EOF
fi

echo "✅ CI/CD setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update Firebase configuration files with your actual project settings"
echo "2. Set up GitHub repository secrets for deployment"
echo "3. Configure code signing certificates"
echo "4. Review and customize the CI/CD workflows"
echo "5. Run 'flutter test' to verify tests are working"
echo ""
echo "🔐 Required GitHub Secrets:"
echo "- FIREBASE_CONFIG_PROD (Base64 encoded google-services.json)"
echo "- FIREBASE_CONFIG_STAGING"
echo "- FIREBASE_CONFIG_IOS_PROD (Base64 encoded GoogleService-Info.plist)"
echo "- FIREBASE_CONFIG_IOS_STAGING"
echo "- ANDROID_KEYSTORE (Base64 encoded keystore file)"
echo "- ANDROID_STORE_PASSWORD"
echo "- ANDROID_KEY_PASSWORD"
echo "- ANDROID_KEY_ALIAS"
echo "- BUILD_CERTIFICATE_BASE64 (iOS)"
echo "- P12_PASSWORD (iOS)"
echo "- PROVISIONING_PROFILE_BASE64 (iOS)"
echo "- GOOGLE_PLAY_SERVICE_ACCOUNT"
echo "- APPSTORE_CONNECT_PRIVATE_KEY"
echo "- APPSTORE_CONNECT_KEY_ID"
echo "- APPSTORE_CONNECT_ISSUER_ID"
echo ""
echo "Run this script from your Flutter project root: ./scripts/setup_ci.sh"