'use client';

import React, { useState, useEffect } from 'react';
import QRGenerator from './QRGenerator';
import QRScanner from './QRScanner';
import { useQRCode } from '../../hooks/useQRCode';
import { QRCodeData } from '../../utils/qr-generator';

interface Branch {
  id: string;
  name: string;
  locations?: string[];
}

interface StoredQRCode {
  id: string;
  type: 'check-in' | 'check-out' | 'event' | 'visitor';
  branch_id: string;
  branch_name: string;
  location_id?: string;
  event_id?: string;
  created_at: string;
  expires_at?: string;
  metadata: any;
  signature: string;
  image_url: string;
  storage_path: string;
  is_active: boolean;
  used_count: number;
  last_used_at?: string;
}

interface QRManagementProps {
  branches?: Branch[];
  onQRAction?: (action: string, qrData: QRCodeData) => void;
}

export const QRManagement: React.FC<QRManagementProps> = ({
  branches = [
    { id: 'branch1', name: 'Main Office', locations: ['Reception', 'Floor 1', 'Floor 2'] },
    { id: 'branch2', name: 'Branch Office', locations: ['Lobby', 'Meeting Room'] },
  ],
  onQRAction
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan' | 'manage'>('generate');
  const [storedQRCodes, setStoredQRCodes] = useState<StoredQRCode[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const { 
    getStoredQRCodes, 
    isLoading, 
    error,
    setError 
  } = useQRCode();

  // Load stored QR codes on component mount and branch change
  useEffect(() => {
    loadStoredQRCodes();
  }, [selectedBranch]);

  const loadStoredQRCodes = async () => {
    try {
      const result = await getStoredQRCodes();
      if (result && result.qrCodes) {
        let qrCodes = result.qrCodes;
        
        // Filter by branch if selected
        if (selectedBranch) {
          qrCodes = qrCodes.filter((qr: StoredQRCode) => qr.branch_id === selectedBranch);
        }

        setStoredQRCodes(qrCodes);
      }
    } catch (err) {
      console.error('Failed to load QR codes:', err);
    }
  };

  const handleQRGenerated = (qrData: QRCodeData, dataUrl: string) => {
    onQRAction?.('generated', qrData);
    // Refresh stored QR codes if using cloud storage
    loadStoredQRCodes();
  };

  const handleQRScanned = (qrData: QRCodeData, rawData: string) => {
    onQRAction?.('scanned', qrData);
  };

  const handleScanError = (error: string) => {
    setError(error);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (qr: StoredQRCode) => {
    if (!qr.is_active) return 'bg-gray-100 text-gray-800';
    if (qr.expires_at && new Date(qr.expires_at) < new Date()) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (qr: StoredQRCode) => {
    if (!qr.is_active) return 'Inactive';
    if (qr.expires_at && new Date(qr.expires_at) < new Date()) return 'Expired';
    return 'Active';
  };

  const toggleQRStatus = async (qrId: string, currentStatus: boolean) => {
    // This would typically make an API call to update the QR code status
    try {
      // Update local state for now
      setStoredQRCodes(prev => 
        prev.map(qr => 
          qr.id === qrId 
            ? { ...qr, is_active: !currentStatus }
            : qr
        )
      );
    } catch (err) {
      console.error('Failed to update QR status:', err);
    }
  };

  const downloadQRCode = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${filename}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">QR Code Management</h1>
        
        {/* Branch Filter */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Branch:</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Branches</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="text-red-600 text-sm">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generate'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Generate QR Codes
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scan'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Scan QR Codes
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'manage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage QR Codes ({storedQRCodes.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'generate' && (
          <QRGenerator
            branches={branches}
            onQRGenerated={handleQRGenerated}
            onBatchGenerated={(results) => {
              results.forEach(result => {
                onQRAction?.('generated', result.qrData);
              });
              loadStoredQRCodes();
            }}
          />
        )}

        {activeTab === 'scan' && (
          <QRScanner
            onScanSuccess={handleQRScanned}
            onScanError={handleScanError}
            onValidationResult={(result) => {
              if (result.qrData) {
                onQRAction?.(result.isValid ? 'validated' : 'invalid', result.qrData);
              }
            }}
            autoValidate={true}
            showPreview={true}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          />
        )}

        {activeTab === 'manage' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Total QR Codes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {storedQRCodes.length}
                    </p>
                  </div>
                  <div className="text-blue-500">📱</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                      {storedQRCodes.filter(qr => qr.is_active && (!qr.expires_at || new Date(qr.expires_at) > new Date())).length}
                    </p>
                  </div>
                  <div className="text-green-500">✅</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Expired</p>
                    <p className="text-2xl font-bold text-red-600">
                      {storedQRCodes.filter(qr => qr.expires_at && new Date(qr.expires_at) < new Date()).length}
                    </p>
                  </div>
                  <div className="text-red-500">⏰</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Total Scans</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {storedQRCodes.reduce((sum, qr) => sum + (qr.used_count || 0), 0)}
                    </p>
                  </div>
                  <div className="text-purple-500">📊</div>
                </div>
              </div>
            </div>

            {/* QR Codes Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">QR Code List</h3>
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading QR codes...</p>
                </div>
              ) : storedQRCodes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">📱</div>
                  <p>No QR codes found</p>
                  <p className="text-sm">Generate your first QR code to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          QR Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expires
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {storedQRCodes.map((qr) => (
                        <tr key={qr.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {qr.image_url ? (
                              <img
                                src={qr.image_url}
                                alt="QR Code"
                                className="w-12 h-12 border border-gray-200 rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                                No Image
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {qr.branch_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Type: {qr.type.split('-').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </div>
                            {qr.location_id && (
                              <div className="text-xs text-gray-400">
                                Location: {qr.location_id}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(qr)}`}>
                              {getStatusText(qr)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{qr.used_count || 0} scans</div>
                            {qr.last_used_at && (
                              <div className="text-xs text-gray-400">
                                Last: {formatDate(qr.last_used_at)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(qr.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {qr.expires_at ? formatDate(qr.expires_at) : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            {qr.image_url && (
                              <button
                                onClick={() => downloadQRCode(qr.image_url, `${qr.branch_name}_${qr.type}_${qr.id.slice(0, 8)}`)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Download
                              </button>
                            )}
                            <button
                              onClick={() => toggleQRStatus(qr.id, qr.is_active)}
                              className={`${
                                qr.is_active 
                                  ? 'text-red-600 hover:text-red-900' 
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {qr.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRManagement;