#!/bin/bash

# AWS Parameter Store에서 환경변수 로드
# 사용법: source ./scripts/load-aws-parameters.sh

set -e

echo "📥 AWS Parameter Store에서 환경변수 로드 중..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# AWS 리전
AWS_REGION=${AWS_REGION:-"ap-northeast-2"}

# Parameter prefix
PREFIX="/dot/marketing"

# .env.local 파일 경로
ENV_FILE=".env.local"

# 기존 .env.local 백업
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "${ENV_FILE}.backup"
    echo -e "${YELLOW}📁 기존 .env.local을 .env.local.backup으로 백업${NC}"
fi

# 새로운 .env.local 생성
cat > "$ENV_FILE" << EOF
# AWS Parameter Store에서 자동 생성됨
# 생성 시간: $(date)
# ⚠️ 이 파일을 직접 수정하지 마세요. Parameter Store를 통해 관리하세요.

EOF

# Parameter 가져오기 함수
get_parameter() {
    local param_name="$1"
    local env_name="$2"
    
    value=$(aws ssm get-parameter \
        --name "$param_name" \
        --with-decryption \
        --region "$AWS_REGION" \
        --query "Parameter.Value" \
        --output text 2>/dev/null || echo "")
    
    if [ ! -z "$value" ]; then
        echo "$env_name=$value" >> "$ENV_FILE"
        echo "  ✓ $env_name"
    else
        echo "  ⚠️  $env_name (not found)"
    fi
}

echo "🔍 Parameters 로드 중..."

# 필수 Parameters 로드
get_parameter "$PREFIX/youtube-api-key" "YOUTUBE_API_KEY"
get_parameter "$PREFIX/aws-region" "AWS_REGION"
get_parameter "$PREFIX/dynamodb-creators-table" "DYNAMODB_CREATORS_TABLE"
get_parameter "$PREFIX/dynamodb-campaigns-table" "DYNAMODB_CAMPAIGNS_TABLE"
get_parameter "$PREFIX/dynamodb-email-history-table" "DYNAMODB_EMAIL_HISTORY_TABLE"
get_parameter "$PREFIX/ses-from-email" "SES_FROM_EMAIL"
get_parameter "$PREFIX/ses-configuration-set" "SES_CONFIGURATION_SET"

# 선택적 Parameters
get_parameter "$PREFIX/aws-access-key-id" "AWS_ACCESS_KEY_ID"
get_parameter "$PREFIX/aws-secret-access-key" "AWS_SECRET_ACCESS_KEY"

# Client-side 환경변수 (Parameter Store에 저장하지 않음)
echo "" >> "$ENV_FILE"
echo "# Client-side environment variables" >> "$ENV_FILE"
echo "NEXT_PUBLIC_APP_URL=http://localhost:3003" >> "$ENV_FILE"

echo ""
echo -e "${GREEN}✅ 환경변수 로드 완료!${NC}"
echo "   파일: $ENV_FILE"
echo ""
echo "💡 개발 서버 실행:"
echo "   npm run dev"