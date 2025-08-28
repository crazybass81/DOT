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
          ),\n        ],\n      ),\n    );\n  }\n\n  Widget _buildQuickActions() {\n    // Mock state - in real app this would come from provider\n    final isCheckedIn = false;\n\n    return Row(\n      children: [\n        Expanded(\n          child: NeoBrutalButton(\n            onPressed: isCheckedIn ? null : () => _showAttendanceMethodDialog(AttendanceActionType.checkIn),\n            backgroundColor: NeoBrutalTheme.success,\n            child: Row(\n              mainAxisAlignment: MainAxisAlignment.center,\n              children: [\n                const Icon(\n                  Icons.login,\n                  color: NeoBrutalTheme.bg,\n                ),\n                const SizedBox(width: NeoBrutalTheme.space2),\n                Text(\n                  'Check In',\n                  style: NeoBrutalTheme.body.copyWith(\n                    fontWeight: FontWeight.w700,\n                    color: NeoBrutalTheme.bg,\n                  ),\n                ),\n              ],\n            ),\n          ),\n        ),\n        \n        const SizedBox(width: NeoBrutalTheme.space3),\n        \n        Expanded(\n          child: NeoBrutalButton(\n            onPressed: !isCheckedIn ? null : () => _showAttendanceMethodDialog(AttendanceActionType.checkOut),\n            backgroundColor: NeoBrutalTheme.warning,\n            child: Row(\n              mainAxisAlignment: MainAxisAlignment.center,\n              children: [\n                const Icon(\n                  Icons.logout,\n                  color: NeoBrutalTheme.bg,\n                ),\n                const SizedBox(width: NeoBrutalTheme.space2),\n                Text(\n                  'Check Out',\n                  style: NeoBrutalTheme.body.copyWith(\n                    fontWeight: FontWeight.w700,\n                    color: NeoBrutalTheme.bg,\n                  ),\n                ),\n              ],\n            ),\n          ),\n        ),\n      ],\n    );\n  }\n\n  Widget _buildAttendanceMethods() {\n    return NeoBrutalCard(\n      child: Column(\n        crossAxisAlignment: CrossAxisAlignment.start,\n        children: [\n          Text(\n            'Attendance Methods',\n            style: NeoBrutalTheme.heading,\n          ),\n          \n          const SizedBox(height: NeoBrutalTheme.space4),\n          \n          // QR Code Method\n          _buildMethodCard(\n            icon: Icons.qr_code_scanner,\n            title: 'QR Code Scan',\n            subtitle: 'Scan QR code for instant attendance',\n            onTap: () => _navigateToQrScanner(AttendanceActionType.checkIn),\n            color: NeoBrutalTheme.hi,\n          ),\n          \n          const SizedBox(height: NeoBrutalTheme.space3),\n          \n          // GPS Method\n          _buildMethodCard(\n            icon: Icons.gps_fixed,\n            title: 'GPS Location',\n            subtitle: 'Mark attendance using your location',\n            onTap: () => _markAttendanceByGPS(AttendanceActionType.checkIn),\n            color: NeoBrutalTheme.pastelSky,\n          ),\n          \n          const SizedBox(height: NeoBrutalTheme.space3),\n          \n          // Manual Method\n          _buildMethodCard(\n            icon: Icons.touch_app,\n            title: 'Manual Entry',\n            subtitle: 'Mark attendance manually with notes',\n            onTap: () => _showManualEntryDialog(AttendanceActionType.checkIn),\n            color: NeoBrutalTheme.pastelMint,\n          ),\n        ],\n      ),\n    );\n  }\n\n  Widget _buildMethodCard({\n    required IconData icon,\n    required String title,\n    required String subtitle,\n    required VoidCallback onTap,\n    required Color color,\n  }) {\n    return NeoBrutalCard(\n      backgroundColor: color.withOpacity(0.1),\n      borderColor: color,\n      onTap: onTap,\n      padding: const EdgeInsets.all(NeoBrutalTheme.space4),\n      child: Row(\n        children: [\n          Container(\n            padding: const EdgeInsets.all(NeoBrutalTheme.space2),\n            decoration: BoxDecoration(\n              color: color,\n              borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusInput),\n            ),\n            child: Icon(\n              icon,\n              color: NeoBrutalTheme.hiInk,\n              size: 24,\n            ),\n          ),\n          \n          const SizedBox(width: NeoBrutalTheme.space3),\n          \n          Expanded(\n            child: Column(\n              crossAxisAlignment: CrossAxisAlignment.start,\n              children: [\n                Text(\n                  title,\n                  style: NeoBrutalTheme.body.copyWith(\n                    fontWeight: FontWeight.w700,\n                  ),\n                ),\n                Text(\n                  subtitle,\n                  style: NeoBrutalTheme.caption.copyWith(\n                    color: NeoBrutalTheme.fg.withOpacity(0.7),\n                  ),\n                ),\n              ],\n            ),\n          ),\n          \n          const Icon(\n            Icons.arrow_forward_ios,\n            size: 16,\n            color: NeoBrutalTheme.fg,\n          ),\n        ],\n      ),\n    );\n  }\n\n  Widget _buildOfflineQueueSummary() {\n    final queueCount = ref.watch(attendanceProvider).offlineQueue.length;\n    \n    return NeoBrutalCard(\n      backgroundColor: NeoBrutalTheme.warning.withOpacity(0.1),\n      borderColor: NeoBrutalTheme.warning,\n      onTap: _showOfflineQueueDialog,\n      child: Row(\n        children: [\n          const Icon(\n            Icons.sync_problem,\n            color: NeoBrutalTheme.warning,\n            size: 24,\n          ),\n          \n          const SizedBox(width: NeoBrutalTheme.space3),\n          \n          Expanded(\n            child: Column(\n              crossAxisAlignment: CrossAxisAlignment.start,\n              children: [\n                Text(\n                  'Offline Queue',\n                  style: NeoBrutalTheme.body.copyWith(\n                    fontWeight: FontWeight.w700,\n                    color: NeoBrutalTheme.warning,\n                  ),\n                ),\n                Text(\n                  '$queueCount attendance records pending sync',\n                  style: NeoBrutalTheme.caption,\n                ),\n              ],\n            ),\n          ),\n          \n          NeoBrutalButton.outlined(\n            onPressed: () => ref.read(attendanceProvider.notifier).forceSyncOfflineQueue(),\n            padding: const EdgeInsets.symmetric(\n              horizontal: NeoBrutalTheme.space3,\n              vertical: NeoBrutalTheme.space2,\n            ),\n            child: const Text('Sync'),\n          ),\n        ],\n      ),\n    );\n  }\n\n  Widget _buildSuccessCard(String message) {\n    return NeoBrutalCard(\n      backgroundColor: NeoBrutalTheme.success.withOpacity(0.1),\n      borderColor: NeoBrutalTheme.success,\n      child: Row(\n        children: [\n          const Icon(\n            Icons.check_circle,\n            color: NeoBrutalTheme.success,\n          ),\n          const SizedBox(width: NeoBrutalTheme.space2),\n          Expanded(\n            child: Text(\n              message,\n              style: NeoBrutalTheme.body.copyWith(\n                color: NeoBrutalTheme.success,\n                fontWeight: FontWeight.w700,\n              ),\n            ),\n          ),\n          IconButton(\n            onPressed: () => ref.read(attendanceProvider.notifier).clearSuccessMessage(),\n            icon: const Icon(\n              Icons.close,\n              color: NeoBrutalTheme.success,\n            ),\n          ),\n        ],\n      ),\n    );\n  }\n\n  Widget _buildErrorCard(String error) {\n    return NeoBrutalCard(\n      backgroundColor: NeoBrutalTheme.error.withOpacity(0.1),\n      borderColor: NeoBrutalTheme.error,\n      child: Row(\n        children: [\n          const Icon(\n            Icons.error,\n            color: NeoBrutalTheme.error,\n          ),\n          const SizedBox(width: NeoBrutalTheme.space2),\n          Expanded(\n            child: Text(\n              error,\n              style: NeoBrutalTheme.body.copyWith(\n                color: NeoBrutalTheme.error,\n                fontWeight: FontWeight.w700,\n              ),\n            ),\n          ),\n          IconButton(\n            onPressed: () => ref.read(attendanceProvider.notifier).clearError(),\n            icon: const Icon(\n              Icons.close,\n              color: NeoBrutalTheme.error,\n            ),\n          ),\n        ],\n      ),\n    );\n  }\n\n  void _showAttendanceMethodDialog(AttendanceActionType actionType) {\n    showModalBottomSheet(\n      context: context,\n      backgroundColor: Colors.transparent,\n      builder: (context) => Container(\n        margin: const EdgeInsets.all(NeoBrutalTheme.space4),\n        child: NeoBrutalCard(\n          padding: const EdgeInsets.all(NeoBrutalTheme.space6),\n          child: Column(\n            mainAxisSize: MainAxisSize.min,\n            children: [\n              Text(\n                'Choose ${actionType == AttendanceActionType.checkIn ? 'Check In' : 'Check Out'} Method',\n                style: NeoBrutalTheme.heading,\n                textAlign: TextAlign.center,\n              ),\n              \n              const SizedBox(height: NeoBrutalTheme.space4),\n              \n              _buildMethodTile(\n                icon: Icons.qr_code_scanner,\n                title: 'QR Code Scan',\n                color: NeoBrutalTheme.hi,\n                onTap: () {\n                  Navigator.pop(context);\n                  _navigateToQrScanner(actionType);\n                },\n              ),\n              \n              _buildMethodTile(\n                icon: Icons.gps_fixed,\n                title: 'GPS Location',\n                color: NeoBrutalTheme.pastelSky,\n                onTap: () {\n                  Navigator.pop(context);\n                  _markAttendanceByGPS(actionType);\n                },\n              ),\n              \n              _buildMethodTile(\n                icon: Icons.touch_app,\n                title: 'Manual Entry',\n                color: NeoBrutalTheme.pastelMint,\n                onTap: () {\n                  Navigator.pop(context);\n                  _showManualEntryDialog(actionType);\n                },\n              ),\n            ],\n          ),\n        ),\n      ),\n    );\n  }\n\n  Widget _buildMethodTile({\n    required IconData icon,\n    required String title,\n    required Color color,\n    required VoidCallback onTap,\n  }) {\n    return Padding(\n      padding: const EdgeInsets.only(bottom: NeoBrutalTheme.space2),\n      child: NeoBrutalButton.outlined(\n        onPressed: onTap,\n        child: Row(\n          children: [\n            Container(\n              padding: const EdgeInsets.all(NeoBrutalTheme.space2),\n              decoration: BoxDecoration(\n                color: color,\n                borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusInput),\n              ),\n              child: Icon(\n                icon,\n                color: NeoBrutalTheme.hiInk,\n                size: 20,\n              ),\n            ),\n            const SizedBox(width: NeoBrutalTheme.space3),\n            Text(\n              title,\n              style: NeoBrutalTheme.body.copyWith(\n                fontWeight: FontWeight.w700,\n              ),\n            ),\n          ],\n        ),\n      ),\n    );\n  }\n\n  void _navigateToQrScanner(AttendanceActionType actionType) async {\n    await HapticFeedback.lightImpact();\n    if (mounted) {\n      Navigator.of(context).push(\n        MaterialPageRoute(\n          builder: (context) => QrScannerPage(actionType: actionType),\n        ),\n      );\n    }\n  }\n\n  Future<void> _markAttendanceByGPS(AttendanceActionType actionType) async {\n    await HapticFeedback.lightImpact();\n    \n    // Verify location first\n    await ref.read(attendanceProvider.notifier).verifyAttendanceRequirements(\n      actionType: actionType,\n      requireLocation: true,\n    );\n    \n    // Show verification dialog\n    if (mounted) {\n      showDialog(\n        context: context,\n        barrierDismissible: false,\n        builder: (context) => AttendanceVerificationDialog(\n          actionType: actionType,\n          method: 'gps',\n          onConfirm: () => Navigator.of(context).pop(),\n          onRetry: () => Navigator.of(context).pop(),\n        ),\n      );\n    }\n  }\n\n  void _showManualEntryDialog(AttendanceActionType actionType) {\n    showDialog(\n      context: context,\n      barrierDismissible: false,\n      builder: (context) => AttendanceVerificationDialog(\n        actionType: actionType,\n        method: 'manual',\n        onConfirm: () => Navigator.of(context).pop(),\n        onRetry: () => Navigator.of(context).pop(),\n      ),\n    );\n  }\n\n  void _showOfflineQueueDialog() {\n    showDialog(\n      context: context,\n      builder: (context) => const AttendanceQueueWidget(),\n    );\n  }\n\n  void _showErrorSnackbar(String error) {\n    ScaffoldMessenger.of(context).showSnackBar(\n      SnackBar(\n        content: Text(error),\n        backgroundColor: NeoBrutalTheme.error,\n        action: SnackBarAction(\n          label: 'Dismiss',\n          textColor: Colors.white,\n          onPressed: () => ref.read(attendanceProvider.notifier).clearError(),\n        ),\n      ),\n    );\n  }\n\n  Future<void> _refreshAttendanceData() async {\n    await HapticFeedback.lightImpact();\n    \n    // Trigger data refresh\n    await ref.read(attendanceProvider.notifier).forceSyncOfflineQueue();\n    \n    // Small delay for UX\n    await Future.delayed(const Duration(milliseconds: 500));\n  }\n\n  @override\n  void dispose() {\n    _pulseController.dispose();\n    super.dispose();\n  }\n}