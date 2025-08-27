#!/bin/bash

# DOT Attendance Firebase Setup Script
# This script sets up the complete Firebase backend infrastructure

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FUNCTIONS_DIR="$PROJECT_DIR/functions"
SCRIPTS_DIR="$PROJECT_DIR/scripts"

echo -e "${BLUE}🚀 DOT Attendance Firebase Setup${NC}"
echo "Project Directory: $PROJECT_DIR"
echo

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed${NC}"
    echo "Please install Firebase CLI first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Please log in to Firebase${NC}"
    firebase login
fi

# Function to prompt for confirmation
confirm() {
    read -p "$1 (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Function to check if project exists
check_project() {
    local project_id="$1"
    if firebase projects:list | grep -q "$project_id"; then
        return 0
    else
        return 1
    fi
}

# Step 1: Firebase Project Setup
echo -e "${BLUE}📋 Step 1: Firebase Project Configuration${NC}"
echo

if [ -f "$PROJECT_DIR/.firebaserc" ]; then
    echo "Firebase project configuration found:"
    cat "$PROJECT_DIR/.firebaserc"
    echo
    if confirm "Use existing project configuration?"; then
        PROJECT_ID=$(cat "$PROJECT_DIR/.firebaserc" | grep -o '"default": "[^"]*' | cut -d'"' -f4)
    else
        read -p "Enter Firebase Project ID: " PROJECT_ID
        echo "{\"projects\": {\"default\": \"$PROJECT_ID\"}}" > "$PROJECT_DIR/.firebaserc"
    fi
else
    echo "No Firebase project configured."
    read -p "Enter Firebase Project ID: " PROJECT_ID
    echo "{\"projects\": {\"default\": \"$PROJECT_ID\"}}" > "$PROJECT_DIR/.firebaserc"
fi

echo -e "${GREEN}✅ Project ID: $PROJECT_ID${NC}"

# Verify project exists
if ! check_project "$PROJECT_ID"; then
    echo -e "${RED}❌ Project '$PROJECT_ID' not found${NC}"
    echo "Please create the project first at: https://console.firebase.google.com/"
    exit 1
fi

# Step 2: Firebase Configuration
echo
echo -e "${BLUE}📋 Step 2: Firebase Services Configuration${NC}"
echo

# Initialize Firebase configuration if not exists
if [ ! -f "$PROJECT_DIR/firebase.json" ]; then
    echo "Creating firebase.json configuration..."
    cat > "$PROJECT_DIR/firebase.json" << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ]
    }
  ],
  "hosting": {
    "public": "hosting",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  }
}
EOF
    echo -e "${GREEN}✅ Created firebase.json${NC}"
fi

# Step 3: Firestore Indexes
echo
echo -e "${BLUE}📋 Step 3: Firestore Indexes${NC}"
echo

if [ ! -f "$PROJECT_DIR/firestore.indexes.json" ]; then
    echo "Creating Firestore indexes configuration..."
    cat > "$PROJECT_DIR/firestore.indexes.json" << EOF
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "storeId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "role", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "franchiseId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "role", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "storeId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "attendance_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "date", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "attendance_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "storeId", "order": "ASCENDING"},
        {"fieldPath": "date", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "recipientIds", "arrayConfig": "CONTAINS"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    }
  ],
  "fieldOverrides": []
}
EOF
    echo -e "${GREEN}✅ Created firestore.indexes.json${NC}"
fi

# Step 4: Storage Rules
echo
echo -e "${BLUE}📋 Step 4: Storage Rules${NC}"
echo

if [ ! -f "$PROJECT_DIR/storage.rules" ]; then
    echo "Creating Storage security rules..."
    cat > "$PROJECT_DIR/storage.rules" << 'EOF'
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile images - users can upload their own
    match /profile_images/{userId}/{filename} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && resource == null // Only allow new files, not overwrite
                   && request.resource.size <= 5 * 1024 * 1024 // 5MB limit
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Attendance photos - users can upload their own
    match /attendance_photos/{userId}/{filename} {
      allow read: if request.auth != null
                  && (request.auth.uid == userId || hasRole(['ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN']));
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size <= 10 * 1024 * 1024 // 10MB limit
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Processed photos (generated by Cloud Functions)
    match /attendance_photos/processed_{filename} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions can write here
    }
    
    // Store logos and images - admins can manage
    match /store_images/{storeId}/{filename} {
      allow read: if true;
      allow write: if request.auth != null
                   && hasStoreAccess(storeId)
                   && request.resource.size <= 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Reports and exports - role-based access
    match /reports/{userId}/{filename} {
      allow read: if request.auth != null 
                  && (request.auth.uid == userId || hasRole(['ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN']));
      allow write: if false; // Only Cloud Functions can generate reports
    }
    
    // Temp files - short-term storage
    match /temp/{userId}/{filename} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId
                         && request.resource.size <= 50 * 1024 * 1024; // 50MB limit
    }
    
    // Helper functions
    function hasRole(roles) {
      return request.auth != null 
             && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in roles;
    }
    
    function hasStoreAccess(storeId) {
      let user = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
      return user.role == 'SUPER_ADMIN'
             || user.storeId == storeId
             || (user.managedStoreIds != null && storeId in user.managedStoreIds);
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
EOF
    echo -e "${GREEN}✅ Created storage.rules${NC}"
fi

# Step 5: Functions Setup
echo
echo -e "${BLUE}📋 Step 5: Cloud Functions Setup${NC}"
echo

# Navigate to functions directory
cd "$FUNCTIONS_DIR"

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "Installing Functions dependencies..."
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Build TypeScript
echo "Building TypeScript..."
npm run build
echo -e "${GREEN}✅ TypeScript compiled${NC}"

# Return to project root
cd "$PROJECT_DIR"

# Step 6: Environment Configuration
echo
echo -e "${BLUE}📋 Step 6: Environment Configuration${NC}"
echo

# Create environment file template
if [ ! -f "$PROJECT_DIR/.env.example" ]; then
    cat > "$PROJECT_DIR/.env.example" << 'EOF'
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_ANDROID_API_KEY=your-android-api-key
FIREBASE_IOS_API_KEY=your-ios-api-key
FIREBASE_WEB_API_KEY=your-web-api-key
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_IOS_BUNDLE_ID=com.dotattendance.app

# App Configuration
APP_NAME=DOT Attendance
APP_VERSION=1.0.0
BASE_URL=https://api.dotattendance.com/v1

# Development
DEBUG_MODE=true
LOG_LEVEL=debug
EOF
    echo -e "${GREEN}✅ Created .env.example${NC}"
fi

if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  Please create .env file based on .env.example${NC}"
    echo "Copy .env.example to .env and fill in your configuration values"
fi

# Step 7: Deploy Options
echo
echo -e "${BLUE}📋 Step 7: Deployment${NC}"
echo

echo "Choose deployment option:"
echo "1. Deploy everything (Rules + Functions + Indexes)"
echo "2. Deploy only Firestore rules"
echo "3. Deploy only Functions"
echo "4. Deploy only Indexes"
echo "5. Run local emulators"
echo "6. Skip deployment"

read -p "Enter your choice (1-6): " DEPLOY_CHOICE

case $DEPLOY_CHOICE in
    1)
        echo -e "${BLUE}🚀 Deploying everything...${NC}"
        firebase deploy --project "$PROJECT_ID"
        ;;
    2)
        echo -e "${BLUE}🚀 Deploying Firestore rules...${NC}"
        firebase deploy --only firestore:rules --project "$PROJECT_ID"
        ;;
    3)
        echo -e "${BLUE}🚀 Deploying Functions...${NC}"
        firebase deploy --only functions --project "$PROJECT_ID"
        ;;
    4)
        echo -e "${BLUE}🚀 Deploying Indexes...${NC}"
        firebase deploy --only firestore:indexes --project "$PROJECT_ID"
        ;;
    5)
        echo -e "${BLUE}🚀 Starting emulators...${NC}"
        firebase emulators:start --project "$PROJECT_ID"
        ;;
    6)
        echo -e "${YELLOW}⏭️  Skipping deployment${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Step 8: Migration and Seeding
if [ "$DEPLOY_CHOICE" != "6" ]; then
    echo
    echo -e "${BLUE}📋 Step 8: Database Migration and Seeding${NC}"
    echo
    
    if confirm "Run database migration and seed sample data?"; then
        cd "$SCRIPTS_DIR"
        
        # Install TypeScript and dependencies if needed
        if ! command -v ts-node &> /dev/null; then
            echo "Installing ts-node..."
            npm install -g ts-node typescript
        fi
        
        # Set Firebase project for service account
        export GOOGLE_APPLICATION_CREDENTIALS="$PROJECT_DIR/service-account-key.json"
        
        if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
            echo -e "${YELLOW}⚠️  Service account key not found${NC}"
            echo "Please download your service account key from Firebase Console and save it as:"
            echo "$GOOGLE_APPLICATION_CREDENTIALS"
            echo "Then run: npm run migrate"
        else
            echo "Running migration..."
            npx ts-node migrate_and_seed.ts migrate
        fi
        
        cd "$PROJECT_DIR"
    fi
fi

# Step 9: Flutter Configuration
echo
echo -e "${BLUE}📋 Step 9: Flutter Configuration${NC}"
echo

echo -e "${YELLOW}⚠️  Flutter Configuration Required:${NC}"
echo "1. Add your Firebase configuration files:"
echo "   - android/app/google-services.json"
echo "   - ios/Runner/GoogleService-Info.plist"
echo "   - lib/firebase_options.dart"
echo
echo "2. Update pubspec.yaml dependencies"
echo "3. Update environment variables in .env"
echo
echo "Run these commands to generate Firebase configuration:"
echo "  flutter pub global activate flutterfire_cli"
echo "  flutterfire configure --project=$PROJECT_ID"

# Step 10: Testing
echo
echo -e "${BLUE}📋 Step 10: Testing Setup${NC}"
echo

if confirm "Set up testing environment?"; then
    echo "Setting up test configuration..."
    
    # Create test script
    cat > "$PROJECT_DIR/scripts/test_setup.sh" << 'EOF'
#!/bin/bash

echo "🧪 Running Firebase Tests..."

# Start emulators
firebase emulators:start --only auth,firestore,functions,storage &
EMULATOR_PID=$!

# Wait for emulators to start
sleep 10

# Run function tests
cd functions
npm test

# Run Firestore rules tests
cd ../
firebase emulators:exec --only firestore 'npm run test:rules'

# Stop emulators
kill $EMULATOR_PID

echo "✅ Tests completed"
EOF
    
    chmod +x "$PROJECT_DIR/scripts/test_setup.sh"
    echo -e "${GREEN}✅ Test setup created${NC}"
fi

# Final Summary
echo
echo -e "${GREEN}🎉 Firebase Setup Complete!${NC}"
echo
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Configure Flutter app with Firebase"
echo "2. Update environment variables"
echo "3. Test the application"
echo "4. Configure CI/CD pipeline"
echo
echo -e "${BLUE}📚 Useful Commands:${NC}"
echo "  firebase emulators:start    # Start local emulators"
echo "  firebase deploy             # Deploy to production"
echo "  firebase logs --only functions  # View function logs"
echo "  npm run migrate             # Run database migration"
echo
echo -e "${BLUE}📁 Project Structure:${NC}"
echo "  ├── firestore.rules         # Database security rules"
echo "  ├── firestore.indexes.json  # Database indexes"
echo "  ├── storage.rules           # Storage security rules"
echo "  ├── functions/              # Cloud Functions"
echo "  ├── scripts/                # Migration and utility scripts"
echo "  └── lib/                    # Flutter application"
echo

echo -e "${GREEN}🔥 Firebase backend is ready for DOT Attendance! 🔥${NC}"