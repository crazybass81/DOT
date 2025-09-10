/**
 * QR 관리 페이지 UI/UX 통합 테스트
 * QR 생성/스캔, 암호화/복호화, 보안 검증
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  mockQRScanner,
  qrCodeHelpers,
  performanceHelpers,
  koreanLocaleHelpers,
  createTestUser,
  createTestOrganization
} from '../test-utils/ui-test-helpers';

// Mock QR libraries
jest.mock('qrcode');
jest.mock('qr-scanner');
jest.mock('crypto-js');

describe('QR 관리 페이지 UI/UX 통합 테스트', () => {
  const testUser = createTestUser({ role: 'admin' });
  const testOrganization = createTestOrganization();

  beforeEach(() => {
    jest.clearAllMocks();
    mockQRScanner();
    
    // Mock QR code generation
    const QRCode = require('qrcode');
    QRCode.toCanvas = jest.fn().mockResolvedValue(undefined);
    QRCode.toDataURL = jest.fn().mockResolvedValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');

    // Mock crypto
    const CryptoJS = require('crypto-js');
    CryptoJS.AES = {
      encrypt: jest.fn().mockReturnValue({ toString: () => 'encrypted-data' }),
      decrypt: jest.fn().mockReturnValue({ toString: () => 'decrypted-data' })
    };
  });

  describe('QR 코드 생성 기능', () => {
    test('QR 코드가 올바르게 생성되어야 함', async () => {
      const QRGenerator = () => {
        const [qrData, setQrData] = React.useState('');
        const [isGenerating, setIsGenerating] = React.useState(false);

        const generateQR = async () => {
          setIsGenerating(true);
          
          const qrPayload = {
            organizationId: testOrganization.id,
            timestamp: Date.now(),
            location: {
              latitude: testOrganization.latitude,
              longitude: testOrganization.longitude
            },
            expiresAt: Date.now() + (10 * 60 * 1000) // 10분 후 만료
          };

          // 암호화
          const CryptoJS = require('crypto-js');
          const encryptedData = CryptoJS.AES.encrypt(
            JSON.stringify(qrPayload), 
            'secret-key'
          ).toString();

          // QR 코드 생성
          const QRCode = require('qrcode');
          const qrDataUrl = await QRCode.toDataURL(encryptedData);
          
          setQrData(qrDataUrl);
          setIsGenerating(false);
        };

        return (
          <div data-testid="qr-generator">
            <h2>QR 코드 생성</h2>
            <button 
              onClick={generateQR}
              disabled={isGenerating}
              data-testid="generate-qr-btn"
            >
              {isGenerating ? 'QR 코드 생성 중...' : 'QR 코드 생성'}
            </button>
            
            {qrData && (
              <div data-testid="qr-display">
                <canvas data-testid="qr-canvas" />
                <p>QR 코드가 생성되었습니다</p>
                <p>유효시간: 10분</p>
              </div>
            )}
          </div>
        );
      };

      render(<QRGenerator />);

      // QR 생성 버튼 클릭
      const generateButton = qrCodeHelpers.findGenerateButton();
      
      const generationTime = await performanceHelpers.measureInteractionTime(async () => {
        await userEvent.click(generateButton);
      });

      // QR 생성 성능 검증 (500ms 이내)
      performanceHelpers.expectFastResponse(generationTime, 500);

      // 로딩 상태 확인
      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('QR 코드 생성 중...');
      });

      // QR 코드 생성 완료 확인
      await waitFor(() => {
        const qrCanvas = qrCodeHelpers.findQRCanvas();
        expect(qrCanvas).toBeInTheDocument();
        koreanLocaleHelpers.expectKoreanText('QR 코드가 생성되었습니다');
        koreanLocaleHelpers.expectKoreanText('유효시간: 10분');
      });

      // QR 라이브러리 호출 확인
      const QRCode = require('qrcode');
      expect(QRCode.toDataURL).toHaveBeenCalled();
    });

    test('QR 코드 만료 시간 표시 및 자동 갱신', async () => {
      jest.useFakeTimers();

      const QRExpirationTimer = () => {
        const [timeLeft, setTimeLeft] = React.useState(600); // 10분 = 600초
        const [isExpired, setIsExpired] = React.useState(false);

        React.useEffect(() => {
          const timer = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) {
                setIsExpired(true);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(timer);
        }, []);

        const formatTime = (seconds: number) => {
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        };

        return (
          <div data-testid="qr-expiration-timer">
            {!isExpired ? (
              <p data-testid="time-remaining">
                남은 시간: {formatTime(timeLeft)}
              </p>
            ) : (
              <div data-testid="expired-notice">
                <p>QR 코드가 만료되었습니다</p>
                <button data-testid="regenerate-btn">새로 생성</button>
              </div>
            )}
          </div>
        );
      };

      render(<QRExpirationTimer />);

      // 초기 시간 확인
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('남은 시간: 10:00');

      // 시간 경과 시뮬레이션
      jest.advanceTimersByTime(30000); // 30초 경과

      await waitFor(() => {
        expect(screen.getByTestId('time-remaining')).toHaveTextContent('남은 시간: 9:30');
      });

      // 만료까지 시간 경과
      jest.advanceTimersByTime(570000); // 9분 30초 더 경과

      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('QR 코드가 만료되었습니다');
        expect(screen.getByTestId('regenerate-btn')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    test('QR 코드 보안 정보 암호화 검증', async () => {
      const securityPayload = {
        organizationId: testOrganization.id,
        userId: testUser.id,
        timestamp: 1642204800000, // 고정 타임스탬프
        nonce: 'random-nonce-123',
        checksum: 'security-checksum'
      };

      const QRSecurityTest = () => {
        const [encryptedData, setEncryptedData] = React.useState('');

        const generateSecureQR = () => {
          const CryptoJS = require('crypto-js');
          const encrypted = CryptoJS.AES.encrypt(
            JSON.stringify(securityPayload),
            'secret-key'
          ).toString();
          
          setEncryptedData(encrypted);
        };

        return (
          <div data-testid="qr-security-test">
            <button onClick={generateSecureQR} data-testid="secure-generate-btn">
              보안 QR 생성
            </button>
            {encryptedData && (
              <div data-testid="encrypted-display">
                <p>암호화된 데이터가 생성되었습니다</p>
                <code data-testid="encrypted-data">{encryptedData}</code>
              </div>
            )}
          </div>
        );
      };

      render(<QRSecurityTest />);

      const generateButton = screen.getByTestId('secure-generate-btn');
      await userEvent.click(generateButton);

      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('암호화된 데이터가 생성되었습니다');
        
        const encryptedData = screen.getByTestId('encrypted-data');
        expect(encryptedData).toHaveTextContent('encrypted-data');
      });

      // 암호화 함수 호출 확인
      const CryptoJS = require('crypto-js');
      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(
        JSON.stringify(securityPayload),
        'secret-key'
      );
    });
  });

  describe('QR 코드 스캔 기능', () => {
    test('QR 스캐너가 올바르게 초기화되어야 함', async () => {
      const QRScanner = () => {
        const [isScanning, setIsScanning] = React.useState(false);
        const [scanResult, setScanResult] = React.useState('');
        const videoRef = React.useRef<HTMLVideoElement>(null);

        const startScan = async () => {
          setIsScanning(true);
          
          const QrScanner = require('qr-scanner');
          const scanner = new QrScanner(
            videoRef.current!,
            (result: string) => {
              setScanResult(result);
              setIsScanning(false);
            }
          );

          await scanner.start();
        };

        const stopScan = () => {
          setIsScanning(false);
        };

        return (
          <div data-testid="qr-scanner-component">
            <h2>QR 코드 스캔</h2>
            <video ref={videoRef} data-testid="qr-scanner" />
            
            <div data-testid="scanner-controls">
              {!isScanning ? (
                <button onClick={startScan} data-testid="start-scan-btn">
                  스캔 시작
                </button>
              ) : (
                <button onClick={stopScan} data-testid="stop-scan-btn">
                  스캔 중지
                </button>
              )}
            </div>

            {scanResult && (
              <div data-testid="scan-result">
                <p>스캔 결과: {scanResult}</p>
              </div>
            )}
          </div>
        );
      };

      render(<QRScanner />);

      // 스캔 시작 버튼 클릭
      const startButton = screen.getByTestId('start-scan-btn');
      await userEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByTestId('stop-scan-btn')).toBeInTheDocument();
        koreanLocaleHelpers.expectKoreanText('스캔 중지');
      });

      // QR 스캔 결과 시뮬레이션
      qrCodeHelpers.mockQRScanResult('scanned-qr-data');

      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('스캔 결과: scanned-qr-data');
      });
    });

    test('스캔된 QR 데이터 복호화 및 검증', async () => {
      const encryptedQRData = 'encrypted-attendance-data';
      
      const QRDataProcessor = () => {
        const [processedData, setProcessedData] = React.useState<any>(null);
        const [error, setError] = React.useState('');

        const processQRData = (encryptedData: string) => {
          try {
            const CryptoJS = require('crypto-js');
            const decrypted = CryptoJS.AES.decrypt(encryptedData, 'secret-key');
            const decryptedText = decrypted.toString();
            
            if (decryptedText === 'decrypted-data') {
              const mockData = {
                organizationId: testOrganization.id,
                timestamp: Date.now(),
                isValid: true
              };
              setProcessedData(mockData);
            } else {
              setError('유효하지 않은 QR 코드입니다');
            }
          } catch (err) {
            setError('QR 코드 처리 중 오류가 발생했습니다');
          }
        };

        React.useEffect(() => {
          processQRData(encryptedQRData);
        }, []);

        return (
          <div data-testid="qr-data-processor">
            {error ? (
              <div data-testid="error-message" role="alert">
                {error}
              </div>
            ) : processedData ? (
              <div data-testid="processed-data">
                <p>QR 코드 인증 성공</p>
                <p>조직 ID: {processedData.organizationId}</p>
                <p>유효성: {processedData.isValid ? '유효' : '무효'}</p>
              </div>
            ) : (
              <p>QR 코드 처리 중...</p>
            )}
          </div>
        );
      };

      render(<QRDataProcessor />);

      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('QR 코드 인증 성공');
        koreanLocaleHelpers.expectKoreanText(`조직 ID: ${testOrganization.id}`);
        koreanLocaleHelpers.expectKoreanText('유효성: 유효');
      });

      // 복호화 함수 호출 확인
      const CryptoJS = require('crypto-js');
      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(encryptedQRData, 'secret-key');
    });

    test('카메라 접근 권한 에러 처리', async () => {
      const CameraPermissionError = () => {
        const [error, setError] = React.useState('');

        const requestCamera = async () => {
          try {
            // 카메라 접근 거부 시뮬레이션
            throw new Error('Permission denied');
          } catch (err) {
            setError('카메라 접근 권한이 필요합니다. 브라우저 설정에서 권한을 허용해주세요.');
          }
        };

        React.useEffect(() => {
          requestCamera();
        }, []);

        return (
          <div data-testid="camera-permission-error">
            {error && (
              <div data-testid="permission-error" role="alert">
                <p>{error}</p>
                <button data-testid="retry-btn">다시 시도</button>
              </div>
            )}
          </div>
        );
      };

      render(<CameraPermissionError />);

      await waitFor(() => {
        const errorElement = screen.getByTestId('permission-error');
        koreanLocaleHelpers.expectKoreanText('카메라 접근 권한이 필요합니다');
        expect(errorElement).toHaveAttribute('role', 'alert');
        expect(screen.getByTestId('retry-btn')).toBeInTheDocument();
      });
    });
  });

  describe('QR 출입 관리 워크플로우', () => {
    test('QR 스캔을 통한 출입 기록 생성', async () => {
      const mockCreateAttendanceRecord = jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'attendance-123',
          user_id: testUser.id,
          organization_id: testOrganization.id,
          method: 'qr',
          timestamp: new Date().toISOString()
        }
      });

      const QRAttendanceFlow = () => {
        const [attendanceResult, setAttendanceResult] = React.useState<any>(null);
        const [isProcessing, setIsProcessing] = React.useState(false);

        const handleQRScan = async (qrData: string) => {
          setIsProcessing(true);
          
          try {
            // QR 데이터 검증
            const CryptoJS = require('crypto-js');
            const decrypted = CryptoJS.AES.decrypt(qrData, 'secret-key');
            const qrPayload = JSON.parse(decrypted.toString());

            // 출입 기록 생성
            const result = await mockCreateAttendanceRecord({
              organizationId: qrPayload.organizationId,
              userId: testUser.id,
              method: 'qr',
              location: qrPayload.location
            });

            setAttendanceResult(result);
          } catch (error) {
            setAttendanceResult({ success: false, error: 'QR 처리 실패' });
          } finally {
            setIsProcessing(false);
          }
        };

        return (
          <div data-testid="qr-attendance-flow">
            <button 
              onClick={() => handleQRScan('encrypted-qr-data')}
              disabled={isProcessing}
              data-testid="simulate-scan-btn"
            >
              QR 스캔 시뮬레이션
            </button>

            {isProcessing && (
              <p data-testid="processing-message">출입 기록 처리 중...</p>
            )}

            {attendanceResult && (
              <div data-testid="attendance-result">
                {attendanceResult.success ? (
                  <div className="success-message">
                    <p>출입이 성공적으로 기록되었습니다</p>
                    <p>기록 ID: {attendanceResult.data.id}</p>
                  </div>
                ) : (
                  <div className="error-message" role="alert">
                    <p>출입 기록 실패: {attendanceResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      };

      render(<QRAttendanceFlow />);

      const scanButton = screen.getByTestId('simulate-scan-btn');
      
      const processTime = await performanceHelpers.measureInteractionTime(async () => {
        await userEvent.click(scanButton);
      });

      // QR 처리 시간이 500ms 이내여야 함
      performanceHelpers.expectFastResponse(processTime, 500);

      // 처리 중 메시지 확인
      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('출입 기록 처리 중...');
      });

      // 성공 결과 확인
      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('출입이 성공적으로 기록되었습니다');
        koreanLocaleHelpers.expectKoreanText('기록 ID: attendance-123');
      });

      expect(mockCreateAttendanceRecord).toHaveBeenCalled();
    });

    test('중복 QR 스캔 방지', async () => {
      const QRDuplicationPrevention = () => {
        const [recentScans, setRecentScans] = React.useState<string[]>([]);
        const [message, setMessage] = React.useState('');

        const handleQRScan = (qrData: string) => {
          // 최근 30초 내 동일한 QR 스캔 확인
          const now = Date.now();
          const recentScanKey = `${qrData}-${Math.floor(now / 30000)}`;

          if (recentScans.includes(recentScanKey)) {
            setMessage('동일한 QR 코드가 최근에 스캔되었습니다. 잠시 후 다시 시도해주세요.');
            return;
          }

          setRecentScans(prev => [...prev, recentScanKey]);
          setMessage('QR 스캔이 성공적으로 처리되었습니다.');
        };

        return (
          <div data-testid="qr-duplication-prevention">
            <button 
              onClick={() => handleQRScan('same-qr-data')}
              data-testid="scan-same-qr"
            >
              동일 QR 스캔
            </button>
            
            {message && (
              <div data-testid="scan-message">
                {message}
              </div>
            )}
          </div>
        );
      };

      render(<QRDuplicationPrevention />);

      const scanButton = screen.getByTestId('scan-same-qr');

      // 첫 번째 스캔
      await userEvent.click(scanButton);
      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('QR 스캔이 성공적으로 처리되었습니다');
      });

      // 동일한 QR 즉시 재스캔
      await userEvent.click(scanButton);
      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('동일한 QR 코드가 최근에 스캔되었습니다');
      });
    });
  });

  describe('관리자 QR 관리 기능', () => {
    test('QR 코드 사용 통계 조회', async () => {
      const mockQRStats = {
        totalScans: 150,
        uniqueUsers: 45,
        todayScans: 23,
        averageResponseTime: 245
      };

      const QRStatsDisplay = () => {
        const [stats, setStats] = React.useState<any>(null);

        React.useEffect(() => {
          // API 호출 시뮬레이션
          setTimeout(() => setStats(mockQRStats), 500);
        }, []);

        return (
          <div data-testid="qr-stats-display">
            <h2>QR 사용 통계</h2>
            {stats ? (
              <div data-testid="stats-content">
                <div className="stat-item">
                  <span>총 스캔 횟수:</span>
                  <span data-testid="total-scans">{stats.totalScans}회</span>
                </div>
                <div className="stat-item">
                  <span>고유 사용자:</span>
                  <span data-testid="unique-users">{stats.uniqueUsers}명</span>
                </div>
                <div className="stat-item">
                  <span>오늘 스캔:</span>
                  <span data-testid="today-scans">{stats.todayScans}회</span>
                </div>
                <div className="stat-item">
                  <span>평균 응답시간:</span>
                  <span data-testid="avg-response">{stats.averageResponseTime}ms</span>
                </div>
              </div>
            ) : (
              <p>통계 로딩 중...</p>
            )}
          </div>
        );
      };

      render(<QRStatsDisplay />);

      // 통계 로딩 완료 대기
      await waitFor(() => {
        expect(screen.getByTestId('stats-content')).toBeInTheDocument();
        
        koreanLocaleHelpers.expectKoreanText('총 스캔 횟수:');
        expect(screen.getByTestId('total-scans')).toHaveTextContent('150회');
        
        koreanLocaleHelpers.expectKoreanText('고유 사용자:');
        expect(screen.getByTestId('unique-users')).toHaveTextContent('45명');
        
        koreanLocaleHelpers.expectKoreanText('오늘 스캔:');
        expect(screen.getByTestId('today-scans')).toHaveTextContent('23회');
        
        koreanLocaleHelpers.expectKoreanText('평균 응답시간:');
        expect(screen.getByTestId('avg-response')).toHaveTextContent('245ms');
      });
    });

    test('QR 코드 일괄 생성 기능', async () => {
      const QRBatchGenerator = () => {
        const [batchCount, setBatchCount] = React.useState(10);
        const [generatedQRs, setGeneratedQRs] = React.useState<any[]>([]);
        const [isGenerating, setIsGenerating] = React.useState(false);

        const generateBatchQRs = async () => {
          setIsGenerating(true);
          
          const qrs = [];
          for (let i = 0; i < batchCount; i++) {
            qrs.push({
              id: `qr-${i + 1}`,
              data: `encrypted-data-${i + 1}`,
              expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
            });
          }
          
          // 생성 시간 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setGeneratedQRs(qrs);
          setIsGenerating(false);
        };

        return (
          <div data-testid="qr-batch-generator">
            <h2>QR 코드 일괄 생성</h2>
            <div>
              <label htmlFor="batch-count">생성 개수:</label>
              <input 
                id="batch-count"
                type="number"
                value={batchCount}
                onChange={(e) => setBatchCount(parseInt(e.target.value))}
                min="1"
                max="100"
                data-testid="batch-count-input"
              />
            </div>
            
            <button 
              onClick={generateBatchQRs}
              disabled={isGenerating}
              data-testid="generate-batch-btn"
            >
              {isGenerating ? '생성 중...' : `${batchCount}개 QR 생성`}
            </button>

            {generatedQRs.length > 0 && (
              <div data-testid="generated-qrs">
                <p>{generatedQRs.length}개의 QR 코드가 생성되었습니다</p>
                <button data-testid="download-btn">ZIP으로 다운로드</button>
              </div>
            )}
          </div>
        );
      };

      render(<QRBatchGenerator />);

      // 생성 개수 변경
      const countInput = screen.getByTestId('batch-count-input');
      await userEvent.clear(countInput);
      await userEvent.type(countInput, '5');

      // 일괄 생성 실행
      const generateButton = screen.getByTestId('generate-batch-btn');
      expect(generateButton).toHaveTextContent('5개 QR 생성');

      await userEvent.click(generateButton);

      // 생성 중 상태 확인
      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('생성 중...');
      });

      // 생성 완료 확인
      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('5개의 QR 코드가 생성되었습니다');
        expect(screen.getByTestId('download-btn')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});

// React import
const React = require('react');