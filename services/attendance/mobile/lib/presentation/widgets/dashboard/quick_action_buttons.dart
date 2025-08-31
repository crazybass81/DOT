import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';
import '../../providers/attendance_provider.dart';
import '../../pages/attendance/attendance_history_page.dart';
import '../attendance/checkout_dialog.dart';

/// 사용자를 위한 빠른 액션 버튼들
class QuickActionButtons extends ConsumerWidget {
  const QuickActionButtons({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todayAttendance = ref.watch(todayAttendanceProvider);
    
    // Check if user has already checked in today
    final hasCheckedIn = todayAttendance.maybeWhen(
      data: (attendance) => attendance?.checkInTime != null,
      orElse: () => false,
    );
    
    // Check if user has already checked out today
    final hasCheckedOut = todayAttendance.maybeWhen(
      data: (attendance) => attendance?.checkOutTime != null,
      orElse: () => false,
    );
    
    return Column(
      children: [
        // Primary attendance buttons - larger and more prominent
        Row(
          children: [
            Expanded(
              child: _buildPrimaryAttendanceButton(
                context,
                ref,
                '출근',
                Icons.login_rounded,
                NeoBrutalTheme.success,
                hasCheckedIn,
                false, // isCheckOut
              ),
            ),
            const SizedBox(width: NeoBrutalTheme.space3),
            Expanded(
              child: _buildPrimaryAttendanceButton(
                context,
                ref,
                '퇴근',
                Icons.logout_rounded,
                NeoBrutalTheme.error,
                hasCheckedOut || !hasCheckedIn, // Disable if not checked in or already checked out
                true, // isCheckOut
              ),
            ),
          ],
        ),
        const SizedBox(height: NeoBrutalTheme.space4),
        
        // Secondary action buttons - smaller grid
        GridView.count(
          crossAxisCount: 2,
          childAspectRatio: 2.5,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: NeoBrutalTheme.space3,
          crossAxisSpacing: NeoBrutalTheme.space3,
          children: [
            _buildActionButton(
              context,
              '휴게 신청',
              Icons.coffee,
              NeoBrutalTheme.pastelMint,
              () {
                // 휴게 신청 페이지
              },
            ),
            _buildActionButton(
              context,
              '스케줄 보기',
              Icons.calendar_today,
              NeoBrutalTheme.pastelSky,
              () {
                // 스케줄 페이지
              },
            ),
            _buildActionButton(
              context,
              '근무 기록',
              Icons.history,
              NeoBrutalTheme.pastelPink,
              () {
                // 근무 기록 페이지로 이동
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const AttendanceHistoryPage(),
                  ),
                );
              },
            ),
            _buildActionButton(
              context,
              'QR 스캔',
              Icons.qr_code_scanner,
              NeoBrutalTheme.hi,
              () {
                // QR 스캔 페이지로 이동
              },
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPrimaryAttendanceButton(
    BuildContext context,
    WidgetRef ref,
    String title,
    IconData icon,
    Color accentColor,
    bool isDisabled,
    bool isCheckOut,
  ) {
    final Color effectiveColor = isDisabled ? NeoBrutalTheme.muted : accentColor;
    
    return NeoBrutalCard(
      onTap: isDisabled ? null : () async {
        // Handle check-in or check-out
        try {
          if (isCheckOut) {
            await ref.read(attendanceServiceProvider).checkOut();
          } else {
            await ref.read(attendanceServiceProvider).checkIn();
          }
          // Refresh the attendance data
          ref.invalidate(todayAttendanceProvider);
          
          // Show success message
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(isCheckOut ? '퇴근 처리되었습니다' : '출근 처리되었습니다'),
                backgroundColor: NeoBrutalTheme.success,
              ),
            );
          }
        } catch (e) {
          // Show error message
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('오류가 발생했습니다: $e'),
                backgroundColor: NeoBrutalTheme.error,
              ),
            );
          }
        }
      },
      backgroundColor: effectiveColor.withOpacity(0.1),
      borderColor: effectiveColor,
      padding: const EdgeInsets.symmetric(
        vertical: NeoBrutalTheme.space5,
        horizontal: NeoBrutalTheme.space4,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            color: effectiveColor,
            size: 40,
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            title,
            style: NeoBrutalTheme.heading.copyWith(
              color: effectiveColor,
              fontSize: 20,
            ),
            textAlign: TextAlign.center,
          ),
          if (isDisabled) ...[
            const SizedBox(height: NeoBrutalTheme.space1),
            Text(
              isCheckOut && !isDisabled 
                ? '출근 먼저 해주세요' 
                : (title == '출근' ? '이미 출근했습니다' : '이미 퇴근했습니다'),
              style: NeoBrutalTheme.micro.copyWith(
                color: effectiveColor.withOpacity(0.7),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionButton(
    BuildContext context,
    String title,
    IconData icon,
    Color accentColor,
    VoidCallback onTap,
  ) {
    return NeoBrutalCard(
      onTap: onTap,
      backgroundColor: accentColor.withOpacity(0.1),
      borderColor: accentColor,
      padding: const EdgeInsets.all(NeoBrutalTheme.space3),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            color: accentColor,
            size: 24,
          ),
          const SizedBox(height: NeoBrutalTheme.space1),
          Text(
            title,
            style: NeoBrutalTheme.caption.copyWith(
              fontWeight: FontWeight.w700,
              fontSize: 12,
              color: accentColor,
            ),
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
