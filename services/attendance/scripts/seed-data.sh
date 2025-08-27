#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Seeding DynamoDB with test data...${NC}"

# Add more businesses
echo -e "${GREEN}Adding businesses...${NC}"

aws dynamodb put-item \
  --table-name dot-businesses \
  --item '{
    "businessId": {"S": "BIZ002"},
    "name": {"S": "강남 파스타집"},
    "location": {"M": {"lat": {"N": "37.4979"}, "lng": {"N": "127.0276"}}},
    "radiusMeters": {"N": "30"},
    "address": {"S": "서울시 강남구 역삼동"},
    "createdAt": {"S": "'$(date -Iseconds)'"}
  }' \
  --region us-east-1

aws dynamodb put-item \
  --table-name dot-businesses \
  --item '{
    "businessId": {"S": "BIZ003"},
    "name": {"S": "홍대 카페"},
    "location": {"M": {"lat": {"N": "37.5563"}, "lng": {"N": "126.9220"}}},
    "radiusMeters": {"N": "40"},
    "address": {"S": "서울시 마포구 홍대입구역"},
    "createdAt": {"S": "'$(date -Iseconds)'"}
  }' \
  --region us-east-1

# Add employees
echo -e "${GREEN}Adding employees...${NC}"

aws dynamodb put-item \
  --table-name dot-employees \
  --item '{
    "employeeId": {"S": "EMP001"},
    "businessId": {"S": "BIZ001"},
    "name": {"S": "김직원"},
    "email": {"S": "employee1@dotattendance.com"},
    "role": {"S": "staff"},
    "department": {"S": "주방"},
    "phoneNumber": {"S": "010-1234-5678"},
    "hireDate": {"S": "2024-01-15"},
    "createdAt": {"S": "'$(date -Iseconds)'"}
  }' \
  --region us-east-1

aws dynamodb put-item \
  --table-name dot-employees \
  --item '{
    "employeeId": {"S": "EMP002"},
    "businessId": {"S": "BIZ001"},
    "name": {"S": "이매니저"},
    "email": {"S": "manager@dotattendance.com"},
    "role": {"S": "manager"},
    "department": {"S": "홀"},
    "phoneNumber": {"S": "010-2345-6789"},
    "hireDate": {"S": "2023-06-01"},
    "createdAt": {"S": "'$(date -Iseconds)'"}
  }' \
  --region us-east-1

aws dynamodb put-item \
  --table-name dot-employees \
  --item '{
    "employeeId": {"S": "EMP003"},
    "businessId": {"S": "BIZ002"},
    "name": {"S": "박알바"},
    "email": {"S": "parttime@dotattendance.com"},
    "role": {"S": "part-time"},
    "department": {"S": "서빙"},
    "phoneNumber": {"S": "010-3456-7890"},
    "hireDate": {"S": "2024-03-10"},
    "createdAt": {"S": "'$(date -Iseconds)'"}
  }' \
  --region us-east-1

echo -e "${GREEN}Test data seeding completed!${NC}"

# Display summary
echo -e "${YELLOW}Summary:${NC}"
echo "- 3 Businesses added (BIZ001, BIZ002, BIZ003)"
echo "- 3 Employees added (EMP001, EMP002, EMP003)"
echo ""
echo -e "${YELLOW}Test Credentials:${NC}"
echo "Admin: admin@dotattendance.com / TempPass123!"
echo "Employee: employee1@dotattendance.com / TempPass123!"
echo ""
echo -e "${GREEN}Note: Users will need to change password on first login${NC}"