import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/common/neo_brutal_input.dart';

/// PLAN-1 요구사항: 신규 사용자 등록 페이지
/// QR 스캔 후 처음 방문한 사용자를 위한 등록 화면
class RegisterPage extends ConsumerStatefulWidget {
  final String? branchId;
  final String? qrCode;

  const RegisterPage({
    super.key,
    this.branchId,
    this.qrCode,
  });

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  
  // PLAN-1 요구사항: 사용자 등록 필드
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _birthDateController = TextEditingController();
  
  DateTime? _selectedBirthDate;
  bool _isLoading = false;
  bool _agreedToTerms = false;

  @override
  void initState() {
    super.initState();
    debugPrint('RegisterPage initialized with branchId: ${widget.branchId}');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _birthDateController.dispose();
    super.dispose();
  }

  Future<void> _selectBirthDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(2000),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData(
            colorScheme: ColorScheme.light(
              primary: NeoBrutalTheme.hi,
              onPrimary: Colors.white,
              surface: NeoBrutalTheme.bg,
              onSurface: NeoBrutalTheme.fg,
            ),
            dialogBackgroundColor: NeoBrutalTheme.bg,
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedBirthDate = picked;
        _birthDateController.text = 
            '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _handleRegistration() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (!_agreedToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('이용약관에 동의해주세요'),
          backgroundColor: NeoBrutalTheme.error,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // TODO: 실제 API 연동 필요
      // PLAN-1 요구사항: 사용자 등록 및 토큰 발급
      await Future.delayed(const Duration(seconds: 2)); // 임시 딜레이

      // 디바이스 ID 생성 (실제로는 device_info_plus 패키지 사용)
      final deviceId = 'device_${DateTime.now().millisecondsSinceEpoch}';
      
      // 사용자 등록 데이터
      final registrationData = {
        'name': _nameController.text.trim(),
        'phone': _phoneController.text.trim(),
        'email': _emailController.text.trim(),
        'birthDate': _birthDateController.text,
        'branchId': widget.branchId ?? 'default',
        'deviceId': deviceId,
      };

      debugPrint('Registration data: $registrationData');

      // 등록 성공 시 자동 로그인
      final token = 'user_token_${DateTime.now().millisecondsSinceEpoch}';
      await ref.read(authProvider.notifier).loginWithQrToken(token, 'register');

      if (mounted) {
        // 대시보드로 이동
        context.go('/dashboard');
      }
    } catch (e) {
      debugPrint('Registration error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('등록 중 오류가 발생했습니다: $e'),
            backgroundColor: NeoBrutalTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        backgroundColor: NeoBrutalTheme.bg,
        title: Text(
          '사용자 등록',
          style: NeoBrutalTheme.heading,
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 안내 메시지
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.hi.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: NeoBrutalTheme.hi,
                      width: 2,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        color: NeoBrutalTheme.hi,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'QR 코드로 처음 방문하셨습니다.\n간단한 정보를 입력해주세요.',
                          style: NeoBrutalTheme.body,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // 이름 입력 (PLAN-1: 필수, 2-50자)
                NeoBrutalInput(
                  controller: _nameController,
                  label: '이름 *',
                  hintText: '홍길동',
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '이름을 입력해주세요';
                    }
                    if (value.length < 2 || value.length > 50) {
                      return '이름은 2-50자 사이여야 합니다';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // 전화번호 입력 (PLAN-1: 필수, 정규식: /^010-\d{4}-\d{4}$/)
                NeoBrutalInput(
                  controller: _phoneController,
                  label: '전화번호 *',
                  hintText: '010-1234-5678',
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9-]')),
                    LengthLimitingTextInputFormatter(13),
                  ],
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '전화번호를 입력해주세요';
                    }
                    // PLAN-1 정규식 검증
                    if (!RegExp(r'^010-\d{4}-\d{4}$').hasMatch(value)) {
                      return '올바른 형식으로 입력해주세요 (010-1234-5678)';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // 이메일 입력 (PLAN-1: 필수, 이메일 형식)
                NeoBrutalInput(
                  controller: _emailController,
                  label: '이메일 *',
                  hintText: 'example@email.com',
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '이메일을 입력해주세요';
                    }
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                      return '올바른 이메일 형식으로 입력해주세요';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // 생년월일 입력 (PLAN-1: 필수, YYYY-MM-DD)
                GestureDetector(
                  onTap: _selectBirthDate,
                  child: AbsorbPointer(
                    child: NeoBrutalInput(
                      controller: _birthDateController,
                      label: '생년월일 *',
                      hintText: 'YYYY-MM-DD',
                      suffixIcon: Icon(
                        Icons.calendar_today_rounded,
                        color: NeoBrutalTheme.fg,
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return '생년월일을 선택해주세요';
                        }
                        return null;
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // 이용약관 동의
                Row(
                  children: [
                    Checkbox(
                      value: _agreedToTerms,
                      onChanged: (value) {
                        setState(() {
                          _agreedToTerms = value ?? false;
                        });
                      },
                      activeColor: NeoBrutalTheme.hi,
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _agreedToTerms = !_agreedToTerms;
                          });
                        },
                        child: Text(
                          '이용약관 및 개인정보 처리방침에 동의합니다',
                          style: NeoBrutalTheme.body,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // 등록 버튼
                NeoBrutalButton(
                  onPressed: _isLoading ? null : _handleRegistration,
                  label: _isLoading ? '등록 중...' : '등록하기',
                  color: NeoBrutalTheme.hi,
                  isLoading: _isLoading,
                ),
                const SizedBox(height: 16),

                // 지점 정보 표시
                if (widget.branchId != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.bg2,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: NeoBrutalTheme.fg.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.location_on_rounded,
                          size: 16,
                          color: NeoBrutalTheme.fg.withOpacity(0.6),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '지점: ${widget.branchId}',
                          style: NeoBrutalTheme.caption.copyWith(
                            color: NeoBrutalTheme.fg.withOpacity(0.6),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}