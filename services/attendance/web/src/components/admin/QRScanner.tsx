'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import QrScanner from 'qr-scanner';
import { QRGenerator, QRCodeData } from '../../utils/qr-generator';
import { useQRCode } from '../../hooks/useQRCode';

interface QRScannerProps {
  onScanSuccess?: (qrData: QRCodeData, rawData: string) => void;
  onScanError?: (error: string) => void;
  onValidationResult?: (result: {
    isValid: boolean;
    errors: string[];
    isExpired?: boolean;
    qrData?: QRCodeData;
  }) => void;
  autoValidate?: boolean;
  showPreview?: boolean;
  className?: string;
}

interface ScanResult {
  timestamp: Date;
  data: string;
  isValid: boolean;
  qrData?: QRCodeData;
  errors?: string[];
  isExpired?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  onValidationResult,
  autoValidate = true,
  showPreview = true,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanner, setScanner] = useState<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { validateQRCode, isLoading: isValidating } = useQRCode();

  // Initialize camera and scanner
  useEffect(() => {
    const initializeScanner = async () => {
      if (!videoRef.current) return;

      try {
        // Check for camera support
        const hasCamera = await QrScanner.hasCamera();
        setHasCamera(hasCamera);

        if (!hasCamera) {
          setError('No camera detected');
          return;
        }

        // Get available cameras
        const cameras = await QrScanner.listCameras(true);
        setCameras(cameras);

        if (cameras.length > 0 && !selectedCamera) {
          // Prefer back camera if available
          const backCamera = cameras.find(camera => 
            camera.label.toLowerCase().includes('back') || 
            camera.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(backCamera?.id || cameras[0].id);
        }

        // Create scanner instance
        const qrScanner = new QrScanner(
          videoRef.current,
          handleScanResult,
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: selectedCamera || 'environment',
          }
        );

        setScanner(qrScanner);
        setError(null);

      } catch (err) {
        console.error('Failed to initialize scanner:', err);
        setError('Failed to initialize camera scanner');
        setHasCamera(false);
      }
    };

    initializeScanner();

    return () => {
      if (scanner) {
        scanner.destroy();
      }
    };
  }, [selectedCamera]);

  // Handle scan result
  const handleScanResult = useCallback(async (result: QrScanner.ScanResult) => {
    const scanData = result.data;
    
    try {
      let scanResult: ScanResult = {
        timestamp: new Date(),
        data: scanData,
        isValid: false
      };

      if (autoValidate) {
        // Validate the scanned QR code
        const validation = await validateQRCode(scanData);
        
        if (validation) {
          scanResult = {
            ...scanResult,
            isValid: validation.isValid,
            qrData: validation.qrData,
            errors: validation.errors,
            isExpired: validation.isExpired
          };

          onValidationResult?.(validation);

          if (validation.isValid && validation.qrData) {
            onScanSuccess?.(validation.qrData, scanData);
          } else {
            onScanError?.(validation.errors.join(', ') || 'Invalid QR code');
          }
        }
      } else {
        // Try to parse QR data locally without validation
        const qrData = QRGenerator.parseQRCode(scanData);
        if (qrData) {
          scanResult.isValid = true;
          scanResult.qrData = qrData;
          onScanSuccess?.(qrData, scanData);
        } else {
          onScanError?('Unable to parse QR code data');
        }
      }

      // Add to scan history
      setScanHistory(prev => [scanResult, ...prev.slice(0, 9)]); // Keep last 10 scans

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Scan processing failed';
      onScanError?.(errorMessage);
      setError(errorMessage);
    }
  }, [autoValidate, validateQRCode, onScanSuccess, onScanError, onValidationResult]);

  // Start scanning
  const startScanning = async () => {
    if (!scanner || !hasCamera) return;

    try {
      await scanner.start();
      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error('Failed to start scanning:', err);
      setError('Failed to start camera');
      setIsScanning(false);
    }
  };

  // Stop scanning
  const stopScanning = () => {
    if (scanner) {
      scanner.stop();
      setIsScanning(false);
    }
  };

  // Switch camera
  const switchCamera = async (cameraId: string) => {
    if (!scanner) return;

    try {
      await scanner.setCamera(cameraId);
      setSelectedCamera(cameraId);
    } catch (err) {
      console.error('Failed to switch camera:', err);
      setError('Failed to switch camera');
    }
  };

  // Handle file upload for QR code scanning
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true
      });

      await handleScanResult(result);
    } catch (err) {
      console.error('Failed to scan image:', err);
      setError('No QR code found in image');
      onScanError?.('No QR code found in uploaded image');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearScanHistory = () => {
    setScanHistory([]);
  };

  return (
    <div className={`qr-scanner-container ${className}`}>
      {/* Scanner Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">QR Code Scanner</h2>
        <div className="flex space-x-2">
          {/* Camera Selection */}
          {cameras.length > 1 && (
            <select
              value={selectedCamera}
              onChange={(e) => switchCamera(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={!hasCamera}
            >
              {cameras.map(camera => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${camera.id}`}
                </option>
              ))}
            </select>
          )}

          {/* Control Buttons */}
          {hasCamera && (
            <button
              onClick={isScanning ? stopScanning : startScanning}
              className={`px-4 py-2 rounded-lg text-white ${
                isScanning 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              disabled={isValidating}
            >
              {isValidating ? 'Processing...' : isScanning ? 'Stop' : 'Start'}
            </button>
          )}

          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={isValidating}
          >
            Upload Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Preview */}
        {showPreview && (
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-200 border-b">
              <h3 className="font-medium text-gray-700">Camera Preview</h3>
            </div>
            <div className="relative aspect-square flex items-center justify-center">
              {hasCamera === null ? (
                <div className="text-gray-500">Checking camera access...</div>
              ) : hasCamera ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className="text-center text-gray-500 p-8">
                  <div className="text-4xl mb-2">📷</div>
                  <div>No camera available</div>
                  <div className="text-sm">Use file upload instead</div>
                </div>
              )}
              {isScanning && (
                <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs">
                  Scanning...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scan History */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-medium text-gray-700">
              Scan History ({scanHistory.length})
            </h3>
            {scanHistory.length > 0 && (
              <button
                onClick={clearScanHistory}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {scanHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-2xl mb-2">📱</div>
                <div>No scans yet</div>
                <div className="text-sm">Scan a QR code to see results here</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {scanHistory.map((scan, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            scan.isValid ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm font-medium">
                            {scan.isValid ? 'Valid' : 'Invalid'}
                          </span>
                          {scan.isExpired && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                              Expired
                            </span>
                          )}
                        </div>
                        
                        {scan.qrData && (
                          <div className="text-sm text-gray-700 mb-1">
                            <div className="font-medium">
                              {scan.qrData.branchName} - {scan.qrData.type}
                            </div>
                            {scan.qrData.locationId && (
                              <div className="text-xs text-gray-500">
                                Location: {scan.qrData.locationId}
                              </div>
                            )}
                          </div>
                        )}

                        {scan.errors && scan.errors.length > 0 && (
                          <div className="text-xs text-red-600 mb-1">
                            {scan.errors.join(', ')}
                          </div>
                        )}

                        <div className="text-xs text-gray-400">
                          {scan.timestamp.toLocaleTimeString()}
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

      {/* Processing Indicator */}
      {isValidating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Validating QR code...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;