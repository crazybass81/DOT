import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 직원 수 프로바이더
final employeeCountProvider = FutureProvider<EmployeeCount>((ref) async {
  // TODO: 실제 서비스 호출 구현
  await Future.delayed(const Duration(milliseconds: 500));
  
  return EmployeeCount(
    total: 48,
    present: 42,
    absent: 6,
    late: 3,
  );
});

/// 전체 직원 수 프로바이더 (마스터 관리자용)
final totalEmployeesProvider = FutureProvider<TotalEmployees>((ref) async {
  // TODO: 실제 서비스 호출 구현
  await Future.delayed(const Duration(milliseconds: 700));
  
  return TotalEmployees(
    totalEmployees: 245,
    activeStores: 12,
    averagePerStore: 20.4,
    newHires: 8,
    resignations: 3,
  );
});

/// 직원 수 모델
class EmployeeCount {
  final int total;
  final int present;
  final int absent;
  final int late;

  EmployeeCount({
    required this.total,
    required this.present,
    required this.absent,
    required this.late,
  });
  
  double get presentRate => total > 0 ? (present / total) * 100 : 0.0;
}

/// 전체 직원 모델
class TotalEmployees {
  final int totalEmployees;
  final int activeStores;
  final double averagePerStore;
  final int newHires;
  final int resignations;

  TotalEmployees({
    required this.totalEmployees,
    required this.activeStores,
    required this.averagePerStore,
    required this.newHires,
    required this.resignations,
  });
}
