# Marketing Service Setup Guide

## Prerequisites

### Required Software
- Node.js 18.x or higher
- npm 9.x or yarn 1.22.x
- AWS CLI configured with credentials
- Docker (for local DynamoDB testing)

### AWS Services
- DynamoDB
- Lambda (optional for serverless)
- API Gateway (optional)
- SES (for email notifications)
- Secrets Manager (for API keys)

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/your-org/dot-services.git
cd dot-services/marketing
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

#### Create .env file
```bash
cp .env.example .env
```

#### Configure Environment Variables
```bash
# AWS Configuration
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# DynamoDB Tables
STORES_TABLE_NAME=dot-marketing-stores
CREATORS_TABLE_NAME=dot-marketing-creators
MATCHES_TABLE_NAME=dot-marketing-matches
CAMPAIGNS_TABLE_NAME=dot-marketing-campaigns

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key

# Naver SmartPlace
SMARTPLACE_BASE_URL=https://pcmap.place.naver.com

# Development Mode
NODE_ENV=development
DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000
```

### 4. Database Setup

#### Local DynamoDB (Development)
```bash
# Start local DynamoDB
docker run -p 8000:8000 amazon/dynamodb-local

# Create tables
npm run db:create-tables:local
```

#### AWS DynamoDB (Production)
```bash
# Configure AWS credentials
aws configure

# Create tables in AWS
npm run db:create-tables:aws

# Verify tables
aws dynamodb list-tables --region ap-northeast-2
```

### 5. API Keys Setup

#### YouTube Data API v3
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable YouTube Data API v3
4. Create API key with restrictions
5. Add to .env file

#### AWS Secrets Manager (Production)
```bash
# Store API keys securely
aws secretsmanager create-secret \
  --name dot-marketing/youtube-api \
  --secret-string '{"apiKey":"your_youtube_api_key"}'

aws secretsmanager create-secret \
  --name dot-marketing/openai-api \
  --secret-string '{"apiKey":"your_openai_api_key"}'
```

## Running the Application

### Development Mode
```bash
# Start development server
npm run dev

# Access at http://localhost:3003
```

### Production Build
```bash
# Build application
npm run build

# Start production server
npm run start
```

### Testing
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
```

## Initial Data Setup

### 1. Seed Sample Data (Development)
```bash
npm run db:seed
```

### 2. Register First Store
```bash
curl -X POST http://localhost:3003/api/stores \
  -H "Content-Type: application/json" \
  -d '{
    "storeUrl": "https://pcmap.place.naver.com/restaurant/1234567",
    "storeName": "Sample Restaurant",
    "category": "restaurant",
    "location": {
      "city": "서울특별시",
      "district": "강남구"
    }
  }'
```

### 3. Register First Creator
```bash
curl -X POST http://localhost:3003/api/creators \
  -H "Content-Type: application/json" \
  -d '{
    "channelUrl": "https://youtube.com/@samplecreator",
    "email": "creator@example.com",
    "categories": ["food", "review"]
  }'
```

## Monitoring & Debugging

### Local Development
```bash
# View logs
npm run dev

# Debug mode
DEBUG=* npm run dev

# DynamoDB Admin GUI
npm run db:admin
# Access at http://localhost:8001
```

### CloudWatch Logs (Production)
```bash
# View recent logs
aws logs tail /aws/lambda/dot-marketing --follow

# Search logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/dot-marketing \
  --filter-pattern "ERROR"
```

### Health Check
```bash
# API health check
curl http://localhost:3003/health

# Database connection test
curl http://localhost:3003/api/health/db
```

## Common Issues & Solutions

### Issue 1: DynamoDB Connection Error
```
Error: Could not load credentials from any providers
```

**Solution:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# For local development, ensure local endpoint
export DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000
```

### Issue 2: YouTube API Quota Exceeded
```
Error: quotaExceeded
```

**Solution:**
- Enable caching in .env: `ENABLE_CACHING=true`
- Reduce API calls by increasing cache TTL
- Request quota increase in Google Cloud Console

### Issue 3: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3003
```

**Solution:**
```bash
# Find process using port
lsof -i :3003

# Kill process
kill -9 [PID]

# Or use different port
PORT=3004 npm run dev
```

### Issue 4: TypeScript Build Errors
```
Error: Cannot find module '@/types'
```

**Solution:**
```bash
# Clean and rebuild
rm -rf dist .next
npm run build
```

## Performance Optimization

### 1. Enable Caching
```bash
# .env
ENABLE_CACHING=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. Connection Pooling
```typescript
// dynamodb-client.ts
const client = new DynamoDBClient({
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    maxSockets: 50
  })
});
```

### 3. Batch Operations
```bash
# Enable batch processing
ENABLE_BATCH_MATCHING=true
BATCH_SIZE=25
```

## Security Best Practices

### 1. Environment Variables
- Never commit .env file
- Use AWS Secrets Manager in production
- Rotate API keys regularly

### 2. API Security
```typescript
// middleware/auth.ts
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  // Verify JWT token
  jwt.verify(token, process.env.JWT_SECRET);
  next();
};
```

### 3. Rate Limiting
```typescript
// middleware/rateLimit.ts
export const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
};
```

## Deployment

### AWS Lambda (Serverless)
```bash
# Install serverless
npm install -g serverless

# Deploy
serverless deploy --stage production
```

### Docker Container
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3003
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t dot-marketing .
docker run -p 3003:3003 dot-marketing
```

### AWS ECS
```bash
# Build and push to ECR
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin [ECR_URI]
docker build -t dot-marketing .
docker tag dot-marketing:latest [ECR_URI]/dot-marketing:latest
docker push [ECR_URI]/dot-marketing:latest

# Deploy to ECS
aws ecs update-service --cluster dot-cluster --service marketing-service --force-new-deployment
```

## Maintenance

### Regular Tasks
```bash
# Weekly: Update dependencies
npm update

# Monthly: Audit security
npm audit fix

# Quarterly: Review and rotate API keys
aws secretsmanager rotate-secret --secret-id dot-marketing/api-keys
```

### Backup & Recovery
```bash
# Backup DynamoDB tables
aws dynamodb create-backup \
  --table-name dot-marketing-stores \
  --backup-name stores-backup-$(date +%Y%m%d)

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name dot-marketing-stores \
  --backup-arn arn:aws:dynamodb:...
```

## Support

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Architecture Guide](./MATCHING_ENGINE_ARCHITECTURE.md)
- [DynamoDB Schema](./DYNAMODB_ARCHITECTURE.md)

### Troubleshooting
- Check logs in CloudWatch or local console
- Review error codes in API documentation
- Contact: support@dot-marketing.com

### Community
- GitHub Issues: [Report bugs](https://github.com/your-org/dot-services/issues)
- Discord: [Join community](https://discord.gg/dot-marketing)
- Stack Overflow: Tag with `dot-marketing`