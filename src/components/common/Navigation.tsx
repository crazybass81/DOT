/**
 * Navigation Component for ID-ROLE-PAPER System
 * Provides consistent navigation across all pages
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navigationItems = [
    { href: '/id-role-paper', label: '대시보드', icon: '📊' },
    { href: '/identity', label: '신원 관리', icon: '👤' },
    { href: '/business', label: '사업자 관리', icon: '🏢' },
    { href: '/papers', label: '문서 관리', icon: '📄' },
    { href: '/permissions', label: '권한 관리', icon: '🔐' },
  ];

  const isActive = (href: string): boolean => {
    return pathname === href;
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            <div className="flex items-center">
              <Link href="/id-role-paper" className="text-xl font-bold text-gray-900">
                ID-ROLE-PAPER 시스템
              </Link>
            </div>
            <div className="flex space-x-4">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-700">{user.email}</span>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;