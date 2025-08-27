# Marketing Service API Documentation

## Base URL

```
Production: https://api.dot-marketing.com
Staging: https://staging-api.dot-marketing.com
Development: http://localhost:3003
```

## Authentication

All API endpoints require authentication using JWT tokens.

```http
Authorization: Bearer <jwt_token>
```

## API Endpoints

### Store Management

#### Create Store
```http
POST /api/stores
```

**Request Body:**
```json
{
  "storeUrl": "https://pcmap.place.naver.com/restaurant/1234567",
  "storeName": "맛있는 레스토랑",
  "category": "restaurant",
  "subcategory": "korean",
  "location": {
    "address": "서울특별시 강남구 테헤란로 123",
    "district": "강남구",
    "city": "서울특별시",
    "coordinates": {
      "latitude": 37.5665,
      "longitude": 126.9780
    }
  },
  "keywords": ["한식", "전통", "가족모임"],
  "targetAudience": {
    "ageRange": "20-40",
    "gender": "all",
    "interests": ["food", "dining", "korean cuisine"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "storeId": "store_abc123",
    "storeName": "맛있는 레스토랑",
    "status": "active",
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

#### Get Store
```http
GET /api/stores/:storeId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "storeId": "store_abc123",
    "storeName": "맛있는 레스토랑",
    "category": "restaurant",
    "subcategory": "korean",
    "location": {
      "address": "서울특별시 강남구 테헤란로 123",
      "district": "강남구",
      "city": "서울특별시",
      "coordinates": {
        "latitude": 37.5665,
        "longitude": 126.9780
      }
    },
    "keywords": ["한식", "전통", "가족모임"],
    "ratings": {
      "average": 4.5,
      "count": 234
    },
    "campaigns": {
      "active": 2,
      "completed": 5,
      "total": 7
    }
  }
}
```

#### Update Store
```http
PUT /api/stores/:storeId
```

**Request Body:**
```json
{
  "keywords": ["한식", "전통", "가족모임", "비즈니스"],
  "targetAudience": {
    "ageRange": "25-45",
    "gender": "all",
    "interests": ["food", "dining", "korean cuisine", "business dining"]
  }
}
```

#### Delete Store
```http
DELETE /api/stores/:storeId
```

### Creator Management

#### Register Creator
```http
POST /api/creators
```

**Request Body:**
```json
{
  "channelUrl": "https://youtube.com/@foodcreator",
  "email": "creator@example.com",
  "categories": ["food", "restaurant", "review"],
  "location": {
    "city": "서울특별시",
    "districts": ["강남구", "서초구", "송파구"]
  },
  "audienceSize": {
    "subscribers": 50000,
    "averageViews": 10000
  },
  "contentStyle": {
    "format": "review",
    "length": "10-15min",
    "frequency": "weekly"
  }
}
```

#### Get Creator
```http
GET /api/creators/:creatorId
```

#### Search Creators
```http
GET /api/creators/search
```

**Query Parameters:**
- `category` (string): Content category
- `location` (string): City or district
- `minSubscribers` (number): Minimum subscriber count
- `maxSubscribers` (number): Maximum subscriber count
- `influenceTier` (string): nano|micro|mid|macro|mega
- `limit` (number): Results per page (default: 20)
- `offset` (number): Pagination offset

**Example:**
```http
GET /api/creators/search?category=food&location=서울특별시&influenceTier=mid&limit=10
```

### Matching Engine

#### Generate Matches
```http
POST /api/matches/generate
```

**Request Body:**
```json
{
  "storeId": "store_abc123",
  "preferences": {
    "influenceTiers": ["micro", "mid"],
    "maxDistance": 10,
    "minEngagementRate": 0.03,
    "contentStyles": ["review", "vlog"]
  },
  "weights": {
    "category": 0.35,
    "location": 0.25,
    "audience": 0.20,
    "style": 0.15,
    "influence": 0.05
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "matchId": "match_xyz789",
    "storeId": "store_abc123",
    "generatedAt": "2024-01-20T10:30:00Z",
    "matches": [
      {
        "creatorId": "creator_123",
        "channelName": "맛집 탐방러",
        "score": 85.5,
        "breakdown": {
          "category": 28.5,
          "location": 20.0,
          "audience": 18.5,
          "style": 12.0,
          "influence": 6.5
        },
        "metrics": {
          "subscribers": 45000,
          "avgViews": 8500,
          "engagementRate": 0.045
        }
      }
    ],
    "totalMatches": 15,
    "averageScore": 72.3
  }
}
```

#### Get Match Results
```http
GET /api/matches/:matchId
```

#### Accept/Reject Match
```http
PUT /api/matches/:matchId/status
```

**Request Body:**
```json
{
  "creatorId": "creator_123",
  "status": "accepted",
  "notes": "Great fit for our brand"
}
```

### Campaign Management

#### Create Campaign
```http
POST /api/campaigns
```

**Request Body:**
```json
{
  "storeId": "store_abc123",
  "name": "2024 봄 프로모션",
  "description": "봄 시즌 신메뉴 홍보 캠페인",
  "budget": {
    "total": 5000000,
    "currency": "KRW",
    "perCreator": 1000000
  },
  "timeline": {
    "startDate": "2024-03-01",
    "endDate": "2024-04-30",
    "contentDeadline": "2024-03-15"
  },
  "requirements": {
    "deliverables": [
      {
        "type": "youtube_video",
        "quantity": 1,
        "minDuration": 600,
        "requirements": ["store_visit", "menu_review", "hashtags"]
      },
      {
        "type": "instagram_post",
        "quantity": 3,
        "requirements": ["photos", "hashtags", "location_tag"]
      }
    ],
    "hashtags": ["#DOT맛집", "#봄신메뉴", "#강남맛집"],
    "mentions": ["@dot_restaurant"]
  },
  "targetCreators": ["creator_123", "creator_456"]
}
```

#### Get Campaign
```http
GET /api/campaigns/:campaignId
```

#### Update Campaign Status
```http
PUT /api/campaigns/:campaignId/status
```

**Request Body:**
```json
{
  "status": "active",
  "reason": "All creators confirmed"
}
```

#### Get Campaign Analytics
```http
GET /api/campaigns/:campaignId/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaignId": "campaign_abc123",
    "performance": {
      "totalReach": 125000,
      "totalEngagement": 5600,
      "engagementRate": 0.045,
      "views": {
        "youtube": 85000,
        "instagram": 40000
      },
      "roi": 2.3
    },
    "creators": [
      {
        "creatorId": "creator_123",
        "performance": {
          "reach": 75000,
          "engagement": 3400,
          "completionRate": 1.0,
          "deliverables": {
            "completed": 4,
            "pending": 0
          }
        }
      }
    ],
    "timeline": {
      "progress": 0.75,
      "daysRemaining": 15
    }
  }
}
```

### Analytics & Reporting

#### Get Store Analytics
```http
GET /api/analytics/stores/:storeId
```

**Query Parameters:**
- `startDate` (string): Start date (YYYY-MM-DD)
- `endDate` (string): End date (YYYY-MM-DD)
- `metrics` (array): Specific metrics to include

#### Get Creator Analytics
```http
GET /api/analytics/creators/:creatorId
```

#### Generate Report
```http
POST /api/analytics/reports
```

**Request Body:**
```json
{
  "type": "campaign_performance",
  "entityId": "campaign_abc123",
  "format": "pdf",
  "email": "manager@store.com"
}
```

### Email & Communication

#### Send Campaign Invitation
```http
POST /api/communications/invitations
```

**Request Body:**
```json
{
  "campaignId": "campaign_abc123",
  "creatorIds": ["creator_123", "creator_456"],
  "template": "campaign_invitation",
  "customMessage": "We'd love to work with you!"
}
```

#### Get Communication History
```http
GET /api/communications/history
```

**Query Parameters:**
- `entityType` (string): store|creator|campaign
- `entityId` (string): ID of the entity
- `limit` (number): Results per page
- `offset` (number): Pagination offset

### Webhooks

#### Register Webhook
```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-domain.com/webhook",
  "events": [
    "match.generated",
    "campaign.created",
    "campaign.completed",
    "creator.accepted"
  ],
  "secret": "your-webhook-secret"
}
```

**Webhook Payload Example:**
```json
{
  "event": "match.generated",
  "timestamp": "2024-01-20T10:30:00Z",
  "data": {
    "matchId": "match_xyz789",
    "storeId": "store_abc123",
    "matchCount": 15
  }
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| DUPLICATE_ENTRY | 409 | Resource already exists |
| RATE_LIMIT | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Rate Limiting

API rate limits per authentication tier:

| Tier | Requests/Hour | Burst |
|------|---------------|-------|
| Free | 100 | 10 |
| Basic | 1,000 | 50 |
| Pro | 10,000 | 200 |
| Enterprise | Unlimited | 1,000 |

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1642680000
```

## Pagination

All list endpoints support pagination:

```http
GET /api/creators?limit=20&offset=40
```

Response includes pagination metadata:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

## Versioning

API version is specified in the URL path:

```
https://api.dot-marketing.com/v1/stores
https://api.dot-marketing.com/v2/stores
```

Default version redirects to latest stable:
```
https://api.dot-marketing.com/stores → /v1/stores
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { DOTMarketingClient } from '@dot/marketing-sdk';

const client = new DOTMarketingClient({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Generate matches
const matches = await client.matches.generate({
  storeId: 'store_abc123',
  preferences: {
    influenceTiers: ['micro', 'mid']
  }
});

// Create campaign
const campaign = await client.campaigns.create({
  storeId: 'store_abc123',
  name: '2024 Spring Campaign',
  budget: { total: 5000000, currency: 'KRW' }
});
```

### Python
```python
from dot_marketing import Client

client = Client(
    api_key='your-api-key',
    environment='production'
)

# Generate matches
matches = client.matches.generate(
    store_id='store_abc123',
    preferences={
        'influence_tiers': ['micro', 'mid']
    }
)

# Create campaign
campaign = client.campaigns.create(
    store_id='store_abc123',
    name='2024 Spring Campaign',
    budget={'total': 5000000, 'currency': 'KRW'}
)
```

## Testing

### Test Environment
```
Base URL: https://sandbox-api.dot-marketing.com
Test API Key: test_key_xxx
```

### Test Data
Pre-populated test entities:
- Store: `test_store_001`
- Creator: `test_creator_001`
- Campaign: `test_campaign_001`

### Postman Collection
Import our Postman collection for easy testing:
```
https://api.dot-marketing.com/postman/collection.json
```