import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';

class TodayScheduleCard extends ConsumerWidget {
  final AsyncValue scheduleData;

  const TodayScheduleCard({
    super.key,
    required this.scheduleData,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return scheduleData.when(
      data: (schedule) => NeoBrutalCard(
        padding: const EdgeInsets.all(NeoBrutalTheme.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '오늘 스케줄',
              style: NeoBrutalTheme.body.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: NeoBrutalTheme.space2),
            // TODO: Implement schedule display
            Text('직원 ${schedule.length}명 근무 예정'),
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
