import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/neo_brutal_theme.dart';
import '../../../domain/entities/attendance/attendance_queue.dart';
import '../../providers/attendance_provider.dart';
import '../common/neo_brutal_button.dart';
import '../common/neo_brutal_card.dart';

class AttendanceQueueWidget extends ConsumerWidget {
  const AttendanceQueueWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendanceState = ref.watch(attendanceProvider);
    final offlineQueue = attendanceState.offlineQueue;
    final lastSyncTime = attendanceState.lastSyncTime;
    final isSyncing = attendanceState.isSyncing;

    return Dialog(
      backgroundColor: Colors.transparent,
      child: NeoBrutalCard(
        padding: const EdgeInsets.all(NeoBrutalTheme.space6),
        boxShadow: NeoBrutalTheme.shadowElev3,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              children: [
                const Icon(
                  Icons.sync_problem,
                  size: 32,
                  color: NeoBrutalTheme.warning,
                ),
                const SizedBox(width: NeoBrutalTheme.space3),
                Expanded(
                  child: Text(
                    'Offline Queue',
                    style: NeoBrutalTheme.title,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            
            const SizedBox(height: NeoBrutalTheme.space4),
            
            // Queue Status
            _buildQueueStatus(offlineQueue.length, lastSyncTime),
            
            const SizedBox(height: NeoBrutalTheme.space4),
            
            // Queue Items
            if (offlineQueue.isNotEmpty) ...[
              Container(
                constraints: const BoxConstraints(maxHeight: 300),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: offlineQueue.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: NeoBrutalTheme.space2),
                  itemBuilder: (context, index) {
                    final item = offlineQueue[index];
                    return _buildQueueItem(item);
                  },
                ),
              ),
              
              const SizedBox(height: NeoBrutalTheme.space4),
            ] else
              NeoBrutalCard(
                backgroundColor: NeoBrutalTheme.muted,
                padding: const EdgeInsets.all(NeoBrutalTheme.space4),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      color: NeoBrutalTheme.success,
                    ),
                    const SizedBox(width: NeoBrutalTheme.space2),
                    Text(
                      'All attendance records are synced',
                      style: NeoBrutalTheme.body,
                    ),
                  ],
                ),
              ),
            
            const SizedBox(height: NeoBrutalTheme.space6),
            
            // Actions
            Row(
              children: [
                Expanded(
                  child: NeoBrutalButton.outlined(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Close'),
                  ),
                ),
                const SizedBox(width: NeoBrutalTheme.space3),
                Expanded(
                  child: NeoBrutalButton(
                    onPressed: isSyncing || offlineQueue.isEmpty
                        ? null
                        : () => _forceSyncQueue(ref),
                    isLoading: isSyncing,
                    child: const Text('Sync Now'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQueueStatus(int queueCount, DateTime? lastSyncTime) {
    return NeoBrutalCard(
      backgroundColor: queueCount > 0
          ? NeoBrutalTheme.warning.withOpacity(0.1)
          : NeoBrutalTheme.success.withOpacity(0.1),
      borderColor: queueCount > 0 ? NeoBrutalTheme.warning : NeoBrutalTheme.success,
      padding: const EdgeInsets.all(NeoBrutalTheme.space3),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                queueCount > 0 ? Icons.pending : Icons.cloud_done,
                color: queueCount > 0 ? NeoBrutalTheme.warning : NeoBrutalTheme.success,
                size: 20,
              ),
              const SizedBox(width: NeoBrutalTheme.space2),
              Text(
                '$queueCount items pending sync',
                style: NeoBrutalTheme.heading.copyWith(
                  color: queueCount > 0 ? NeoBrutalTheme.warning : NeoBrutalTheme.success,
                ),
              ),
            ],
          ),
          
          if (lastSyncTime != null) ...[
            const SizedBox(height: NeoBrutalTheme.space2),
            Row(
              children: [
                Icon(
                  Icons.access_time,
                  size: 16,
                  color: NeoBrutalTheme.fg.withOpacity(0.7),
                ),
                const SizedBox(width: NeoBrutalTheme.space2),
                Text(
                  'Last sync: ${_formatSyncTime(lastSyncTime)}',
                  style: NeoBrutalTheme.caption,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQueueItem(AttendanceQueue item) {
    final isCheckIn = item.actionType == AttendanceActionType.checkIn;
    final statusColor = _getStatusColor(item.status);
    final statusIcon = _getStatusIcon(item.status);
    
    return NeoBrutalCard(
      backgroundColor: statusColor.withOpacity(0.1),
      borderColor: statusColor,
      padding: const EdgeInsets.all(NeoBrutalTheme.space3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(
                isCheckIn ? Icons.login : Icons.logout,
                color: isCheckIn ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
                size: 20,
              ),
              const SizedBox(width: NeoBrutalTheme.space2),
              Expanded(
                child: Text(
                  isCheckIn ? 'Check In' : 'Check Out',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Icon(
                statusIcon,
                color: statusColor,
                size: 16,
              ),
              const SizedBox(width: NeoBrutalTheme.space1),
              Text(
                _getStatusText(item.status),
                style: NeoBrutalTheme.caption.copyWith(
                  color: statusColor,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: NeoBrutalTheme.space2),
          
          // Details
          Row(
            children: [
              Icon(
                Icons.access_time,
                size: 14,
                color: NeoBrutalTheme.fg.withOpacity(0.6),
              ),
              const SizedBox(width: NeoBrutalTheme.space1),
              Text(
                DateFormat('MMM dd, HH:mm').format(item.timestamp),
                style: NeoBrutalTheme.caption,
              ),
              const SizedBox(width: NeoBrutalTheme.space3),
              Icon(
                _getMethodIcon(item.method),
                size: 14,
                color: NeoBrutalTheme.fg.withOpacity(0.6),
              ),
              const SizedBox(width: NeoBrutalTheme.space1),
              Text(
                item.method.toUpperCase(),
                style: NeoBrutalTheme.caption,
              ),
            ],
          ),
          
          // Location if available
          if (item.locationName != null) ...[
            const SizedBox(height: NeoBrutalTheme.space1),
            Row(
              children: [
                Icon(
                  Icons.location_on,
                  size: 14,
                  color: NeoBrutalTheme.fg.withOpacity(0.6),
                ),
                const SizedBox(width: NeoBrutalTheme.space1),
                Expanded(
                  child: Text(
                    item.locationName!,
                    style: NeoBrutalTheme.caption,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
          
          // Error message if failed
          if (item.status == QueueStatus.failed && item.lastError != null) ...[
            const SizedBox(height: NeoBrutalTheme.space2),
            Container(
              padding: const EdgeInsets.all(NeoBrutalTheme.space2),
              decoration: BoxDecoration(
                color: NeoBrutalTheme.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusInput),
                border: Border.all(
                  color: NeoBrutalTheme.error.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.error,
                    size: 14,
                    color: NeoBrutalTheme.error,
                  ),
                  const SizedBox(width: NeoBrutalTheme.space1),
                  Expanded(
                    child: Text(
                      item.lastError!,
                      style: NeoBrutalTheme.caption.copyWith(
                        color: NeoBrutalTheme.error,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getStatusColor(QueueStatus status) {
    switch (status) {
      case QueueStatus.pending:
        return NeoBrutalTheme.warning;
      case QueueStatus.syncing:
        return NeoBrutalTheme.info;
      case QueueStatus.synced:
        return NeoBrutalTheme.success;
      case QueueStatus.failed:
        return NeoBrutalTheme.error;
    }
  }

  IconData _getStatusIcon(QueueStatus status) {
    switch (status) {
      case QueueStatus.pending:
        return Icons.schedule;
      case QueueStatus.syncing:
        return Icons.sync;
      case QueueStatus.synced:
        return Icons.check_circle;
      case QueueStatus.failed:
        return Icons.error;
    }
  }

  String _getStatusText(QueueStatus status) {
    switch (status) {
      case QueueStatus.pending:
        return 'Pending';
      case QueueStatus.syncing:
        return 'Syncing';
      case QueueStatus.synced:
        return 'Synced';
      case QueueStatus.failed:
        return 'Failed';
    }
  }

  IconData _getMethodIcon(String method) {
    switch (method.toLowerCase()) {
      case 'qr':
        return Icons.qr_code;
      case 'gps':
        return Icons.gps_fixed;
      case 'manual':
        return Icons.touch_app;
      default:
        return Icons.help;
    }
  }

  String _formatSyncTime(DateTime syncTime) {
    final now = DateTime.now();
    final difference = now.difference(syncTime);
    
    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} min ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hr ago';
    } else {
      return DateFormat('MMM dd, HH:mm').format(syncTime);
    }
  }

  Future<void> _forceSyncQueue(WidgetRef ref) async {
    await HapticFeedback.lightImpact();
    await ref.read(attendanceProvider.notifier).forceSyncOfflineQueue();
  }
}
