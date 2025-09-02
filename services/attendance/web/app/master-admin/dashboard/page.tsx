'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  Building,
  QrCode,
  Activity,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  FileText,
  Key,
  Eye
} from 'lucide-react';

interface DashboardStats {
  totalEmployees: number;
  pendingApprovals: number;
  activeQRCodes: number;
  todayAttendance: number;
  branches: number;
  recentActivities: Activity[];
}

interface Activity {
  id: string;
  type: 'login' | 'approval' | 'qr_generated' | 'permission_granted';
  actor: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

export default function MasterAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    pendingApprovals: 0,
    activeQRCodes: 0,
    todayAttendance: 0,
    branches: 0,
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Simulated data - replace with actual API call
      setStats({
        totalEmployees: 156,
        pendingApprovals: 8,
        activeQRCodes: 24,
        todayAttendance: 142,
        branches: 5,
        recentActivities: [
          {
            id: '1',
            type: 'approval',
            actor: 'John Doe',
            description: 'Employee registration approved',
            timestamp: '10 minutes ago',
            status: 'success'
          },
          {
            id: '2',
            type: 'qr_generated',
            actor: 'System',
            description: 'New QR code generated for Branch A',
            timestamp: '1 hour ago',
            status: 'success'
          },
          {
            id: '3',
            type: 'login',
            actor: 'Admin User',
            description: 'Failed login attempt detected',
            timestamp: '2 hours ago',
            status: 'warning'
          }
        ]
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/master-admin/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('master_admin_token')}`
        }
      });
      localStorage.removeItem('master_admin_token');
      router.push('/master-admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'login': return <Key className="w-4 h-4" />;
      case 'approval': return <CheckCircle className="w-4 h-4" />;
      case 'qr_generated': return <QrCode className="w-4 h-4" />;
      case 'permission_granted': return <Shield className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (status: Activity['status']) => {
    switch (status) {
      case 'success': return 'text-green-400 bg-green-400/10';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10';
      case 'error': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Master Admin</h1>
                  <p className="text-xs text-gray-400">Control Center</p>
                </div>
              </div>
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employees, branches, or activities..."
                  className="w-full px-4 py-2 pl-10 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">+12%</span>
            </div>
            <h3 className="text-2xl font-bold text-white">{stats.totalEmployees}</h3>
            <p className="text-sm text-gray-400 mt-1">Total Employees</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-yellow-400" />
              {stats.pendingApprovals > 0 && (
                <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded animate-pulse">
                  Action Required
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-white">{stats.pendingApprovals}</h3>
            <p className="text-sm text-gray-400 mt-1">Pending Approvals</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <QrCode className="w-8 h-8 text-purple-400" />
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">{stats.activeQRCodes}</h3>
            <p className="text-sm text-gray-400 mt-1">Active QR Codes</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-green-400" />
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">{stats.todayAttendance}</h3>
            <p className="text-sm text-gray-400 mt-1">Today's Attendance</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <Building className="w-8 h-8 text-indigo-400" />
              <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">{stats.branches}</h3>
            <p className="text-sm text-gray-400 mt-1">Active Branches</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800/30 p-1 rounded-lg w-fit">
          {['overview', 'employees', 'qr-codes', 'permissions', 'audit'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedTab === tab
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50">
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recent Activities</h2>
                <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  View All
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {stats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      by {activity.actor} • {activity.timestamp}
                    </p>
                  </div>
                  <Eye className="w-4 h-4 text-gray-500 cursor-pointer hover:text-white transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50">
            <div className="p-6 border-b border-gray-700/50">
              <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => router.push('/master-admin/qr-generator')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
              >
                <QrCode className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-white">Generate QR Code</span>
              </button>
              
              <button
                onClick={() => router.push('/master-admin/approvals')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
              >
                <CheckCircle className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-white">Review Approvals</span>
                {stats.pendingApprovals > 0 && (
                  <span className="ml-auto bg-yellow-400/20 text-yellow-400 text-xs px-2 py-1 rounded">
                    {stats.pendingApprovals}
                  </span>
                )}
              </button>
              
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900/50 hover:bg-gray-700/50 rounded-lg transition-colors group">
                <Users className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-white">Add Employee</span>
              </button>
              
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900/50 hover:bg-gray-700/50 rounded-lg transition-colors group">
                <Shield className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-white">Manage Permissions</span>
              </button>
              
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900/50 hover:bg-gray-700/50 rounded-lg transition-colors group">
                <FileText className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-white">Export Reports</span>
              </button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="mt-6 bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">System Health</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm text-green-400">All Systems Operational</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-400/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Database</p>
                <p className="text-sm text-white font-medium">Healthy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-400/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">API Server</p>
                <p className="text-sm text-white font-medium">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Storage</p>
                <p className="text-sm text-white font-medium">78% Used</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-400/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Security</p>
                <p className="text-sm text-white font-medium">No Threats</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}