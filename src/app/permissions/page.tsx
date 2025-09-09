/**
 * Permission Dashboard Page Route
 * Individual route for RBAC visualization and control component
 */

'use client';

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import PermissionDashboard from '../../components/id-role-paper/PermissionDashboard';
import Navigation from '../../components/common/Navigation';

const PermissionsPage: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <PermissionDashboard />
        </main>
      </div>
    </AuthProvider>
  );
};

export default PermissionsPage;