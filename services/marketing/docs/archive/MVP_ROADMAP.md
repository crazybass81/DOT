# Marketing Service MVP Roadmap

## 🎯 MVP Scope (Phase 1)

### 플랫폼 지원
- **스토어**: Naver SmartPlace (한국 시장)
- **크리에이터**: YouTube (한국 크리에이터)
- **언어**: 한국어 우선

### 핵심 기능
1. **SmartPlace URL 입력** → 가게 정보 스크래핑
2. **YouTube 실시간 검색** → 최근 30일 활동 크리에이터
3. **AI 매칭 분석** → GPT-4 기반 추천
4. **상위 20개 추천** → 점수/ROI 예측 제공

## 📊 기술 스택 (MVP)

```typescript
// 현재 구현 완료된 것들
const MVP_STACK = {
  backend: {
    framework: 'Next.js 14',
    database: 'AWS DynamoDB',
    ai: 'OpenAI GPT-4',
    apis: ['YouTube Data API v3', 'Naver SmartPlace Scraping']
  },
  frontend: {
    framework: 'React 18',
    ui: 'TailwindCSS',
    charts: 'Recharts'
  },
  infrastructure: {
    hosting: 'AWS Lambda',
    storage: 'DynamoDB',
    cache: 'Redis (optional)'
  }
}
```

## 🚀 MVP 구현 체크리스트

### ✅ 완료된 작업
- [x] DynamoDB 테이블 설계 및 생성 스크립트
- [x] SmartPlace 스크래퍼 구현
- [x] YouTube 실시간 데이터 수집기
- [x] AI 매칭 엔진 (GPT-4 통합)
- [x] 분석 이력 저장 (30일 TTL)
- [x] API 문서화

### 🔄 진행 중
- [ ] 프론트엔드 UI 구현
- [ ] 인증 시스템 (스토어 오너용)
- [ ] 결제 시스템 연동

### 📋 TODO (MVP 필수)
- [ ] 환경 변수 설정 (.env)
- [ ] YouTube API 키 발급
- [ ] OpenAI API 키 설정
- [ ] DynamoDB 테이블 생성
- [ ] 배포 스크립트
- [ ] 기본 UI 화면 3개

## 🎨 MVP UI 화면 (최소)

### 1. 메인 화면 (`/`)
```tsx
// 심플한 URL 입력 화면
<MainPage>
  <Input placeholder="Naver SmartPlace URL 입력" />
  <Button>크리에이터 추천받기</Button>
</MainPage>
```

### 2. 분석 중 화면 (`/analyzing`)
```tsx
// 실시간 진행 상태 표시
<AnalyzingPage>
  <Progress steps={[
    "가게 정보 수집 중...",
    "YouTube 크리에이터 검색 중...",
    "AI 매칭 분석 중...",
    "추천 결과 생성 중..."
  ]} />
</AnalyzingPage>
```

### 3. 결과 화면 (`/results/[id]`)
```tsx
// 추천 크리에이터 리스트
<ResultsPage>
  <StoreInfo data={store} />
  <CreatorList recommendations={top20} />
  <DownloadButton format="pdf" />
</ResultsPage>
```

## 🔧 MVP 실행 명령어

```bash
# 1. 환경 설정
cd services/marketing
cp .env.example .env
# .env 파일에 API 키 입력

# 2. 의존성 설치
npm install

# 3. DynamoDB 로컬 실행 (개발용)
docker run -p 8000:8000 amazon/dynamodb-local

# 4. 테이블 생성
npm run db:create-tables:local

# 5. 개발 서버 실행
npm run dev

# 6. 접속
# http://localhost:3003
```

## 📈 MVP 성공 지표

### 정량적 지표
- 일일 분석 요청: 10건 이상
- 매칭 정확도: 70% 이상 (사용자 피드백)
- 응답 시간: 30초 이내
- API 비용: 요청당 100원 이하

### 정성적 지표
- 추천 결과에 대한 만족도
- 실제 캠페인 진행 의사
- UI/UX 피드백

## 🔄 Post-MVP 확장 계획

### Phase 2 (MVP + 1개월)
- [ ] 캠페인 관리 기능
- [ ] 이메일 알림 시스템
- [ ] 분석 리포트 PDF 생성
- [ ] 대시보드 통계

### Phase 3 (MVP + 2개월)
- [ ] Instagram 크리에이터 지원
- [ ] 결제 시스템 통합
- [ ] 자동 매칭 알림
- [ ] A/B 테스트 기능

### Phase 4 (MVP + 3개월)
- [ ] Google Maps 지원
- [ ] TikTok 크리에이터 지원
- [ ] 다국어 지원 (영어, 일본어, 중국어)
- [ ] API 공개 (B2B)

## 🚨 MVP 리스크 및 대응

### 기술적 리스크
| 리스크 | 가능성 | 영향 | 대응 방안 |
|--------|--------|------|-----------|
| YouTube API 할당량 초과 | 높음 | 높음 | 캐싱 강화, 배치 처리 |
| SmartPlace 스크래핑 차단 | 중간 | 높음 | 프록시, User-Agent 로테이션 |
| GPT-4 비용 초과 | 중간 | 중간 | GPT-3.5 폴백, 캐싱 |
| DynamoDB 비용 | 낮음 | 낮음 | TTL 설정, On-demand 모드 |

### 비즈니스 리스크
| 리스크 | 대응 방안 |
|--------|-----------|
| 낮은 사용률 | 무료 체험 제공, 데모 영상 |
| 부정확한 매칭 | 사용자 피드백 수집, ML 모델 개선 |
| 크리에이터 컨택 어려움 | 이메일 템플릿 제공, 중개 서비스 |

## 📝 MVP 체크포인트

### Week 1: 기본 구현 완료
- [ ] 백엔드 API 동작
- [ ] 기본 UI 구현
- [ ] 로컬 테스트 완료

### Week 2: 통합 테스트
- [ ] E2E 테스트
- [ ] 성능 최적화
- [ ] 버그 수정

### Week 3: 배포 준비
- [ ] AWS 배포
- [ ] 도메인 설정
- [ ] SSL 인증서

### Week 4: 런칭
- [ ] 소프트 런칭 (베타)
- [ ] 초기 사용자 피드백
- [ ] 긴급 이슈 대응

## 💡 MVP 핵심 원칙

1. **Simple is Best**: 핵심 기능만 구현
2. **Fast Iteration**: 빠른 피드백 반영
3. **Cost Efficient**: 최소 비용으로 검증
4. **User Focused**: 사용자 가치 우선
5. **Data Driven**: 데이터 기반 의사결정

## 🎯 MVP 완료 기준

- [ ] Naver SmartPlace URL 입력 → YouTube 크리에이터 추천 완전 자동화
- [ ] 30초 이내 결과 제공
- [ ] 최소 10명 베타 사용자 확보
- [ ] 긍정적 피드백 70% 이상
- [ ] 일일 API 비용 $10 이하

---

**MVP Target Date**: 2024년 2월 중순
**Budget**: 월 30만원 이하 (API + 인프라)
**Team**: 1-2명으로 운영 가능