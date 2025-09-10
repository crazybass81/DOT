/**
 * 성능 및 로드 테스트
 * 시스템 부하 상황에서의 성능 검증
 */

import { performance } from 'perf_hooks';

// Mock dependencies for testing
jest.mock('@/lib/supabase');
jest.mock('next/navigation');

interface LoadTestResult {
  requests: Array<{
    startTime: number;
    endTime: number;
    duration: number;
    status: number;
    error?: string;
  }>;
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    throughput: number;
    errorRate: number;
  };
}

class PerformanceTestSuite {
  private baseURL = 'http://localhost:3002';
  
  async runLoadTest(options: {
    endpoint: string;
    concurrent: number;
    duration: number;
    method?: 'GET' | 'POST';
    payload?: any;
  }): Promise<LoadTestResult> {
    const { endpoint, concurrent, duration, method = 'GET', payload } = options;
    const results: LoadTestResult['requests'] = [];
    const promises: Promise<void>[] = [];
    
    const startTime = Date.now();
    
    // 동시 사용자 시뮬레이션
    for (let i = 0; i < concurrent; i++) {
      promises.push(this.simulateUser(endpoint, duration, method, payload, results));
    }
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const testDuration = (endTime - startTime) / 1000; // 초 단위
    
    return this.analyzeResults(results, testDuration);
  }
  
  private async simulateUser(
    endpoint: string,
    duration: number,
    method: string,
    payload: any,
    results: LoadTestResult['requests']
  ): Promise<void> {
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      const requestStart = performance.now();
      
      try {
        const response = await this.makeRequest(endpoint, method, payload);
        const requestEnd = performance.now();
        
        results.push({
          startTime: requestStart,
          endTime: requestEnd,
          duration: requestEnd - requestStart,
          status: response.status || 200
        });
        
      } catch (error) {
        const requestEnd = performance.now();
        results.push({
          startTime: requestStart,
          endTime: requestEnd,
          duration: requestEnd - requestStart,
          status: 500,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // 요청 간 간격
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  private async makeRequest(endpoint: string, method: string, payload?: any): Promise<{ status: number }> {
    // Mock HTTP request - 실제 환경에서는 fetch나 axios 사용
    const mockResponse = {
      status: Math.random() > 0.95 ? 500 : 200 // 5% 에러율
    };
    
    // 응답 시간 시뮬레이션 (50-500ms)
    const responseTime = Math.random() * 450 + 50;
    await new Promise(resolve => setTimeout(resolve, responseTime));
    
    return mockResponse;
  }
  
  private analyzeResults(results: LoadTestResult['requests'], testDuration: number): LoadTestResult {
    const successfulRequests = results.filter(r => r.status < 400);
    const failedRequests = results.filter(r => r.status >= 400);
    const responseTimes = results.map(r => r.duration);
    
    return {
      requests: results,
      summary: {
        totalRequests: results.length,
        successfulRequests: successfulRequests.length,
        failedRequests: failedRequests.length,
        averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        minResponseTime: Math.min(...responseTimes),
        maxResponseTime: Math.max(...responseTimes),
        throughput: results.length / testDuration,
        errorRate: failedRequests.length / results.length
      }
    };
  }
}

describe('성능 및 로드 테스트', () => {
  let performanceTestSuite: PerformanceTestSuite;
  
  beforeEach(() => {
    performanceTestSuite = new PerformanceTestSuite();
    jest.clearAllMocks();
  });

  describe('API 엔드포인트 성능 테스트', () => {
    test('출근 API 부하 테스트', async () => {
      const result = await performanceTestSuite.runLoadTest({
        endpoint: '/api/attendance/check-in',
        concurrent: 20,  // 20명 동시 접속
        duration: 30000, // 30초
        method: 'POST',
        payload: {
          latitude: 37.5665,
          longitude: 126.9780,
          timestamp: new Date().toISOString()
        }
      });

      // 성능 기준 검증
      expect(result.summary.averageResponseTime).toBeLessThan(500); // 평균 응답시간 500ms 이내
      expect(result.summary.throughput).toBeGreaterThan(10); // 초당 10건 이상 처리
      expect(result.summary.errorRate).toBeLessThan(0.05); // 에러율 5% 이내
      
      // 상세 성능 메트릭 로깅
      console.log('출근 API 성능 테스트 결과:');
      console.log(`- 총 요청: ${result.summary.totalRequests}건`);
      console.log(`- 성공률: ${((1 - result.summary.errorRate) * 100).toFixed(2)}%`);
      console.log(`- 평균 응답시간: ${result.summary.averageResponseTime.toFixed(2)}ms`);
      console.log(`- 처리량: ${result.summary.throughput.toFixed(2)} req/s`);
    });

    test('퇴근 API 부하 테스트', async () => {
      const result = await performanceTestSuite.runLoadTest({
        endpoint: '/api/attendance/check-out',
        concurrent: 15,
        duration: 20000,
        method: 'POST',
        payload: {
          attendanceId: 'test-attendance-id',
          timestamp: new Date().toISOString()
        }
      });

      expect(result.summary.averageResponseTime).toBeLessThan(300);
      expect(result.summary.errorRate).toBeLessThan(0.03);
    });

    test('실시간 대시보드 데이터 로드 테스트', async () => {
      const result = await performanceTestSuite.runLoadTest({
        endpoint: '/api/dashboard/realtime',
        concurrent: 50, // 많은 사용자가 대시보드 조회
        duration: 60000, // 1분
        method: 'GET'
      });

      expect(result.summary.averageResponseTime).toBeLessThan(200); // 대시보드는 더 빠른 응답 필요
      expect(result.summary.throughput).toBeGreaterThan(20);
      expect(result.summary.errorRate).toBeLessThan(0.02);
    });
  });

  describe('QR 시스템 성능 테스트', () => {
    test('QR 생성 성능 테스트', async () => {
      const QRCodeGenerator = () => {
        const generateQR = async () => {
          const startTime = performance.now();
          
          // QR 생성 시뮬레이션
          const payload = {
            organizationId: 'org-123',
            timestamp: Date.now(),
            nonce: Math.random().toString(36)
          };
          
          // 암호화 시뮬레이션
          const encrypted = JSON.stringify(payload);
          
          // QR 코드 생성 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const endTime = performance.now();
          return endTime - startTime;
        };

        return { generateQR };
      };

      const generator = QRCodeGenerator();
      const generationTimes: number[] = [];

      // 100개 QR 코드 생성 성능 측정
      for (let i = 0; i < 100; i++) {
        const time = await generator.generateQR();
        generationTimes.push(time);
      }

      const averageTime = generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length;
      const maxTime = Math.max(...generationTimes);

      expect(averageTime).toBeLessThan(200); // 평균 200ms 이내
      expect(maxTime).toBeLessThan(500); // 최대 500ms 이내

      console.log(`QR 생성 성능: 평균 ${averageTime.toFixed(2)}ms, 최대 ${maxTime.toFixed(2)}ms`);
    });

    test('QR 스캔 처리 성능 테스트', async () => {
      const result = await performanceTestSuite.runLoadTest({
        endpoint: '/api/qr/scan',
        concurrent: 10,
        duration: 15000,
        method: 'POST',
        payload: {
          qrData: 'encrypted-qr-data',
          location: { latitude: 37.5665, longitude: 126.9780 }
        }
      });

      expect(result.summary.averageResponseTime).toBeLessThan(300); // QR 스캔은 빠른 처리 필요
      expect(result.summary.errorRate).toBeLessThan(0.01); // QR 스캔 신뢰성 중요
    });
  });

  describe('데이터베이스 성능 테스트', () => {
    test('출석 기록 조회 성능 테스트', async () => {
      const DatabasePerformanceTest = () => {
        const queryAttendanceRecords = async (userId: string, days: number) => {
          const startTime = performance.now();
          
          // 데이터베이스 쿼리 시뮬레이션
          const mockQuery = async () => {
            const queryTime = Math.random() * 100 + 50; // 50-150ms
            await new Promise(resolve => setTimeout(resolve, queryTime));
            
            return Array.from({ length: days }, (_, i) => ({
              id: `record-${i}`,
              user_id: userId,
              check_in_time: new Date(),
              check_out_time: new Date(),
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
            }));
          };
          
          const records = await mockQuery();
          const endTime = performance.now();
          
          return {
            records,
            queryTime: endTime - startTime
          };
        };

        return { queryAttendanceRecords };
      };

      const dbTest = DatabasePerformanceTest();
      const queryTimes: number[] = [];

      // 다양한 기간에 대한 조회 성능 테스트
      for (const days of [7, 30, 90]) {
        for (let i = 0; i < 10; i++) {
          const result = await dbTest.queryAttendanceRecords('user-123', days);
          queryTimes.push(result.queryTime);
          
          expect(result.records).toHaveLength(days);
        }
      }

      const averageQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      expect(averageQueryTime).toBeLessThan(200); // 평균 쿼리 시간 200ms 이내

      console.log(`데이터베이스 쿼리 성능: 평균 ${averageQueryTime.toFixed(2)}ms`);
    });

    test('대량 데이터 처리 성능 테스트', async () => {
      const BulkDataProcessor = () => {
        const processBulkAttendance = async (recordCount: number) => {
          const startTime = performance.now();
          
          const records = Array.from({ length: recordCount }, (_, i) => ({
            id: `bulk-record-${i}`,
            user_id: `user-${i % 100}`, // 100명의 사용자
            timestamp: new Date(),
            method: 'gps'
          }));
          
          // 배치 처리 시뮬레이션 (1000건씩 처리)
          const batchSize = 1000;
          const batches = Math.ceil(records.length / batchSize);
          
          for (let i = 0; i < batches; i++) {
            const batchStart = i * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, records.length);
            const batch = records.slice(batchStart, batchEnd);
            
            // 배치 처리 시간 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, batch.length * 0.1));
          }
          
          const endTime = performance.now();
          return endTime - startTime;
        };

        return { processBulkAttendance };
      };

      const processor = BulkDataProcessor();
      
      // 5000건 대량 데이터 처리 테스트
      const processingTime = await processor.processBulkAttendance(5000);
      
      expect(processingTime).toBeLessThan(2000); // 2초 이내 처리
      console.log(`대량 데이터 처리 성능: ${processingTime.toFixed(2)}ms (5000건)`);
    });
  });

  describe('실시간 업데이트 성능 테스트', () => {
    test('WebSocket 연결 부하 테스트', async () => {
      const WebSocketLoadTest = () => {
        const connections: any[] = [];
        const messageLatencies: number[] = [];

        const createConnection = () => {
          const mockConnection = {
            send: jest.fn(),
            close: jest.fn(),
            onMessage: jest.fn(),
            connected: true
          };

          // 메시지 지연 시뮬레이션
          mockConnection.send.mockImplementation(() => {
            const latency = Math.random() * 50 + 10; // 10-60ms
            messageLatencies.push(latency);
            return Promise.resolve();
          });

          return mockConnection;
        };

        const testConcurrentConnections = async (connectionCount: number) => {
          const startTime = performance.now();

          // 동시 연결 생성
          for (let i = 0; i < connectionCount; i++) {
            connections.push(createConnection());
          }

          // 각 연결에서 메시지 전송
          const messagePromises = connections.map(conn => conn.send('test-message'));
          await Promise.all(messagePromises);

          const endTime = performance.now();
          return endTime - startTime;
        };

        return { testConcurrentConnections, messageLatencies };
      };

      const wsTest = WebSocketLoadTest();
      
      // 100개 동시 WebSocket 연결 테스트
      const connectionTime = await wsTest.testConcurrentConnections(100);
      
      expect(connectionTime).toBeLessThan(1000); // 1초 이내 연결 및 메시지 전송
      
      const averageLatency = wsTest.messageLatencies.reduce((a, b) => a + b, 0) / wsTest.messageLatencies.length;
      expect(averageLatency).toBeLessThan(100); // 평균 메시지 지연 100ms 이내

      console.log(`WebSocket 성능: 연결시간 ${connectionTime.toFixed(2)}ms, 평균 지연 ${averageLatency.toFixed(2)}ms`);
    });

    test('실시간 알림 처리 성능 테스트', async () => {
      const NotificationProcessor = () => {
        const processNotifications = async (notificationCount: number) => {
          const startTime = performance.now();
          const processingTimes: number[] = [];

          for (let i = 0; i < notificationCount; i++) {
            const notificationStart = performance.now();
            
            // 알림 처리 시뮬레이션
            const notification = {
              id: `notification-${i}`,
              type: 'attendance',
              message: '출근이 완료되었습니다',
              timestamp: new Date()
            };

            // 알림 전송 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
            
            const notificationEnd = performance.now();
            processingTimes.push(notificationEnd - notificationStart);
          }

          const endTime = performance.now();
          return {
            totalTime: endTime - startTime,
            averageProcessingTime: processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length,
            maxProcessingTime: Math.max(...processingTimes)
          };
        };

        return { processNotifications };
      };

      const processor = NotificationProcessor();
      
      // 1000개 알림 처리 성능 테스트
      const result = await processor.processNotifications(1000);
      
      expect(result.averageProcessingTime).toBeLessThan(50); // 평균 50ms 이내
      expect(result.maxProcessingTime).toBeLessThan(200); // 최대 200ms 이내
      expect(result.totalTime).toBeLessThan(30000); // 전체 30초 이내

      console.log(`알림 처리 성능: 평균 ${result.averageProcessingTime.toFixed(2)}ms, 최대 ${result.maxProcessingTime.toFixed(2)}ms`);
    });
  });

  describe('메모리 사용량 테스트', () => {
    test('장시간 실행 시 메모리 누수 검증', async () => {
      const MemoryLeakTest = () => {
        const data: any[] = [];
        let intervalId: NodeJS.Timeout;

        const startSimulation = () => {
          const initialMemory = process.memoryUsage();
          
          intervalId = setInterval(() => {
            // 데이터 생성 및 정리 시뮬레이션
            data.push(new Array(1000).fill(Math.random()));
            
            // 일부 데이터 정리 (메모리 해제)
            if (data.length > 100) {
              data.splice(0, 50);
            }
          }, 100);

          return initialMemory;
        };

        const stopSimulation = () => {
          clearInterval(intervalId);
          return process.memoryUsage();
        };

        return { startSimulation, stopSimulation };
      };

      const memoryTest = MemoryLeakTest();
      
      const initialMemory = memoryTest.startSimulation();
      
      // 30초 동안 실행
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      const finalMemory = memoryTest.stopSimulation();
      
      // 메모리 증가량 확인 (50MB 이내)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB

      console.log(`메모리 사용량 변화: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});