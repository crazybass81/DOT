#!/bin/bash

# Local Development Setup Script

set -e

echo "🔧 Setting up local development environment..."

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from example..."
    cp .env.local.example .env.local
    echo "⚠️  Please update .env.local with your AWS credentials"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Lambda dependencies
echo "📦 Installing Lambda layer dependencies..."
cd lambda/layers/nodejs
npm install
cd ../../..

echo "✅ Local setup complete!"
echo ""
echo "📋 To deploy to AWS:"
echo "  1. Configure AWS CLI: aws configure"
echo "  2. Update .env.local with your AWS details"
echo "  3. Run: npm run deploy"
echo ""
echo "🚀 To start local development:"
echo "  npm run dev"