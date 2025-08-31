import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../providers/attendance_provider.dart';

/// PLAN-1 요구사항: 퇴근 확인 다이얼로그
class CheckoutDialog extends ConsumerWidget {
  const CheckoutDialog({super.key});

  static Future<bool?> show(BuildContext context) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const CheckoutDialog(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendanceState = ref.watch(attendanceProvider);
    
    // 근무 시간 계산
    final now = DateTime.now();
    int totalMinutes = 0;
    if (attendanceState.checkInTime != null) {
      totalMinutes = now.difference(attendanceState.checkInTime!).inMinutes;
    }
    final actualWorkMinutes = totalMinutes - attendanceState.breakMinutes;
    
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: NeoBrutalTheme.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: NeoBrutalTheme.fg,
            width: 4,
          ),
          boxShadow: [
            BoxShadow(
              offset: const Offset(6, 6),
              color: NeoBrutalTheme.fg,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 헤더
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: NeoBrutalTheme.primary,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(8),
                  topRight: Radius.circular(8),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.logout_rounded,
                      color: NeoBrutalTheme.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '퇴근 확인',
                    style: NeoBrutalTheme.heading.copyWith(
                      color: NeoBrutalTheme.white,
                      fontSize: 20,
                    ),
                  ),
                ],
              ),
            ),
            
            // 본문
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '오늘의 근무를 종료하시겠습니까?',
                    style: NeoBrutalTheme.body.copyWith(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // 근무 시간 요약
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.bg2,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: NeoBrutalTheme.fg.withOpacity(0.2),
                        width: 2,
                      ),
                    ),
                    child: Column(
                      children: [
                        _SummaryRow(
                          icon: Icons.login_rounded,
                          label: '출근 시간',
                          value: attendanceState.checkInTime != null
                              ? '${attendanceState.checkInTime!.hour.toString().padLeft(2, '0')}:${attendanceState.checkInTime!.minute.toString().padLeft(2, '0')}'
                              : '-',
                          color: NeoBrutalTheme.success,
                        ),
                        const SizedBox(height: 12),
                        _SummaryRow(
                          icon: Icons.logout_rounded,
                          label: '퇴근 시간',
                          value: '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
                          color: NeoBrutalTheme.error,
                        ),
                        const Divider(height: 24),
                        _SummaryRow(
                          icon: Icons.timer_outlined,
                          label: '총 근무',
                          value: _formatMinutes(totalMinutes),
                          color: NeoBrutalTheme.primary,
                        ),
                        const SizedBox(height: 12),
                        _SummaryRow(
                          icon: Icons.coffee_outlined,
                          label: '휴게 시간',
                          value: _formatMinutes(attendanceState.breakMinutes),
                          color: NeoBrutalTheme.warning,
                        ),
                        const Divider(height: 24),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: NeoBrutalTheme.success.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: NeoBrutalTheme.success,
                              width: 2,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.check_circle_outline,
                                color: NeoBrutalTheme.success,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '실 근무: ',
                                style: NeoBrutalTheme.body,
                              ),
                              Text(
                                _formatMinutes(actualWorkMinutes),
                                style: NeoBrutalTheme.heading.copyWith(
                                  fontSize: 18,
                                  color: NeoBrutalTheme.success,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // 버튼
                  Row(
                    children: [
                      Expanded(
                        child: _DialogButton(
                          onPressed: () {
                            Navigator.of(context).pop(false);
                          },
                          label: '취소',
                          color: NeoBrutalTheme.gray300,
                          textColor: NeoBrutalTheme.fg,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _DialogButton(
                          onPressed: attendanceState.isLoading
                              ? null
                              : () async {
                                  await HapticFeedback.heavyImpact();
                                  await ref.read(attendanceProvider.notifier).performCheckOut();
                                  if (context.mounted) {
                                    Navigator.of(context).pop(true);
                                  }
                                },
                          label: attendanceState.isLoading ? '처리중...' : '퇴근하기',
                          color: NeoBrutalTheme.error,
                          textColor: NeoBrutalTheme.white,
                          isLoading: attendanceState.isLoading,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatMinutes(int minutes) {
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    return '${hours}시간 ${mins}분';
  }
}

/// 요약 행 위젯
class _SummaryRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 8),
        Text(
          label,
          style: NeoBrutalTheme.body.copyWith(
            color: NeoBrutalTheme.fg.withOpacity(0.7),
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: NeoBrutalTheme.body.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}

/// 다이얼로그 버튼
class _DialogButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final String label;
  final Color color;
  final Color textColor;
  final bool isLoading;

  const _DialogButton({
    required this.onPressed,
    required this.label,
    required this.color,
    required this.textColor,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: onPressed == null ? NeoBrutalTheme.gray300 : color,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: NeoBrutalTheme.fg,
            width: 3,
          ),
          boxShadow: onPressed == null
              ? []
              : [
                  BoxShadow(
                    offset: const Offset(3, 3),
                    color: NeoBrutalTheme.fg,
                  ),
                ],
        ),
        child: Center(
          child: isLoading
              ? SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    color: textColor,
                    strokeWidth: 2,
                  ),
                )
              : Text(
                  label,
                  style: NeoBrutalTheme.button.copyWith(
                    color: textColor,
                  ),
                ),
        ),
      ),
    );
  }
}