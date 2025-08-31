import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../providers/approval_management_provider.dart';
import '../../widgets/common/neo_brutal_card.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../../core/theme/neo_brutal_theme.dart';

class ApprovalManagementPage extends ConsumerStatefulWidget {
  const ApprovalManagementPage({super.key});

  @override
  ConsumerState<ApprovalManagementPage> createState() => _ApprovalManagementPageState();
}

class _ApprovalManagementPageState extends ConsumerState<ApprovalManagementPage> {
  final TextEditingController _rejectionReasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Load pending approvals when page loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(approvalManagementProvider.notifier).loadPendingApprovals();
    });
  }

  @override
  void dispose() {
    _rejectionReasonController.dispose();
    super.dispose();
  }

  Future<void> _handleApprove(String employeeId) async {
    final success = await ref.read(approvalManagementProvider.notifier)
        .approveEmployee(employeeId);
    
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('직원이 승인되었습니다'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _handleReject(String employeeId) async {
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: NeoBrutalTheme.bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(0),
          side: const BorderSide(
            color: NeoBrutalTheme.fg,
            width: 3,
          ),
        ),
        title: Text(
          '거부 사유 입력',
          style: NeoBrutalTheme.heading,
        ),
        content: TextField(
          controller: _rejectionReasonController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: '거부 사유를 입력해주세요',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(0),
              borderSide: const BorderSide(
                color: NeoBrutalTheme.fg,
                width: 2,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(0),
              borderSide: const BorderSide(
                color: NeoBrutalTheme.hi,
                width: 3,
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              '취소',
              style: TextStyle(color: NeoBrutalTheme.fg),
            ),
          ),
          NeoBrutalButton(
            onPressed: () async {
              final reason = _rejectionReasonController.text.trim();
              if (reason.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('거부 사유를 입력해주세요'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }
              
              Navigator.of(context).pop();
              
              final success = await ref.read(approvalManagementProvider.notifier)
                  .rejectEmployee(employeeId, reason);
              
              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('직원 등록이 거부되었습니다'),
                    backgroundColor: Colors.orange,
                  ),
                );
                _rejectionReasonController.clear();
              }
            },
            child: const Text('거부'),
            color: Colors.red.shade400,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(approvalManagementProvider);
    
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        backgroundColor: NeoBrutalTheme.bg,
        elevation: 0,
        title: Text(
          '직원 승인 관리',
          style: NeoBrutalTheme.heading,
        ),
        centerTitle: true,
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.pendingApprovals.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.check_circle_outline,
                        size: 64,
                        color: NeoBrutalTheme.fg.withOpacity(0.3),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '승인 대기 중인 직원이 없습니다',
                        style: NeoBrutalTheme.body.copyWith(
                          color: NeoBrutalTheme.fg.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    await ref.read(approvalManagementProvider.notifier)
                        .loadPendingApprovals();
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: state.pendingApprovals.length,
                    itemBuilder: (context, index) {
                      final employee = state.pendingApprovals[index];
                      final requestedAt = employee['requested_at'] != null
                          ? DateFormat('yyyy-MM-dd HH:mm').format(
                              DateTime.parse(employee['requested_at']))
                          : '알 수 없음';
                      
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: NeoBrutalCard(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${employee['last_name']} ${employee['first_name']}',
                                          style: NeoBrutalTheme.subheading,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '사번: ${employee['employee_code']}',
                                          style: NeoBrutalTheme.body.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.shade100,
                                      border: Border.all(
                                        color: Colors.orange.shade400,
                                        width: 2,
                                      ),
                                    ),
                                    child: Text(
                                      '승인 대기',
                                      style: NeoBrutalTheme.caption.copyWith(
                                        color: Colors.orange.shade700,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              _buildInfoRow('이메일', employee['email'] ?? ''),
                              _buildInfoRow('전화번호', employee['phone'] ?? ''),
                              _buildInfoRow('조직', employee['organization_name'] ?? ''),
                              _buildInfoRow('지점', employee['branch_name'] ?? ''),
                              _buildInfoRow('부서', employee['department_name'] ?? ''),
                              _buildInfoRow('직급', employee['position_name'] ?? ''),
                              _buildInfoRow('요청 시간', requestedAt),
                              if (employee['device_id'] != null)
                                _buildInfoRow('디바이스', employee['device_id']!.substring(0, 8) + '...'),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(
                                    child: NeoBrutalButton(
                                      onPressed: () => _handleReject(employee['id']),
                                      color: Colors.red.shade400,
                                      child: const Text('거부'),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: NeoBrutalButton(
                                      onPressed: () => _handleApprove(employee['id']),
                                      color: Colors.green.shade400,
                                      child: const Text('승인'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: NeoBrutalTheme.caption.copyWith(
                color: NeoBrutalTheme.fg.withOpacity(0.6),
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: NeoBrutalTheme.body,
            ),
          ),
        ],
      ),
    );
  }
}