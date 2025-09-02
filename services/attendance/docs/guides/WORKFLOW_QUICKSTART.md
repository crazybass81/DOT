# 🚀 즉시 시작 가이드

## 현재 상태
- ✅ QR 코드 스캔 기능 구현됨
- ✅ Deep link 설정 완료
- ✅ 기본 대시보드 구조 완성
- ⏳ PLAN-1.md 기능 구현 필요

## 첫 10분: 마스터 어드민 로그인 페이지

### 1단계: 파일 생성 (1분)
```bash
cd /Users/t/Desktop/DOT/services/attendance/mobile
```

### 2단계: 마스터 어드민 로그인 UI 작성 (9분)
`lib/presentation/pages/auth/master_admin_login_page.dart` 생성:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/neo_brutal_theme.dart';

class MasterAdminLoginPage extends ConsumerStatefulWidget {
  const MasterAdminLoginPage({super.key});

  @override
  ConsumerState<MasterAdminLoginPage> createState() => _MasterAdminLoginPageState();
}

class _MasterAdminLoginPageState extends ConsumerState<MasterAdminLoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // 마스터 어드민 아이콘
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.error,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: NeoBrutalTheme.errorInk,
                        width: 3,
                      ),
                    ),
                    child: const Icon(
                      Icons.admin_panel_settings,
                      size: 50,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  Text(
                    '마스터 어드민',
                    style: NeoBrutalTheme.heading,
                  ),
                  const SizedBox(height: 32),
                  
                  // Username 입력
                  TextFormField(
                    controller: _usernameController,
                    decoration: InputDecoration(
                      labelText: 'Username',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Username을 입력해주세요';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  
                  // Password 입력
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Password를 입력해주세요';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 32),
                  
                  // 로그인 버튼
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: NeoBrutalTheme.error,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: BorderSide(
                            color: NeoBrutalTheme.errorInk,
                            width: 3,
                          ),
                        ),
                      ),
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text(
                              '로그인',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      
      // TODO: 다음 10분 작업에서 구현
      // - Admin auth provider 연동
      // - JWT 토큰 처리
      // - 대시보드 라우팅
      
      await Future.delayed(const Duration(seconds: 2)); // 임시 딜레이
      
      setState(() => _isLoading = false);
      
      // 임시 성공 메시지
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('로그인 기능 구현 예정')),
      );
    }
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
```

## 다음 10분 작업들

### Session 1 완료 후 (0:10-0:20)
**Admin Auth Provider 생성**
- JWT 토큰 처리
- Secure storage 연동
- 로그인 상태 관리

### Session 2 (0:20-0:30)
**QR 생성 기능**
- 지점별 고정 QR 생성
- QR 이미지 저장
- 다운로드 기능

### Session 3 (0:30-0:40)
**사용자 등록 플로우**
- QR 스캔 후 체크
- 등록 페이지 UI
- 토큰 발급

## 진행 상황 추적

```bash
# 각 세션 시작 시
echo "Session X 시작: $(date)" >> work_log.txt

# 각 세션 완료 시  
echo "Session X 완료: $(date)" >> work_log.txt
```

## 테스트 명령어

```bash
# 앱 실행
flutter run -d R5CWB0RN4TW

# 핫 리로드
r

# 테스트 실행
flutter test

# 빌드
flutter build apk --debug
```

## 주의사항
- 각 10분 세션은 독립적으로 완성
- TODO 주석으로 다음 작업 명시
- 매 세션 후 커밋 권장
- 테스트 가능한 상태 유지

---

지금 바로 첫 번째 10분 작업을 시작하세요! 🚀