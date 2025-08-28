import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Missing providers for dashboard functionality with realistic mock data
// TODO: Replace with actual service calls

// Mock data generators
class MockDataGenerator {
  static final _random = Random();
  
  static List<Map<String, dynamic>> generateWeeklyHours() {
    final days = ['월', '화', '수', '목', '금', '토', '일'];
    return days.map((day) => {
      'day': day,
      'hours': 6.0 + _random.nextDouble() * 4.0, // 6-10 hours
      'overtime': _random.nextDouble() * 2.0, // 0-2 hours
    }).toList();
  }
  
  static List<Map<String, dynamic>> generateAttendanceData() {
    return List.generate(20, (index) => {
      'employeeId': 'EMP${1000 + index}',
      'name': '직원${index + 1}',
      'status': ['출근', '퇴근', '휴게', '외근'][_random.nextInt(4)],
      'checkInTime': DateTime.now().subtract(Duration(hours: 8 - _random.nextInt(3))),
      'department': ['개발팀', '영업팀', '마케팅팀', '인사팀'][_random.nextInt(4)],
      'profileImage': null,
    });
  }
  
  static List<Map<String, dynamic>> generateFranchiseData() {
    return List.generate(15, (index) => {
      'id': 'FR${100 + index}',
      'name': '프랜차이즈${index + 1}',
      'isActive': _random.nextBool(),
      'performance': ['excellent', 'good', 'average', 'poor'][_random.nextInt(4)],
      'storeCount': 5 + _random.nextInt(20),
      'employeeCount': 50 + _random.nextInt(200),
      'monthlyRevenue': 50000000 + _random.nextInt(200000000),
      'location': {
        'lat': 37.5665 + (_random.nextDouble() - 0.5) * 0.2,
        'lng': 126.9780 + (_random.nextDouble() - 0.5) * 0.2,
      },
    });
  }
  
  static Map<String, dynamic> generateSystemHealth() {
    return {
      'uptime': '99.9%',
      'responseTime': '${50 + _random.nextInt(200)}ms',
      'memoryUsage': 45 + _random.nextInt(40),
      'cpuUsage': 20 + _random.nextInt(60),
      'diskUsage': 65 + _random.nextInt(20),
      'activeUsers': 1500 + _random.nextInt(500),
      'errors': _random.nextInt(10),
      'warnings': _random.nextInt(20),
    };
  }
  
  static List<Map<String, dynamic>> generateRevenueData(String timeRange) {
    final count = timeRange == 'day' ? 24 : timeRange == 'week' ? 7 : 
                  timeRange == 'month' ? 30 : 12;
    
    return List.generate(count, (index) => {
      'period': timeRange == 'day' ? '${index}시' :
               timeRange == 'week' ? ['월', '화', '수', '목', '금', '토', '일'][index] :
               timeRange == 'month' ? '${index + 1}일' : '${index + 1}월',
      'revenue': 1000000 + _random.nextInt(5000000),
      'expenses': 500000 + _random.nextInt(2000000),
      'profit': 200000 + _random.nextInt(1000000),
    });
  }
}

// Store providers
final multiStoreOverviewProvider = FutureProvider<List<dynamic>>((ref) async {
  await Future.delayed(const Duration(milliseconds: 600));
  return MockDataGenerator.generateFranchiseData();
});

final storeComparisonProvider = FutureProvider<List<dynamic>>((ref) async {
  await Future.delayed(const Duration(milliseconds: 700));
  return MockDataGenerator.generateFranchiseData().take(5).toList();
});

// Payroll providers
final monthlyPayrollProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 500));
  return {
    'totalAmount': 150000000,
    'employeeCount': 85,
    'averageSalary': 3500000,
    'overtime': 25000000,
    'bonuses': 15000000,
    'deductions': 8000000,
    'breakdown': [
      {'department': '개발팀', 'amount': 60000000, 'count': 30},
      {'department': '영업팀', 'amount': 45000000, 'count': 25},
      {'department': '마케팅팀', 'amount': 30000000, 'count': 20},
      {'department': '인사팀', 'amount': 15000000, 'count': 10},
    ]
  };
});

// Analytics providers
final franchisePerformanceProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 800));
  return {
    'totalRevenue': 500000000,
    'growth': 15.5,
    'topPerformers': MockDataGenerator.generateFranchiseData().take(5).toList(),
    'metrics': {
      'customerSatisfaction': 4.2,
      'employeeTurnover': 8.5,
      'profitMargin': 22.3,
    }
  };
});

final revenueAnalysisProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 600));
  return {
    'currentPeriod': MockDataGenerator.generateRevenueData('week'),
    'previousPeriod': MockDataGenerator.generateRevenueData('week'),
    'trends': {
      'growth': 12.5,
      'forecast': 850000000,
      'seasonality': 'high',
    }
  };
});

final analyticsProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 400));
  return {
    'userEngagement': 78.5,
    'systemPerformance': 94.2,
    'errorRate': 0.3,
    'satisfactionScore': 4.1,
  };
});

// System providers
final systemWideStatsProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 700));
  return {
    'totalUsers': 15420,
    'activeUsers': 8950,
    'totalFranchises': 156,
    'totalStores': 1250,
    'totalEmployees': 45600,
    'systemUptime': 99.95,
    'dataProcessed': '2.5TB',
    'transactionsToday': 125000,
  };
});

final allFranchisesOverviewProvider = FutureProvider<List<dynamic>>((ref) async {
  await Future.delayed(const Duration(milliseconds: 800));
  return MockDataGenerator.generateFranchiseData();
});

final systemHealthProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 500));
  return MockDataGenerator.generateSystemHealth();
});

final globalMetricsProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 600));
  return {
    'kpis': [
      {'label': '총 매출', 'value': '₩1.2B', 'change': 15.2, 'trend': 'up'},
      {'label': '활성 사용자', 'value': '8,950', 'change': 8.7, 'trend': 'up'},
      {'label': '시스템 가동률', 'value': '99.95%', 'change': 0.05, 'trend': 'stable'},
      {'label': '고객 만족도', 'value': '4.2/5', 'change': 3.1, 'trend': 'up'},
    ],
    'alerts': [
      {'type': 'warning', 'message': 'Database 용량 85% 도달'},
      {'type': 'info', 'message': '새 업데이트 사용 가능'},
    ]
  };
});

// Existing attendance providers with enhanced mock data
final todayAttendanceProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 400));
  return {
    'status': 'checked_in',
    'checkInTime': DateTime.now().subtract(const Duration(hours: 4)),
    'workingHours': 4.5,
    'breakTime': 0.5,
    'overtimeHours': 0,
    'location': '서울 사무소',
  };
});

final weeklyHoursProvider = FutureProvider<List<dynamic>>((ref) async {
  await Future.delayed(const Duration(milliseconds: 500));
  return MockDataGenerator.generateWeeklyHours();
});

final realTimeAttendanceProvider = FutureProvider<List<dynamic>>((ref) async {
  await Future.delayed(const Duration(milliseconds: 600));
  return MockDataGenerator.generateAttendanceData();
});

final employeeCountProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 300));
  return {
    'total': 156,
    'present': 142,
    'absent': 8,
    'late': 6,
    'onBreak': 25,
  };
});

final attendanceOverviewProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 700));
  return {
    'weeklyData': MockDataGenerator.generateWeeklyHours(),
    'monthlyTrends': MockDataGenerator.generateRevenueData('month'),
    'departmentStats': [
      {'dept': '개발팀', 'rate': 95.2},
      {'dept': '영업팀', 'rate': 87.1},
      {'dept': '마케팅팀', 'rate': 91.8},
      {'dept': '인사팀', 'rate': 96.5},
    ]
  };
});

// Revenue providers
final revenueProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 500));
  return MockDataGenerator.generateRevenueData('month');
});

// Franchise providers
final franchiseProvider = FutureProvider<List<dynamic>>((ref) async {
  await Future.delayed(const Duration(milliseconds: 600));
  return MockDataGenerator.generateFranchiseData();
});

// Store providers
final storeProvider = FutureProvider<List<dynamic>>((ref) async {
  await Future.delayed(const Duration(milliseconds: 500));
  return MockDataGenerator.generateFranchiseData();
});

// System provider
final systemProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 400));
  return MockDataGenerator.generateSystemHealth();
});

// Attendance rates provider
final attendanceRatesProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 500));
  return {
    'overall': 92.5,
    'thisWeek': 94.2,
    'thisMonth': 91.8,
    'departments': [
      {'name': '개발팀', 'rate': 95.2, 'trend': 2.1},
      {'name': '영업팀', 'rate': 87.1, 'trend': -1.5},
      {'name': '마케팅팀', 'rate': 91.8, 'trend': 0.8},
      {'name': '인사팀', 'rate': 96.5, 'trend': 1.2},
    ],
    'trends': {
      'weekly': [89.5, 90.2, 92.1, 94.2, 93.8, 92.5, 94.2],
      'monthly': [91.2, 90.8, 92.3, 91.8],
    }
  };
});

// Total employees provider
final totalEmployeesProvider = FutureProvider<dynamic>((ref) async {
  await Future.delayed(const Duration(milliseconds: 300));
  return {
    'total': 456,
    'active': 425,
    'onLeave': 18,
    'new': 13,
    'departments': {
      '개발팀': 150,
      '영업팀': 120,
      '마케팅팀': 86,
      '인사팀': 45,
      '기타': 55,
    }
  };
});
