import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';

part 'employee_registration_provider.freezed.dart';

@freezed
class EmployeeRegistrationState with _$EmployeeRegistrationState {
  const factory EmployeeRegistrationState({
    @Default(false) bool isLoading,
    @Default(false) bool isRegistered,
    String? employeeId,
    String? organizationName,
    String? branchName,
    String? approvalStatus, // PENDING, APPROVED, REJECTED, SUSPENDED
    String? rejectionReason,
    String? error,
  }) = _EmployeeRegistrationState;
}

class EmployeeRegistrationNotifier extends StateNotifier<EmployeeRegistrationState> {
  final SupabaseClient _supabase;
  
  EmployeeRegistrationNotifier(this._supabase) : super(const EmployeeRegistrationState());

  /// Check employee registration and approval status
  Future<String> checkRegistrationStatus({
    String? email,
    String? deviceId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      // Get device ID if not provided
      if (deviceId == null) {
        deviceId = await _getDeviceId();
      }
      
      // Check employee status using new function
      final response = await _supabase.rpc(
        'check_employee_status',
        params: {
          'p_email': email,
          'p_device_id': deviceId,
        },
      );
      
      if (response != null && (response as List).isNotEmpty) {
        final data = response[0];
        final status = data['status'] ?? 'NOT_REGISTERED';
        
        state = state.copyWith(
          isLoading: false,
          isRegistered: status != 'NOT_REGISTERED',
          employeeId: data['employee_id'],
          organizationName: data['organization_name'],
          branchName: data['branch_name'],
          approvalStatus: data['approval_status'],
          rejectionReason: data['rejection_reason'],
        );
        
        return status;
      }
      
      state = state.copyWith(isLoading: false, isRegistered: false);
      return 'NOT_REGISTERED';
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: '상태 확인 실패: ${e.toString()}',
      );
      return 'ERROR';
    }
  }
  
  /// Check approval status for specific employee
  Future<String> checkApprovalStatus(String? employeeId) async {
    if (employeeId == null) return 'NOT_REGISTERED';
    
    try {
      final response = await _supabase
          .from('employees')
          .select('approval_status, rejection_reason')
          .eq('id', employeeId)
          .single();
      
      if (response != null) {
        state = state.copyWith(
          approvalStatus: response['approval_status'],
          rejectionReason: response['rejection_reason'],
        );
        return response['approval_status'] ?? 'PENDING';
      }
      
      return 'NOT_FOUND';
    } catch (e) {
      state = state.copyWith(error: '승인 상태 확인 실패: ${e.toString()}');
      return 'ERROR';
    }
  }

  /// Register new employee
  Future<bool> registerEmployee({
    required String employeeCode,
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
    required String pin,
    String? qrToken,
    String? locationId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final deviceId = await _getDeviceId();
      
      // First, create auth user
      final authResponse = await _supabase.auth.signUp(
        email: email,
        password: pin + employeeCode, // Combine PIN and employee code for password
        data: {
          'first_name': firstName,
          'last_name': lastName,
          'employee_code': employeeCode,
        },
      );
      
      if (authResponse.user == null) {
        throw Exception('사용자 생성 실패');
      }
      
      // Get branch ID from location ID or QR token
      String? branchId = locationId;
      
      if (branchId == null && qrToken != null) {
        // Extract location from QR token
        final tokenParts = qrToken.split('_');
        if (tokenParts.length >= 2) {
          branchId = tokenParts[1]; // Format: type_locationId_timestamp
        }
      }
      
      // If still no branch ID, get default branch
      if (branchId == null) {
        final branchResponse = await _supabase
            .from('branches')
            .select('id')
            .limit(1)
            .single();
        branchId = branchResponse['id'];
      }
      
      // Register employee using stored procedure
      final response = await _supabase.rpc(
        'register_employee_via_qr',
        params: {
          'p_email': email,
          'p_first_name': firstName,
          'p_last_name': lastName,
          'p_phone': phone,
          'p_employee_code': employeeCode,
          'p_branch_id': branchId,
          'p_device_id': deviceId,
        },
      );
      
      if (response != null) {
        // Update employee record with auth user ID
        await _supabase
            .from('employees')
            .update({
              'user_id': authResponse.user!.id,
              'pin_code': _hashPin(pin), // Store hashed PIN
            })
            .eq('id', response);
        
        state = state.copyWith(
          isLoading: false,
          isRegistered: true,
          employeeId: response,
        );
        
        return true;
      }
      
      throw Exception('직원 등록 실패');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: '등록 실패: ${e.toString()}',
      );
      return false;
    }
  }

  /// Get device unique ID
  Future<String> _getDeviceId() async {
    final deviceInfo = DeviceInfoPlugin();
    
    if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      return iosInfo.identifierForVendor ?? 'unknown_ios';
    } else if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      return androidInfo.id;
    }
    
    return 'unknown_device';
  }

  /// Simple hash for PIN (in production, use proper hashing)
  String _hashPin(String pin) {
    // TODO: Implement proper PIN hashing with bcrypt or similar
    // For now, just return a simple hash
    return 'hashed_$pin';
  }

  /// Verify employee PIN
  Future<bool> verifyPin(String employeeId, String pin) async {
    try {
      final response = await _supabase
          .from('employees')
          .select('pin_code')
          .eq('id', employeeId)
          .single();
      
      if (response != null) {
        final storedPin = response['pin_code'];
        return storedPin == _hashPin(pin);
      }
      
      return false;
    } catch (e) {
      state = state.copyWith(error: 'PIN 확인 실패: ${e.toString()}');
      return false;
    }
  }

  /// Clear registration state
  void clearState() {
    state = const EmployeeRegistrationState();
  }
}

// Provider
final employeeRegistrationProvider = 
    StateNotifierProvider<EmployeeRegistrationNotifier, EmployeeRegistrationState>((ref) {
  final supabase = Supabase.instance.client;
  return EmployeeRegistrationNotifier(supabase);
});