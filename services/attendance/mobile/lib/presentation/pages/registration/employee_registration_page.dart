import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/neo_brutal_theme.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/common/neo_brutal_card.dart';
import '../../widgets/common/neo_brutal_text_field.dart';
import '../../providers/employee_registration_provider.dart';

class EmployeeRegistrationPage extends ConsumerStatefulWidget {
  final String? qrToken;
  final String? locationId;
  
  const EmployeeRegistrationPage({
    super.key,
    this.qrToken,
    this.locationId,
  });

  @override
  ConsumerState<EmployeeRegistrationPage> createState() => _EmployeeRegistrationPageState();
}

class _EmployeeRegistrationPageState extends ConsumerState<EmployeeRegistrationPage> {
  final _formKey = GlobalKey<FormState>();
  
  // Controllers
  final _employeeCodeController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();
  final _confirmPinController = TextEditingController();
  
  bool _isLoading = false;
  bool _obscurePin = true;
  bool _obscureConfirmPin = true;

  @override
  void dispose() {
    _employeeCodeController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _pinController.dispose();
    _confirmPinController.dispose();
    super.dispose();
  }

  Future<void> _handleRegistration() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    try {
      // Haptic feedback
      await HapticFeedback.mediumImpact();
      
      final success = await ref.read(employeeRegistrationProvider.notifier).registerEmployee(
        employeeCode: _employeeCodeController.text.trim(),
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim(),
        pin: _pinController.text,
        qrToken: widget.qrToken,
        locationId: widget.locationId,
      );
      
      if (success && mounted) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('직원 등록이 완료되었습니다!'),
            backgroundColor: NeoBrutalTheme.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
              side: const BorderSide(
                color: NeoBrutalTheme.fg,
                width: NeoBrutalTheme.borderThick,
              ),
            ),
          ),
        );
        
        // Navigate to attendance page
        context.go('/main/attendance');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('등록 실패: ${e.toString()}'),
            backgroundColor: NeoBrutalTheme.error,
            behavior: SnackBarBehavior.floating,
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
    final registrationState = ref.watch(employeeRegistrationProvider);
    
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: const Text('직원 등록'),
        backgroundColor: NeoBrutalTheme.bg,
        foregroundColor: NeoBrutalTheme.fg,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(NeoBrutalTheme.space4),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                NeoBrutalCard(
                  backgroundColor: NeoBrutalTheme.primary,
                  child: Column(
                    children: [
                      Icon(
                        Icons.person_add,
                        size: 48,
                        color: NeoBrutalTheme.bg,
                      ),
                      const SizedBox(height: NeoBrutalTheme.space2),
                      Text(
                        'DOT 출근부 시스템',
                        style: NeoBrutalTheme.h2.copyWith(
                          color: NeoBrutalTheme.bg,
                        ),
                      ),
                      const SizedBox(height: NeoBrutalTheme.space1),
                      Text(
                        '처음 방문하신 직원분은 아래 정보를 입력해주세요',
                        style: NeoBrutalTheme.body.copyWith(
                          color: NeoBrutalTheme.bg,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: NeoBrutalTheme.space6),
                
                // Employee Code
                NeoBrutalTextField(
                  controller: _employeeCodeController,
                  label: '사번',
                  hintText: '직원 번호를 입력하세요',
                  prefixIcon: Icons.badge,
                  textInputAction: TextInputAction.next,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '사번을 입력해주세요';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: NeoBrutalTheme.space4),
                
                // Name fields
                Row(
                  children: [
                    Expanded(
                      child: NeoBrutalTextField(
                        controller: _lastNameController,
                        label: '성',
                        hintText: '성',
                        prefixIcon: Icons.person_outline,
                        textInputAction: TextInputAction.next,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return '성을 입력해주세요';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: NeoBrutalTheme.space3),
                    Expanded(
                      child: NeoBrutalTextField(
                        controller: _firstNameController,
                        label: '이름',
                        hintText: '이름',
                        textInputAction: TextInputAction.next,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return '이름을 입력해주세요';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: NeoBrutalTheme.space4),
                
                // Email
                NeoBrutalTextField(
                  controller: _emailController,
                  label: '이메일',
                  hintText: 'example@company.com',
                  prefixIcon: Icons.email,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '이메일을 입력해주세요';
                    }
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                      return '올바른 이메일 형식이 아닙니다';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: NeoBrutalTheme.space4),
                
                // Phone
                NeoBrutalTextField(
                  controller: _phoneController,
                  label: '전화번호',
                  hintText: '010-0000-0000',
                  prefixIcon: Icons.phone,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9-]')),
                    LengthLimitingTextInputFormatter(13),
                  ],
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '전화번호를 입력해주세요';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: NeoBrutalTheme.space4),
                
                // PIN Code
                NeoBrutalTextField(
                  controller: _pinController,
                  label: 'PIN 코드 (4자리)',
                  hintText: '4자리 숫자',
                  prefixIcon: Icons.lock,
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePin ? Icons.visibility : Icons.visibility_off),
                    onPressed: () => setState(() => _obscurePin = !_obscurePin),
                  ),
                  obscureText: _obscurePin,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.next,
                  maxLength: 4,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(4),
                  ],
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'PIN 코드를 입력해주세요';
                    }
                    if (value.length != 4) {
                      return 'PIN 코드는 4자리여야 합니다';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: NeoBrutalTheme.space4),
                
                // Confirm PIN
                NeoBrutalTextField(
                  controller: _confirmPinController,
                  label: 'PIN 코드 확인',
                  hintText: 'PIN 코드 재입력',
                  prefixIcon: Icons.lock_outline,
                  suffixIcon: IconButton(
                    icon: Icon(_obscureConfirmPin ? Icons.visibility : Icons.visibility_off),
                    onPressed: () => setState(() => _obscureConfirmPin = !_obscureConfirmPin),
                  ),
                  obscureText: _obscureConfirmPin,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.done,
                  maxLength: 4,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(4),
                  ],
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'PIN 코드를 다시 입력해주세요';
                    }
                    if (value != _pinController.text) {
                      return 'PIN 코드가 일치하지 않습니다';
                    }
                    return null;
                  },
                  onFieldSubmitted: (_) => _handleRegistration(),
                ),
                
                const SizedBox(height: NeoBrutalTheme.space6),
                
                // Register Button
                NeoBrutalButton(
                  onPressed: _isLoading || registrationState.isLoading 
                      ? null 
                      : _handleRegistration,
                  backgroundColor: NeoBrutalTheme.success,
                  foregroundColor: NeoBrutalTheme.white,
                  child: _isLoading || registrationState.isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(
                            color: NeoBrutalTheme.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.check_circle),
                            SizedBox(width: NeoBrutalTheme.space2),
                            Text('등록 완료'),
                          ],
                        ),
                ),
                
                // Error message
                if (registrationState.error != null) ...[
                  const SizedBox(height: NeoBrutalTheme.space4),
                  NeoBrutalCard(
                    backgroundColor: NeoBrutalTheme.error,
                    child: Row(
                      children: [
                        const Icon(
                          Icons.error,
                          color: NeoBrutalTheme.white,
                        ),
                        const SizedBox(width: NeoBrutalTheme.space2),
                        Expanded(
                          child: Text(
                            registrationState.error!,
                            style: NeoBrutalTheme.body.copyWith(
                              color: NeoBrutalTheme.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}