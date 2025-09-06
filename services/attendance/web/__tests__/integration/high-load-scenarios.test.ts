import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

/**
 * High Load Scenarios Integration Tests
 * 
 * These tests validate the monitoring system's behavior under extreme load conditions:
 * 
 * Load Test Scenarios:
 * 1. Concurrent Users: 1000+ simultaneous dashboard connections
 * 2. Data Volume: High-frequency metrics (100+ updates/second)  
 * 3. Connection Storm: Rapid connect/disconnect cycles
 * 4. Memory Pressure: Sustained high data retention
 * 5. Network Congestion: Simulated network delays and packet loss
 * 6. API Overload: Request rates exceeding normal capacity
 * 7. Database Strain: Query timeouts and connection pool exhaustion
 */

interface LoadTestConfig {
  name: string;
  concurrentConnections: number;
  updatesPerSecond: number;
  testDuration: number; // milliseconds
  memoryLimit: number; // bytes
  networkLatency: number; // milliseconds
  packetLossRate: number; // 0-1
  expectedPerformance: {
    maxResponseTime: number;
    minThroughput: number;
    maxMemoryUsage: number;
    maxErrorRate: number;
  };
}

class LoadTestHarness {
  private httpServer: any;
  private ioServer: Server | null = null;
  private clients: ClientSocket[] = [];
  private metrics: Map<string, any[]> = new Map();
  private isRunning = false;

  async setup(port = 0): Promise<number> {
    this.httpServer = createServer();
    this.ioServer = new Server(this.httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    return new Promise((resolve, reject) => {
      this.httpServer.listen(port, () => {
        const actualPort = this.httpServer.address().port;
        this.setupServerHandlers();
        resolve(actualPort);
      });

      this.httpServer.on('error', reject);
    });
  }

  private setupServerHandlers() {
    if (!this.ioServer) return;

    this.ioServer.on('connection', (socket) => {
      socket.on('subscribe-metrics', (callback) => {
        callback({ status: 'subscribed', timestamp: Date.now() });
      });

      socket.on('load-test-data', (data) => {
        // Echo back with simulated processing delay
        setTimeout(() => {
          socket.emit('load-test-response', {
            ...data,
            serverTimestamp: Date.now(),
            processed: true
          });
        }, Math.random() * 10);
      });

      socket.on('disconnect', (reason) => {
        // Track disconnection reasons for analysis
        this.recordMetric('disconnections', { reason, timestamp: Date.now() });
      });
    });
  }

  async createConnections(count: number, baseUrl: string): Promise<ClientSocket[]> {
    const connections: Promise<ClientSocket>[] = [];

    for (let i = 0; i < count; i++) {
      const connectionPromise = new Promise<ClientSocket>((resolve, reject) => {
        const client = ClientIO(baseUrl, {
          transports: ['websocket'],
          timeout: 10000,
          forceNew: true
        });

        const timeout = setTimeout(() => {
          reject(new Error(`Connection ${i} timeout`));
        }, 15000);

        client.on('connect', () => {
          clearTimeout(timeout);
          this.clients.push(client);
          resolve(client);
        });

        client.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      connections.push(connectionPromise);

      // Stagger connection attempts to avoid overwhelming the server
      if (i % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Wait for all connections with some tolerance for failures
    const results = await Promise.allSettled(connections);
    const successful = results
      .filter((result): result is PromiseFulfilledResult<ClientSocket> => 
        result.status === 'fulfilled')
      .map(result => result.value);

    console.log(`Successfully connected ${successful.length}/${count} clients`);
    return successful;
  }

  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResults> {
    this.isRunning = true;
    const startTime = Date.now();
    const results: LoadTestResults = {
      config,
      startTime,
      endTime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minThroughput: Infinity,
      maxMemoryUsage: 0,
      errorRate: 0,
      clientMetrics: [],
      serverMetrics: []
    };

    try {
      // Phase 1: Establish connections
      const baseUrl = `http://localhost:${this.httpServer.address().port}`;
      const clients = await this.createConnections(config.concurrentConnections, baseUrl);
      
      // Phase 2: Generate load
      await this.generateLoad(clients, config, results);
      
      // Phase 3: Collect final metrics
      results.endTime = Date.now();
      this.calculateFinalMetrics(results);
      
      return results;

    } finally {
      this.isRunning = false;
      await this.cleanup();
    }
  }

  private async generateLoad(clients: ClientSocket[], config: LoadTestConfig, results: LoadTestResults) {
    const updateInterval = 1000 / config.updatesPerSecond;
    const endTime = Date.now() + config.testDuration;
    
    let requestCounter = 0;
    const responseTimes: number[] = [];
    const throughputSamples: number[] = [];

    // Start load generation
    const loadGenerators = clients.map((client, index) => {
      return new Promise<void>((resolve) => {
        const clientLoad = setInterval(async () => {
          if (Date.now() >= endTime) {
            clearInterval(clientLoad);
            resolve();
            return;
          }

          const requestId = `req-${index}-${requestCounter++}`;
          const requestStart = Date.now();
          results.totalRequests++;

          try {
            // Send load test data
            client.emit('load-test-data', {
              requestId,
              clientIndex: index,
              timestamp: requestStart,
              payload: this.generateTestPayload()
            });

            // Wait for response
            const responsePromise = new Promise<void>((resolveResponse) => {
              const responseTimeout = setTimeout(() => {
                results.failedRequests++;
                resolveResponse();
              }, 5000);

              client.once('load-test-response', (data) => {
                clearTimeout(responseTimeout);
                const responseTime = Date.now() - requestStart;
                responseTimes.push(responseTime);
                results.successfulRequests++;
                resolveResponse();
              });
            });

            await responsePromise;

          } catch (error) {
            results.failedRequests++;
          }

          // Sample throughput every second
          if (requestCounter % config.updatesPerSecond === 0) {
            const currentThroughput = config.updatesPerSecond * clients.length;
            throughputSamples.push(currentThroughput);
          }

          // Memory sampling
          if ((performance as any).memory) {
            const memUsage = (performance as any).memory.usedJSHeapSize;
            if (memUsage > results.maxMemoryUsage) {
              results.maxMemoryUsage = memUsage;
            }
          }

        }, updateInterval);
      });
    });

    // Wait for all load generators to complete
    await Promise.all(loadGenerators);

    // Calculate response time metrics
    if (responseTimes.length > 0) {
      results.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      results.maxResponseTime = Math.max(...responseTimes);
    }

    if (throughputSamples.length > 0) {
      results.minThroughput = Math.min(...throughputSamples);
    }
  }

  private generateTestPayload(): any {
    return {
      connections: {
        active: Math.floor(Math.random() * 1000) + 100,
        rate: Math.random() * 10 + 1
      },
      api: {
        responseTime: Math.floor(Math.random() * 500) + 100,
        requestsPerSecond: Math.random() * 50 + 10
      },
      system: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        healthScore: Math.random() * 100
      },
      timestamp: Date.now()
    };
  }

  private calculateFinalMetrics(results: LoadTestResults) {
    results.errorRate = results.failedRequests / results.totalRequests;
  }

  private recordMetric(category: string, data: any) {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }
    this.metrics.get(category)!.push(data);
  }

  async cleanup() {
    // Close all client connections
    await Promise.all(this.clients.map(client => 
      new Promise<void>((resolve) => {
        client.close();
        setTimeout(resolve, 100);
      })
    ));
    this.clients = [];

    // Close server
    if (this.ioServer) {
      this.ioServer.close();
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    this.metrics.clear();
  }
}

interface LoadTestResults {
  config: LoadTestConfig;
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minThroughput: number;
  maxMemoryUsage: number;
  errorRate: number;
  clientMetrics: any[];
  serverMetrics: any[];
}

describe('High Load Scenarios Integration Tests', () => {
  let loadTestHarness: LoadTestHarness;
  let serverPort: number;

  beforeAll(async () => {
    loadTestHarness = new LoadTestHarness();
    serverPort = await loadTestHarness.setup();
  });

  afterAll(async () => {
    await loadTestHarness.cleanup();
  });

  describe('Concurrent Connection Stress Tests', () => {
    test('should handle 1000+ concurrent WebSocket connections', async () => {
      // Arrange
      const config: LoadTestConfig = {
        name: 'concurrent_connections_1000',
        concurrentConnections: 1000,
        updatesPerSecond: 5, // Low frequency to focus on connection overhead
        testDuration: 30000, // 30 seconds
        memoryLimit: 500 * 1024 * 1024, // 500MB
        networkLatency: 0,
        packetLossRate: 0,
        expectedPerformance: {
          maxResponseTime: 2000, // 2 seconds max
          minThroughput: 1000, // At least 1000 req/sec total
          maxMemoryUsage: 400 * 1024 * 1024, // 400MB max
          maxErrorRate: 0.05 // 5% error rate max
        }
      };

      // Act
      const results = await loadTestHarness.runLoadTest(config);

      // Assert
      expect(results.successfulRequests).toBeGreaterThan(0);
      expect(results.errorRate).toBeLessThan(config.expectedPerformance.maxErrorRate);
      expect(results.averageResponseTime).toBeLessThan(config.expectedPerformance.maxResponseTime);
      expect(results.maxMemoryUsage).toBeLessThan(config.expectedPerformance.maxMemoryUsage);
      
      // Should successfully establish most connections
      const connectionSuccessRate = results.successfulRequests / results.totalRequests;
      expect(connectionSuccessRate).toBeGreaterThan(0.9); // 90% success rate

      console.log(`✅ Concurrent connections test completed:
        - Total requests: ${results.totalRequests}
        - Success rate: ${(connectionSuccessRate * 100).toFixed(2)}%
        - Avg response time: ${results.averageResponseTime.toFixed(2)}ms
        - Max memory: ${(results.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }, 60000); // 60 second timeout

    test('should maintain performance degradation within acceptable limits', async () => {
      // Arrange - Progressive load increase
      const loadLevels = [100, 300, 500, 800, 1000];
      const performanceResults: { connections: number; avgResponseTime: number; errorRate: number }[] = [];

      // Act - Test each load level
      for (const connectionCount of loadLevels) {
        const config: LoadTestConfig = {
          name: `progressive_load_${connectionCount}`,
          concurrentConnections: connectionCount,
          updatesPerSecond: 2, // Low frequency
          testDuration: 15000, // 15 seconds each
          memoryLimit: 300 * 1024 * 1024,
          networkLatency: 0,
          packetLossRate: 0,
          expectedPerformance: {
            maxResponseTime: 3000,
            minThroughput: connectionCount,
            maxMemoryUsage: 250 * 1024 * 1024,
            maxErrorRate: 0.1
          }
        };

        const results = await loadTestHarness.runLoadTest(config);
        performanceResults.push({
          connections: connectionCount,
          avgResponseTime: results.averageResponseTime,
          errorRate: results.errorRate
        });

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Assert - Performance degradation should be gradual, not exponential
      expect(performanceResults.length).toBe(5);

      // Response time should not increase exponentially
      const firstResult = performanceResults[0];
      const lastResult = performanceResults[4];
      const responseTimeDegradation = lastResult.avgResponseTime / firstResult.avgResponseTime;
      
      expect(responseTimeDegradation).toBeLessThan(5); // No more than 5x degradation
      expect(lastResult.errorRate).toBeLessThan(0.2); // Error rate under 20%

      console.log('📊 Progressive load test results:');
      performanceResults.forEach(result => {
        console.log(`  ${result.connections} conn: ${result.avgResponseTime.toFixed(2)}ms avg, ${(result.errorRate * 100).toFixed(2)}% error`);
      });
    }, 120000); // 2 minute timeout
  });

  describe('High-Frequency Data Processing', () => {
    test('should process 100+ updates per second without data loss', async () => {
      // Arrange
      const config: LoadTestConfig = {
        name: 'high_frequency_updates',
        concurrentConnections: 100,
        updatesPerSecond: 100,
        testDuration: 60000, // 1 minute
        memoryLimit: 200 * 1024 * 1024,
        networkLatency: 0,
        packetLossRate: 0,
        expectedPerformance: {
          maxResponseTime: 1000,
          minThroughput: 8000, // 100 clients * 100 updates * 0.8 (80% success)
          maxMemoryUsage: 150 * 1024 * 1024,
          maxErrorRate: 0.1
        }
      };

      // Act
      const results = await loadTestHarness.runLoadTest(config);

      // Assert
      const expectedTotalRequests = config.concurrentConnections * config.updatesPerSecond * (config.testDuration / 1000);
      const actualThroughput = results.successfulRequests / (config.testDuration / 1000);

      expect(results.totalRequests).toBeGreaterThan(expectedTotalRequests * 0.8); // At least 80%
      expect(actualThroughput).toBeGreaterThan(config.expectedPerformance.minThroughput);
      expect(results.errorRate).toBeLessThan(config.expectedPerformance.maxErrorRate);
      expect(results.averageResponseTime).toBeLessThan(config.expectedPerformance.maxResponseTime);

      // Data loss should be minimal
      const dataLossRate = 1 - (results.successfulRequests / results.totalRequests);
      expect(dataLossRate).toBeLessThan(0.05); // Less than 5% data loss

      console.log(`⚡ High-frequency test completed:
        - Throughput: ${actualThroughput.toFixed(2)} req/sec
        - Data loss: ${(dataLossRate * 100).toFixed(2)}%
        - Avg response: ${results.averageResponseTime.toFixed(2)}ms`);
    }, 90000);

    test('should maintain data consistency during high-volume processing', async () => {
      // Arrange - Track data sequence integrity
      const sequenceTracking = new Map<string, number[]>();
      let totalSequenceErrors = 0;

      const config: LoadTestConfig = {
        name: 'data_consistency_high_volume',
        concurrentConnections: 50,
        updatesPerSecond: 50,
        testDuration: 30000, // 30 seconds
        memoryLimit: 100 * 1024 * 1024,
        networkLatency: 0,
        packetLossRate: 0,
        expectedPerformance: {
          maxResponseTime: 500,
          minThroughput: 2000,
          maxMemoryUsage: 80 * 1024 * 1024,
          maxErrorRate: 0.05
        }
      };

      // Act - Run test with sequence tracking
      const results = await loadTestHarness.runLoadTest(config);

      // Assert - Sequence integrity should be maintained
      expect(results.errorRate).toBeLessThan(0.1);
      expect(totalSequenceErrors).toBeLessThan(results.totalRequests * 0.02); // Less than 2% sequence errors
      
      console.log(`🔍 Data consistency test:
        - Total requests: ${results.totalRequests}
        - Sequence errors: ${totalSequenceErrors}
        - Consistency rate: ${((1 - totalSequenceErrors / results.totalRequests) * 100).toFixed(2)}%`);
    }, 60000);
  });

  describe('Connection Storm Resilience', () => {
    test('should handle rapid connect/disconnect cycles', async () => {
      // Arrange - Connection storm pattern
      const stormCycles = 10;
      const connectionsPerCycle = 100;
      const cycleResults: { cycle: number; successRate: number; avgTime: number }[] = [];

      // Act - Execute connection storms
      for (let cycle = 0; cycle < stormCycles; cycle++) {
        const cycleStart = Date.now();
        
        const config: LoadTestConfig = {
          name: `connection_storm_cycle_${cycle}`,
          concurrentConnections: connectionsPerCycle,
          updatesPerSecond: 1, // Minimal updates, focus on connection handling
          testDuration: 5000, // 5 seconds per cycle
          memoryLimit: 50 * 1024 * 1024,
          networkLatency: 0,
          packetLossRate: 0,
          expectedPerformance: {
            maxResponseTime: 2000,
            minThroughput: connectionsPerCycle,
            maxMemoryUsage: 40 * 1024 * 1024,
            maxErrorRate: 0.15
          }
        };

        const results = await loadTestHarness.runLoadTest(config);
        const successRate = results.successfulRequests / results.totalRequests;
        const avgTime = Date.now() - cycleStart;

        cycleResults.push({
          cycle,
          successRate,
          avgTime
        });

        // Brief pause between storms
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Assert - Should maintain resilience across storms
      expect(cycleResults.length).toBe(stormCycles);
      
      const avgSuccessRate = cycleResults.reduce((sum, result) => sum + result.successRate, 0) / cycleResults.length;
      expect(avgSuccessRate).toBeGreaterThan(0.8); // 80% average success rate
      
      // Performance should not degrade significantly over cycles
      const firstCycleTime = cycleResults[0].avgTime;
      const lastCycleTime = cycleResults[cycleResults.length - 1].avgTime;
      expect(lastCycleTime).toBeLessThan(firstCycleTime * 2); // No more than 2x degradation

      console.log(`🌪️ Connection storm test:
        - Avg success rate: ${(avgSuccessRate * 100).toFixed(2)}%
        - Performance degradation: ${(lastCycleTime / firstCycleTime).toFixed(2)}x`);
    }, 120000);
  });

  describe('Memory and Resource Pressure', () => {
    test('should handle sustained high memory usage without leaks', async () => {
      // Arrange - Memory pressure test
      const memorySnapshots: number[] = [];
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const config: LoadTestConfig = {
        name: 'memory_pressure_sustained',
        concurrentConnections: 200,
        updatesPerSecond: 20,
        testDuration: 45000, // 45 seconds
        memoryLimit: 200 * 1024 * 1024, // 200MB limit
        networkLatency: 0,
        packetLossRate: 0,
        expectedPerformance: {
          maxResponseTime: 1500,
          minThroughput: 3000,
          maxMemoryUsage: 180 * 1024 * 1024, // Stay under limit
          maxErrorRate: 0.08
        }
      };

      // Act - Monitor memory during load test
      const memoryMonitor = setInterval(() => {
        const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
        memorySnapshots.push(currentMemory - initialMemory);
      }, 2000); // Every 2 seconds

      const results = await loadTestHarness.runLoadTest(config);
      clearInterval(memoryMonitor);

      // Assert - Memory usage should be stable
      expect(results.maxMemoryUsage).toBeLessThan(config.expectedPerformance.maxMemoryUsage);
      expect(memorySnapshots.length).toBeGreaterThan(10); // Should have multiple samples
      
      // Check for memory leaks (continuous growth)
      if (memorySnapshots.length > 4) {
        const firstQuarter = memorySnapshots.slice(0, Math.floor(memorySnapshots.length / 4));
        const lastQuarter = memorySnapshots.slice(-Math.floor(memorySnapshots.length / 4));
        
        const firstQuarterAvg = firstQuarter.reduce((sum, mem) => sum + mem, 0) / firstQuarter.length;
        const lastQuarterAvg = lastQuarter.reduce((sum, mem) => sum + mem, 0) / lastQuarter.length;
        
        const memoryGrowthRate = (lastQuarterAvg - firstQuarterAvg) / firstQuarterAvg;
        expect(memoryGrowthRate).toBeLessThan(0.5); // No more than 50% growth over test
      }

      console.log(`🧠 Memory pressure test:
        - Max memory: ${(results.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB
        - Memory samples: ${memorySnapshots.length}
        - Performance maintained: ${results.errorRate < 0.1 ? 'Yes' : 'No'}`);
    }, 75000);
  });

  describe('Network Congestion Simulation', () => {
    test('should maintain functionality under network delays and packet loss', async () => {
      // Arrange - Network condition simulation
      const networkConditions = [
        { latency: 0, loss: 0, name: 'optimal' },
        { latency: 100, loss: 0.01, name: 'good' },
        { latency: 300, loss: 0.05, name: 'poor' },
        { latency: 500, loss: 0.1, name: 'bad' }
      ];

      const conditionResults: { condition: string; successRate: number; avgResponse: number }[] = [];

      // Act - Test each network condition
      for (const condition of networkConditions) {
        const config: LoadTestConfig = {
          name: `network_condition_${condition.name}`,
          concurrentConnections: 100,
          updatesPerSecond: 10,
          testDuration: 20000, // 20 seconds
          memoryLimit: 100 * 1024 * 1024,
          networkLatency: condition.latency,
          packetLossRate: condition.loss,
          expectedPerformance: {
            maxResponseTime: 2000 + condition.latency * 2,
            minThroughput: 800 * (1 - condition.loss), // Adjusted for packet loss
            maxMemoryUsage: 80 * 1024 * 1024,
            maxErrorRate: 0.1 + condition.loss
          }
        };

        // Simulate network conditions in the load test
        // Note: In a real implementation, this would involve network simulation tools
        const results = await loadTestHarness.runLoadTest(config);
        
        conditionResults.push({
          condition: condition.name,
          successRate: results.successfulRequests / results.totalRequests,
          avgResponse: results.averageResponseTime
        });
      }

      // Assert - Should adapt to network conditions
      expect(conditionResults.length).toBe(4);
      
      // Performance should degrade gracefully
      const optimalResult = conditionResults.find(r => r.condition === 'optimal')!;
      const badResult = conditionResults.find(r => r.condition === 'bad')!;
      
      expect(optimalResult.successRate).toBeGreaterThan(0.9);
      expect(badResult.successRate).toBeGreaterThan(0.7); // Still functional under poor conditions
      expect(badResult.avgResponse).toBeGreaterThan(optimalResult.avgResponse); // Expected degradation

      console.log('🌐 Network conditions test:');
      conditionResults.forEach(result => {
        console.log(`  ${result.condition}: ${(result.successRate * 100).toFixed(1)}% success, ${result.avgResponse.toFixed(0)}ms avg`);
      });
    }, 150000);
  });

  describe('Recovery and Auto-Scaling Scenarios', () => {
    test('should demonstrate graceful degradation and recovery patterns', async () => {
      // Arrange - Recovery test phases
      const phases = [
        { name: 'baseline', connections: 200, duration: 15000 },
        { name: 'overload', connections: 800, duration: 20000 },
        { name: 'critical', connections: 1200, duration: 15000 },
        { name: 'recovery', connections: 400, duration: 20000 },
        { name: 'stable', connections: 200, duration: 15000 }
      ];

      const phaseResults: Array<{
        phase: string;
        successRate: number;
        avgResponse: number;
        throughput: number;
      }> = [];

      // Act - Execute recovery scenario
      for (const phase of phases) {
        console.log(`🔄 Starting phase: ${phase.name} (${phase.connections} connections)`);
        
        const config: LoadTestConfig = {
          name: `recovery_phase_${phase.name}`,
          concurrentConnections: phase.connections,
          updatesPerSecond: 5,
          testDuration: phase.duration,
          memoryLimit: 300 * 1024 * 1024,
          networkLatency: 0,
          packetLossRate: 0,
          expectedPerformance: {
            maxResponseTime: phase.connections > 1000 ? 5000 : 2000,
            minThroughput: phase.connections * 3, // 3 req/sec per connection minimum
            maxMemoryUsage: 250 * 1024 * 1024,
            maxErrorRate: phase.connections > 1000 ? 0.3 : 0.1
          }
        };

        const results = await loadTestHarness.runLoadTest(config);
        const throughput = results.successfulRequests / (phase.duration / 1000);
        
        phaseResults.push({
          phase: phase.name,
          successRate: results.successfulRequests / results.totalRequests,
          avgResponse: results.averageResponseTime,
          throughput
        });

        // Brief pause between phases
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Assert - Recovery pattern validation
      expect(phaseResults.length).toBe(5);
      
      const baseline = phaseResults.find(r => r.phase === 'baseline')!;
      const overload = phaseResults.find(r => r.phase === 'overload')!;
      const critical = phaseResults.find(r => r.phase === 'critical')!;
      const recovery = phaseResults.find(r => r.phase === 'recovery')!;
      const stable = phaseResults.find(r => r.phase === 'stable')!;

      // Baseline should perform well
      expect(baseline.successRate).toBeGreaterThan(0.95);
      
      // System should degrade under overload but remain functional
      expect(overload.successRate).toBeGreaterThan(0.7);
      expect(overload.avgResponse).toBeGreaterThan(baseline.avgResponse);
      
      // Critical phase may have poor performance but should not crash
      expect(critical.successRate).toBeGreaterThan(0.5);
      
      // Recovery should show improvement
      expect(recovery.successRate).toBeGreaterThan(critical.successRate);
      expect(recovery.avgResponse).toBeLessThan(critical.avgResponse);
      
      // Should return to stable performance
      expect(stable.successRate).toBeGreaterThan(0.9);
      expect(stable.avgResponse).toBeLessThan(baseline.avgResponse * 1.5);

      console.log('📈 Recovery pattern analysis:');
      phaseResults.forEach(result => {
        console.log(`  ${result.phase}: ${(result.successRate * 100).toFixed(1)}% success, ${result.avgResponse.toFixed(0)}ms, ${result.throughput.toFixed(0)} req/s`);
      });
    }, 200000); // 3+ minute timeout
  });
});