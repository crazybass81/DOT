import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../providers/attendance_provider.dart';
import '../../widgets/common/neo_brutal_card.dart';

/// PLAN-1 요구사항: 근태 이력 조회 페이지
/// 일별, 주별, 월별 필터링으로 근태 기록 확인
class AttendanceHistoryPage extends ConsumerStatefulWidget {
  const AttendanceHistoryPage({super.key});

  @override
  ConsumerState<AttendanceHistoryPage> createState() => _AttendanceHistoryPageState();
}

class _AttendanceHistoryPageState extends ConsumerState<AttendanceHistoryPage> {
  String _selectedFilter = 'daily'; // daily, weekly, monthly
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadAttendanceHistory();
  }

  Future<void> _loadAttendanceHistory() async {
    // 선택된 필터에 따라 데이터 로드
    await ref.read(attendanceProvider.notifier).loadAttendanceHistory(
      filter: _selectedFilter,
      date: _selectedDate,
    );
  }

  @override
  Widget build(BuildContext context) {
    final attendanceState = ref.watch(attendanceProvider);
    final records = attendanceState.todayRecords;

    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: Text(
          '근태 이력',
          style: NeoBrutalTheme.title,
        ),
        backgroundColor: NeoBrutalTheme.bg,
        foregroundColor: NeoBrutalTheme.fg,
        elevation: 0,
      ),
      body: Column(
        children: [
          // 필터 선택
          _buildFilterSection(),
          
          // 날짜 선택기
          _buildDateSelector(),
          
          // 근태 기록 목록
          Expanded(
            child: records.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: records.length,
                    itemBuilder: (context, index) {
                      return _buildAttendanceRecord(records[index]);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterSection() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: NeoBrutalTheme.white,
        border: Border(
          bottom: BorderSide(
            color: NeoBrutalTheme.fg,
            width: 3,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _FilterButton(
            label: '일별',
            value: 'daily',
            selected: _selectedFilter == 'daily',
            onTap: () => _changeFilter('daily'),
          ),
          _FilterButton(
            label: '주별',
            value: 'weekly',
            selected: _selectedFilter == 'weekly',
            onTap: () => _changeFilter('weekly'),
          ),
          _FilterButton(
            label: '월별',
            value: 'monthly',
            selected: _selectedFilter == 'monthly',
            onTap: () => _changeFilter('monthly'),
          ),
        ],
      ),
    );
  }

  Widget _buildDateSelector() {
    String dateText = '';
    if (_selectedFilter == 'daily') {
      dateText = '${_selectedDate.year}년 ${_selectedDate.month}월 ${_selectedDate.day}일';
    } else if (_selectedFilter == 'weekly') {
      // 주차 계산
      final weekNumber = _getWeekNumber(_selectedDate);
      dateText = '${_selectedDate.year}년 ${_selectedDate.month}월 ${weekNumber}주차';
    } else {
      dateText = '${_selectedDate.year}년 ${_selectedDate.month}월';
    }

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: NeoBrutalTheme.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: NeoBrutalTheme.fg,
          width: 3,
        ),
        boxShadow: [
          BoxShadow(
            offset: const Offset(4, 4),
            color: NeoBrutalTheme.fg,
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: Icon(Icons.chevron_left, color: NeoBrutalTheme.fg),
            onPressed: _previousPeriod,
          ),
          GestureDetector(
            onTap: _showDatePicker,
            child: Row(
              children: [
                Icon(Icons.calendar_today, size: 20, color: NeoBrutalTheme.primary),
                const SizedBox(width: 8),
                Text(
                  dateText,
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(Icons.chevron_right, color: NeoBrutalTheme.fg),
            onPressed: _nextPeriod,
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceRecord(Map<String, dynamic> record) {
    final checkIn = record['checkIn'] as DateTime?;
    final checkOut = record['checkOut'] as DateTime?;
    final workMinutes = record['workMinutes'] as int? ?? 0;
    final breakMinutes = record['breakMinutes'] as int? ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: NeoBrutalCard(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 날짜
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _formatDate(checkIn ?? DateTime.now()),
                    style: NeoBrutalTheme.heading.copyWith(fontSize: 16),
                  ),
                  _buildStatusBadge(checkOut != null ? 'completed' : 'in_progress'),
                ],
              ),
              const SizedBox(height: 12),
              
              // 시간 정보
              Row(
                children: [
                  Expanded(
                    child: _InfoItem(
                      icon: Icons.login,
                      label: '출근',
                      value: checkIn != null
                          ? '${checkIn.hour.toString().padLeft(2, '0')}:${checkIn.minute.toString().padLeft(2, '0')}'
                          : '-',
                      color: NeoBrutalTheme.success,
                    ),
                  ),
                  Expanded(
                    child: _InfoItem(
                      icon: Icons.logout,
                      label: '퇴근',
                      value: checkOut != null
                          ? '${checkOut.hour.toString().padLeft(2, '0')}:${checkOut.minute.toString().padLeft(2, '0')}'
                          : '-',
                      color: NeoBrutalTheme.error,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // 근무 시간
              Row(
                children: [
                  Expanded(
                    child: _InfoItem(
                      icon: Icons.timer,
                      label: '근무',
                      value: _formatMinutes(workMinutes),
                      color: NeoBrutalTheme.primary,
                    ),
                  ),
                  Expanded(
                    child: _InfoItem(
                      icon: Icons.coffee,
                      label: '휴게',
                      value: _formatMinutes(breakMinutes),
                      color: NeoBrutalTheme.warning,
                    ),
                  ),
                ],
              ),
              
              // 실 근무 시간
              Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: NeoBrutalTheme.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
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
                      '실 근무: ${_formatMinutes(workMinutes - breakMinutes)}',
                      style: NeoBrutalTheme.body.copyWith(
                        fontWeight: FontWeight.bold,
                        color: NeoBrutalTheme.success,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.event_busy,
            size: 64,
            color: NeoBrutalTheme.gray400,
          ),
          const SizedBox(height: 16),
          Text(
            '근태 기록이 없습니다',
            style: NeoBrutalTheme.heading.copyWith(
              color: NeoBrutalTheme.gray600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '선택한 기간에 출근 기록이 없습니다',
            style: NeoBrutalTheme.body.copyWith(
              color: NeoBrutalTheme.gray500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    final isCompleted = status == 'completed';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: isCompleted
            ? NeoBrutalTheme.success.withOpacity(0.2)
            : NeoBrutalTheme.warning.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCompleted ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
          width: 2,
        ),
      ),
      child: Text(
        isCompleted ? '완료' : '진행중',
        style: NeoBrutalTheme.caption.copyWith(
          color: isCompleted ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  void _changeFilter(String filter) {
    setState(() {
      _selectedFilter = filter;
    });
    _loadAttendanceHistory();
  }

  void _previousPeriod() {
    setState(() {
      if (_selectedFilter == 'daily') {
        _selectedDate = _selectedDate.subtract(const Duration(days: 1));
      } else if (_selectedFilter == 'weekly') {
        _selectedDate = _selectedDate.subtract(const Duration(days: 7));
      } else {
        _selectedDate = DateTime(
          _selectedDate.year,
          _selectedDate.month - 1,
          _selectedDate.day,
        );
      }
    });
    _loadAttendanceHistory();
  }

  void _nextPeriod() {
    setState(() {
      if (_selectedFilter == 'daily') {
        _selectedDate = _selectedDate.add(const Duration(days: 1));
      } else if (_selectedFilter == 'weekly') {
        _selectedDate = _selectedDate.add(const Duration(days: 7));
      } else {
        _selectedDate = DateTime(
          _selectedDate.year,
          _selectedDate.month + 1,
          _selectedDate.day,
        );
      }
    });
    _loadAttendanceHistory();
  }

  Future<void> _showDatePicker() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            primaryColor: NeoBrutalTheme.primary,
            colorScheme: ColorScheme.light(primary: NeoBrutalTheme.primary),
          ),
          child: child!,
        );
      },
    );
    
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
      _loadAttendanceHistory();
    }
  }

  String _formatDate(DateTime date) {
    final weekdays = ['월', '화', '수', '목', '금', '토', '일'];
    final weekday = weekdays[date.weekday - 1];
    return '${date.month}/${date.day} ($weekday)';
  }

  String _formatMinutes(int minutes) {
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (hours > 0) {
      return '${hours}시간 ${mins}분';
    }
    return '${mins}분';
  }

  int _getWeekNumber(DateTime date) {
    final firstDayOfMonth = DateTime(date.year, date.month, 1);
    final dayOfMonth = date.day;
    final weekday = firstDayOfMonth.weekday;
    return ((dayOfMonth + weekday - 2) ~/ 7) + 1;
  }
}

/// 필터 버튼 위젯
class _FilterButton extends StatelessWidget {
  final String label;
  final String value;
  final bool selected;
  final VoidCallback onTap;

  const _FilterButton({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? NeoBrutalTheme.primary : NeoBrutalTheme.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: NeoBrutalTheme.fg,
            width: 2,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    offset: const Offset(2, 2),
                    color: NeoBrutalTheme.fg,
                  ),
                ]
              : [],
        ),
        child: Text(
          label,
          style: NeoBrutalTheme.button.copyWith(
            color: selected ? NeoBrutalTheme.white : NeoBrutalTheme.fg,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

/// 정보 항목 위젯
class _InfoItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _InfoItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: NeoBrutalTheme.caption.copyWith(
                color: NeoBrutalTheme.gray600,
              ),
            ),
            Text(
              value,
              style: NeoBrutalTheme.body.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ],
    );
  }
}