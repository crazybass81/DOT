/**
 * Identity Management Page Route
 * Individual route for identity management component
 */

'use client';

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import IdentityManagement from '../../components/id-role-paper/IdentityManagement';
import Navigation from '../../components/common/Navigation';

const IdentityPage: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <IdentityManagement />
        </main>
      </div>
    </AuthProvider>
  );
};

export default IdentityPage;