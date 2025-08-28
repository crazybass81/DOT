'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';

interface StatsData {
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  onLeave: number;
  averageWorkHours: number;
  attendanceRate: number;
}

export default function AttendanceStats() {
  const [stats, setStats] = useState<StatsData>({
    totalEmployees: 0,
    checkedIn: 0,
    checkedOut: 0,
    onLeave: 0,
    averageWorkHours: 0,
    attendanceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAttendanceStats(period);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Use mock data for now
      setStats({
        totalEmployees: 25,
        checkedIn: 18,
        checkedOut: 5,
        onLeave: 2,
        averageWorkHours: 7.5,
        attendanceRate: 92
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: '전체 직원',
      value: stats.totalEmployees,
      icon: '👥',
      color: 'bg-blue-500'
    },
    {
      title: '출근',
      value: stats.checkedIn,
      icon: '✅',
      color: 'bg-green-500'
    },
    {
      title: '퇴근',
      value: stats.checkedOut,
      icon: '🏠',
      color: 'bg-gray-500'
    },
    {
      title: '휴가',
      value: stats.onLeave,
      icon: '🏖️',
      color: 'bg-yellow-500'
    },
    {
      title: '평균 근무시간',
      value: `${stats.averageWorkHours}h`,
      icon: '⏰',
      color: 'bg-purple-500'
    },
    {
      title: '출근율',
      value: `${stats.attendanceRate}%`,
      icon: '📊',
      color: 'bg-indigo-500'
    }
  ];

  return (
    <div className="p-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">근태 현황</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('daily')}
            className={`px-4 py-2 rounded-lg ${
              period === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            일간
          </button>
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-4 py-2 rounded-lg ${
              period === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 rounded-lg ${
              period === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            월간
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full bg-opacity-10`}>
                  <span className="text-3xl">{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}