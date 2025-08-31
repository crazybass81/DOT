import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'approval_management_provider.freezed.dart';

@freezed
class ApprovalManagementState with _$ApprovalManagementState {
  const factory ApprovalManagementState({
    @Default(false) bool isLoading,
    @Default([]) List<Map<String, dynamic>> pendingApprovals,
    String? error,
  }) = _ApprovalManagementState;
}

final approvalManagementProvider = StateNotifierProvider<ApprovalManagementNotifier, ApprovalManagementState>(
  (ref) => ApprovalManagementNotifier(),
);

class ApprovalManagementNotifier extends StateNotifier<ApprovalManagementState> {
  ApprovalManagementNotifier() : super(const ApprovalManagementState());

  final _supabase = Supabase.instance.client;

  Future<void> loadPendingApprovals() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Get current user's organization and branch
      final user = _supabase.auth.currentUser;
      if (user == null) {
        state = state.copyWith(
          isLoading: false,
          error: '로그인이 필요합니다',
        );
        return;
      }

      // Get pending approvals using the RPC function
      final response = await _supabase.rpc('get_pending_approvals').execute();

      if (response.error != null) {
        throw response.error!;
      }

      final data = response.data as List<dynamic>;
      final pendingList = data.map((item) => item as Map<String, dynamic>).toList();

      state = state.copyWith(
        isLoading: false,
        pendingApprovals: pendingList,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<bool> approveEmployee(String employeeId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        state = state.copyWith(
          isLoading: false,
          error: '로그인이 필요합니다',
        );
        return false;
      }

      // Call the approve_employee function
      final response = await _supabase.rpc('approve_employee', params: {
        'p_employee_id': employeeId,
        'p_approved_by': user.id,
      }).execute();

      if (response.error != null) {
        throw response.error!;
      }

      // Reload pending approvals
      await loadPendingApprovals();
      
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> rejectEmployee(String employeeId, String reason) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        state = state.copyWith(
          isLoading: false,
          error: '로그인이 필요합니다',
        );
        return false;
      }

      // Call the reject_employee function
      final response = await _supabase.rpc('reject_employee', params: {
        'p_employee_id': employeeId,
        'p_rejected_by': user.id,
        'p_rejection_reason': reason,
      }).execute();

      if (response.error != null) {
        throw response.error!;
      }

      // Reload pending approvals
      await loadPendingApprovals();
      
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<void> getEmployeeHistory(String employeeId) async {
    try {
      // Get approval history for an employee
      final response = await _supabase
          .from('approval_requests')
          .select('*, reviewed_by_user:employees!reviewed_by(first_name, last_name)')
          .eq('employee_id', employeeId)
          .order('requested_at', ascending: false)
          .execute();

      if (response.error != null) {
        throw response.error!;
      }

      // Process history data if needed
      final history = response.data as List<dynamic>;
      // You can add this to state if needed for display
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}