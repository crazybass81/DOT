'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { multiRoleAuthService } from "@/src/services/multiRoleAuthService";

interface Employee {
  id: string;
  name: string;
  department: string;
  status: 'present' | 'late' | 'absent' | 'off';
  checkInTime?: string;
  checkOutTime?: string;
  workDuration?: string;
  location?: string;
}

export default function AttendanceMonitoring() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filter, setFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        // router.push("/login");
        // return;
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  // Mock data - replace with real API call
  useEffect(() => {
    const mockEmployees: Employee[] = [
      {
        id: 'EMP001',
        name: '김직원',
        department: '주방',
        status: 'present',
        checkInTime: '09:02',
        checkOutTime: undefined,
        workDuration: '7시간 30분',
        location: '본점'
      },
      {
        id: 'EMP002',
        name: '이매니저',
        department: '홀',
        status: 'present',
        checkInTime: '08:55',
        checkOutTime: undefined,
        workDuration: '7시간 45분',
        location: '본점'
      },
      {
        id: 'EMP003',
        name: '박알바',
        department: '서빙',
        status: 'late',
        checkInTime: '09:15',
        checkOutTime: undefined,
        workDuration: '7시간 15분',
        location: '본점'
      },
      {
        id: 'EMP004',
        name: '최사원',
        department: '주방',
        status: 'late',
        checkInTime: '09:20',
        checkOutTime: undefined,
        workDuration: '7시간 10분',
        location: '본점'
      },
      {
        id: 'EMP005',
        name: '정대리',
        department: '홀',
        status: 'present',
        checkInTime: '08:45',
        checkOutTime: '18:00',
        workDuration: '9시간 15분',
        location: '본점'
      },
      {
        id: 'EMP006',
        name: '강인턴',
        department: '서빙',
        status: 'absent',
        checkInTime: undefined,
        checkOutTime: undefined,
        workDuration: undefined,
        location: undefined
      }
    ];
    setEmployees(mockEmployees);
  }, [selectedDate]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) // return;

    const interval = setInterval(() => {
      // Refresh data here
      console.log('Refreshing attendance data...');
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesFilter = filter === 'all' || emp.status === filter;
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate statistics
  const stats = {
    total: employees.length,
    present: employees.filter(e => e.status === 'present').length,
    late: employees.filter(e => e.status === 'late').length,
    absent: employees.filter(e => e.status === 'absent').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">출퇴근 현황 모니터링</h1>
              <p className="text-sm text-gray-500 mt-1">실시간 직원 근태 관리</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">자동 새로고침</span>
              </label>
              <a href="/admin/dashboard" className="text-sm text-blue-600 hover:text-blue-500">
                대시보드로 돌아가기
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Selector and Stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">전체</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                <p className="text-sm text-gray-500">정상 출근</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
                <p className="text-sm text-gray-500">지각</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                <p className="text-sm text-gray-500">결근</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체 ({stats.total})
              </button>
              <button
                onClick={() => setFilter('present')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'present' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                출근 ({stats.present})
              </button>
              <button
                onClick={() => setFilter('late')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'late' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                지각 ({stats.late})
              </button>
              <button
                onClick={() => setFilter('absent')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'absent' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                결근 ({stats.absent})
              </button>
            </div>
            <div>
              <input
                type="text"
                placeholder="이름, 사번, 부서로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  직원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  부서
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출근 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  퇴근 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  근무 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  위치
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.status === 'present' 
                        ? 'bg-green-100 text-green-800'
                        : employee.status === 'late'
                        ? 'bg-yellow-100 text-yellow-800'
                        : employee.status === 'absent'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {employee.status === 'present' ? '정상 출근' 
                        : employee.status === 'late' ? '지각'
                        : employee.status === 'absent' ? '결근'
                        : '휴무'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.checkInTime || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.checkOutTime || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.workDuration || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.location || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900">
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Export Buttons */}
        <div className="mt-6 flex justify-end gap-4">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            CSV 내보내기
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            PDF 내보내기
          </button>
        </div>
      </main>
    </div>
  );
}