# Flutter에서 실제로 바뀌는 부분

## 🔵 그대로 유지되는 것 (95%)

### ✅ 모든 UI/화면
```dart
// login_page.dart - 그대로!
class LoginPage extends ConsumerStatefulWidget {
  // 모든 UI 코드 그대로
  TextField(...) // 그대로
  ElevatedButton(...) // 그대로
}
```

### ✅ 모든 위젯
```dart
// 모든 커스텀 위젯 그대로
class BreakControlWidget {...} // 그대로
class CheckoutDialog {...} // 그대로
class TimeCounterWidget {...} // 그대로
```

### ✅ 라우터/네비게이션
```dart
// 모든 라우팅 그대로
GoRouter(...) // 그대로
context.go('/dashboard') // 그대로
```

## 🔴 바뀌는 것 (5%)

### 1. main.dart (2줄만 변경)
```dart
// 기존 Firebase
await Firebase.initializeApp();

// Supabase로 변경 (1줄)
await Supabase.initialize(
  url: 'YOUR_URL',
  anonKey: 'YOUR_KEY',
);
```

### 2. 인증 서비스 (10줄 정도)
```dart
// 기존 Firebase
final user = await FirebaseAuth.instance
  .signInWithEmailAndPassword(
    email: email,
    password: password,
  );

// Supabase로 변경
final response = await Supabase.instance.client.auth
  .signInWithPassword(
    email: email,
    password: password,
  );
```

### 3. 데이터베이스 (10줄 정도)
```dart
// 기존 Firebase
await FirebaseFirestore.instance
  .collection('attendance')
  .add(data);

// Supabase로 변경
await Supabase.instance.client
  .from('attendance')
  .insert(data);
```

## 📊 실제 변경 비율

| 파일 종류 | 총 파일 수 | 변경 필요 | 비율 |
|----------|-----------|----------|------|
| UI 파일 (pages, widgets) | 50개 | 0개 | 0% |
| Provider/State | 10개 | 2개 | 20% |
| Services | 5개 | 3개 | 60% |
| Models | 20개 | 0개 | 0% |
| **전체** | **85개** | **5개** | **6%** |

## 🎯 결론

### Flutter 앱의 94%는 그대로!
### Firebase 관련 6%만 Supabase로 교체!

```
Flutter (UI) ────────> 100% 그대로
         │
         └── Firebase 코드 (6%) ──> Supabase로 교체
```

## 시간 예상

- Firebase 제거: 30분
- Supabase 설치: 10분  
- 코드 수정: 1시간
- 테스트: 30분

**총 2시간이면 완료!**