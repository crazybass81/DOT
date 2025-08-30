import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/services/qr_service.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../../domain/entities/attendance/qr_action_type.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/common/neo_brutal_card.dart';
import '../../widgets/common/neo_brutal_input.dart';

class QrGeneratorPage extends ConsumerStatefulWidget {
  const QrGeneratorPage({super.key});

  @override
  ConsumerState<QrGeneratorPage> createState() => _QrGeneratorPageState();
}

class _QrGeneratorPageState extends ConsumerState<QrGeneratorPage> {
  final _qrService = QrService();
  final _locationController = TextEditingController();
  final _extraDataController = TextEditingController();
  
  String? _generatedQrData;
  Widget? _qrCodeWidget;
  bool _isGenerating = false;
  
  // Predefined locations for quick selection
  final List<Map<String, String>> _predefinedLocations = [
    {'id': 'main_office', 'name': '본사 - 강남'},
    {'id': 'branch_1', 'name': '강남지점'},
    {'id': 'branch_2', 'name': '홍대지점'},
    {'id': 'branch_3', 'name': '신촌지점'},
    {'id': 'meeting_room_1', 'name': '회의실 A'},
    {'id': 'meeting_room_2', 'name': '회의실 B'},
  ];
  
  String? _selectedLocationId;

  @override
  void initState() {
    super.initState();
    // Set default location
    _selectedLocationId = _predefinedLocations.first['id'];
    _locationController.text = _predefinedLocations.first['name'] ?? '';
  }

  @override
  void dispose() {
    _locationController.dispose();
    _extraDataController.dispose();
    super.dispose();
  }

  Future<void> _generateQrCode() async {
    if (_selectedLocationId == null || _selectedLocationId!.isEmpty) {
      _showSnackBar('위치를 선택해주세요', isError: true);
      return;
    }

    setState(() {
      _isGenerating = true;
    });

    try {
      // Generate QR code data for login
      final qrData = _qrService.generateQrCodeData(
        type: 'login',  // 로그인용 QR
        locationId: _selectedLocationId!,
        extraData: _extraDataController.text.trim().isNotEmpty 
            ? _extraDataController.text.trim() 
            : null,
      );

      // Generate QR code widget
      final qrWidget = _qrService.generateQrCodeWidget(
        data: qrData,
        size: 280.0,
        foregroundColor: NeoBrutalTheme.fg,
        backgroundColor: NeoBrutalTheme.bg,
      );

      setState(() {
        _generatedQrData = qrData;
        _qrCodeWidget = qrWidget;
        _isGenerating = false;
      });

      _showSnackBar('QR 코드가 생성되었습니다!', isError: false);
      
      // Haptic feedback
      await HapticFeedback.lightImpact();
      
    } catch (e) {
      setState(() {
        _isGenerating = false;
      });
      _showSnackBar('QR 코드 생성 중 오류가 발생했습니다: $e', isError: true);
    }
  }

  Future<void> _shareQrCode() async {
    if (_generatedQrData == null) {
      _showSnackBar('먼저 QR 코드를 생성해주세요', isError: true);
      return;
    }

    try {
      // Generate QR code as image bytes
      final imageBytes = await _qrService.generateQrCodeBytes(
        data: _generatedQrData!,
        size: 512.0,
        foregroundColor: Colors.black,
        backgroundColor: Colors.white,
      );

      if (imageBytes == null) {
        _showSnackBar('QR 코드 이미지 생성에 실패했습니다', isError: true);
        return;
      }

      // Save to temporary file
      final directory = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final fileName = 'qr_code_login_$timestamp.png';
      final file = File('${directory.path}/$fileName');
      
      await file.writeAsBytes(imageBytes);

      // Share the file
      await Share.shareXFiles(
        [XFile(file.path)],
        text: 'DOT 출근부 QR 코드\n'
             '유형: 로그인 QR\n'
             '위치: ${_locationController.text}\n'
             '생성시간: ${DateTime.now().toString().substring(0, 19)}',
        subject: 'DOT 출근부 QR 코드',
      );

      _showSnackBar('QR 코드를 공유했습니다', isError: false);
      await HapticFeedback.lightImpact();
      
    } catch (e) {
      _showSnackBar('QR 코드 공유 중 오류가 발생했습니다: $e', isError: true);
    }
  }

  Future<void> _saveQrCode() async {
    if (_generatedQrData == null) {
      _showSnackBar('먼저 QR 코드를 생성해주세요', isError: true);
      return;
    }

    try {
      // Generate QR code as image bytes
      final imageBytes = await _qrService.generateQrCodeBytes(
        data: _generatedQrData!,
        size: 512.0,
        foregroundColor: Colors.black,
        backgroundColor: Colors.white,
      );

      if (imageBytes == null) {
        _showSnackBar('QR 코드 이미지 생성에 실패했습니다', isError: true);
        return;
      }

      // Get downloads directory
      final directory = await getApplicationDocumentsDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final fileName = 'dot_qr_code_login_$timestamp.png';
      final file = File('${directory.path}/$fileName');
      
      await file.writeAsBytes(imageBytes);

      _showSnackBar('QR 코드가 저장되었습니다\n경로: ${file.path}', isError: false);
      await HapticFeedback.lightImpact();
      
    } catch (e) {
      _showSnackBar('QR 코드 저장 중 오류가 발생했습니다: $e', isError: true);
    }
  }

  void _copyQrData() {
    if (_generatedQrData == null) {
      _showSnackBar('먼저 QR 코드를 생성해주세요', isError: true);
      return;
    }

    Clipboard.setData(ClipboardData(text: _generatedQrData!));
    _showSnackBar('QR 코드 데이터가 클립보드에 복사되었습니다', isError: false);
    HapticFeedback.selectionClick();
  }

  void _showSnackBar(String message, {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? NeoBrutalTheme.error : NeoBrutalTheme.success,
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: isError ? 4 : 2),
      ),
    );
  }

  Widget _buildLocationSelector() {
    return NeoBrutalCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '📍 위치 선택',
            style: NeoBrutalTheme.h3.copyWith(
              color: NeoBrutalTheme.fg,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          
          // Predefined locations grid
          Wrap(
            spacing: NeoBrutalTheme.space2,
            runSpacing: NeoBrutalTheme.space2,
            children: _predefinedLocations.map((location) {
              final isSelected = _selectedLocationId == location['id'];
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedLocationId = location['id'];
                    _locationController.text = location['name'] ?? '';
                  });
                  HapticFeedback.selectionClick();
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: NeoBrutalTheme.space3,
                    vertical: NeoBrutalTheme.space2,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected ? NeoBrutalTheme.hi : NeoBrutalTheme.lo,
                    border: Border.all(
                      color: NeoBrutalTheme.fg,
                      width: NeoBrutalTheme.borderThin,
                    ),
                    borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
                    boxShadow: isSelected ? [
                      BoxShadow(
                        color: NeoBrutalTheme.shadow,
                        offset: const Offset(NeoBrutalTheme.shadowOffset, NeoBrutalTheme.shadowOffset),
                      ),
                    ] : null,
                  ),
                  child: Text(
                    location['name'] ?? '',
                    style: NeoBrutalTheme.body.copyWith(
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? NeoBrutalTheme.hiInk : NeoBrutalTheme.fg,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // Custom location input
          Text(
            '또는 직접 입력:',
            style: NeoBrutalTheme.body.copyWith(
              color: NeoBrutalTheme.loInk,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          NeoBrutalInput(
            controller: _locationController,
            label: '위치명',
            hint: '예: 회의실 C, 로비 등',
            onChanged: (value) {
              setState(() {
                _selectedLocationId = 'custom_${value.hashCode}';
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildActionTypeSelector() {
    return NeoBrutalCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '⚡ QR 코드 유형',
            style: NeoBrutalTheme.h3.copyWith(
              color: NeoBrutalTheme.fg,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedActionType = QrActionType.checkIn;
                    });
                    HapticFeedback.selectionClick();
                  },
                  child: Container(
                    padding: const EdgeInsets.all(NeoBrutalTheme.space3),
                    decoration: BoxDecoration(
                      color: _selectedActionType == QrActionType.checkIn 
                          ? NeoBrutalTheme.success 
                          : NeoBrutalTheme.lo,
                      border: Border.all(
                        color: NeoBrutalTheme.fg,
                        width: NeoBrutalTheme.borderThin,
                      ),
                      borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
                      boxShadow: _selectedActionType == QrActionType.checkIn ? [
                        BoxShadow(
                          color: NeoBrutalTheme.shadow,
                          offset: const Offset(NeoBrutalTheme.shadowOffset, NeoBrutalTheme.shadowOffset),
                        ),
                      ] : null,
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.login,
                          size: 32,
                          color: _selectedActionType == QrActionType.checkIn 
                              ? NeoBrutalTheme.successInk 
                              : NeoBrutalTheme.loInk,
                        ),
                        const SizedBox(height: NeoBrutalTheme.space2),
                        Text(
                          '출근',
                          style: NeoBrutalTheme.h4.copyWith(
                            color: _selectedActionType == QrActionType.checkIn 
                                ? NeoBrutalTheme.successInk 
                                : NeoBrutalTheme.loInk,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              
              const SizedBox(width: NeoBrutalTheme.space3),
              
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedActionType = QrActionType.checkOut;
                    });
                    HapticFeedback.selectionClick();
                  },
                  child: Container(
                    padding: const EdgeInsets.all(NeoBrutalTheme.space3),
                    decoration: BoxDecoration(
                      color: _selectedActionType == QrActionType.checkOut 
                          ? NeoBrutalTheme.warning 
                          : NeoBrutalTheme.lo,
                      border: Border.all(
                        color: NeoBrutalTheme.fg,
                        width: NeoBrutalTheme.borderThin,
                      ),
                      borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
                      boxShadow: _selectedActionType == QrActionType.checkOut ? [
                        BoxShadow(
                          color: NeoBrutalTheme.shadow,
                          offset: const Offset(NeoBrutalTheme.shadowOffset, NeoBrutalTheme.shadowOffset),
                        ),
                      ] : null,
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.logout,
                          size: 32,
                          color: _selectedActionType == QrActionType.checkOut 
                              ? NeoBrutalTheme.warningInk 
                              : NeoBrutalTheme.loInk,
                        ),
                        const SizedBox(height: NeoBrutalTheme.space2),
                        Text(
                          '퇴근',
                          style: NeoBrutalTheme.h4.copyWith(
                            color: _selectedActionType == QrActionType.checkOut 
                                ? NeoBrutalTheme.warningInk 
                                : NeoBrutalTheme.loInk,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildExtraDataInput() {
    return NeoBrutalCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '📝 추가 정보 (선택사항)',
            style: NeoBrutalTheme.h3.copyWith(
              color: NeoBrutalTheme.fg,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          NeoBrutalInput(
            controller: _extraDataController,
            label: '추가 정보',
            hint: '예: 프로젝트명, 부서명, 메모 등',
            maxLines: 2,
          ),
        ],
      ),
    );
  }

  Widget _buildGenerateButton() {
    return SizedBox(
      width: double.infinity,
      child: NeoBrutalButton(
        onPressed: _isGenerating ? null : _generateQrCode,
        child: _isGenerating 
            ? const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: NeoBrutalTheme.hiInk,
                      strokeWidth: 2,
                    ),
                  ),
                  SizedBox(width: NeoBrutalTheme.space2),
                  Text(
                    '생성 중...',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: NeoBrutalTheme.hiInk,
                    ),
                  ),
                ],
              )
            : Text(
                '🎯 QR 코드 생성',
                style: NeoBrutalTheme.h4.copyWith(
                  color: NeoBrutalTheme.hiInk,
                ),
              ),
      ),
    );
  }

  Widget _buildQrCodeDisplay() {
    if (_qrCodeWidget == null) return const SizedBox.shrink();

    return NeoBrutalCard(
      child: Column(
        children: [
          Text(
            '생성된 QR 코드',
            style: NeoBrutalTheme.h3.copyWith(
              color: NeoBrutalTheme.fg,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // QR Code display
          Container(
            padding: const EdgeInsets.all(NeoBrutalTheme.space4),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(
                color: NeoBrutalTheme.fg,
                width: NeoBrutalTheme.borderThin,
              ),
              borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
              boxShadow: const [
                BoxShadow(
                  color: NeoBrutalTheme.shadow,
                  offset: Offset(NeoBrutalTheme.shadowOffset, NeoBrutalTheme.shadowOffset),
                ),
              ],
            ),
            child: _qrCodeWidget!,
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // QR Code info
          Container(
            padding: const EdgeInsets.all(NeoBrutalTheme.space3),
            decoration: BoxDecoration(
              color: NeoBrutalTheme.lo,
              border: Border.all(
                color: NeoBrutalTheme.fg,
                width: NeoBrutalTheme.borderThin,
              ),
              borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildInfoRow('유형', '로그인 QR'),
                _buildInfoRow('위치', _locationController.text),
                if (_extraDataController.text.trim().isNotEmpty)
                  _buildInfoRow('추가정보', _extraDataController.text.trim()),
                _buildInfoRow('생성시간', DateTime.now().toString().substring(0, 19)),
                _buildInfoRow('유효기간', '5분'),
              ],
            ),
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // Action buttons
          Row(
            children: [
              Expanded(
                child: NeoBrutalButton.outlined(
                  onPressed: _shareQrCode,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.share, size: 20),
                      SizedBox(width: NeoBrutalTheme.space1),
                      Text('공유'),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: NeoBrutalTheme.space2),
              Expanded(
                child: NeoBrutalButton.outlined(
                  onPressed: _saveQrCode,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.download, size: 20),
                      SizedBox(width: NeoBrutalTheme.space1),
                      Text('저장'),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: NeoBrutalTheme.space2),
              Expanded(
                child: NeoBrutalButton.outlined(
                  onPressed: _copyQrData,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.copy, size: 20),
                      SizedBox(width: NeoBrutalTheme.space1),
                      Text('복사'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: NeoBrutalTheme.space1),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: NeoBrutalTheme.small.copyWith(
                color: NeoBrutalTheme.loInk,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Text(
            ': ',
            style: NeoBrutalTheme.small.copyWith(
              color: NeoBrutalTheme.loInk,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: NeoBrutalTheme.small.copyWith(
                color: NeoBrutalTheme.fg,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: const Text('QR 코드 생성기'),
        backgroundColor: NeoBrutalTheme.bg,
        foregroundColor: NeoBrutalTheme.fg,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () {
              // Show help dialog
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('로그인 QR 코드 생성기'),
                  content: const Text(
                    '1. 위치 선택 또는 직접 입력\n'
                    '2. 필요시 추가 정보 입력\n'
                    '3. QR 코드 생성 버튼 클릭\n'
                    '4. 생성된 QR 코드를 공유/저장/복사\n'
                    '5. 직원들이 QR을 스캔하여 로그인',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('확인'),
                    ),
                  ],
                ),
              );
            },
            icon: const Icon(Icons.help_outline),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(NeoBrutalTheme.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Title and description
            Text(
              '🎯 QR 코드 생성기',
              style: NeoBrutalTheme.h1.copyWith(
                color: NeoBrutalTheme.fg,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: NeoBrutalTheme.space2),
            Text(
              '직원들이 QR 스캔으로 빠르게 로그인할 수 있습니다',
              style: NeoBrutalTheme.body.copyWith(
                color: NeoBrutalTheme.loInk,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: NeoBrutalTheme.space6),
            
            
            // Location selector
            _buildLocationSelector(),
            
            const SizedBox(height: NeoBrutalTheme.space4),
            
            // Extra data input
            _buildExtraDataInput(),
            
            const SizedBox(height: NeoBrutalTheme.space6),
            
            // Generate button
            _buildGenerateButton(),
            
            const SizedBox(height: NeoBrutalTheme.space6),
            
            // Generated QR code display
            _buildQrCodeDisplay(),
          ],
        ),
      ),
    );
  }
}