#!/bin/bash

# ====================================
# Save .env to AWS Parameter Store
# ====================================
# This script saves environment variables from .env file
# to AWS Parameter Store for secure storage

set -e

# Configuration
ENV_FILE="${ENV_FILE:-.env}"
PARAMETER_PATH="${PARAMETER_STORE_PATH:-/dot-attendance/prod/}"
REGION="${AWS_REGION:-ap-northeast-2}"
KMS_KEY_ID="${PARAMETER_STORE_KMS_KEY_ID:-alias/aws/ssm}"

echo "📤 Saving parameters to AWS Parameter Store..."
echo "   Source: $ENV_FILE"
echo "   Path: $PARAMETER_PATH"
echo "   Region: $REGION"

# Check AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found: $ENV_FILE"
    exit 1
fi

# Function to save parameter
save_parameter() {
    local param_name=$1
    local param_value=$2
    local param_type=${3:-SecureString}
    
    echo -n "💾 Saving $param_name... "
    
    aws ssm put-parameter \
        --name "$param_name" \
        --value "$param_value" \
        --type "$param_type" \
        --key-id "$KMS_KEY_ID" \
        --overwrite \
        --region "$REGION" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅"
    else
        echo "❌ Failed"
    fi
}

# Parse .env file and save to Parameter Store
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    if [[ -z "$key" || "$key" == \#* ]]; then
        continue
    fi
    
    # Remove quotes from value if present
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    
    # Convert env var name to parameter path
    # API_ENDPOINT -> /dot-attendance/prod/api/endpoint
    param_name=$(echo "$key" | tr '[:upper:]' '[:lower:]' | tr '_' '/')
    param_full_path="${PARAMETER_PATH}${param_name}"
    
    # Determine parameter type (SecureString for secrets)
    param_type="String"
    if [[ "$key" == *SECRET* ]] || [[ "$key" == *KEY* ]] || [[ "$key" == *PASSWORD* ]] || [[ "$key" == *TOKEN* ]]; then
        param_type="SecureString"
    fi
    
    # Save parameter
    if [ -n "$value" ]; then
        save_parameter "$param_full_path" "$value" "$param_type"
    fi
done < "$ENV_FILE"

echo ""
echo "✅ Parameters saved to AWS Parameter Store!"
echo ""
echo "📋 View parameters in AWS Console:"
echo "   https://console.aws.amazon.com/systems-manager/parameters?region=$REGION"
echo ""
echo "🔐 Security Best Practices:"
echo "   - Use different KMS keys for different environments"
echo "   - Limit IAM permissions to specific parameter paths"
echo "   - Enable parameter store access logging"
echo "   - Rotate secrets regularly"