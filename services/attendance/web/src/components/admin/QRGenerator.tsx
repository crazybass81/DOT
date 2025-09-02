'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  QRGenerator as QRGen, 
  QRCodeConfig, 
  QRCodeData, 
  BatchQRRequest, 
  QRCodeOptions 
} from '../../utils/qr-generator';

interface Branch {
  id: string;
  name: string;
  locations?: string[];
}

interface QRGeneratorProps {
  branches?: Branch[];
  onQRGenerated?: (qrData: QRCodeData, dataUrl: string) => void;
  onBatchGenerated?: (results: any[]) => void;
}

interface GeneratedQR {
  qrData: QRCodeData;
  dataUrl: string;
  svg: string;
  filename: string;
  info: ReturnType<typeof QRGen.getQRCodeInfo>;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  branches = [],
  onQRGenerated,
  onBatchGenerated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQRs, setGeneratedQRs] = useState<GeneratedQR[]>([]);
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const printRef = useRef<HTMLDivElement>(null);

  // Single QR form state
  const [singleConfig, setSingleConfig] = useState<QRCodeConfig>({
    type: 'check-in',
    branchId: '',
    branchName: '',
    locationId: '',
    eventId: '',
    expiresAt: undefined,
    metadata: {}
  });

  // Batch QR form state
  const [batchConfig, setBatchConfig] = useState<BatchQRRequest>({
    branches: [],
    options: {
      width: 256,
      margin: 2,
      errorCorrectionLevel: 'M'
    },
    expiresAt: undefined
  });

  // QR code options
  const [qrOptions, setQrOptions] = useState<QRCodeOptions>({
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92
  });

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]);
      setSingleConfig(prev => ({
        ...prev,
        branchId: branches[0].id,
        branchName: branches[0].name
      }));
    }
  }, [branches, selectedBranch]);

  const generateSingleQR = async () => {
    if (!singleConfig.branchId || !singleConfig.branchName) {
      setError('Please select a branch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const qrData = QRGen.createQRData(singleConfig);
      const dataUrl = await QRGen.generateQRCode(qrData, qrOptions);
      const svg = await QRGen.generateQRCodeSVG(qrData, qrOptions);
      
      const generatedQR: GeneratedQR = {
        qrData,
        dataUrl,
        svg,
        filename: `${singleConfig.branchName}_${singleConfig.type}_${qrData.id.slice(0, 8)}`,
        info: QRGen.getQRCodeInfo(qrData)
      };

      setGeneratedQRs(prev => [generatedQR, ...prev]);
      onQRGenerated?.(qrData, dataUrl);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const generateBatchQR = async () => {
    if (batchConfig.branches.length === 0) {
      setError('Please select at least one branch for batch generation');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await QRGen.generateBatchQRCodes(batchConfig);
      
      const generatedQRs: GeneratedQR[] = results.map(result => ({
        ...result,
        info: QRGen.getQRCodeInfo(result.qrData)
      }));

      setGeneratedQRs(prev => [...generatedQRs, ...prev]);
      onBatchGenerated?.(results);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate batch QR codes');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQR = (qr: GeneratedQR, format: 'png' | 'svg') => {
    const content = format === 'svg' ? qr.svg : qr.dataUrl;
    const { blob, url, filename } = QRGen.createDownloadBlob(content, format, qr.filename);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printQRs = async () => {
    if (generatedQRs.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let printContent = `
      <html>
        <head>
          <title>QR Codes</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
            }
            .qr-print-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              page-break-inside: avoid;
              margin: 20px;
              padding: 15px;
              border: 2px solid #333;
              border-radius: 8px;
              background: white;
              break-inside: avoid;
            }
            .qr-print-code {
              margin-bottom: 15px;
            }
            .qr-print-label {
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 5px;
              color: #333;
            }
            .qr-print-info {
              font-size: 10px;
              text-align: center;
              color: #666;
              line-height: 1.4;
            }
            .qr-print-expiry {
              font-size: 9px;
              color: #999;
              margin-top: 5px;
            }
            @media print {
              .qr-print-container {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
    `;

    for (const qr of generatedQRs) {
      const printQRData = await QRGen.generatePrintQRCode(qr.qrData, {
        width: 200,
        includeLabel: true,
        includeExpiry: true
      });

      printContent += `
        <div class="qr-print-container">
          <div class="qr-print-code">
            <img src="${printQRData.dataUrl}" alt="QR Code" />
          </div>
          <div class="qr-print-label">${qr.info.displayName}</div>
          <div class="qr-print-info">
            ${qr.info.description}<br>
            Created: ${qr.qrData.createdAt.toLocaleDateString()}
            ${qr.qrData.expiresAt ? `<div class="qr-print-expiry">Expires: ${qr.qrData.expiresAt.toLocaleDateString()}</div>` : ''}
          </div>
        </div>
      `;
    }

    printContent += '</body></html>';
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const addBatchBranch = () => {
    if (!selectedBranch) return;
    
    const existingBranch = batchConfig.branches.find(b => b.branchId === selectedBranch.id);
    if (existingBranch) return;

    setBatchConfig(prev => ({
      ...prev,
      branches: [
        ...prev.branches,
        {
          branchId: selectedBranch.id,
          branchName: selectedBranch.name,
          types: ['check-in'],
          locationIds: selectedBranch.locations
        }
      ]
    }));
  };

  const removeBatchBranch = (branchId: string) => {
    setBatchConfig(prev => ({
      ...prev,
      branches: prev.branches.filter(b => b.branchId !== branchId)
    }));
  };

  const updateBatchBranch = (branchId: string, field: string, value: any) => {
    setBatchConfig(prev => ({
      ...prev,
      branches: prev.branches.map(b => 
        b.branchId === branchId 
          ? { ...b, [field]: value }
          : b
      )
    }));
  };

  const clearGenerated = () => {
    setGeneratedQRs([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">QR Code Generator</h1>
        {generatedQRs.length > 0 && (
          <div className="space-x-2">
            <button
              onClick={printQRs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Print All ({generatedQRs.length})
            </button>
            <button
              onClick={clearGenerated}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('single')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'single'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Single QR Code
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'batch'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Batch Generation
          </button>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {activeTab === 'single' ? 'QR Code Configuration' : 'Batch Configuration'}
          </h2>

          {activeTab === 'single' ? (
            /* Single QR Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch
                </label>
                <select
                  value={singleConfig.branchId}
                  onChange={(e) => {
                    const branch = branches.find(b => b.id === e.target.value);
                    if (branch) {
                      setSelectedBranch(branch);
                      setSingleConfig(prev => ({
                        ...prev,
                        branchId: branch.id,
                        branchName: branch.name
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Type
                </label>
                <select
                  value={singleConfig.type}
                  onChange={(e) => setSingleConfig(prev => ({ 
                    ...prev, 
                    type: e.target.value as QRCodeConfig['type'] 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="check-in">Check In</option>
                  <option value="check-out">Check Out</option>
                  <option value="event">Event</option>
                  <option value="visitor">Visitor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location ID (Optional)
                </label>
                <input
                  type="text"
                  value={singleConfig.locationId || ''}
                  onChange={(e) => setSingleConfig(prev => ({ 
                    ...prev, 
                    locationId: e.target.value || undefined 
                  }))}
                  placeholder="Enter location identifier"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event ID (Optional)
                </label>
                <input
                  type="text"
                  value={singleConfig.eventId || ''}
                  onChange={(e) => setSingleConfig(prev => ({ 
                    ...prev, 
                    eventId: e.target.value || undefined 
                  }))}
                  placeholder="Enter event identifier"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={singleConfig.expiresAt ? 
                    new Date(singleConfig.expiresAt.getTime() - singleConfig.expiresAt.getTimezoneOffset() * 60000)
                      .toISOString().slice(0, 16) : ''
                  }
                  onChange={(e) => setSingleConfig(prev => ({ 
                    ...prev, 
                    expiresAt: e.target.value ? new Date(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={generateSingleQR}
                disabled={isLoading || !singleConfig.branchId}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Generating...' : 'Generate QR Code'}
              </button>
            </div>
          ) : (
            /* Batch QR Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Branch
                </label>
                <div className="flex space-x-2">
                  <select
                    value={selectedBranch?.id || ''}
                    onChange={(e) => {
                      const branch = branches.find(b => b.id === e.target.value);
                      setSelectedBranch(branch || null);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addBatchBranch}
                    disabled={!selectedBranch}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Selected Branches */}
              {batchConfig.branches.map((branch, index) => (
                <div key={branch.branchId} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">{branch.branchName}</h4>
                    <button
                      onClick={() => removeBatchBranch(branch.branchId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">QR Types</label>
                      <div className="flex flex-wrap gap-2">
                        {(['check-in', 'check-out', 'event', 'visitor'] as const).map(type => (
                          <label key={type} className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={branch.types.includes(type)}
                              onChange={(e) => {
                                const types = e.target.checked
                                  ? [...branch.types, type]
                                  : branch.types.filter(t => t !== type);
                                updateBatchBranch(branch.branchId, 'types', types);
                              }}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {type.split('-').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Batch Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={batchConfig.expiresAt ? 
                    new Date(batchConfig.expiresAt.getTime() - batchConfig.expiresAt.getTimezoneOffset() * 60000)
                      .toISOString().slice(0, 16) : ''
                  }
                  onChange={(e) => setBatchConfig(prev => ({ 
                    ...prev, 
                    expiresAt: e.target.value ? new Date(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={generateBatchQR}
                disabled={isLoading || batchConfig.branches.length === 0}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Generating...' : `Generate Batch QR Codes`}
              </button>
            </div>
          )}

          {/* QR Options */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium mb-3">QR Code Options</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <select
                  value={qrOptions.width}
                  onChange={(e) => setQrOptions(prev => ({ 
                    ...prev, 
                    width: parseInt(e.target.value) 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={128}>128x128</option>
                  <option value={256}>256x256</option>
                  <option value={512}>512x512</option>
                  <option value={1024}>1024x1024</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Error Correction
                </label>
                <select
                  value={qrOptions.errorCorrectionLevel}
                  onChange={(e) => setQrOptions(prev => ({ 
                    ...prev, 
                    errorCorrectionLevel: e.target.value as 'L' | 'M' | 'Q' | 'H'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="L">Low (7%)</option>
                  <option value="M">Medium (15%)</option>
                  <option value="Q">Quartile (25%)</option>
                  <option value="H">High (30%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foreground Color
                </label>
                <input
                  type="color"
                  value={qrOptions.color?.dark || '#000000'}
                  onChange={(e) => setQrOptions(prev => ({ 
                    ...prev, 
                    color: { ...prev.color, dark: e.target.value }
                  }))}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <input
                  type="color"
                  value={qrOptions.color?.light || '#FFFFFF'}
                  onChange={(e) => setQrOptions(prev => ({ 
                    ...prev, 
                    color: { ...prev.color, light: e.target.value }
                  }))}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Generated QR Codes Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">
            Generated QR Codes ({generatedQRs.length})
          </h2>

          {generatedQRs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">📱</div>
              <p>No QR codes generated yet</p>
              <p className="text-sm">Configure and generate your first QR code</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedQRs.map((qr, index) => (
                <div key={qr.qrData.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    {/* QR Code Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={qr.dataUrl}
                        alt="QR Code"
                        className="w-16 h-16 border border-gray-200 rounded"
                      />
                    </div>

                    {/* QR Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {qr.info.displayName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {qr.info.description}
                      </p>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className="text-xs text-gray-500">
                          Created: {qr.qrData.createdAt.toLocaleDateString()}
                        </span>
                        {qr.qrData.expiresAt && (
                          <span 
                            className={`text-xs ${qr.info.isExpired ? 'text-red-600' : 'text-green-600'}`}
                          >
                            {qr.info.isExpired ? 'Expired' : 'Expires'}: {qr.qrData.expiresAt.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => downloadQR(qr, 'png')}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        PNG
                      </button>
                      <button
                        onClick={() => downloadQR(qr, 'svg')}
                        className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                      >
                        SVG
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Print Preview (Hidden) */}
      <div ref={printRef} className="hidden">
        {generatedQRs.map((qr, index) => (
          <div key={qr.qrData.id} className="qr-print-container">
            <div className="qr-print-code">
              <img src={qr.dataUrl} alt="QR Code" />
            </div>
            <div className="qr-print-label">{qr.info.displayName}</div>
            <div className="qr-print-info">
              {qr.info.description}<br />
              Created: {qr.qrData.createdAt.toLocaleDateString()}
              {qr.qrData.expiresAt && (
                <div className="qr-print-expiry">
                  Expires: {qr.qrData.expiresAt.toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QRGenerator;