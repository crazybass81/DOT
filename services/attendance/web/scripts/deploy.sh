#!/bin/bash

# DOT Attendance AWS Deployment Script

set -e

echo "🚀 Starting DOT Attendance AWS Deployment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_DEFAULT_REGION:-ap-northeast-2}

echo "📍 Deploying to Account: $ACCOUNT_ID, Region: $REGION"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build Lambda layer
echo "🔧 Building Lambda layer..."
cd lambda/layers/nodejs
npm install --production
cd ../../..

# Bootstrap CDK (if needed)
echo "🏗️ Bootstrapping CDK..."
npx cdk bootstrap aws://$ACCOUNT_ID/$REGION || true

# Synthesize CDK stack
echo "📋 Synthesizing CDK stack..."
npx cdk synth

# Deploy CDK stack
echo "🚀 Deploying infrastructure..."
npx cdk deploy --require-approval never --outputs-file cdk-outputs.json

# Extract outputs
echo "📤 Extracting deployment outputs..."
USER_POOL_ID=$(cat cdk-outputs.json | jq -r '.DotAttendanceStack.UserPoolId')
USER_POOL_CLIENT_ID=$(cat cdk-outputs.json | jq -r '.DotAttendanceStack.UserPoolClientId')
API_ENDPOINT=$(cat cdk-outputs.json | jq -r '.DotAttendanceStack.ApiEndpoint')

# Create .env.local file
echo "📝 Creating .env.local file..."
cat > .env.local << EOF
NEXT_PUBLIC_AWS_REGION=$REGION
NEXT_PUBLIC_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
NEXT_PUBLIC_API_ENDPOINT=$API_ENDPOINT
EOF

echo "✅ Deployment complete!"
echo ""
echo "📊 Deployment Summary:"
echo "  - User Pool ID: $USER_POOL_ID"
echo "  - Client ID: $USER_POOL_CLIENT_ID"
echo "  - API Endpoint: $API_ENDPOINT"
echo ""
echo "🎯 Next Steps:"
echo "  1. Create test users in Cognito User Pool"
echo "  2. Add test business data to DynamoDB"
echo "  3. Build and deploy frontend to Amplify"
echo ""
echo "Run 'npm run dev' to test locally with AWS backend"