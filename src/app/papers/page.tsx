/**
 * Paper Management Page Route
 * Individual route for document lifecycle management component
 */

'use client';

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import PaperManagement from '../../components/id-role-paper/PaperManagement';
import Navigation from '../../components/common/Navigation';

const PapersPage: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <PaperManagement />
        </main>
      </div>
    </AuthProvider>
  );
};

export default PapersPage;