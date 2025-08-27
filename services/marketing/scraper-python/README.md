# SmartPlace Scraper - Python Lambda Version

네이버 스마트플레이스 스크래핑을 위한 Python 구현 (AWS Lambda 최적화)

## 🎯 왜 Python인가?

### TypeScript/Node.js 대비 장점:
1. **Lambda 최적화** - 더 작은 패키지 크기, 빠른 콜드 스타트
2. **Playwright 호환성** - Python 버전이 Lambda에서 더 안정적
3. **BeautifulSoup** - 강력한 HTML 파싱 라이브러리
4. **배포 용이성** - pip로 간단한 의존성 관리
5. **AWS SDK (boto3)** - 네이티브 Python 지원

## 📁 프로젝트 구조

```
scraper-python/
├── smartplace_scraper.py    # 메인 스크래퍼
├── requirements.txt         # 의존성
├── setup.sh                # 로컬 설정 스크립트
├── lambda_deploy.py        # Lambda 배포 패키지 생성
└── lambda_config.json      # Lambda 설정
```

## 🚀 로컬 설정 및 테스트

### 1. 환경 설정
```bash
cd scraper-python
chmod +x setup.sh
./setup.sh
```

### 2. 가상환경 활성화
```bash
source venv/bin/activate
```

### 3. 테스트 실행
```bash
python smartplace_scraper.py "https://naver.me/5k7f2jv9"
```

## ☁️ AWS Lambda 배포

### 1. 배포 패키지 생성
```bash
python lambda_deploy.py
```

생성되는 파일:
- `lambda_function.zip` - Lambda 함수 코드
- `playwright_layer.zip` - Playwright Lambda Layer

### 2. AWS Lambda 설정

#### Lambda Layer 생성:
```bash
aws lambda publish-layer-version \
  --layer-name playwright-chromium \
  --zip-file fileb://playwright_layer.zip \
  --compatible-runtimes python3.11 \
  --region ap-northeast-2
```

#### Lambda 함수 생성:
```bash
aws lambda create-function \
  --function-name SmartPlaceScraper \
  --runtime python3.11 \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda_function.zip \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --timeout 60 \
  --memory-size 1024 \
  --environment Variables="{PLAYWRIGHT_BROWSERS_PATH=/opt/python}" \
  --layers arn:aws:lambda:ap-northeast-2:YOUR_ACCOUNT:layer:playwright-chromium:1 \
  --region ap-northeast-2
```

### 3. API Gateway 연동

```python
# API Gateway 요청 예시
{
    "url": "https://naver.me/5k7f2jv9"
}

# Lambda 응답
{
    "success": true,
    "data": {
        "basicInfo": {
            "name": "매장명",
            "category": "카테고리",
            "address": "주소",
            "phone": "전화번호"
        },
        "menuItems": [...],
        "reviews": [...],
        "images": [...],
        "statistics": {...}
    },
    "timestamp": "2024-12-26T12:00:00"
}
```

## 🔧 주요 기능

### 1. 직접 평가 (page.evaluate)
```python
# JavaScript 실행으로 동적 데이터 추출
data = await page.evaluate('''() => {
    // Window 객체 접근
    const naverData = window.__PLACE_STATE__;
    
    // Meta 태그 파싱
    const metaTags = document.querySelectorAll('meta');
    
    // JSON-LD 구조화 데이터
    const jsonLd = JSON.parse(
        document.querySelector('script[type="application/ld+json"]').textContent
    );
    
    return { naverData, metaTags, jsonLd };
}''')
```

### 2. BeautifulSoup 파싱
```python
# HTML 파싱으로 추가 데이터 추출
soup = BeautifulSoup(html, 'html.parser')
name = soup.select_one('span.GHAhO').get_text()
```

### 3. 다단계 폴백
- Window 전역 변수 확인
- Meta 태그 추출
- JSON-LD 파싱
- DOM 셀렉터 스캔
- BeautifulSoup 파싱

## 📊 성능 최적화

### Lambda 최적화:
- **콜드 스타트**: ~3초
- **웜 스타트**: ~1초
- **메모리 사용**: ~500MB
- **패키지 크기**: ~50MB (Layer 포함)

### 스크래핑 성능:
- **페이지 로드**: 2-3초
- **데이터 추출**: 1-2초
- **전체 처리**: 5-7초

## 🛠️ 문제 해결

### 1. Lambda에서 Playwright 실행 안 될 때
```python
# Lambda Layer에 Playwright 설치
# EphemeralStorage 크기 증가 (2GB)
# /tmp 디렉토리 활용
```

### 2. 네이버 차단 우회
```python
# User-Agent 설정
# 헤드리스 모드 감지 우회
# 랜덤 딜레이 추가
```

### 3. 데이터 추출 실패
```python
# 다중 셀렉터 시도
# JavaScript 평가 + BeautifulSoup 병행
# 폴백 전략 구현
```

## 🔄 Next.js 연동

### API Route에서 Lambda 호출
```typescript
// app/api/smartplace/analyze/route.ts
export async function POST(request: NextRequest) {
  const { url } = await request.json();
  
  // Lambda 함수 호출
  const lambda = new AWS.Lambda({ region: 'ap-northeast-2' });
  const result = await lambda.invoke({
    FunctionName: 'SmartPlaceScraper',
    Payload: JSON.stringify({ url })
  }).promise();
  
  return NextResponse.json(JSON.parse(result.Payload));
}
```

## 📈 모니터링

CloudWatch 로그 그룹: `/aws/lambda/SmartPlaceScraper`

주요 메트릭:
- Duration (실행 시간)
- Memory Usage (메모리 사용량)
- Error Rate (에러율)
- Concurrent Executions (동시 실행)

## 🚨 주의사항

1. **Rate Limiting** - 네이버 요청 제한 준수
2. **IP 차단** - Lambda IP 로테이션 고려
3. **비용 관리** - 실행 시간 및 메모리 최적화
4. **데이터 캐싱** - 중복 스크래핑 방지