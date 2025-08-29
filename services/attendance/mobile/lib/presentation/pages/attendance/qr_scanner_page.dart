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
import '../../widgets/attendance/attendance_verification_dialog.dart';
import '../../widgets/attendance/attendance_queue_widget.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/common/neo_brutal_card.dart';

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
    
    // Process QR code - convert QrActionType to AttendanceActionType
    final attendanceAction = widget.actionType == QrActionType.checkIn
        ? AttendanceActionType.checkIn
        : AttendanceActionType.checkOut;
    
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
    // Convert QrActionType to AttendanceActionType
    final attendanceAction = widget.actionType == QrActionType.checkIn
        ? AttendanceActionType.checkIn
        : AttendanceActionType.checkOut;
    
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

  Future<void> _toggleFlash() async {
    if (controller != null) {
      await controller!.toggleFlash();
      final flashStatus = await controller!.getFlashStatus() ?? false;
      setState(() {
        isFlashOn = flashStatus;
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
          QRView(
            key: qrKey,
            onQRViewCreated: _onQRViewCreated,
            overlay: QrScannerOverlayShape(
              borderColor: Colors.transparent,
              borderRadius: 0,
              borderLength: 0,
              borderWidth: 0,
              cutOutSize: 250,
            ),
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