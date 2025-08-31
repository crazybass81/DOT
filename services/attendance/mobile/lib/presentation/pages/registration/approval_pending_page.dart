import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'dart:async';

import '../../../core/theme/neo_brutal_theme.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/common/neo_brutal_card.dart';
import '../../providers/employee_registration_provider.dart';
import '../../router/app_router.dart';

class ApprovalPendingPage extends ConsumerStatefulWidget {
  final String? employeeId;
  
  const ApprovalPendingPage({
    super.key,
    this.employeeId,
  });

  @override
  ConsumerState<ApprovalPendingPage> createState() => _ApprovalPendingPageState();
}

class _ApprovalPendingPageState extends ConsumerState<ApprovalPendingPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _pulseAnimation;
  Timer? _statusCheckTimer;

  @override
  void initState() {
    super.initState();
    
    // Setup pulse animation
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(
      begin: 0.95,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
    
    // Start checking approval status periodically
    _startStatusCheck();
  }

  void _startStatusCheck() {
    // Check status every 5 seconds
    _statusCheckTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      await _checkApprovalStatus();
    });
    
    // Initial check
    _checkApprovalStatus();
  }

  Future<void> _checkApprovalStatus() async {
    final status = await ref.read(employeeRegistrationProvider.notifier)
        .checkApprovalStatus(widget.employeeId);
    
    if (status == 'APPROVED' && mounted) {
      // Navigate to user dashboard
      context.go(RouteNames.dashboard);
    } else if (status == 'REJECTED' && mounted) {
      // Show rejection message
      _showRejectionDialog();
    }
  }

  void _showRejectionDialog() {
    final registrationState = ref.read(employeeRegistrationProvider);
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: NeoBrutalTheme.bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
          side: const BorderSide(
            color: NeoBrutalTheme.fg,
            width: NeoBrutalTheme.borderThick,
          ),
        ),
        title: Row(
          children: [
            const Icon(
              Icons.cancel,
              color: NeoBrutalTheme.error,
              size: 28,
            ),
            const SizedBox(width: NeoBrutalTheme.space2),
            Text(
              '등록 거부됨',
              style: NeoBrutalTheme.h3.copyWith(
                color: NeoBrutalTheme.error,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '관리자가 등록 요청을 거부했습니다.',
              style: NeoBrutalTheme.body,
            ),
            if (registrationState.rejectionReason != null) ...[
              const SizedBox(height: NeoBrutalTheme.space3),
              Text(
                '거부 사유:',
                style: NeoBrutalTheme.body.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: NeoBrutalTheme.space1),
              Text(
                registrationState.rejectionReason!,
                style: NeoBrutalTheme.body.copyWith(
                  color: NeoBrutalTheme.loInk,
                ),
              ),
            ],
          ],
        ),
        actions: [
          NeoBrutalButton(
            onPressed: () {
              Navigator.of(context).pop();
              // Go back to registration page
              context.go(RouteNames.employeeRegistration);
            },
            backgroundColor: NeoBrutalTheme.primary,
            foregroundColor: NeoBrutalTheme.bg,
            child: const Text('다시 등록'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _statusCheckTimer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final registrationState = ref.watch(employeeRegistrationProvider);
    
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(NeoBrutalTheme.space4),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Animated Icon
                AnimatedBuilder(
                  animation: _pulseAnimation,
                  builder: (context, child) {
                    return Transform.scale(
                      scale: _pulseAnimation.value,
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: NeoBrutalTheme.warning,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: NeoBrutalTheme.fg,
                            width: NeoBrutalTheme.borderThick,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: NeoBrutalTheme.shadow,
                              offset: Offset(
                                NeoBrutalTheme.shadowOffset,
                                NeoBrutalTheme.shadowOffset,
                              ),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.hourglass_top,
                          size: 60,
                          color: NeoBrutalTheme.fg,
                        ),
                      ),
                    );
                  },
                ),
                
                const SizedBox(height: NeoBrutalTheme.space6),
                
                // Title
                Text(
                  '승인 대기 중',
                  style: NeoBrutalTheme.h1.copyWith(
                    color: NeoBrutalTheme.fg,
                  ),
                ),
                
                const SizedBox(height: NeoBrutalTheme.space3),
                
                // Description
                NeoBrutalCard(
                  backgroundColor: NeoBrutalTheme.lo,
                  child: Column(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: NeoBrutalTheme.loInk,
                        size: 32,
                      ),
                      const SizedBox(height: NeoBrutalTheme.space3),
                      Text(
                        '직원 등록이 완료되었습니다!',
                        style: NeoBrutalTheme.h4.copyWith(
                          color: NeoBrutalTheme.fg,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: NeoBrutalTheme.space2),
                      Text(
                        '관리자의 승인을 기다리고 있습니다.\n승인이 완료되면 자동으로 서비스를 이용하실 수 있습니다.',
                        style: NeoBrutalTheme.body.copyWith(
                          color: NeoBrutalTheme.loInk,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: NeoBrutalTheme.space4),
                
                // Employee Info
                if (registrationState.organizationName != null) ...[
                  NeoBrutalCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildInfoRow(
                          Icons.business,
                          '조직',
                          registrationState.organizationName!,
                        ),
                        if (registrationState.branchName != null) ...[
                          const Divider(height: NeoBrutalTheme.space4),
                          _buildInfoRow(
                            Icons.location_on,
                            '지점',
                            registrationState.branchName!,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: NeoBrutalTheme.space4),
                ],
                
                // Loading indicator
                const SizedBox(
                  height: 24,
                  width: 24,
                  child: CircularProgressIndicator(
                    color: NeoBrutalTheme.hi,
                    strokeWidth: 2,
                  ),
                ),
                
                const SizedBox(height: NeoBrutalTheme.space6),
                
                // Refresh button
                NeoBrutalButton(
                  onPressed: () async {
                    await HapticFeedback.selectionClick();
                    await _checkApprovalStatus();
                    
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('상태를 확인했습니다'),
                          backgroundColor: NeoBrutalTheme.hi,
                          behavior: SnackBarBehavior.floating,
                          duration: const Duration(seconds: 1),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
                            side: const BorderSide(
                              color: NeoBrutalTheme.fg,
                              width: NeoBrutalTheme.borderThin,
                            ),
                          ),
                        ),
                      );
                    }
                  },
                  backgroundColor: NeoBrutalTheme.primary,
                  foregroundColor: NeoBrutalTheme.bg,
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.refresh),
                      SizedBox(width: NeoBrutalTheme.space2),
                      Text('상태 확인'),
                    ],
                  ),
                ),
                
                const SizedBox(height: NeoBrutalTheme.space3),
                
                // Back button
                TextButton(
                  onPressed: () {
                    context.go(RouteNames.masterAdminLogin);
                  },
                  child: Text(
                    '로그인 페이지로 돌아가기',
                    style: NeoBrutalTheme.body.copyWith(
                      color: NeoBrutalTheme.primary,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: NeoBrutalTheme.hi,
        ),
        const SizedBox(width: NeoBrutalTheme.space2),
        Text(
          '$label: ',
          style: NeoBrutalTheme.body.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: NeoBrutalTheme.body.copyWith(
              color: NeoBrutalTheme.loInk,
            ),
          ),
        ),
      ],
    );
  }
}