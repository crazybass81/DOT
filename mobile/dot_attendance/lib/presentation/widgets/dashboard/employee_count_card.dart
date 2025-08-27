import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';

class EmployeeCountCard extends ConsumerWidget {
  final AsyncValue employeeCount;

  const EmployeeCountCard({
    super.key,
    required this.employeeCount,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return employeeCount.when(
      data: (count) => NeoBrutalCard(
        padding: const EdgeInsets.all(NeoBrutalTheme.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.people,
                  color: NeoBrutalTheme.info,
                  size: 24,
                ),
                const SizedBox(width: NeoBrutalTheme.space2),
                Text(
                  '전체 직원',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: NeoBrutalTheme.space2),
            Text(
              '${count.total}명',
              style: NeoBrutalTheme.heading.copyWith(
                color: NeoBrutalTheme.info,
              ),
            ),
            Text(
              '출근: ${count.present}명',
              style: NeoBrutalTheme.caption,
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
