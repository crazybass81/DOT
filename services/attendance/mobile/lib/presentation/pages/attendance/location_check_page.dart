import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';

import '../../../core/services/location_service.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/di/injection_container.dart';
import '../../../domain/entities/attendance/attendance_action_type.dart';
import '../../../domain/entities/business/business_location.dart';
import '../../providers/attendance_provider.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/common/neo_brutal_card.dart';

/// PLAN-1: GPS 기반 출퇴근 처리 화면
/// 사업장 위치와 사용자 위치를 비교하여 출퇴근을 처리하는 화면
class LocationCheckPage extends ConsumerStatefulWidget {
  final AttendanceActionType actionType;
  final BusinessLocation? workLocation;

  const LocationCheckPage({
    super.key,
    required this.actionType,
    this.workLocation,
  });

  @override
  ConsumerState<LocationCheckPage> createState() => _LocationCheckPageState();
}

class _LocationCheckPageState extends ConsumerState<LocationCheckPage>
    with TickerProviderStateMixin {
  final LocationService _locationService = getIt<LocationService>();
  
  Position? _currentPosition;
  String? _currentAddress;
  bool _isLoadingLocation = false;
  bool _isWithinRange = false;
  double? _distanceToWork;
  String? _locationError;
  
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  late AnimationController _checkController;
  late Animation<double> _checkAnimation;

  @override
  void initState() {
    super.initState();
    
    _pulseController = AnimationController(
      duration: const Duration(seconds: 1),
      vsync: this,
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(
      begin: 0.95,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    _checkController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    
    _checkAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _checkController,
      curve: Curves.elasticOut,
    ));

    // 자동으로 위치 확인 시작
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _getCurrentLocation();
    });
  }

  @override
  Widget build(BuildContext context) {
    final attendanceState = ref.watch(attendanceProvider);
    final isProcessingAttendance = ref.watch(isAttendanceLoadingProvider);

    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: Text(
          widget.actionType == AttendanceActionType.checkIn ? '출근 위치 확인' : '퇴근 위치 확인',
          style: NeoBrutalTheme.title,
        ),
        backgroundColor: NeoBrutalTheme.bg,
        foregroundColor: NeoBrutalTheme.fg,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(NeoBrutalTheme.space4),
        child: Column(
          children: [
            // 현재 위치 상태 카드
            _buildLocationStatusCard(),
            
            const SizedBox(height: NeoBrutalTheme.space6),
            
            // 사업장 위치 정보 카드
            if (widget.workLocation != null) ...[
              _buildWorkLocationCard(),
              const SizedBox(height: NeoBrutalTheme.space6),
            ],
            
            // 거리 정보 카드
            if (_distanceToWork != null) ...[
              _buildDistanceCard(),
              const SizedBox(height: NeoBrutalTheme.space6),
            ],
            
            // 위치 새로고침 버튼
            _buildRefreshLocationButton(),
            
            const SizedBox(height: NeoBrutalTheme.space6),
            
            // 출퇴근 처리 버튼
            _buildAttendanceButton(isProcessingAttendance),
            
            const SizedBox(height: NeoBrutalTheme.space4),
            
            // 도움말 정보
            _buildHelpCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationStatusCard() {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        children: [
          // 위치 아이콘과 상태
          Row(
            children: [
              AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _isLoadingLocation ? _pulseAnimation.value : 1.0,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _getLocationStatusColor(),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: NeoBrutalTheme.fg,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        _getLocationStatusIcon(),
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(width: NeoBrutalTheme.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '현재 위치',
                      style: NeoBrutalTheme.caption.copyWith(
                        color: NeoBrutalTheme.fg.withOpacity(0.6),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _getLocationStatusText(),
                      style: NeoBrutalTheme.body.copyWith(
                        fontWeight: FontWeight.bold,
                        color: _getLocationStatusColor(),
                      ),
                    ),
                  ],
                ),
              ),
              if (_isWithinRange) ...[
                AnimatedBuilder(
                  animation: _checkAnimation,
                  builder: (context, child) {
                    return Transform.scale(
                      scale: _checkAnimation.value,
                      child: const Icon(
                        Icons.check_circle,
                        color: NeoBrutalTheme.success,
                        size: 24,
                      ),
                    );
                  },
                ),
              ],
            ],
          ),
          
          // 현재 주소
          if (_currentAddress != null) ...[
            const SizedBox(height: NeoBrutalTheme.space4),
            Container(
              padding: const EdgeInsets.all(NeoBrutalTheme.space3),
              decoration: BoxDecoration(
                color: NeoBrutalTheme.gray50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: NeoBrutalTheme.gray200,
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.location_on,
                    size: 16,
                    color: NeoBrutalTheme.gray500,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _currentAddress!,
                      style: NeoBrutalTheme.caption.copyWith(
                        color: NeoBrutalTheme.gray600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          
          // 좌표 정보
          if (_currentPosition != null) ...[
            const SizedBox(height: NeoBrutalTheme.space2),
            Text(
              '좌표: ${_locationService.formatCoordinates(_currentPosition!.latitude, _currentPosition!.longitude)}',
              style: NeoBrutalTheme.micro.copyWith(
                color: NeoBrutalTheme.gray500,
              ),
            ),
            Text(
              '정확도: ±${_currentPosition!.accuracy.toStringAsFixed(0)}m',
              style: NeoBrutalTheme.micro.copyWith(
                color: NeoBrutalTheme.gray500,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildWorkLocationCard() {
    final workLocation = widget.workLocation!;
    
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: NeoBrutalTheme.hi.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: NeoBrutalTheme.hi,
                    width: 1,
                  ),
                ),
                child: const Icon(
                  Icons.business,
                  color: NeoBrutalTheme.hi,
                  size: 20,
                ),
              ),
              const SizedBox(width: NeoBrutalTheme.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '근무지',
                      style: NeoBrutalTheme.caption.copyWith(
                        color: NeoBrutalTheme.fg.withOpacity(0.6),
                      ),
                    ),
                    Text(
                      workLocation.name,
                      style: NeoBrutalTheme.body.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: NeoBrutalTheme.space3),
          
          // 주소 정보
          Container(
            padding: const EdgeInsets.all(NeoBrutalTheme.space3),
            decoration: BoxDecoration(
              color: NeoBrutalTheme.gray50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              workLocation.fullAddress,
              style: NeoBrutalTheme.caption,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDistanceCard() {
    return NeoBrutalCard(
      backgroundColor: _isWithinRange 
          ? NeoBrutalTheme.success.withOpacity(0.1)
          : NeoBrutalTheme.warning.withOpacity(0.1),
      borderColor: _isWithinRange ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Row(
        children: [
          Icon(
            _isWithinRange ? Icons.check_circle : Icons.warning,
            color: _isWithinRange ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
            size: 24,
          ),
          const SizedBox(width: NeoBrutalTheme.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '근무지와의 거리',
                  style: NeoBrutalTheme.caption.copyWith(
                    color: NeoBrutalTheme.fg.withOpacity(0.6),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_distanceToWork!.toStringAsFixed(0)}m',
                  style: NeoBrutalTheme.heading.copyWith(
                    color: _isWithinRange ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
                  ),
                ),
                Text(
                  _isWithinRange 
                      ? '출퇴근 가능 범위입니다' 
                      : '출퇴근 범위를 벗어났습니다 (${AppConstants.attendanceRadius.toInt()}m 이내)',
                  style: NeoBrutalTheme.micro.copyWith(
                    color: _isWithinRange ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRefreshLocationButton() {
    return NeoBrutalButton(
      onPressed: _isLoadingLocation ? null : _getCurrentLocation,
      backgroundColor: NeoBrutalTheme.gray100,
      foregroundColor: NeoBrutalTheme.fg,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_isLoadingLocation) ...[
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: NeoBrutalTheme.fg,
              ),
            ),
            const SizedBox(width: 8),
          ] else ...[
            const Icon(Icons.refresh, size: 18),
            const SizedBox(width: 8),
          ],
          const Text('위치 새로고침'),
        ],
      ),
    );
  }

  Widget _buildAttendanceButton(bool isProcessing) {
    final canProcess = _isWithinRange && _currentPosition != null && !isProcessing;
    
    return SizedBox(
      width: double.infinity,
      child: NeoBrutalButton(
        onPressed: canProcess ? _processAttendance : null,
        backgroundColor: widget.actionType == AttendanceActionType.checkIn 
            ? NeoBrutalTheme.success 
            : NeoBrutalTheme.error,
        foregroundColor: NeoBrutalTheme.white,
        height: 56,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isProcessing) ...[
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              const Text('처리 중...'),
            ] else if (!canProcess && _locationError == null) ...[
              const Icon(Icons.lock, size: 20),
              const SizedBox(width: 8),
              Text(
                _isWithinRange 
                    ? '${widget.actionType == AttendanceActionType.checkIn ? '출근' : '퇴근'} 처리'
                    : '위치 확인 필요',
              ),
            ] else ...[
              Icon(
                widget.actionType == AttendanceActionType.checkIn 
                    ? Icons.login 
                    : Icons.logout,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                widget.actionType == AttendanceActionType.checkIn ? '출근 처리' : '퇴근 처리',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHelpCard() {
    return NeoBrutalCard(
      backgroundColor: NeoBrutalTheme.gray50,
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.help_outline,
                color: NeoBrutalTheme.gray500,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                '도움말',
                style: NeoBrutalTheme.body.copyWith(
                  fontWeight: FontWeight.bold,
                  color: NeoBrutalTheme.gray700,
                ),
              ),
            ],
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '• 근무지 ${AppConstants.attendanceRadius.toInt()}m 이내에서만 출퇴근이 가능합니다\n'
            '• GPS 정확도가 낮을 경우 위치를 새로고침해주세요\n'
            '• 건물 내부에서는 GPS 정확도가 떨어질 수 있습니다\n'
            '• 위치 서비스가 비활성화된 경우 설정에서 활성화해주세요',
            style: NeoBrutalTheme.caption.copyWith(
              color: NeoBrutalTheme.gray600,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  // Helper methods for UI state
  Color _getLocationStatusColor() {
    if (_isLoadingLocation) return NeoBrutalTheme.hi;
    if (_locationError != null) return NeoBrutalTheme.error;
    if (_isWithinRange) return NeoBrutalTheme.success;
    if (_currentPosition != null) return NeoBrutalTheme.warning;
    return NeoBrutalTheme.gray400;
  }

  IconData _getLocationStatusIcon() {
    if (_isLoadingLocation) return Icons.gps_fixed;
    if (_locationError != null) return Icons.gps_off;
    if (_isWithinRange) return Icons.gps_fixed;
    if (_currentPosition != null) return Icons.gps_not_fixed;
    return Icons.gps_off;
  }

  String _getLocationStatusText() {
    if (_isLoadingLocation) return '위치 확인 중...';
    if (_locationError != null) return '위치 확인 실패';
    if (_isWithinRange) return '출퇴근 가능 위치';
    if (_currentPosition != null) return '출퇴근 범위 외';
    return '위치 정보 없음';
  }

  // Location methods
  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLoadingLocation = true;
      _locationError = null;
    });

    try {
      final position = await _locationService.getCurrentLocation(
        highAccuracy: true,
        timeout: const Duration(seconds: 15),
      );
      
      final address = await _locationService.getAddressFromCoordinates(
        position.latitude,
        position.longitude,
      );

      setState(() {
        _currentPosition = position;
        _currentAddress = address;
        _isLoadingLocation = false;
      });

      await _checkWorkDistance();
      
      // Haptic feedback
      await HapticFeedback.lightImpact();
      
    } catch (e) {
      setState(() {
        _locationError = e.toString();
        _isLoadingLocation = false;
      });
      
      _showErrorSnackBar('위치 확인 실패: ${e.toString()}');
    }
  }

  Future<void> _checkWorkDistance() async {
    if (_currentPosition == null || widget.workLocation == null) return;

    final workLocation = widget.workLocation!;
    if (!workLocation.hasCoordinates) return;

    try {
      final distance = _locationService.calculateDistance(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
        workLocation.latitude!,
        workLocation.longitude!,
      );
      
      final isWithinRange = distance <= AppConstants.attendanceRadius;
      
      setState(() {
        _distanceToWork = distance;
        _isWithinRange = isWithinRange;
      });

      if (isWithinRange) {
        _checkController.forward();
        await HapticFeedback.mediumImpact();
      }
      
    } catch (e) {
      debugPrint('Failed to calculate distance: $e');
    }
  }

  Future<void> _processAttendance() async {
    if (_currentPosition == null) return;

    try {
      await HapticFeedback.mediumImpact();
      
      final success = await ref.read(attendanceProvider.notifier).markAttendance(
        actionType: widget.actionType,
        method: 'location',
        notes: '위치: ${_currentAddress ?? 'Unknown'}\n'
              '좌표: ${_locationService.formatCoordinates(_currentPosition!.latitude, _currentPosition!.longitude)}\n'
              '거리: ${_distanceToWork?.toStringAsFixed(0)}m',
      );

      if (success && mounted) {
        await HapticFeedback.heavyImpact();
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.actionType == AttendanceActionType.checkIn 
                  ? '출근 처리가 완료되었습니다!' 
                  : '퇴근 처리가 완료되었습니다!',
            ),
            backgroundColor: NeoBrutalTheme.success,
          ),
        );
        
        // 잠시 후 페이지 닫기
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) {
            Navigator.of(context).pop(true);
          }
        });
      }
    } catch (e) {
      await HapticFeedback.heavyImpact();
      _showErrorSnackBar('처리 실패: ${e.toString()}');
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: NeoBrutalTheme.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _checkController.dispose();
    super.dispose();
  }
}