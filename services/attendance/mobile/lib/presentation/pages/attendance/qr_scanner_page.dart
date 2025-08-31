import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/theme/neo_brutal_theme.dart';
import '../../../domain/entities/attendance/attendance_queue.dart';
import '../../../domain/entities/attendance/qr_action_type.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/employee_registration_provider.dart';
import '../../widgets/attendance/attendance_verification_dialog.dart';
import '../../widgets/attendance/attendance_queue_widget.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/common/neo_brutal_card.dart';
import 'package:go_router/go_router.dart';
import '../../router/app_router.dart';

class QrScannerPage extends ConsumerStatefulWidget {
  final QrActionType actionType;
  
  const QrScannerPage({
    super.key,
    required this.actionType,
  });

  @override
  ConsumerState<QrScannerPage> createState() => _QrScannerPageState();
}

class _QrScannerPageState extends ConsumerState<QrScannerPage>
    with WidgetsBindingObserver {
  MobileScannerController? controller;
  bool isFlashOn = false;
  bool hasScanned = false;
  String? lastScannedCode;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    controller = MobileScannerController(
      facing: CameraFacing.back,
      torchEnabled: false,
    );
    _checkCameraPermission();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (controller != null) {
      if (state == AppLifecycleState.paused) {
        controller!.stop();
      } else if (state == AppLifecycleState.resumed) {
        controller!.start();
      }
    }
  }

  @override
  void reassemble() {
    super.reassemble();
    if (Platform.isAndroid) {
      controller!.stop();
      controller!.start();
    } else if (Platform.isIOS) {
      controller!.start();
    }
  }

  Future<void> _checkCameraPermission() async {
    final status = await Permission.camera.status;
    if (status.isDenied) {
      final result = await Permission.camera.request();
      if (!result.isGranted) {
        if (mounted) {
          _showPermissionDialog();
        }
      }
    } else if (status.isPermanentlyDenied) {
      if (mounted) {
        _showPermissionDialog();
      }
    }
  }

  void _showPermissionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Camera Permission Required'),
        content: const Text(
          'Camera access is required to scan QR codes. Please enable camera permission in settings.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await openAppSettings();
            },
            child: const Text('Settings'),
          ),
        ],
      ),
    );
  }

  void _onQRViewCreated(MobileScannerController qrController) {
    controller = qrController;
    // Mobile scanner automatically starts scanning
  }

  Future<void> _handleQrScanned(String qrData) async {
    if (hasScanned || qrData == lastScannedCode) return;
    
    setState(() {
      hasScanned = true;
      lastScannedCode = qrData;
    });
    
    // Haptic feedback
    await HapticFeedback.selectionClick();
    
    // Parse QR data to extract token and location
    Uri? qrUri;
    String? token;
    String? locationId;
    
    try {
      qrUri = Uri.parse(qrData);
      token = qrUri.queryParameters['token'];
      locationId = qrUri.queryParameters['location'];
    } catch (e) {
      debugPrint('Failed to parse QR data: $e');
    }
    
    // Check if this is attendance QR
    if (widget.actionType == QrActionType.attendance || 
        (qrUri != null && (qrUri.host == 'checkin' || qrUri.queryParameters['type'] == 'attendance'))) {
      
      debugPrint('QR Scan - Checking registration and approval status...');
      
      // Check employee status
      final status = await ref.read(employeeRegistrationProvider.notifier)
          .checkRegistrationStatus();
      
      debugPrint('QR Scan - Employee status: $status');
      
      final employeeId = ref.read(employeeRegistrationProvider).employeeId;
      
      if (mounted) {
        switch (status) {
          case 'NOT_REGISTERED':
            // Not registered, navigate to registration page
            debugPrint('QR Scan - Navigating to registration page');
            context.go('${RouteNames.employeeRegistration}?token=$token&location=${locationId ?? ""}');
            return;
            
          case 'PENDING_APPROVAL':
            // Registration pending approval
            debugPrint('QR Scan - Navigating to approval pending page');
            context.go('${RouteNames.approvalPending}?employeeId=$employeeId');
            return;
            
          case 'REJECTED':
            // Registration rejected, show message and redirect to registration
            _showRejectionMessage();
            return;
            
          case 'SUSPENDED':
            // Account suspended
            _showSuspendedMessage();
            return;
            
          case 'APPROVED':
            // Approved, continue with normal attendance flow
            debugPrint('QR Scan - Employee approved, processing attendance');
            break;
            
          default:
            debugPrint('QR Scan - Unknown status: $status');
            break;
        }
      }
    }
    
    // Process as normal attendance check-in
    final attendanceAction = widget.actionType == QrActionType.attendance 
        ? AttendanceActionType.checkIn 
        : AttendanceActionType.checkIn; // Default to check-in
    
    await ref.read(attendanceProvider.notifier).processScannedQrCode(
      qrData: qrData,
      actionType: attendanceAction,
    );
    
    // Show verification dialog
    if (mounted) {
      _showVerificationDialog();
    }
  }

  void _showVerificationDialog() {
    // Determine attendance action based on QR action type
    final attendanceAction = widget.actionType == QrActionType.attendance 
        ? AttendanceActionType.checkIn 
        : AttendanceActionType.checkIn; // Default to check-in
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AttendanceVerificationDialog(
        actionType: attendanceAction,
        method: 'qr',
        qrCodeData: lastScannedCode,
        onConfirm: () {
          Navigator.of(context).pop(); // Close dialog
          Navigator.of(context).pop(); // Close scanner page
        },
        onRetry: () {
          Navigator.of(context).pop();
          _resetScanning();
        },
      ),
    );
  }

  void _resetScanning() {
    setState(() {
      hasScanned = false;
      lastScannedCode = null;
    });
  }
  
  void _showRejectionMessage() {
    final rejectionReason = ref.read(employeeRegistrationProvider).rejectionReason;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: NeoBrutalTheme.bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
          side: const BorderSide(
            color: NeoBrutalTheme.fg,
            width: NeoBrutalTheme.borderThick,
          ),
        ),
        title: const Text('등록 거부됨'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('관리자가 귀하의 등록을 거부했습니다.'),
            if (rejectionReason != null) ...[
              const SizedBox(height: 8),
              Text(
                '사유: $rejectionReason',
                style: const TextStyle(color: NeoBrutalTheme.error),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go(RouteNames.employeeRegistration);
            },
            child: const Text('다시 등록'),
          ),
        ],
      ),
    );
  }
  
  void _showSuspendedMessage() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: NeoBrutalTheme.bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
          side: const BorderSide(
            color: NeoBrutalTheme.fg,
            width: NeoBrutalTheme.borderThick,
          ),
        ),
        title: const Text('계정 정지'),
        content: const Text('귀하의 계정이 정지되었습니다.\n관리자에게 문의하세요.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop(); // Close scanner
            },
            child: const Text('확인'),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleFlash() async {
    if (controller != null) {
      await controller!.toggleTorch();
      setState(() {
        isFlashOn = !isFlashOn;
      });
      await HapticFeedback.selectionClick();
    }
  }

  Widget _buildScannerOverlay() {
    return Stack(
      children: [
        // Scanner frame
        Center(
          child: Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              border: Border.all(
                color: NeoBrutalTheme.hi,
                width: NeoBrutalTheme.borderThick,
              ),
              borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
            ),
            child: Stack(
              children: [
                // Corner indicators
                Positioned(
                  top: -NeoBrutalTheme.borderThick,
                  left: -NeoBrutalTheme.borderThick,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.hi,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                Positioned(
                  top: -NeoBrutalTheme.borderThick,
                  right: -NeoBrutalTheme.borderThick,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.hi,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                Positioned(
                  bottom: -NeoBrutalTheme.borderThick,
                  left: -NeoBrutalTheme.borderThick,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.hi,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                Positioned(
                  bottom: -NeoBrutalTheme.borderThick,
                  right: -NeoBrutalTheme.borderThick,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.hi,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        
        // Scanning line animation
        if (!hasScanned) _buildScanningLine(),
        
        // Instructions
        Positioned(
          bottom: 120,
          left: 0,
          right: 0,
          child: Center(
            child: NeoBrutalCard(
              padding: const EdgeInsets.symmetric(
                horizontal: NeoBrutalTheme.space4,
                vertical: NeoBrutalTheme.space3,
              ),
              child: Text(
                hasScanned 
                    ? 'QR Code Scanned Successfully!' 
                    : 'Position QR code within the frame',
                style: NeoBrutalTheme.body,
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildScanningLine() {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(seconds: 2),
      builder: (context, value, child) {
        return Positioned(
          top: MediaQuery.of(context).size.height / 2 - 125 + (value * 200),
          left: MediaQuery.of(context).size.width / 2 - 120,
          child: Container(
            width: 240,
            height: 2,
            decoration: BoxDecoration(
              color: NeoBrutalTheme.hi,
              boxShadow: [
                BoxShadow(
                  color: NeoBrutalTheme.hi.withOpacity(0.5),
                  blurRadius: 4,
                  spreadRadius: 1,
                ),
              ],
            ),
          ),
        );
      },
      onEnd: () {
        if (!hasScanned && mounted) {
          setState(() {}); // Restart animation
        }
      },
    );
  }

  Widget _buildControlButtons() {
    return Positioned(
      bottom: NeoBrutalTheme.space6,
      left: NeoBrutalTheme.space4,
      right: NeoBrutalTheme.space4,
      child: Row(
        children: [
          // Flash toggle
          Expanded(
            child: NeoBrutalButton.outlined(
              onPressed: _toggleFlash,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isFlashOn ? Icons.flash_on : Icons.flash_off,
                    color: NeoBrutalTheme.fg,
                  ),
                  const SizedBox(width: NeoBrutalTheme.space2),
                  Text(
                    isFlashOn ? 'Flash On' : 'Flash Off',
                    style: NeoBrutalTheme.body.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(width: NeoBrutalTheme.space3),
          
          // Reset scanning
          if (hasScanned)
            Expanded(
              child: NeoBrutalButton(
                onPressed: _resetScanning,
                child: Text(
                  'Scan Again',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                    color: NeoBrutalTheme.hiInk,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final attendanceState = ref.watch(attendanceProvider);
    final hasOfflineQueue = ref.watch(hasOfflineQueueProvider);

    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: Text(
          widget.actionType == AttendanceActionType.checkIn
              ? 'Check In - QR Scanner'
              : 'Check Out - QR Scanner',
        ),
        actions: [
          // Queue indicator
          if (hasOfflineQueue)
            IconButton(
              onPressed: () => _showOfflineQueueDialog(),
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
      body: Stack(
        children: [
          // QR Scanner
          MobileScanner(
            controller: controller,
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null && !hasScanned) {
                  _handleQrScanned(barcode.rawValue!);
                  break;
                }
              }
            },
          ),
          
          // Dark overlay except for scan area
          Container(
            color: Colors.black.withOpacity(0.5),
            child: Stack(
              children: [
                // Transparent center area
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
                      child: Container(color: Colors.transparent),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Scanner overlay
          _buildScannerOverlay(),
          
          // Control buttons
          _buildControlButtons(),
          
          // Loading indicator
          if (attendanceState.isVerifying)
            Container(
              color: Colors.black.withOpacity(0.7),
              child: const Center(
                child: CircularProgressIndicator(
                  color: NeoBrutalTheme.hi,
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _showOfflineQueueDialog() {
    showDialog(
      context: context,
      builder: (context) => const AttendanceQueueWidget(),
    );
  }

  @override
  void dispose() {
    controller?.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}