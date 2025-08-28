#!/bin/bash

# ====================================
# AWS Parameter Store to .env Loader
# ====================================
# This script loads environment variables from AWS Parameter Store
# and writes them to a .env file for local development

set -e

# Configuration
PARAMETER_PATH="${PARAMETER_STORE_PATH:-/dot-attendance/prod/}"
ENV_FILE="${ENV_FILE:-.env}"
REGION="${AWS_REGION:-ap-northeast-2}"

echo "🔄 Loading parameters from AWS Parameter Store..."
echo "   Path: $PARAMETER_PATH"
echo "   Region: $REGION"

# Check AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Backup existing .env file
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.backup"
    echo "📋 Backed up existing .env to .env.backup"
fi

# Create new .env file with header
cat > "$ENV_FILE" << 'EOF'
# ================================
# Auto-generated from AWS Parameter Store
# ================================
# Generated at: $(date)
# Parameter Path: $PARAMETER_PATH

EOF

# Function to get parameter value
get_parameter() {
    local param_name=$1
    local env_var_name=$2
    
    value=$(aws ssm get-parameter \
        --name "$param_name" \
        --with-decryption \
        --region "$REGION" \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$value" ]; then
        echo "$env_var_name=$value" >> "$ENV_FILE"
        echo "✅ Loaded: $env_var_name"
    else
        echo "⚠️  Not found: $param_name"
    fi
}

# Function to get all parameters by path
get_parameters_by_path() {
    local path=$1
    
    echo "📥 Fetching all parameters from path: $path"
    
    aws ssm get-parameters-by-path \
        --path "$path" \
        --recursive \
        --with-decryption \
        --region "$REGION" \
        --query 'Parameters[*].[Name,Value]' \
        --output text | while IFS=$'\t' read -r name value; do
        
        # Convert parameter name to env var name
        # /dot-attendance/prod/api/endpoint -> API_ENDPOINT
        env_name=$(echo "$name" | sed "s|$path||" | tr '/' '_' | tr '[:lower:]' '[:upper:]')
        
        echo "$env_name=$value" >> "$ENV_FILE"
        echo "✅ Loaded: $env_name"
    done
}

# Load all parameters from the path
get_parameters_by_path "$PARAMETER_PATH"

# Load specific parameters (if they exist in different paths)
echo ""
echo "📥 Loading specific parameters..."

# Cognito
get_parameter "/aws/cognito/user-pool-id" "NEXT_PUBLIC_USER_POOL_ID"
get_parameter "/aws/cognito/client-id" "NEXT_PUBLIC_USER_POOL_CLIENT_ID"

# API Gateway
get_parameter "/aws/apigateway/endpoint" "NEXT_PUBLIC_API_ENDPOINT"

# DynamoDB Tables
get_parameter "/aws/dynamodb/businesses-table" "DYNAMODB_BUSINESSES_TABLE"
get_parameter "/aws/dynamodb/employees-table" "DYNAMODB_EMPLOYEES_TABLE"
get_parameter "/aws/dynamodb/attendance-table" "DYNAMODB_ATTENDANCE_TABLE"

# Secrets
get_parameter "/secrets/qr-key" "QR_SECRET_KEY"
get_parameter "/secrets/jwt-key" "JWT_SECRET"

echo ""
echo "✅ Environment variables loaded successfully!"
echo "📄 Written to: $ENV_FILE"
echo ""
echo "🔐 Security Notes:"
echo "   - Never commit .env file to version control"
echo "   - Use IAM roles in production instead of access keys"
echo "   - Rotate secrets regularly"
echo ""
echo "💡 Next steps:"
echo "   1. Review the generated .env file"
echo "   2. Add any missing manual configurations"
echo "   3. Run 'npm run dev' to start development"