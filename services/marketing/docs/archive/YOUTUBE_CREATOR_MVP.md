# YouTube Creator Marketing Automation MVP

## 🎯 문제 정의
음식점 사장님들이 유튜브 마케팅의 효과는 알지만, 크리에이터를 찾고 연락하는 과정이 복잡하고 두려워서 시도하지 못하는 문제를 해결

## 📊 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  크리에이터   │  │   필터링     │  │  이메일      │  │
│  │    검색      │  │   & 분석     │  │   발송       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                    API Layer (Next.js API)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  YouTube     │  │   Scoring    │  │    Email     │  │
│  │  Data API    │  │   Engine     │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                    External Services                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  YouTube     │  │   Social     │  │    AWS       │  │
│  │  Data API    │  │   Blade API  │  │     SES      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                     Database (DynamoDB)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Creators    │  │  Campaigns   │  │   Email      │  │
│  │    Table     │  │    Table     │  │   History    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 🔑 핵심 기능

### 1. 크리에이터 검색 및 데이터 수집
- **YouTube Data API v3** 활용
- **Social Blade API** 연동 (옵션)
- 채널 정보, 구독자, 조회수, 업로드 빈도 수집

### 2. 크리에이터 평가 알고리즘

#### 호감도 지수 (Engagement Score)
```typescript
engagementScore = (
  (평균좋아요 / 평균조회수) * 0.4 +
  (평균댓글수 / 평균조회수) * 0.3 +
  (구독자증가율) * 0.3
) * 100
```

#### 활성화 지수 (Activity Score)
```typescript
activityScore = (
  (최근30일업로드수 / 4) * 0.5 +
  (평균업로드주기정규화) * 0.3 +
  (최근활동일수) * 0.2
) * 100
```

#### 적합도 지수 (Fit Score)
```typescript
fitScore = (
  카테고리매칭점수 * 0.4 +
  지역매칭점수 * 0.3 +
  구독자규모적합도 * 0.3
) * 100
```

### 3. 이메일 추출 시스템
- YouTube 채널 '정보' 탭 스크래핑
- 채널 설명란 이메일 패턴 검색
- 연결된 소셜 미디어 확인

### 4. 이메일 템플릿 엔진

#### 템플릿 종류
1. **일반 협업 제안** - 표준 광고 제안
2. **제품 리뷰** - 음식 리뷰 요청
3. **방문 리뷰** - 매장 방문 리뷰
4. **이벤트 협업** - 특별 이벤트 협찬
5. **장기 파트너십** - 지속적 협업 제안

## 📝 데이터 모델

### Creator Schema
```typescript
interface Creator {
  id: string;
  channelId: string;
  channelName: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  category: string;
  location?: string;
  email?: string;
  engagementScore: number;
  activityScore: number;
  fitScore: number;
  lastUpdated: Date;
  metadata: {
    averageViews: number;
    uploadFrequency: number;
    recentVideos: Video[];
  };
}
```

### Campaign Schema
```typescript
interface Campaign {
  id: string;
  restaurantId: string;
  name: string;
  budget: number;
  targetCreators: string[];
  emailTemplate: string;
  status: 'draft' | 'active' | 'completed';
  results: {
    emailsSent: number;
    responses: number;
    conversions: number;
  };
  createdAt: Date;
}
```

### EmailHistory Schema
```typescript
interface EmailHistory {
  id: string;
  campaignId: string;
  creatorId: string;
  template: string;
  sentAt: Date;
  status: 'sent' | 'opened' | 'replied' | 'bounced';
  responseData?: {
    openedAt?: Date;
    repliedAt?: Date;
    message?: string;
  };
}
```

## 🛠 기술 스택

### Frontend
- **Next.js 15** - React 프레임워크
- **TanStack Query** - 데이터 페칭
- **Recharts** - 데이터 시각화
- **Tailwind CSS** - 스타일링

### Backend
- **Node.js** - 런타임
- **AWS Lambda** - 서버리스 함수
- **DynamoDB** - NoSQL 데이터베이스
- **AWS SES** - 이메일 발송

### External APIs
- **YouTube Data API v3** - 크리에이터 데이터
- **Social Blade API** - 추가 분석 데이터
- **Clearbit API** - 이메일 검증

## 📅 개발 로드맵

### Phase 1: MVP (2주)
- [ ] YouTube API 연동
- [ ] 기본 검색 기능
- [ ] 간단한 필터링
- [ ] 이메일 추출
- [ ] 기본 템플릿 1종

### Phase 2: 스코어링 (1주)
- [ ] 호감도 지수 구현
- [ ] 활성화 지수 구현
- [ ] 적합도 지수 구현
- [ ] 정렬 및 필터링 고도화

### Phase 3: 이메일 자동화 (1주)
- [ ] 5종 템플릿 구현
- [ ] AWS SES 연동
- [ ] 발송 자동화
- [ ] 응답 추적

### Phase 4: 분석 대시보드 (1주)
- [ ] 캠페인 성과 분석
- [ ] 크리에이터 반응률
- [ ] ROI 계산
- [ ] 리포트 생성

## 💡 차별화 포인트

1. **음식점 특화 스코어링**: 음식 콘텐츠 친화도 평가
2. **자동 이메일 추출**: 수동 작업 최소화
3. **템플릿 최적화**: 음식점별 맞춤 템플릿
4. **투명한 가격**: 중개 수수료 없는 직접 연결
5. **성과 추적**: 실제 전환까지 추적

## 🚀 예상 성과

- **시간 절감**: 크리에이터 발굴 시간 90% 감소
- **비용 절감**: 중개 수수료 0원
- **응답률**: 일반 대비 3배 향상 (개인화 템플릿)
- **ROI**: 투자 대비 5배 이상 매출 증대

## 📌 주의사항

1. **YouTube API 할당량**: 일일 10,000 유닛 제한
2. **이메일 발송 제한**: AWS SES 일일 발송 한도
3. **개인정보 보호**: GDPR, 개인정보보호법 준수
4. **스팸 방지**: CAN-SPAM Act 준수