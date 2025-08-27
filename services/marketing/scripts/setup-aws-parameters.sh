#!/bin/bash

# AWS Parameter Store에 환경변수 저장 스크립트
# 사용법: ./scripts/setup-aws-parameters.sh

set -e

echo "🔧 AWS Parameter Store 설정 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# AWS 리전 설정
AWS_REGION=${AWS_REGION:-"ap-northeast-2"}
echo "📍 AWS Region: $AWS_REGION"

# Parameter prefix
PREFIX="/dot/marketing"

# 함수: Parameter 생성 또는 업데이트
create_or_update_parameter() {
    local name="$1"
    local value="$2"
    local type="${3:-SecureString}"
    local description="$4"
    
    echo -n "  - $name: "
    
    # Parameter 존재 확인
    if aws ssm get-parameter --name "$name" --region "$AWS_REGION" >/dev/null 2>&1; then
        # 업데이트
        aws ssm put-parameter \
            --name "$name" \
            --value "$value" \
            --type "$type" \
            --overwrite \
            --region "$AWS_REGION" >/dev/null
        echo -e "${YELLOW}Updated${NC}"
    else
        # 생성
        aws ssm put-parameter \
            --name "$name" \
            --value "$value" \
            --type "$type" \
            --description "$description" \
            --region "$AWS_REGION" >/dev/null
        echo -e "${GREEN}Created${NC}"
    fi
}

echo ""
echo "📝 필수 환경변수를 입력하세요:"
echo ""

# YouTube API Key
read -p "YouTube API Key: " YOUTUBE_API_KEY
if [ -z "$YOUTUBE_API_KEY" ]; then
    echo -e "${RED}❌ YouTube API Key는 필수입니다${NC}"
    exit 1
fi

# AWS Access Key (선택사항)
read -p "AWS Access Key ID (선택, Enter로 건너뛰기): " AWS_ACCESS_KEY_ID
read -s -p "AWS Secret Access Key (선택, Enter로 건너뛰기): " AWS_SECRET_ACCESS_KEY
echo ""

# Email 설정
read -p "SES From Email (기본값: marketing@dot-platform.com): " SES_FROM_EMAIL
SES_FROM_EMAIL=${SES_FROM_EMAIL:-"marketing@dot-platform.com"}

echo ""
echo "🚀 Parameter Store에 저장 중..."

# Parameters 저장
create_or_update_parameter \
    "$PREFIX/youtube-api-key" \
    "$YOUTUBE_API_KEY" \
    "SecureString" \
    "YouTube Data API v3 Key"

create_or_update_parameter \
    "$PREFIX/aws-region" \
    "$AWS_REGION" \
    "String" \
    "AWS Region"

create_or_update_parameter \
    "$PREFIX/dynamodb-creators-table" \
    "dot-marketing-creators" \
    "String" \
    "DynamoDB Creators Table Name"

create_or_update_parameter \
    "$PREFIX/dynamodb-campaigns-table" \
    "dot-marketing-campaigns" \
    "String" \
    "DynamoDB Campaigns Table Name"

create_or_update_parameter \
    "$PREFIX/dynamodb-email-history-table" \
    "dot-marketing-email-history" \
    "String" \
    "DynamoDB Email History Table Name"

create_or_update_parameter \
    "$PREFIX/ses-from-email" \
    "$SES_FROM_EMAIL" \
    "String" \
    "SES From Email Address"

create_or_update_parameter \
    "$PREFIX/ses-configuration-set" \
    "dot-marketing" \
    "String" \
    "SES Configuration Set Name"

# AWS Credentials (선택사항)
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    create_or_update_parameter \
        "$PREFIX/aws-access-key-id" \
        "$AWS_ACCESS_KEY_ID" \
        "SecureString" \
        "AWS Access Key ID"
fi

if [ ! -z "$AWS_SECRET_ACCESS_KEY" ]; then
    create_or_update_parameter \
        "$PREFIX/aws-secret-access-key" \
        "$AWS_SECRET_ACCESS_KEY" \
        "SecureString" \
        "AWS Secret Access Key"
fi

echo ""
echo -e "${GREEN}✅ Parameter Store 설정 완료!${NC}"
echo ""
echo "📋 저장된 Parameters:"
aws ssm describe-parameters \
    --region "$AWS_REGION" \
    --parameter-filters "Key=Name,Option=Contains,Values=$PREFIX" \
    --query "Parameters[].Name" \
    --output text | tr '\t' '\n'

echo ""
echo "💡 로컬 개발 환경에서 사용하려면:"
echo "   ./scripts/load-aws-parameters.sh"
echo ""
echo "🚀 Lambda/ECS에서는 자동으로 Parameter Store를 참조합니다"