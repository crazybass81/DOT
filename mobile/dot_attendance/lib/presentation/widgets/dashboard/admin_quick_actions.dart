import 'package:flutter/material.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';

/// 관리자를 위한 빠른 액션 버튼들
class AdminQuickActions extends StatelessWidget {
  const AdminQuickActions({super.key});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      childAspectRatio: 2.5,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: NeoBrutalTheme.space3,
      crossAxisSpacing: NeoBrutalTheme.space3,
      children: [
        _buildActionButton(
          'QR 생성',
          Icons.qr_code,
          NeoBrutalTheme.hi,
          () {},
        ),
        _buildActionButton(
          '직원 추가',
          Icons.person_add,
          NeoBrutalTheme.pastelMint,
          () {},
        ),
        _buildActionButton(
          '스케줄 관리',
          Icons.calendar_month,
          NeoBrutalTheme.pastelSky,
          () {},
        ),
        _buildActionButton(
          '승인 처리',
          Icons.check_circle,
          NeoBrutalTheme.pastelPink,
          () {},
        ),
      ],
    );
  }

  Widget _buildActionButton(
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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            color: accentColor,
            size: 20,
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
          Flexible(
            child: Text(
              title,
              style: NeoBrutalTheme.body.copyWith(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: accentColor,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
