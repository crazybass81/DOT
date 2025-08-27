#!/bin/bash

# AWS Parameter Store에 환경변수 업로드
# Usage: ./scripts/upload-to-parameter-store.sh

echo "📦 Uploading parameters to AWS Parameter Store..."

# Service prefix
PREFIX="/dot/marketing"

# Google OAuth parameters
aws ssm put-parameter \
  --name "$PREFIX/google/client-id" \
  --value "26385144084-4nlakvktuh8dv9kg5ga6f33h0aitppcl.apps.googleusercontent.com" \
  --type "String" \
  --overwrite \
  --description "Google OAuth Client ID for DOT Marketing" \
  2>/dev/null && echo "✅ Google Client ID uploaded" || echo "⚠️  Google Client ID already exists"

aws ssm put-parameter \
  --name "$PREFIX/google/client-secret" \
  --value "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" \
  --type "SecureString" \
  --overwrite \
  --description "Google OAuth Client Secret for DOT Marketing" \
  2>/dev/null && echo "✅ Google Client Secret uploaded (encrypted)" || echo "⚠️  Google Client Secret already exists"

aws ssm put-parameter \
  --name "$PREFIX/nextauth/url" \
  --value "http://localhost:3000" \
  --type "String" \
  --overwrite \
  --description "NextAuth URL for DOT Marketing" \
  2>/dev/null && echo "✅ NextAuth URL uploaded" || echo "⚠️  NextAuth URL already exists"

aws ssm put-parameter \
  --name "$PREFIX/nextauth/secret" \
  --value "JMHWJzSQ4CjUBDHz96DOwkFARdBut0HDSSFAavxfrjI=" \
  --type "SecureString" \
  --overwrite \
  --description "NextAuth Secret for session encryption" \
  2>/dev/null && echo "✅ NextAuth Secret uploaded (encrypted)" || echo "⚠️  NextAuth Secret already exists"

aws ssm put-parameter \
  --name "$PREFIX/google/maps-api-key" \
  --value "AIzaSyD7w_1hz4_dj3Xg6GZGDlAHcRFPHK1m6xM" \
  --type "SecureString" \
  --overwrite \
  --description "Google Maps API Key for DOT Marketing" \
  2>/dev/null && echo "✅ Google Maps API Key uploaded (encrypted)" || echo "⚠️  Google Maps API Key already exists"

# DynamoDB table names
aws ssm put-parameter \
  --name "$PREFIX/dynamodb/stores-table" \
  --value "dot-marketing-stores" \
  --type "String" \
  --overwrite \
  --description "DynamoDB table name for stores" \
  2>/dev/null && echo "✅ Stores table name uploaded" || echo "⚠️  Stores table name already exists"

aws ssm put-parameter \
  --name "$PREFIX/dynamodb/creators-table" \
  --value "dot-marketing-creators" \
  --type "String" \
  --overwrite \
  --description "DynamoDB table name for creators" \
  2>/dev/null && echo "✅ Creators table name uploaded" || echo "⚠️  Creators table name already exists"

aws ssm put-parameter \
  --name "$PREFIX/dynamodb/matches-table" \
  --value "dot-marketing-matches" \
  --type "String" \
  --overwrite \
  --description "DynamoDB table name for matches" \
  2>/dev/null && echo "✅ Matches table name uploaded" || echo "⚠️  Matches table name already exists"

echo ""
echo "✨ Parameter Store upload complete!"
echo ""
echo "📋 View parameters with:"
echo "aws ssm get-parameters-by-path --path $PREFIX --recursive"
echo ""
echo "🔒 Secure parameters are encrypted with AWS KMS"