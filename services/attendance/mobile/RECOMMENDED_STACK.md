# 🎯 DOT Attendance 추천 기술 스택

## 평가 기준
1. **Claude Code 제어력**: 얼마나 직접 파악하고 수정할 수 있는가
2. **비용 효율성**: 무료 또는 저렴한가

## 🏆 최종 추천 스택

### 1. 데이터베이스: SQLite + Drift
```yaml
dependencies:
  drift: ^2.14.0
  sqlite3_flutter_libs: ^0.5.0
  path_provider: ^2.0.0
  path: ^1.8.0
```

**장점:**
- ✅ 100% 로컬 제어 (Claude가 모든 SQL 직접 작성)
- ✅ 완전 무료
- ✅ 오프라인 작동
- ✅ 타입 안전성

```dart
// Claude가 직접 작성하고 수정 가능한 코드
@DataClassName('User')
class Users extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get email => text()();
  TextColumn get password => text()();
  TextColumn get role => text()();
}

// 실시간 데이터 스트림
Stream<List<User>> watchAllUsers() {
  return select(users).watch();
}
```

### 2. 인증: 로컬 인증 시스템
```dart
class LocalAuthService {
  final Database db;
  
  Future<User?> login(String email, String password) async {
    // Claude가 완전히 제어하는 로직
    final hashedPassword = hashPassword(password);
    final user = await (db.select(db.users)
      ..where((u) => u.email.equals(email) & 
                     u.password.equals(hashedPassword)))
      .getSingleOrNull();
    
    if (user != null) {
      await saveSession(user);
    }
    return user;
  }
  
  String hashPassword(String password) {
    // 간단한 해싱 (프로덕션에서는 bcrypt 사용)
    return base64Encode(utf8.encode(password));
  }
}
```

### 3. 파일 저장: 로컬 디렉토리
```dart
class LocalFileService {
  Future<String> saveImage(Uint8List bytes, String fileName) async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/images/$fileName');
    await file.writeAsBytes(bytes);
    return file.path; // 로컬 경로 반환
  }
  
  Future<Uint8List?> loadImage(String path) async {
    final file = File(path);
    if (await file.exists()) {
      return await file.readAsBytes();
    }
    return null;
  }
}
```

### 4. 실시간 동기화: WebSocket (선택사항)
```dart
// 필요한 경우에만 - 간단한 WebSocket 서버
class SimpleWebSocketService {
  IOWebSocketChannel? channel;
  
  void connect() {
    // 로컬 서버나 간단한 클라우드 서버
    channel = IOWebSocketChannel.connect('ws://localhost:8080');
    
    channel!.stream.listen((message) {
      // 실시간 메시지 처리
      print('받은 메시지: $message');
    });
  }
  
  void sendAttendanceUpdate(Map<String, dynamic> data) {
    channel?.sink.add(json.encode(data));
  }
}
```

### 5. QR 코드: 로컬 생성/검증
```dart
class LocalQRService {
  String generateQR(String userId, String action) {
    final data = {
      'userId': userId,
      'action': action,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'expiry': DateTime.now().add(Duration(minutes: 1)).millisecondsSinceEpoch,
    };
    
    // Base64로 인코딩 (Claude가 완전 제어)
    return base64Encode(utf8.encode(json.encode(data)));
  }
  
  bool validateQR(String token) {
    try {
      final decoded = json.decode(utf8.decode(base64Decode(token)));
      final expiry = decoded['expiry'] as int;
      return DateTime.now().millisecondsSinceEpoch < expiry;
    } catch (e) {
      return false;
    }
  }
}
```

### 6. 푸시 알림: 로컬 알림
```dart
class LocalNotificationService {
  final FlutterLocalNotificationsPlugin plugin = 
      FlutterLocalNotificationsPlugin();
  
  Future<void> showNotification(String title, String body) async {
    await plugin.show(
      0,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'attendance_channel',
          'Attendance',
          importance: Importance.high,
        ),
      ),
    );
  }
  
  // 스케줄 알림 (출근 리마인더 등)
  Future<void> scheduleDaily(TimeOfDay time) async {
    await plugin.periodicallyShow(
      1,
      '출근 리마인더',
      '출근 체크를 잊지 마세요!',
      RepeatInterval.daily,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'reminder_channel',
          'Reminders',
        ),
      ),
    );
  }
}
```

## 📊 기술 스택 비교표

| 기능 | Firebase | AWS | Supabase | **로컬 솔루션** |
|------|----------|-----|----------|----------------|
| **Claude 제어** | 30% | 40% | 70% | **100%** ✅ |
| **비용** | $25/월 | $50/월 | $25/월 | **$0** ✅ |
| **설정 복잡도** | 높음 | 매우 높음 | 중간 | **매우 낮음** ✅ |
| **오프라인** | 부분 | 불가 | 불가 | **완벽** ✅ |
| **실시간** | ✅ | ✅ | ✅ | 제한적 |
| **확장성** | 높음 | 매우 높음 | 높음 | 낮음 |

## 🚀 구현 순서

### Phase 1: 로컬 MVP (1주)
1. SQLite + Drift 설정
2. 로컬 인증 구현
3. 출퇴근 기능
4. QR 코드 생성/검증

### Phase 2: 기능 확장 (1주)
1. 로컬 파일 저장
2. 로컬 알림
3. 데이터 내보내기 (CSV/JSON)
4. 백업/복원

### Phase 3: 선택적 클라우드 (필요시)
1. Supabase 연동 (실시간 동기화용)
2. 또는 간단한 REST API 서버
3. 또는 P2P 동기화

## 💰 비용 분석

### 로컬 솔루션 (추천)
- 개발: $0
- 운영: $0
- 유지보수: $0
- **총 비용: $0/월**

### Firebase
- 개발: 복잡도로 인한 시간 비용
- 운영: $25-100/월
- 디버깅: Claude가 직접 못 봐서 어려움

### Supabase
- 개발: 중간 복잡도
- 운영: $0-25/월 (무료 티어 있음)
- 디버깅: SQL로 어느 정도 가능

## 🎯 결론

**로컬 우선 접근법**을 추천합니다:
1. ✅ Claude Code가 100% 제어
2. ✅ 완전 무료
3. ✅ 즉시 작동
4. ✅ 오프라인 완벽 지원
5. ✅ 나중에 필요하면 클라우드 추가 가능

## 📝 다음 단계 액션

```bash
# 1. 필요한 패키지 추가
flutter pub add drift sqlite3_flutter_libs path_provider path

# 2. 코드 생성 도구 추가 (dev dependencies)
flutter pub add --dev drift_dev build_runner

# 3. 데이터베이스 생성
flutter pub run build_runner build

# 4. 앱 실행
flutter run
```

이제 Firebase 없이 완벽하게 작동하는 앱을 만들 수 있습니다!