/**
 * Paper Management Page Route
 * Individual route for document lifecycle management component
 */

'use client';

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import PaperManagement from '../../components/id-role-paper/PaperManagement';

const PapersPage: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">문서 관리</h1>
              </div>
              <div className="flex items-center">
                <a href="/id-role-paper" className="text-blue-600 hover:text-blue-800">
                  대시보드로 돌아가기
                </a>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <PaperManagement />
        </main>
      </div>
    </AuthProvider>
  );
};

export default PapersPage;