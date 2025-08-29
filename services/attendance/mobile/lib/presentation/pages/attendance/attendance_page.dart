import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/neo_brutal_theme.dart';
import '../../../domain/entities/attendance/attendance_queue.dart';
import '../../providers/attendance_provider.dart';
import '../../widgets/attendance/attendance_queue_widget.dart';
import '../../widgets/attendance/attendance_verification_dialog.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/common/neo_brutal_card.dart';
import 'qr_scanner_page.dart';

class AttendancePage extends ConsumerStatefulWidget {
  const AttendancePage({super.key});

  @override
  ConsumerState<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends ConsumerState<AttendancePage>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  
  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final attendanceState = ref.watch(attendanceProvider);
    final hasOfflineQueue = ref.watch(hasOfflineQueueProvider);
    final isLoading = ref.watch(isAttendanceLoadingProvider);

    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: const Text('Attendance'),
        actions: [
          // Error indicator
          if (attendanceState.error != null)
            IconButton(
              onPressed: () => _showErrorSnackbar(attendanceState.error!),
              icon: const Icon(
                Icons.error,
                color: NeoBrutalTheme.error,
              ),
            ),
          
          // Offline queue indicator
          if (hasOfflineQueue)
            IconButton(
              onPressed: _showOfflineQueueDialog,
              icon: Stack(
                children: [
                  const Icon(Icons.sync_problem),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: NeoBrutalTheme.error,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 12,
                        minHeight: 12,
                      ),
                      child: Text(
                        '${attendanceState.offlineQueue.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: NeoBrutalTheme.hi,
        onRefresh: _refreshAttendanceData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(NeoBrutalTheme.space4),
          child: Column(
            children: [
              // Current Status Card
              _buildCurrentStatusCard(),
              
              const SizedBox(height: NeoBrutalTheme.space6),
              
              // Quick Actions
              _buildQuickActions(),
              
              const SizedBox(height: NeoBrutalTheme.space6),
              
              // Attendance Methods
              _buildAttendanceMethods(),
              
              const SizedBox(height: NeoBrutalTheme.space6),
              
              // Offline Queue Summary (if exists)
              if (hasOfflineQueue) ...[
                _buildOfflineQueueSummary(),
                const SizedBox(height: NeoBrutalTheme.space6),
              ],
              
              // Success/Error Messages
              if (attendanceState.successMessage != null)
                _buildSuccessCard(attendanceState.successMessage!),
              
              if (attendanceState.error != null)
                _buildErrorCard(attendanceState.error!),
                
              // Loading indicator
              if (isLoading)
                const Padding(
                  padding: EdgeInsets.all(NeoBrutalTheme.space4),
                  child: CircularProgressIndicator(
                    color: NeoBrutalTheme.hi,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentStatusCard() {
    // Mock current attendance status - in real app this would come from provider
    final now = DateTime.now();
    final isCheckedIn = false; // This would come from actual state
    final todayDate = DateFormat('EEEE, MMMM dd, yyyy').format(now);
    final currentTime = DateFormat('hh:mm a').format(now);

    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      boxShadow: NeoBrutalTheme.shadowElev2,
      child: Column(
        children: [
          // Date and Time
          Text(
            todayDate,
            style: NeoBrutalTheme.heading,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: _pulseAnimation.value,
                child: Text(
                  currentTime,
                  style: NeoBrutalTheme.display.copyWith(
                    color: NeoBrutalTheme.hi,
                  ),
                  textAlign: TextAlign.center,
                ),
              );
            },
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // Status
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: NeoBrutalTheme.space4,
              vertical: NeoBrutalTheme.space2,
            ),
            decoration: BoxDecoration(
              color: isCheckedIn
                  ? NeoBrutalTheme.success.withOpacity(0.1)
                  : NeoBrutalTheme.warning.withOpacity(0.1),
              border: Border.all(
                color: isCheckedIn ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
                width: NeoBrutalTheme.borderThin,
              ),
              borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  isCheckedIn ? Icons.check_circle : Icons.schedule,
                  color: isCheckedIn ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
                  size: 20,
                ),
                const SizedBox(width: NeoBrutalTheme.space2),
                Text(
                  isCheckedIn ? 'Checked In' : 'Not Checked In',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                    color: isCheckedIn ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}