import { useState, useCallback, useEffect } from 'react';
import { QRGenerator, QRCodeConfig, QRCodeData, BatchQRRequest } from '../utils/qr-generator';

interface QRCodeHookState {
  isLoading: boolean;
  error: string | null;
  generatedQRs: Array<{
    qrData: QRCodeData;
    dataUrl: string;
    svg: string;
    filename: string;
    info: ReturnType<typeof QRGenerator.getQRCodeInfo>;
  }>;
}

interface SupabaseQRCodeResponse {
  success: boolean;
  qrData: QRCodeData;
  dataUrl: string;
  imageUrl: string;
  storagePath: string;
}

interface SupabaseBatchResponse {
  success: boolean;
  count: number;
  results: Array<{
    qrData: QRCodeData;
    dataUrl: string;
    imageUrl: string;
    filename: string;
    storagePath: string;
  }>;
}

export const useQRCode = () => {
  const [state, setState] = useState<QRCodeHookState>({
    isLoading: false,
    error: null,
    generatedQRs: []
  });

  const [supabaseFunction, setSupabaseFunction] = useState<string | null>(null);

  // Initialize Supabase function URL
  useEffect(() => {
    // Try to get from environment variables or use default
    const functionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/qr-generate`
      : 'http://localhost:54321/functions/v1/qr-generate';
    
    setSupabaseFunction(functionUrl);
  }, []);

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const addGeneratedQR = (qrData: QRCodeData, dataUrl: string, svg: string, filename: string) => {
    const newQR = {
      qrData,
      dataUrl,
      svg,
      filename,
      info: QRGenerator.getQRCodeInfo(qrData)
    };

    setState(prev => ({
      ...prev,
      generatedQRs: [newQR, ...prev.generatedQRs]
    }));
  };

  const clearGeneratedQRs = () => {
    setState(prev => ({ ...prev, generatedQRs: [] }));
  };

  /**
   * Generate a single QR code locally
   */
  const generateQRCode = useCallback(async (
    config: QRCodeConfig,
    options?: any
  ): Promise<{
    qrData: QRCodeData;
    dataUrl: string;
    svg: string;
  } | null> => {
    if (!config.branchId || !config.branchName || !config.type) {
      setError('Missing required configuration: branchId, branchName, and type are required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const qrData = QRGenerator.createQRData(config);
      const dataUrl = await QRGenerator.generateQRCode(qrData, options);
      const svg = await QRGenerator.generateQRCodeSVG(qrData, options);
      
      const filename = `${config.branchName}_${config.type}_${qrData.id.slice(0, 8)}`;
      addGeneratedQR(qrData, dataUrl, svg, filename);

      return { qrData, dataUrl, svg };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate batch QR codes locally
   */
  const generateBatchQRCodes = useCallback(async (
    request: BatchQRRequest
  ): Promise<Array<{
    qrData: QRCodeData;
    dataUrl: string;
    svg: string;
    filename: string;
  }> | null> => {
    if (!request.branches || request.branches.length === 0) {
      setError('At least one branch is required for batch generation');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await QRGenerator.generateBatchQRCodes(request);
      
      // Add all generated QRs to state
      results.forEach(result => {
        addGeneratedQR(result.qrData, result.dataUrl, result.svg, result.filename);
      });

      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate batch QR codes');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate QR code using Supabase Edge Function with cloud storage
   */
  const generateQRCodeWithStorage = useCallback(async (
    config: QRCodeConfig,
    options?: any,
    storageFolder?: string
  ): Promise<SupabaseQRCodeResponse | null> => {
    if (!supabaseFunction) {
      setError('Supabase function URL not configured');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${supabaseFunction}?action=generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({
          ...config,
          options,
          storageFolder
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SupabaseQRCodeResponse = await response.json();
      
      if (result.success) {
        // Add to local state
        const svg = await QRGenerator.generateQRCodeSVG(result.qrData, options);
        const filename = `${config.branchName}_${config.type}_${result.qrData.id.slice(0, 8)}`;
        addGeneratedQR(result.qrData, result.dataUrl, svg, filename);
      }

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code with storage');
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabaseFunction]);

  /**
   * Generate batch QR codes using Supabase Edge Function with cloud storage
   */
  const generateBatchQRCodesWithStorage = useCallback(async (
    request: BatchQRRequest & { storageFolder?: string }
  ): Promise<SupabaseBatchResponse | null> => {
    if (!supabaseFunction) {
      setError('Supabase function URL not configured');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${supabaseFunction}?action=batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SupabaseBatchResponse = await response.json();
      
      if (result.success) {
        // Add all to local state
        for (const item of result.results) {
          const svg = await QRGenerator.generateQRCodeSVG(item.qrData, request.options);
          addGeneratedQR(item.qrData, item.dataUrl, svg, item.filename);
        }
      }

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate batch QR codes with storage');
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabaseFunction]);

  /**
   * Validate QR code data
   */
  const validateQRCode = useCallback(async (qrString: string): Promise<{
    isValid: boolean;
    errors: string[];
    isExpired?: boolean;
    qrData?: QRCodeData;
  } | null> => {
    setLoading(true);
    setError(null);

    try {
      // First try local validation
      const qrData = QRGenerator.parseQRCode(qrString);
      if (qrData) {
        const validation = QRGenerator.validateQRData(qrData);
        setLoading(false);
        return { ...validation, qrData };
      }

      // If local parsing fails, try server validation
      if (supabaseFunction) {
        const response = await fetch(`${supabaseFunction}?action=validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
          },
          body: JSON.stringify({ qrString })
        });

        if (response.ok) {
          const result = await response.json();
          return result;
        }
      }

      return {
        isValid: false,
        errors: ['Unable to parse QR code data']
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate QR code');
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabaseFunction]);

  /**
   * Download QR code as file
   */
  const downloadQRCode = useCallback((
    qrData: QRCodeData,
    dataUrl: string,
    svg: string,
    format: 'png' | 'svg' = 'png',
    filename?: string
  ) => {
    try {
      const finalFilename = filename || `${qrData.branchName}_${qrData.type}_${qrData.id.slice(0, 8)}`;
      const content = format === 'svg' ? svg : dataUrl;
      const { blob, url, filename: fullFilename } = QRGenerator.createDownloadBlob(content, format, finalFilename);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fullFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download QR code');
    }
  }, []);

  /**
   * Get QR code info for display
   */
  const getQRCodeInfo = useCallback((qrData: QRCodeData) => {
    return QRGenerator.getQRCodeInfo(qrData);
  }, []);

  /**
   * Get stored QR codes from Supabase
   */
  const getStoredQRCodes = useCallback(async (qrId?: string): Promise<any> => {
    if (!supabaseFunction) {
      setError('Supabase function URL not configured');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const url = qrId 
        ? `${supabaseFunction}?id=${encodeURIComponent(qrId)}`
        : supabaseFunction;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stored QR codes');
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabaseFunction]);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    generatedQRs: state.generatedQRs,

    // Actions
    generateQRCode,
    generateBatchQRCodes,
    generateQRCodeWithStorage,
    generateBatchQRCodesWithStorage,
    validateQRCode,
    downloadQRCode,
    getQRCodeInfo,
    getStoredQRCodes,
    clearGeneratedQRs,

    // Utilities
    setError,
    setLoading
  };
};

export default useQRCode;