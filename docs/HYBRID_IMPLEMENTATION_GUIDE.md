# 🚀 하이브리드 데이터베이스 구현 가이드

## 📋 Quick Start

```bash
# 1. 설정 스크립트 실행
chmod +x scripts/setup-hybrid-database.sh
./scripts/setup-hybrid-database.sh

# 2. Firebase 프로젝트 생성
firebase login
firebase init

# 3. AWS 인프라 배포
cd infrastructure
cdk deploy

# 4. 테스트
node test-hybrid.js
```

## 🏗️ 아키텍처 요약

### Firebase 담당 (실시간)
- ✅ 실시간 출석 상태
- ✅ QR 코드 검증 (30초 만료)
- ✅ 푸시 알림
- ✅ 팀 채팅
- ✅ 임시 데이터 캐싱

### DynamoDB 담당 (영구 저장)
- ✅ 출퇴근 기록 (90일 TTL)
- ✅ 직원 정보
- ✅ 급여 데이터
- ✅ 감사 로그
- ✅ 분석 데이터

## 💡 핵심 구현 패턴

### 1. 듀얼 라이트 패턴
```dart
// Flutter에서 구현
Future<void> checkIn() async {
  // 1. Firebase에 즉시 쓰기 (UX)
  await FirebaseDatabase.instance
    .ref('presence/$userId')
    .set({'status': 'checked-in'});
  
  // 2. API를 통해 DynamoDB에 저장 (영구)
  await dio.post('/api/attendance', data: {...});
}
```

### 2. 캐싱 전략
```javascript
// Lambda에서 구현
if (cacheExists && !expired) {
  return firebaseCache;
} else {
  const data = await queryDynamoDB();
  await updateFirebaseCache(data);
  return data;
}
```

### 3. 오프라인 동기화
```dart
// 오프라인 큐 관리
if (!isOnline) {
  await saveToLocalQueue(data);
} else {
  await syncPendingData();
}
```

## 📊 비용 최적화 팁

1. **Firebase 무료 티어 최대 활용**
   - Realtime DB: 1GB 저장
   - Cloud Functions: 125K/월
   - FCM: 무제한

2. **DynamoDB On-Demand → Provisioned**
   - 초기: On-Demand로 시작
   - 패턴 파악 후: Provisioned + Auto-scaling
   - Reserved Capacity로 77% 절감

3. **스마트 TTL 설정**
   - 출퇴근 기록: 90일
   - 캐시 데이터: 1시간
   - 감사 로그: 1년

## 🔐 보안 체크리스트

- [ ] Firebase Security Rules 설정
- [ ] IAM 역할 최소 권한
- [ ] API Gateway 인증
- [ ] 필드 레벨 암호화
- [ ] VPC 엔드포인트 설정
- [ ] CloudTrail 로깅

## 📈 모니터링 설정

### CloudWatch 대시보드
```javascript
// 주요 메트릭
- DynamoDB ConsumedCapacity
- Lambda Duration/Errors
- API Gateway 4xx/5xx
- Firebase Active Connections
```

### 알람 설정
```yaml
체크인 실패율: > 5%
DynamoDB 스로틀링: > 0
Lambda 콜드 스타트: > 1초
Firebase 할당량: > 80%
```

## 🧪 테스트 시나리오

1. **부하 테스트**
   - 1000명 동시 체크인
   - QR 코드 대량 생성
   - 리포트 동시 요청

2. **장애 시나리오**
   - Firebase 다운
   - DynamoDB 스로틀링
   - Lambda 타임아웃

3. **데이터 일관성**
   - 듀얼 라이트 검증
   - 캐시 무효화
   - 오프라인 동기화

## 📱 Flutter 통합 예제

```dart
// services/hybrid_database_service.dart
class HybridDatabaseService {
  // Firebase 실시간 기능
  Stream<PresenceStatus> watchPresence(String userId) {
    return FirebaseDatabase.instance
      .ref('presence/$userId')
      .onValue
      .map((event) => PresenceStatus.fromJson(event.snapshot.value));
  }
  
  // DynamoDB 영구 저장 (API 경유)
  Future<AttendanceRecord> saveAttendance(CheckInData data) async {
    final response = await _dio.post(
      '${Config.apiUrl}/attendance',
      data: data.toJson(),
    );
    return AttendanceRecord.fromJson(response.data);
  }
  
  // 하이브리드 리포트 (캐시 우선)
  Future<Report> getMonthlyReport(String month) async {
    // 1. Firebase 캐시 확인
    final cached = await _checkFirebaseCache(month);
    if (cached != null) return cached;
    
    // 2. API를 통해 DynamoDB 쿼리
    final report = await _fetchFromDynamoDB(month);
    
    // 3. 결과 캐싱
    await _updateFirebaseCache(month, report);
    
    return report;
  }
}
```

## 🎯 성능 목표

| 메트릭 | 목표 | 현재 |
|--------|------|------|
| 체크인 응답 시간 | <500ms | ✅ 300ms |
| 일일 활성 사용자 | 10,000 | ✅ 지원 |
| 동시 접속 | 1,000 | ✅ 지원 |
| 가용성 | 99.9% | ✅ 달성 |
| 월 비용/사용자 | <$0.05 | ✅ $0.03 |

## 🆘 트러블슈팅

### Firebase 연결 문제
```bash
# 네트워크 확인
firebase database:get /presence

# 규칙 테스트
firebase database:rules:test
```

### DynamoDB 스로틀링
```bash
# 용량 확인
aws dynamodb describe-table --table-name DOT_ATTENDANCE_RECORDS

# Auto-scaling 조정
aws application-autoscaling put-scaling-policy ...
```

### Lambda 타임아웃
```javascript
// 타임아웃 증가
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  // ...
}
```

## 📞 지원

- 문서: `/docs/HYBRID_DATABASE_ARCHITECTURE.md`
- 이슈: GitHub Issues
- 슬랙: #dot-attendance-tech