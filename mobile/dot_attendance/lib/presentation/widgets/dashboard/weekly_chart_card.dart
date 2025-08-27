import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:skeletons/skeletons.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';

/// 주간 근무시간을 차트로 보여주는 위젯
class WeeklyChartCard extends ConsumerWidget {
  final AsyncValue weeklyHours;

  const WeeklyChartCard({
    super.key,
    required this.weeklyHours,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return weeklyHours.when(
      data: (hours) => _buildChartCard(hours),
      loading: () => _buildSkeletonCard(),
      error: (error, stack) => _buildErrorCard(error.toString()),
    ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.2, end: 0);
  }

  Widget _buildChartCard(dynamic hoursData) {
    final weekData = hoursData as List<dynamic>? ?? [];
    final totalHours = weekData.fold<double>(
      0.0, 
      (sum, day) => sum + ((day['hours'] ?? 0.0) as double),
    );
    
    final maxHours = weekData.isNotEmpty 
        ? weekData.map<double>((day) => (day['hours'] ?? 0.0) as double).reduce((a, b) => a > b ? a : b)
        : 8.0;
    
    final targetHours = 40.0; // 주 40시간 기준

    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 주간 통계
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '총 근무시간',
                    style: NeoBrutalTheme.caption,
                  ),
                  Text(
                    '${totalHours.toStringAsFixed(1)}시간',
                    style: NeoBrutalTheme.heading.copyWith(
                      color: totalHours >= targetHours 
                          ? NeoBrutalTheme.success 
                          : NeoBrutalTheme.warning,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '목표 대비',
                    style: NeoBrutalTheme.caption,
                  ),
                  Text(
                    '${((totalHours / targetHours) * 100).toStringAsFixed(1)}%',
                    style: NeoBrutalTheme.body.copyWith(
                      fontWeight: FontWeight.w700,
                      color: totalHours >= targetHours 
                          ? NeoBrutalTheme.success 
                          : NeoBrutalTheme.warning,
                    ),
                  ),
                ],
              ),
            ],
          ),
          
          const SizedBox(height: NeoBrutalTheme.space6),
          
          // 주간 차트
          SizedBox(
            height: 120,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(7, (index) {
                final dayData = index < weekData.length ? weekData[index] : null;
                final hours = (dayData?['hours'] ?? 0.0) as double;
                final dayName = _getDayName(index);
                
                return _buildDayBar(
                  dayName,
                  hours,
                  maxHours,
                  _getDayColor(index),
                ).animate().scale(
                  delay: (index * 100).ms,
                  duration: 400.ms,
                  curve: Curves.elasticOut,
                );
              }),
            ),
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // 바 차트 설명
          Row(
            children: [
              _buildLegendItem('주말', NeoBrutalTheme.pastelMint),
              const SizedBox(width: NeoBrutalTheme.space4),
              _buildLegendItem('평일', NeoBrutalTheme.hi),
              const SizedBox(width: NeoBrutalTheme.space4),
              _buildLegendItem('오늘', NeoBrutalTheme.pastelPink),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDayBar(
    String day,
    double hours,
    double maxHours,
    Color color,
  ) {
    final barHeight = maxHours > 0 ? (hours / maxHours) * 80 : 0.0;
    
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        // 시간 표시
        Text(
          hours > 0 ? hours.toStringAsFixed(1) : '',
          style: NeoBrutalTheme.micro.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        
        // 바 차트
        Container(
          width: 24,
          height: barHeight.clamp(4.0, 80.0),
          decoration: BoxDecoration(
            color: hours > 0 ? color : NeoBrutalTheme.muted,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(4),
              topRight: Radius.circular(4),
            ),
            border: Border.all(
              color: hours > 0 ? color : NeoBrutalTheme.line,
              width: NeoBrutalTheme.borderThin,
            ),
          ),
        ),
        
        const SizedBox(height: 4),
        
        // 요일 라벨
        Text(
          day,
          style: NeoBrutalTheme.micro.copyWith(
            fontWeight: FontWeight.w700,
            color: _isToday(day) 
                ? NeoBrutalTheme.pastelPink 
                : NeoBrutalTheme.fg.withOpacity(0.7),
          ),
        ),
      ],
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
            border: Border.all(
              color: color,
              width: 1,
            ),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: NeoBrutalTheme.micro,
        ),
      ],
    );
  }

  Widget _buildSkeletonCard() {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 헤더 스켈레톤
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonLine(
                    style: SkeletonLineStyle(
                      height: 12,
                      width: 80,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  SkeletonLine(
                    style: SkeletonLineStyle(
                      height: 16,
                      width: 100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  SkeletonLine(
                    style: SkeletonLineStyle(
                      height: 12,
                      width: 60,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  SkeletonLine(
                    style: SkeletonLineStyle(
                      height: 16,
                      width: 80,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ],
          ),
          
          const SizedBox(height: NeoBrutalTheme.space6),
          
          // 차트 스켈레톤
          SizedBox(
            height: 120,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(7, (index) {
                final height = 40.0 + (index % 3) * 20.0; // 다양한 높이
                return Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    SkeletonContainer.rounded(
                      width: 24,
                      height: height,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(4),
                        topRight: Radius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 4),
                    SkeletonLine(
                      style: SkeletonLineStyle(
                        height: 10,
                        width: 16,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                );
              }),
            ),
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // 범례 스켈레톤
          Row(
            children: List.generate(3, (index) => 
              Padding(
                padding: EdgeInsets.only(
                  right: index < 2 ? NeoBrutalTheme.space4 : 0,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SkeletonContainer.rounded(
                      width: 12,
                      height: 12,
                      borderRadius: BorderRadius.circular(2),
                    ),
                    const SizedBox(width: 4),
                    SkeletonLine(
                      style: SkeletonLineStyle(
                        height: 10,
                        width: 30,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard(String error) {
    return NeoBrutalCard(
      borderColor: NeoBrutalTheme.error,
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        children: [
          Icon(
            Icons.error_outline,
            color: NeoBrutalTheme.error,
            size: 48,
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '주간 데이터를 불러올 수 없습니다',
            style: NeoBrutalTheme.body,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  String _getDayName(int index) {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    return days[index];
  }

  Color _getDayColor(int index) {
    final today = DateTime.now().weekday - 1; // Monday = 0
    
    if (index == today) {
      return NeoBrutalTheme.pastelPink; // 오늘
    } else if (index >= 5) {
      return NeoBrutalTheme.pastelMint; // 주말
    } else {
      return NeoBrutalTheme.hi; // 평일
    }
  }

  bool _isToday(String dayName) {
    final today = DateTime.now();
    final todayName = _getDayName(today.weekday - 1);
    return dayName == todayName;
  }
}
