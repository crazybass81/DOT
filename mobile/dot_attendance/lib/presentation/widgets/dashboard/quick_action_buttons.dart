import 'package:flutter/material.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';

/// 사용자를 위한 빠른 액션 버튼들
class QuickActionButtons extends StatelessWidget {
  const QuickActionButtons({super.key});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      childAspectRatio: 2.0,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: NeoBrutalTheme.space3,
      crossAxisSpacing: NeoBrutalTheme.space3,
      children: [
        _buildActionButton(
          context,
          'QR 스캔',
          Icons.qr_code_scanner,
          NeoBrutalTheme.hi,
          () {
            // QR 스캔 페이지로 이동
          },
        ),
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
            // 근무 기록 페이지
          },
        ),
      ],
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
            size: 28,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            title,
            style: NeoBrutalTheme.body.copyWith(
              fontWeight: FontWeight.w700,
              fontSize: 14,
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
