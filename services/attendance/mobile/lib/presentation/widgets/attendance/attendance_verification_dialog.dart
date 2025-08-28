import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/neo_brutal_theme.dart';
import '../../../domain/entities/attendance/attendance_queue.dart';
import '../../providers/attendance_provider.dart';
import '../common/neo_brutal_button.dart';
import '../common/neo_brutal_card.dart';

class AttendanceVerificationDialog extends ConsumerStatefulWidget {
  final AttendanceActionType actionType;
  final String method;
  final String? qrCodeData;
  final String? notes;
  final VoidCallback onConfirm;
  final VoidCallback onRetry;

  const AttendanceVerificationDialog({
    super.key,
    required this.actionType,
    required this.method,
    this.qrCodeData,
    this.notes,
    required this.onConfirm,
    required this.onRetry,
  });

  @override
  ConsumerState<AttendanceVerificationDialog> createState() =>
      _AttendanceVerificationDialogState();
}

class _AttendanceVerificationDialogState
    extends ConsumerState<AttendanceVerificationDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  final TextEditingController _notesController = TextEditingController();
  bool _requireBiometric = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: NeoBrutalAnimations.toastDuration,
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: NeoBrutalAnimations.toastCurve,
    ));
    
    _animationController.forward();
    
    if (widget.notes != null) {
      _notesController.text = widget.notes!;
    }
  }

  @override
  Widget build(BuildContext context) {
    final attendanceState = ref.watch(attendanceProvider);
    final verificationResult = attendanceState.verificationResult;
    final isLoading = attendanceState.isMarkingAttendance;

    return AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: Dialog(
            backgroundColor: Colors.transparent,
            child: NeoBrutalCard(
              padding: const EdgeInsets.all(NeoBrutalTheme.space6),
              boxShadow: NeoBrutalTheme.shadowElev3,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Title
                  Row(
                    children: [
                      Icon(
                        _getActionIcon(),
                        size: 32,
                        color: _getActionColor(),
                      ),
                      const SizedBox(width: NeoBrutalTheme.space3),
                      Expanded(
                        child: Text(
                          _getTitle(),
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
                  
                  // Verification Status
                  if (verificationResult != null)
                    _buildVerificationStatus(verificationResult),
                  
                  // Method Info
                  _buildMethodInfo(),
                  
                  const SizedBox(height: NeoBrutalTheme.space4),
                  
                  // Notes Input
                  TextField(
                    controller: _notesController,
                    decoration: const InputDecoration(
                      labelText: 'Notes (Optional)',
                      hintText: 'Add any additional notes...',
                    ),
                    maxLines: 2,
                    maxLength: 200,
                  ),
                  
                  const SizedBox(width: NeoBrutalTheme.space4),
                  
                  // Biometric Option
                  Row(
                    children: [
                      Checkbox(
                        value: _requireBiometric,
                        onChanged: (value) {
                          setState(() {
                            _requireBiometric = value ?? false;
                          });
                          HapticFeedback.selectionClick();
                        },
                        activeColor: NeoBrutalTheme.hi,
                      ),
                      const SizedBox(width: NeoBrutalTheme.space2),
                      Expanded(
                        child: Text(
                          'Require biometric verification',
                          style: NeoBrutalTheme.body,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: NeoBrutalTheme.space6),
                  
                  // Actions
                  Row(
                    children: [
                      Expanded(
                        child: NeoBrutalButton.outlined(
                          onPressed: isLoading ? null : widget.onRetry,
                          child: const Text('Retry'),
                        ),
                      ),
                      const SizedBox(width: NeoBrutalTheme.space3),
                      Expanded(
                        child: NeoBrutalButton(
                          onPressed: verificationResult?.isValid == true && !isLoading
                              ? _handleConfirm
                              : null,
                          isLoading: isLoading,
                          child: Text(_getConfirmButtonText()),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildVerificationStatus(AttendanceVerificationResult result) {
    final isValid = result.isValid;
    final statusColor = isValid ? NeoBrutalTheme.success : NeoBrutalTheme.error;
    final statusIcon = isValid ? Icons.check_circle : Icons.error;
    
    return NeoBrutalCard(
      backgroundColor: statusColor.withOpacity(0.1),
      borderColor: statusColor,
      padding: const EdgeInsets.all(NeoBrutalTheme.space3),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                statusIcon,
                color: statusColor,
                size: 24,
              ),
              const SizedBox(width: NeoBrutalTheme.space2),
              Expanded(
                child: Text(
                  isValid ? 'Verification Successful' : 'Verification Failed',
                  style: NeoBrutalTheme.heading.copyWith(color: statusColor),
                ),
              ),
            ],
          ),
          
          if (!isValid && result.errorMessage != null) ..[
            const SizedBox(height: NeoBrutalTheme.space2),
            Text(
              result.errorMessage!,
              style: NeoBrutalTheme.body.copyWith(color: statusColor),
            ),
          ],
          
          if (isValid) ..[
            const SizedBox(height: NeoBrutalTheme.space2),
            _buildVerificationDetails(result),
          ],
        ],
      ),
    );
  }

  Widget _buildVerificationDetails(AttendanceVerificationResult result) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (result.locationName != null)
          _buildDetailRow(
            icon: Icons.location_on,
            label: 'Location',
            value: result.locationName!,
          ),
        
        if (result.distance != null)
          _buildDetailRow(
            icon: Icons.straighten,
            label: 'Distance',
            value: '${result.distance!.toStringAsFixed(0)}m from work location',
          ),
        
        _buildDetailRow(
          icon: Icons.access_time,
          label: 'Time Status',
          value: result.isWithinTimeWindow ? 'Within working hours' : 'Outside working hours',
        ),
      ],
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(
            icon,
            size: 16,
            color: NeoBrutalTheme.fg.withOpacity(0.7),
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
          Text(
            '$label: ',
            style: NeoBrutalTheme.caption.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: NeoBrutalTheme.caption,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMethodInfo() {
    String methodText;
    IconData methodIcon;
    
    switch (widget.method) {
      case 'qr':
        methodText = 'QR Code Scan';
        methodIcon = Icons.qr_code_scanner;
        break;
      case 'gps':
        methodText = 'GPS Location';
        methodIcon = Icons.gps_fixed;
        break;
      case 'manual':
        methodText = 'Manual Entry';
        methodIcon = Icons.touch_app;
        break;
      default:
        methodText = 'Unknown Method';
        methodIcon = Icons.help;
    }
    
    return NeoBrutalCard(
      backgroundColor: NeoBrutalTheme.muted,
      padding: const EdgeInsets.all(NeoBrutalTheme.space3),
      child: Row(
        children: [
          Icon(
            methodIcon,
            color: NeoBrutalTheme.fg.withOpacity(0.7),
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
          Text(
            'Method: $methodText',
            style: NeoBrutalTheme.body,
          ),
        ],
      ),
    );
  }

  String _getTitle() {
    return widget.actionType == AttendanceActionType.checkIn
        ? 'Confirm Check In'
        : 'Confirm Check Out';
  }

  IconData _getActionIcon() {
    return widget.actionType == AttendanceActionType.checkIn
        ? Icons.login
        : Icons.logout;
  }

  Color _getActionColor() {
    return widget.actionType == AttendanceActionType.checkIn
        ? NeoBrutalTheme.success
        : NeoBrutalTheme.warning;
  }

  String _getConfirmButtonText() {
    if (widget.actionType == AttendanceActionType.checkIn) {
      return 'Check In';
    } else {
      return 'Check Out';
    }
  }

  Future<void> _handleConfirm() async {
    final success = await ref.read(attendanceProvider.notifier).markAttendance(
      actionType: widget.actionType,
      method: widget.method,
      qrCodeData: widget.qrCodeData,
      notes: _notesController.text.trim().isNotEmpty
          ? _notesController.text.trim()
          : null,
      requireBiometric: _requireBiometric,
    );

    if (success) {
      await HapticFeedback.lightImpact();
      widget.onConfirm();
    } else {
      await HapticFeedback.heavyImpact();
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    _notesController.dispose();
    super.dispose();
  }
}
