'use client';

import React, { useState } from 'react';
import QRManagement from './QRManagement';
import { QRCodeData } from '../../types/qr-types';

interface QRCodeDemoProps {
  className?: string;
}

export const QRCodeDemo: React.FC<QRCodeDemoProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<Array<{
    timestamp: Date;
    action: string;
    qrData: QRCodeData;
    details?: any;
  }>>([]);

  // Sample branches for demo
  const demoBranches = [
    { 
      id: 'branch_001', 
      name: 'Main Office', 
      locations: ['Reception', 'Floor 1', 'Floor 2', 'Conference Room A', 'Conference Room B'] 
    },
    { 
      id: 'branch_002', 
      name: 'Branch Office Seoul', 
      locations: ['Lobby', 'Meeting Room', 'Co-working Space'] 
    },
    { 
      id: 'branch_003', 
      name: 'Branch Office Busan', 
      locations: ['Front Desk', 'Workshop Area', 'Break Room'] 
    },
    { 
      id: 'branch_004', 
      name: 'Remote Hub Tokyo', 
      locations: ['Check-in Desk', 'Event Space', 'Networking Area'] 
    }
  ];

  const handleQRAction = (action: string, qrData: QRCodeData, details?: any) => {
    const logEntry = {
      timestamp: new Date(),
      action,
      qrData,
      details
    };
    
    setLogs(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
    
    console.log('QR Code Action:', logEntry);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'generated': return 'text-blue-600 bg-blue-50';
      case 'scanned': return 'text-green-600 bg-green-50';
      case 'validated': return 'text-purple-600 bg-purple-50';
      case 'invalid': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'generated': return '🎯';
      case 'scanned': return '📱';
      case 'validated': return '✅';
      case 'invalid': return '❌';
      default: return '📋';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className={`qr-code-demo ${className}`}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Demo Header */}
        <div className="text-center bg-gradient-to-r from-blue-500 to-purple-600 text-white py-12 px-6 rounded-xl">
          <h1 className="text-4xl font-bold mb-4">QR Code Management System</h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Complete QR code generation, scanning, and management solution for attendance tracking. 
            Generate unique QR codes for branches, scan with validation, and manage your QR code inventory.
          </p>
          <div className="mt-6 flex justify-center space-x-4 text-sm">
            <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
              ✨ Cloud Storage
            </div>
            <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
              🔒 Signature Validation
            </div>
            <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
              📊 Usage Analytics
            </div>
            <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
              🖨️ Print Ready
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-2">Generate QR Codes</h3>
            <p className="text-sm text-gray-600">
              Create unique QR codes for different locations and purposes with customizable options
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-semibold text-gray-900 mb-2">Scan & Validate</h3>
            <p className="text-sm text-gray-600">
              Real-time QR code scanning with signature validation and expiration checking
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-3xl mb-3">☁️</div>
            <h3 className="font-semibold text-gray-900 mb-2">Cloud Storage</h3>
            <p className="text-sm text-gray-600">
              Automatic storage in Supabase with metadata tracking and download links
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-sm text-gray-600">
              Track usage statistics, scan counts, and QR code performance metrics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main QR Management Component */}
          <div className="xl:col-span-3">
            <QRManagement
              branches={demoBranches}
              onQRAction={handleQRAction}
            />
          </div>

          {/* Activity Log Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Activity Log</h3>
                {logs.length > 0 && (
                  <button
                    onClick={clearLogs}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-2xl mb-2">📋</div>
                    <p className="text-sm">No activity yet</p>
                    <p className="text-xs">Generate or scan QR codes to see activity</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {logs.map((log, index) => (
                      <div key={index} className="p-3">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <span className="text-lg">
                              {getActionIcon(log.action)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getActionColor(log.action)}`}>
                                {log.action.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTimestamp(log.timestamp)}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-700">
                              <div className="font-medium">
                                {log.qrData.branchName}
                              </div>
                              <div className="text-gray-500">
                                {log.qrData.type} • {log.qrData.locationId || 'No location'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Technical Information */}
        <div className="bg-gray-50 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Technical Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">🔐 Security Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• HMAC signature validation</li>
                <li>• Expiration timestamp checking</li>
                <li>• Tamper-proof data structure</li>
                <li>• UUID-based unique identifiers</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">⚙️ Customization Options</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Configurable QR code sizes</li>
                <li>• Custom colors and styling</li>
                <li>• Error correction levels</li>
                <li>• Print-optimized layouts</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">📈 Analytics & Tracking</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Usage count tracking</li>
                <li>• Scan success/failure rates</li>
                <li>• Geographic scan locations</li>
                <li>• Performance statistics</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">🖥️ Technologies Used</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• React + TypeScript</li>
                <li>• Supabase Edge Functions</li>
                <li>• QR Code generation libraries</li>
                <li>• Camera API integration</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">📱 Export Options</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• PNG, SVG, JPEG formats</li>
                <li>• Batch download capabilities</li>
                <li>• Print-ready layouts</li>
                <li>• Cloud storage integration</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">🔄 Integration Ready</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• REST API endpoints</li>
                <li>• Webhook support</li>
                <li>• React hooks for easy use</li>
                <li>• Database integration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-blue-50 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-blue-900 mb-6">How to Use</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-xl">1</span>
              </div>
              <h3 className="font-semibold text-blue-900 mb-2">Generate QR Codes</h3>
              <p className="text-blue-700 text-sm">
                Use the Generate tab to create single or batch QR codes for your branches and locations
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-xl">2</span>
              </div>
              <h3 className="font-semibold text-blue-900 mb-2">Scan & Validate</h3>
              <p className="text-blue-700 text-sm">
                Use the Scan tab to validate QR codes using your camera or by uploading images
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-xl">3</span>
              </div>
              <h3 className="font-semibold text-blue-900 mb-2">Manage Inventory</h3>
              <p className="text-blue-700 text-sm">
                Use the Manage tab to view statistics, download QR codes, and control activation status
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDemo;