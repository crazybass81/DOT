/**
 * Business Registration Page Route
 * Individual route for business registration management component
 */

'use client';

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import BusinessRegistrationManagement from '../../components/id-role-paper/BusinessRegistration';
import Navigation from '../../components/common/Navigation';

const BusinessPage: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <BusinessRegistrationManagement />
        </main>
      </div>
    </AuthProvider>
  );
};

export default BusinessPage;