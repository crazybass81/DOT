/**
 * Header Component with Authentication
 * Navigation header with user profile and logout functionality
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  User, 
  LogOut, 
  ChevronDown, 
  Settings, 
  Shield,
  Users,
  Clock
} from 'lucide-react';
import { useAuth, Authenticated } from '@/src/contexts/AuthContext';
import { UserRole } from '@/src/schemas/auth.schema';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showUserMenu?: boolean;
}

export default function Header({ 
  title = 'DOT 근태관리',
  subtitle,
  showUserMenu = true 
}: HeaderProps) {
  const auth = useAuth();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.logout();
      // Auth context will handle redirect
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    const roleNames = {
      master: '마스터 관리자',
      admin: '관리자',
      manager: '매니저',
      worker: '직원',
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role: UserRole) => {
    const roleColors = {
      master: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800',
      worker: 'bg-gray-100 text-gray-800',
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  const getNavigationItems = (role: UserRole) => {
    const baseItems = [
      { href: '/attendance', icon: Clock, label: '출퇴근 관리' },
    ];

    if (auth.hasRole('manager')) {
      baseItems.push(
        { href: '/manager/dashboard', icon: Users, label: '팀 관리' }
      );
    }

    if (auth.hasRole('admin')) {
      baseItems.push(
        { href: '/admin/dashboard', icon: Shield, label: '관리자 대시보드' },
        { href: '/admin/employees', icon: Users, label: '직원 관리' }
      );
    }

    if (auth.hasRole('master')) {
      baseItems.push(
        { href: '/super-admin/dashboard', icon: Shield, label: '마스터 대시보드' },
        { href: '/super-admin/users', icon: Users, label: '사용자 관리' }
      );
    }

    return baseItems;
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Navigation Items */}
            <Authenticated>
              {auth.user && (
                <nav className="hidden md:flex space-x-4">
                  {getNavigationItems(auth.user.role).map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  ))}
                </nav>
              )}
            </Authenticated>

            {/* User Menu */}
            <Authenticated fallback={
              <div className="flex items-center space-x-3">
                <a
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  로그인
                </a>
              </div>
            }>
              {showUserMenu && auth.user && (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{auth.user.name}</p>
                      <p className="text-xs text-gray-500">{auth.user.email}</p>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <>
                      {/* Overlay to close dropdown */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                      />
                      
                      {/* Dropdown Content */}
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                        <div className="py-1">
                          {/* User Info */}
                          <div className="px-4 py-3 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {auth.user.name}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  {auth.user.email}
                                </p>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${getRoleColor(auth.user.role)}`}>
                                  {getRoleDisplayName(auth.user.role)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="py-1">
                            <a
                              href="/profile"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setShowDropdown(false)}
                            >
                              <User className="w-4 h-4 mr-3 text-gray-400" />
                              프로필 설정
                            </a>
                            <a
                              href="/settings"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setShowDropdown(false)}
                            >
                              <Settings className="w-4 h-4 mr-3 text-gray-400" />
                              계정 설정
                            </a>
                          </div>

                          {/* Logout */}
                          <div className="border-t border-gray-100">
                            <button
                              onClick={() => {
                                setShowDropdown(false);
                                handleLogout();
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                              <LogOut className="w-4 h-4 mr-3 text-red-400" />
                              로그아웃
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </Authenticated>
          </div>
        </div>
      </div>
    </header>
  );
}