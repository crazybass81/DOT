import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/qr_service.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../../domain/entities/attendance/qr_action_type.dart';

class QrDisplayPage extends ConsumerStatefulWidget {
  final QrActionType actionType;
  final String locationId;
  final String locationName;

  const QrDisplayPage({
    super.key,
    required this.actionType,
    required this.locationId,
    required this.locationName,
  });

  @override
  ConsumerState<QrDisplayPage> createState() => _QrDisplayPageState();
}

class _QrDisplayPageState extends ConsumerState<QrDisplayPage> 
    with TickerProviderStateMixin {
  final _qrService = QrService();
  
  Timer? _refreshTimer;
  Widget? _currentQrCode;
  String? _currentQrData;
  DateTime? _lastGeneratedTime;
  
  late AnimationController _pulseController;
  late AnimationController _fadeController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _fadeAnimation;
  
  bool _isFullscreen = false;
  
  @override
  void initState() {
    super.initState();
    _initAnimations();
    _generateQrCode();
    _startAutoRefresh();
  }

  void _initAnimations() {
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _pulseAnimation = Tween<double>(
      begin: 0.95,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeIn,
    ));
    
    _pulseController.repeat(reverse: true);
    _fadeController.forward();
  }

  void _startAutoRefresh() {
    // Refresh every 4 minutes (QR codes expire in 5 minutes)
    _refreshTimer = Timer.periodic(const Duration(minutes: 4), (timer) {
      _generateQrCode();
    });
  }

  Future<void> _generateQrCode() async {
    try {
      final qrData = _qrService.generateQrCodeData(
        type: widget.actionType.toString().split('.').last,
        locationId: widget.locationId,
        extraData: 'display_mode',
      );

      final qrWidget = _qrService.generateQrCodeWidget(
        data: qrData,
        size: _isFullscreen ? 400.0 : 300.0,
        foregroundColor: NeoBrutalTheme.fg,
        backgroundColor: Colors.white,
      );

      setState(() {
        _currentQrCode = qrWidget;
        _currentQrData = qrData;
        _lastGeneratedTime = DateTime.now();
      });
      
      // Restart fade animation
      _fadeController.reset();
      _fadeController.forward();
      
    } catch (e) {
      _showError('QR 코드 생성 실패: $e');
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: NeoBrutalTheme.error,
        ),
      );
    }
  }

  void _toggleFullscreen() {
    setState(() {
      _isFullscreen = !_isFullscreen;
    });
    
    if (_isFullscreen) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
    } else {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
    
    // Regenerate QR code with new size
    _generateQrCode();
  }

  String _getTimeRemaining() {
    if (_lastGeneratedTime == null) return '';
    
    final now = DateTime.now();
    final difference = now.difference(_lastGeneratedTime!);
    final remaining = const Duration(minutes: 5) - difference;
    
    if (remaining.isNegative) {
      return 'EXPIRED';
    }
    
    final minutes = remaining.inMinutes;
    final seconds = remaining.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      decoration: BoxDecoration(
        color: widget.actionType == QrActionType.checkIn 
            ? NeoBrutalTheme.success 
            : NeoBrutalTheme.warning,
        border: Border.all(
          color: NeoBrutalTheme.fg,
          width: NeoBrutalTheme.borderThick,
        ),
        borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
        boxShadow: const [
          BoxShadow(
            color: NeoBrutalTheme.shadow,
            offset: Offset(NeoBrutalTheme.shadowOffset, NeoBrutalTheme.shadowOffset),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            widget.actionType == QrActionType.checkIn 
                ? Icons.login 
                : Icons.logout,
            size: 48,
            color: widget.actionType == QrActionType.checkIn 
                ? NeoBrutalTheme.successInk 
                : NeoBrutalTheme.warningInk,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            widget.actionType == QrActionType.checkIn ? '출근' : '퇴근',
            style: NeoBrutalTheme.h1.copyWith(
              color: widget.actionType == QrActionType.checkIn 
                  ? NeoBrutalTheme.successInk 
                  : NeoBrutalTheme.warningInk,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space1),
          Text(
            widget.locationName,
            style: NeoBrutalTheme.h3.copyWith(
              color: widget.actionType == QrActionType.checkIn 
                  ? NeoBrutalTheme.successInk 
                  : NeoBrutalTheme.warningInk,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQrCodeSection() {
    if (_currentQrCode == null) {
      return Container(
        width: 300,
        height: 300,
        decoration: BoxDecoration(
          color: NeoBrutalTheme.lo,
          border: Border.all(
            color: NeoBrutalTheme.fg,
            width: NeoBrutalTheme.borderThin,
          ),
          borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
        ),
        child: const Center(
          child: CircularProgressIndicator(
            color: NeoBrutalTheme.hi,
          ),
        ),
      );
    }

    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _pulseAnimation.value,
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: Container(
              padding: const EdgeInsets.all(NeoBrutalTheme.space4),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(
                  color: NeoBrutalTheme.fg,
                  width: NeoBrutalTheme.borderThick,
                ),
                borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
                boxShadow: const [
                  BoxShadow(
                    color: NeoBrutalTheme.shadow,
                    offset: Offset(NeoBrutalTheme.shadowOffset, NeoBrutalTheme.shadowOffset),
                  ),
                ],
              ),
              child: _currentQrCode!,
            ),
          ),
        );
      },
    );
  }

  Widget _buildTimer() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final timeRemaining = _getTimeRemaining();
        final isExpired = timeRemaining == 'EXPIRED';
        
        return Container(
          padding: const EdgeInsets.symmetric(
            horizontal: NeoBrutalTheme.space4,
            vertical: NeoBrutalTheme.space2,
          ),
          decoration: BoxDecoration(
            color: isExpired ? NeoBrutalTheme.error : NeoBrutalTheme.hi,
            border: Border.all(
              color: NeoBrutalTheme.fg,
              width: NeoBrutalTheme.borderThin,
            ),
            borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
            boxShadow: const [
              BoxShadow(
                color: NeoBrutalTheme.shadow,
                offset: Offset(NeoBrutalTheme.shadowOffset, NeoBrutalTheme.shadowOffset),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isExpired ? Icons.error : Icons.timer,
                color: isExpired ? Colors.white : NeoBrutalTheme.hiInk,
                size: 20,
              ),
              const SizedBox(width: NeoBrutalTheme.space2),
              Text(
                isExpired ? 'EXPIRED' : '남은 시간: $timeRemaining',
                style: NeoBrutalTheme.h4.copyWith(
                  color: isExpired ? Colors.white : NeoBrutalTheme.hiInk,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInstructions() {
    return Container(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      decoration: BoxDecoration(
        color: NeoBrutalTheme.lo,
        border: Border.all(
          color: NeoBrutalTheme.fg,
          width: NeoBrutalTheme.borderThin,
        ),
        borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
      ),
      child: Column(
        children: [
          Icon(
            Icons.info_outline,
            color: NeoBrutalTheme.loInk,
            size: 32,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            '사용 방법',
            style: NeoBrutalTheme.h3.copyWith(
              color: NeoBrutalTheme.fg,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            '1. 휴대폰으로 DOT 출근부 앱을 열어주세요\n'
            '2. QR 코드 스캔 메뉴를 선택하세요\n'
            '3. 위 QR 코드를 스캔하여 ${widget.actionType == QrActionType.checkIn ? "출근" : "퇴근"} 처리하세요\n'
            '4. QR 코드는 5분마다 자동 갱신됩니다',
            style: NeoBrutalTheme.body.copyWith(
              color: NeoBrutalTheme.loInk,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildFullscreenView() {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildHeader(),
                  const SizedBox(height: NeoBrutalTheme.space6),
                  _buildQrCodeSection(),
                  const SizedBox(height: NeoBrutalTheme.space4),
                  _buildTimer(),
                ],
              ),
            ),
            
            // Exit fullscreen button
            Positioned(
              top: NeoBrutalTheme.space4,
              right: NeoBrutalTheme.space4,
              child: GestureDetector(
                onTap: _toggleFullscreen,
                child: Container(
                  padding: const EdgeInsets.all(NeoBrutalTheme.space2),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.lo,
                    border: Border.all(
                      color: NeoBrutalTheme.fg,
                      width: NeoBrutalTheme.borderThin,
                    ),
                    borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
                  ),
                  child: const Icon(
                    Icons.fullscreen_exit,
                    color: NeoBrutalTheme.fg,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNormalView() {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: Text('QR 디스플레이 - ${widget.locationName}'),
        backgroundColor: NeoBrutalTheme.bg,
        foregroundColor: NeoBrutalTheme.fg,
        actions: [
          IconButton(
            onPressed: _generateQrCode,
            icon: const Icon(Icons.refresh),
            tooltip: '새로고침',
          ),
          IconButton(
            onPressed: _toggleFullscreen,
            icon: const Icon(Icons.fullscreen),
            tooltip: '전체화면',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(NeoBrutalTheme.space4),
        child: Column(
          children: [
            _buildHeader(),
            const SizedBox(height: NeoBrutalTheme.space6),
            _buildQrCodeSection(),
            const SizedBox(height: NeoBrutalTheme.space4),
            _buildTimer(),
            const SizedBox(height: NeoBrutalTheme.space6),
            _buildInstructions(),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _isFullscreen ? _buildFullscreenView() : _buildNormalView();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _pulseController.dispose();
    _fadeController.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }
}