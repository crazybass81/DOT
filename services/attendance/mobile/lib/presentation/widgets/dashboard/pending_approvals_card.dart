import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';

class PendingApprovalsCard extends ConsumerWidget {
  final AsyncValue pendingApprovals;
  final VoidCallback? onTap;

  const PendingApprovalsCard({
    super.key,
    required this.pendingApprovals,
    this.onTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return pendingApprovals.when(
      data: (approvals) => NeoBrutalCard(
        onTap: onTap,
        padding: const EdgeInsets.all(NeoBrutalTheme.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.pending_actions,
                  color: NeoBrutalTheme.warning,
                  size: 24,
                ),
                const SizedBox(width: NeoBrutalTheme.space2),
                Text(
                  '대기 중인 승인',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: NeoBrutalTheme.space2),
            Text(
              '${approvals.length}건',
              style: NeoBrutalTheme.heading.copyWith(
                color: NeoBrutalTheme.warning,
              ),
            ),
          ],
        ),
      ),
      loading: () => NeoBrutalCard(
        padding: const EdgeInsets.all(NeoBrutalTheme.space4),
        child: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, stack) => NeoBrutalCard(
        borderColor: NeoBrutalTheme.error,
        padding: const EdgeInsets.all(NeoBrutalTheme.space4),
        child: Text('Error: $error'),
      ),
    );
  }
}
