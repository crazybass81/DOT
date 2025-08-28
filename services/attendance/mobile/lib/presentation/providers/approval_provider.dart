import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 승인 대기 요청 프로바이더
final pendingApprovalsProvider = FutureProvider<List<ApprovalRequest>>((ref) async {
  // TODO: 실제 서비스 호출 구현
  await Future.delayed(const Duration(milliseconds: 800));
  
  return [
    ApprovalRequest(
      id: '1',
      employeeName: '김직원',
      type: '휴가 신청',
      reason: '개인 사정으로 인한 연차 사용',
      requestedDate: DateTime.now().subtract(const Duration(hours: 2)),
      status: 'pending',
    ),
    ApprovalRequest(
      id: '2',
      employeeName: '이사원',
      type: '지각 사유서',
      reason: '교통 체증으로 인한 지각',
      requestedDate: DateTime.now().subtract(const Duration(hours: 5)),
      status: 'pending',
    ),
    ApprovalRequest(
      id: '3',
      employeeName: '박대리',
      type: '근무시간 수정',
      reason: '출근 시간 QR 스캔 오류로 인한 수정 요청',
      requestedDate: DateTime.now().subtract(const Duration(days: 1)),
      status: 'pending',
    ),
  ];
});

/// 승인 요청 모델
class ApprovalRequest {
  final String id;
  final String employeeName;
  final String type;
  final String reason;
  final DateTime requestedDate;
  final String status;

  ApprovalRequest({
    required this.id,
    required this.employeeName,
    required this.type,
    required this.reason,
    required this.requestedDate,
    required this.status,
  });
}
