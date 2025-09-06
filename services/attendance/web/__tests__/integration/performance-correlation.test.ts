import { jest } from '@jest/globals';
import { PerformanceCollector } from '@/src/lib/metrics/performance-collector';
import { CircularBuffer } from '@/src/lib/metrics/circular-buffer';

/**
 * Performance Correlation Integration Tests
 * 
 * These tests validate the correlation between different performance metrics
 * and how load on one system affects others:
 * 
 * Key correlation patterns tested:
 * - Connection load → API performance impact
 * - API performance → System health degradation  
 * - System resource usage → Connection handling capacity
 * - Memory pressure → Response time correlation
 * - Database load → Overall system performance
 */

interface PerformanceSnapshot {
  timestamp: number;
  connections: {
    active: number;
    rate: number;
    setupTime: number;
    rejectedCount: number;
  };
  api: {
    responseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    pendingRequests: number;
  };
  system: {
    cpu: number;
    memory: number;
    disk: number;
    networkIO: number;
    healthScore: number;
  };
  database: {
    connections: number;
    queryTime: number;
    lockWaitTime: number;
    cacheHitRate: number;
  };
}

class PerformanceCorrelationEngine {
  private snapshots: CircularBuffer<PerformanceSnapshot>;
  private correlations: Map<string, number> = new Map();
  private thresholds: Map<string, number> = new Map();

  constructor(historySize = 1000) {
    this.snapshots = new CircularBuffer(historySize);
    this.initializeThresholds();
  }

  private initializeThresholds() {
    // Performance thresholds for correlation detection
    this.thresholds.set('connection_api_correlation', 0.7);
    this.thresholds.set('memory_response_correlation', 0.6);
    this.thresholds.set('db_overall_correlation', 0.8);
    this.thresholds.set('cpu_connection_correlation', 0.5);
  }

  addSnapshot(snapshot: PerformanceSnapshot) {
    this.snapshots.push(snapshot);
    this.updateCorrelations();
  }

  private updateCorrelations() {
    if (this.snapshots.length < 10) return; // Need minimum data points

    const data = this.snapshots.toArray();
    
    // Calculate various correlations
    this.correlations.set('connection_to_api', 
      this.calculateCorrelation(
        data.map(d => d.connections.active),
        data.map(d => d.api.responseTime)
      )
    );

    this.correlations.set('memory_to_response', 
      this.calculateCorrelation(
        data.map(d => d.system.memory),
        data.map(d => d.api.responseTime)
      )
    );

    this.correlations.set('db_to_health', 
      this.calculateCorrelation(
        data.map(d => d.database.queryTime),
        data.map(d => d.system.healthScore)
      )
    );

    this.correlations.set('cpu_to_connections', 
      this.calculateCorrelation(
        data.map(d => d.system.cpu),
        data.map(d => d.connections.rejectedCount)
      )
    );
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  getCorrelation(type: string): number {
    return this.correlations.get(type) || 0;
  }

  detectPerformanceDegradation(): boolean {
    const connectionApiCorr = Math.abs(this.getCorrelation('connection_to_api'));
    const memoryResponseCorr = Math.abs(this.getCorrelation('memory_to_response'));
    
    return connectionApiCorr > 0.7 || memoryResponseCorr > 0.6;
  }

  predictPerformanceIssue(currentSnapshot: PerformanceSnapshot): {
    predicted: boolean;
    confidence: number;
    type: string;
    estimatedImpact: string;
  } {
    const connectionApiCorr = this.getCorrelation('connection_to_api');
    const memoryCorr = this.getCorrelation('memory_to_response');
    
    // Prediction based on current state and historical correlations
    if (currentSnapshot.connections.active > 1000 && connectionApiCorr > 0.6) {
      return {
        predicted: true,
        confidence: connectionApiCorr,
        type: 'api_slowdown_due_to_connections',
        estimatedImpact: 'high'
      };
    }

    if (currentSnapshot.system.memory > 85 && memoryCorr > 0.5) {
      return {
        predicted: true,
        confidence: memoryCorr,
        type: 'response_degradation_due_to_memory',
        estimatedImpact: 'medium'
      };
    }

    return {
      predicted: false,
      confidence: 0,
      type: 'none',
      estimatedImpact: 'low'
    };
  }

  reset() {
    this.snapshots.clear();
    this.correlations.clear();
  }
}

describe('Performance Correlation Integration', () => {
  let correlationEngine: PerformanceCorrelationEngine;
  let performanceCollector: PerformanceCollector;

  beforeEach(() => {
    correlationEngine = new PerformanceCorrelationEngine();
    performanceCollector = new PerformanceCollector();
    jest.clearAllMocks();
  });

  afterEach(() => {
    correlationEngine.reset();
  });

  describe('Connection Load to API Performance Correlation', () => {
    test('should detect correlation between increasing connections and API response time', async () => {
      // Arrange - Simulate increasing connection load
      const loadScenarios = [
        { connections: 100, expectedResponseTime: 150 },
        { connections: 300, expectedResponseTime: 200 },
        { connections: 500, expectedResponseTime: 280 },
        { connections: 800, expectedResponseTime: 400 },
        { connections: 1200, expectedResponseTime: 650 },
        { connections: 1500, expectedResponseTime: 900 }
      ];

      // Act - Generate performance snapshots showing correlation
      for (const scenario of loadScenarios) {
        const snapshot: PerformanceSnapshot = {
          timestamp: Date.now(),
          connections: {
            active: scenario.connections,
            rate: scenario.connections / 100,
            setupTime: 50 + (scenario.connections / 20),
            rejectedCount: Math.max(0, scenario.connections - 1000)
          },
          api: {
            responseTime: scenario.expectedResponseTime,
            requestsPerSecond: Math.max(10, 50 - (scenario.connections / 50)),
            errorRate: Math.min(0.1, (scenario.connections - 500) / 5000),
            pendingRequests: scenario.connections / 10
          },
          system: {
            cpu: 30 + (scenario.connections / 20),
            memory: 40 + (scenario.connections / 30),
            disk: 20,
            networkIO: scenario.connections / 5,
            healthScore: Math.max(50, 100 - (scenario.connections / 20))
          },
          database: {
            connections: Math.min(100, scenario.connections / 10),
            queryTime: 10 + (scenario.connections / 100),
            lockWaitTime: (scenario.connections / 200),
            cacheHitRate: Math.max(0.5, 0.95 - (scenario.connections / 5000))
          }
        };

        correlationEngine.addSnapshot(snapshot);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for realistic timing
      }

      // Assert - Should detect strong positive correlation
      const correlation = correlationEngine.getCorrelation('connection_to_api');
      expect(correlation).toBeGreaterThan(0.7); // Strong positive correlation
      expect(correlationEngine.detectPerformanceDegradation()).toBe(true);
    });

    test('should identify connection bottleneck impact on API throughput', async () => {
      // Arrange - Connection bottleneck scenario
      const bottleneckData = [
        // Normal operation
        { active: 200, apiRPS: 45, responseTime: 180 },
        { active: 400, apiRPS: 42, responseTime: 220 },
        { active: 600, apiRPS: 38, responseTime: 280 },
        // Approaching bottleneck
        { active: 900, apiRPS: 30, responseTime: 450 },
        { active: 1100, apiRPS: 22, responseTime: 650 },
        // Bottleneck hit
        { active: 1300, apiRPS: 15, responseTime: 1100 },
        { active: 1500, apiRPS: 12, responseTime: 1400 }
      ];

      // Act - Process bottleneck scenario
      for (const data of bottleneckData) {
        const snapshot: PerformanceSnapshot = {
          timestamp: Date.now(),
          connections: {
            active: data.active,
            rate: data.active / 100,
            setupTime: data.active > 1000 ? 200 : 50,
            rejectedCount: Math.max(0, data.active - 1200)
          },
          api: {
            responseTime: data.responseTime,
            requestsPerSecond: data.apiRPS,
            errorRate: data.active > 1000 ? 0.05 : 0.01,
            pendingRequests: data.active / 8
          },
          system: {
            cpu: 20 + (data.active / 15),
            memory: 30 + (data.active / 20),
            disk: 25,
            networkIO: data.active / 3,
            healthScore: Math.max(40, 100 - (data.active / 15))
          },
          database: {
            connections: Math.min(150, data.active / 8),
            queryTime: 5 + (data.active / 80),
            lockWaitTime: data.active > 1000 ? data.active / 500 : 0,
            cacheHitRate: Math.max(0.4, 0.95 - (data.active / 4000))
          }
        };

        correlationEngine.addSnapshot(snapshot);
      }

      // Assert - Should identify bottleneck pattern
      const throughputCorrelation = correlationEngine.getCorrelation('connection_to_api');
      expect(Math.abs(throughputCorrelation)).toBeGreaterThan(0.8); // Very strong correlation
      
      // Should predict performance issues at high load
      const highLoadSnapshot = bottleneckData[bottleneckData.length - 1];
      const prediction = correlationEngine.predictPerformanceIssue({
        timestamp: Date.now(),
        connections: { active: highLoadSnapshot.active, rate: 15, setupTime: 200, rejectedCount: 300 },
        api: { responseTime: highLoadSnapshot.responseTime, requestsPerSecond: highLoadSnapshot.apiRPS, errorRate: 0.08, pendingRequests: 180 },
        system: { cpu: 85, memory: 90, disk: 45, networkIO: 500, healthScore: 45 },
        database: { connections: 150, queryTime: 25, lockWaitTime: 3, cacheHitRate: 0.6 }
      });

      expect(prediction.predicted).toBe(true);
      expect(prediction.confidence).toBeGreaterThan(0.6);
      expect(prediction.estimatedImpact).toBe('high');
    });
  });

  describe('Memory Pressure to Response Time Correlation', () => {
    test('should detect memory pressure impact on API response times', async () => {
      // Arrange - Memory pressure scenario
      const memoryScenarios = [
        { memory: 40, responseTime: 150, gcPauses: 1 },
        { memory: 55, responseTime: 180, gcPauses: 3 },
        { memory: 70, responseTime: 250, gcPauses: 6 },
        { memory: 80, responseTime: 400, gcPauses: 12 },
        { memory: 90, responseTime: 700, gcPauses: 25 },
        { memory: 95, responseTime: 1200, gcPauses: 45 }
      ];

      // Act - Generate memory pressure data
      memoryScenarios.forEach(scenario => {
        const snapshot: PerformanceSnapshot = {
          timestamp: Date.now(),
          connections: {
            active: 300,
            rate: 3,
            setupTime: 50 + (scenario.memory * 2),
            rejectedCount: scenario.memory > 90 ? 10 : 0
          },
          api: {
            responseTime: scenario.responseTime,
            requestsPerSecond: Math.max(5, 40 - (scenario.memory / 5)),
            errorRate: scenario.memory > 85 ? 0.05 : 0.01,
            pendingRequests: scenario.responseTime / 10
          },
          system: {
            cpu: 40 + (scenario.memory / 3), // CPU correlates with memory pressure
            memory: scenario.memory,
            disk: 30,
            networkIO: 150,
            healthScore: Math.max(30, 120 - scenario.memory)
          },
          database: {
            connections: 50,
            queryTime: 8 + (scenario.memory / 10), // Slower queries under memory pressure
            lockWaitTime: scenario.memory > 80 ? 2 : 0.5,
            cacheHitRate: Math.max(0.3, 1 - (scenario.memory / 120))
          }
        };

        correlationEngine.addSnapshot(snapshot);
      });

      // Assert - Should detect memory-response time correlation
      const memoryCorrelation = correlationEngine.getCorrelation('memory_to_response');
      expect(memoryCorrelation).toBeGreaterThan(0.6); // Strong positive correlation
      
      // Should predict issues at high memory usage
      const prediction = correlationEngine.predictPerformanceIssue({
        timestamp: Date.now(),
        connections: { active: 300, rate: 3, setupTime: 250, rejectedCount: 15 },
        api: { responseTime: 1000, requestsPerSecond: 8, errorRate: 0.08, pendingRequests: 100 },
        system: { cpu: 70, memory: 92, disk: 30, networkIO: 150, healthScore: 35 },
        database: { connections: 50, queryTime: 18, lockWaitTime: 3, cacheHitRate: 0.4 }
      });

      expect(prediction.predicted).toBe(true);
      expect(prediction.type).toBe('response_degradation_due_to_memory');
    });

    test('should identify garbage collection impact on system performance', async () => {
      // Arrange - GC impact simulation over time
      const gcScenarios = Array.from({ length: 20 }, (_, i) => {
        const memoryPressure = 60 + (i * 2); // Increasing memory from 60% to 98%
        const gcFrequency = Math.pow(i / 5, 2); // Exponentially increasing GC
        const gcPauseTime = 50 + (i * 15); // Increasing pause times
        
        return {
          timestamp: Date.now() + (i * 30000), // 30 second intervals
          memory: memoryPressure,
          gcFrequency,
          gcPauseTime,
          responseTime: 150 + (gcFrequency * gcPauseTime / 10)
        };
      });

      // Act - Process GC scenario data
      gcScenarios.forEach(scenario => {
        const snapshot: PerformanceSnapshot = {
          timestamp: scenario.timestamp,
          connections: {
            active: 400,
            rate: Math.max(1, 5 - (scenario.gcFrequency / 10)),
            setupTime: 50 + scenario.gcPauseTime,
            rejectedCount: scenario.memory > 90 ? Math.floor(scenario.gcFrequency) : 0
          },
          api: {
            responseTime: scenario.responseTime,
            requestsPerSecond: Math.max(1, 30 - scenario.gcFrequency),
            errorRate: Math.min(0.2, scenario.gcFrequency / 100),
            pendingRequests: scenario.gcFrequency * 5
          },
          system: {
            cpu: 30 + scenario.gcFrequency * 3, // CPU spikes during GC
            memory: scenario.memory,
            disk: 25,
            networkIO: Math.max(50, 200 - scenario.gcFrequency * 5),
            healthScore: Math.max(20, 100 - scenario.memory - scenario.gcFrequency)
          },
          database: {
            connections: 60,
            queryTime: 10 + (scenario.gcPauseTime / 20),
            lockWaitTime: scenario.gcFrequency / 5,
            cacheHitRate: Math.max(0.2, 0.9 - (scenario.memory / 200))
          }
        };

        correlationEngine.addSnapshot(snapshot);
      });

      // Assert - Should show degradation pattern
      const correlation = correlationEngine.getCorrelation('memory_to_response');
      expect(correlation).toBeGreaterThan(0.7);
      
      // Should detect performance degradation
      expect(correlationEngine.detectPerformanceDegradation()).toBe(true);
    });
  });

  describe('Database Performance Impact on Overall System', () => {
    test('should correlate database query time with overall system health', async () => {
      // Arrange - Database degradation scenario
      const dbScenarios = [
        { queryTime: 5, lockWait: 0.1, cacheHit: 0.95, healthScore: 95 },
        { queryTime: 12, lockWait: 0.5, cacheHit: 0.88, healthScore: 88 },
        { queryTime: 25, lockWait: 1.2, cacheHit: 0.75, healthScore: 75 },
        { queryTime: 45, lockWait: 3.0, cacheHit: 0.60, healthScore: 60 },
        { queryTime: 80, lockWait: 6.5, cacheHit: 0.45, healthScore: 45 },
        { queryTime: 150, lockWait: 12.0, cacheHit: 0.25, healthScore: 25 }
      ];

      // Act - Process database degradation
      dbScenarios.forEach(scenario => {
        const snapshot: PerformanceSnapshot = {
          timestamp: Date.now(),
          connections: {
            active: 500,
            rate: Math.max(1, 5 - (scenario.queryTime / 50)),
            setupTime: 50 + (scenario.queryTime * 2),
            rejectedCount: scenario.queryTime > 50 ? Math.floor(scenario.queryTime / 10) : 0
          },
          api: {
            responseTime: 100 + (scenario.queryTime * 8), // API depends on DB
            requestsPerSecond: Math.max(5, 40 - (scenario.queryTime / 5)),
            errorRate: Math.min(0.15, scenario.queryTime / 1000),
            pendingRequests: scenario.queryTime * 2
          },
          system: {
            cpu: 40 + (scenario.lockWait * 5), // CPU increases with lock waits
            memory: 50 + (scenario.queryTime / 5), // Memory pressure from query queues
            disk: 30 + (scenario.queryTime / 10), // Disk IO from queries
            networkIO: Math.max(50, 200 - scenario.queryTime),
            healthScore: scenario.healthScore
          },
          database: {
            connections: Math.min(100, 30 + scenario.queryTime),
            queryTime: scenario.queryTime,
            lockWaitTime: scenario.lockWait,
            cacheHitRate: scenario.cacheHit
          }
        };

        correlationEngine.addSnapshot(snapshot);
      });

      // Assert - Should show strong DB-health correlation
      const dbHealthCorrelation = correlationEngine.getCorrelation('db_to_health');
      expect(Math.abs(dbHealthCorrelation)).toBeGreaterThan(0.8); // Very strong correlation
      
      // Should detect degradation
      expect(correlationEngine.detectPerformanceDegradation()).toBe(true);
    });

    test('should predict system-wide impact from database connection pool exhaustion', async () => {
      // Arrange - Connection pool exhaustion scenario
      const poolExhaustionStages = [
        { poolUsage: 0.3, queryTime: 8, connectionRejects: 0 },
        { poolUsage: 0.5, queryTime: 12, connectionRejects: 0 },
        { poolUsage: 0.7, queryTime: 18, connectionRejects: 2 },
        { poolUsage: 0.85, queryTime: 35, connectionRejects: 8 },
        { poolUsage: 0.95, queryTime: 80, connectionRejects: 25 },
        { poolUsage: 1.0, queryTime: 200, connectionRejects: 50 }
      ];

      let systemFailurePredicted = false;

      // Act - Process pool exhaustion stages
      poolExhaustionStages.forEach((stage, index) => {
        const snapshot: PerformanceSnapshot = {
          timestamp: Date.now() + (index * 60000), // 1 minute intervals
          connections: {
            active: 600,
            rate: Math.max(1, 6 - (stage.poolUsage * 5)),
            setupTime: 50 + (stage.queryTime * 3),
            rejectedCount: stage.connectionRejects * 2 // API rejects due to DB issues
          },
          api: {
            responseTime: 150 + (stage.queryTime * 10),
            requestsPerSecond: Math.max(1, 35 - (stage.poolUsage * 30)),
            errorRate: Math.min(0.3, stage.poolUsage / 3),
            pendingRequests: stage.queryTime * 3
          },
          system: {
            cpu: 35 + (stage.poolUsage * 40), // High CPU due to connection waits
            memory: 45 + (stage.poolUsage * 30),
            disk: 20 + (stage.queryTime / 5),
            networkIO: Math.max(30, 180 - (stage.poolUsage * 100)),
            healthScore: Math.max(10, 100 - (stage.poolUsage * 80))
          },
          database: {
            connections: Math.floor(100 * stage.poolUsage),
            queryTime: stage.queryTime,
            lockWaitTime: stage.poolUsage * 5,
            cacheHitRate: Math.max(0.1, 0.9 - (stage.poolUsage * 0.7))
          }
        };

        correlationEngine.addSnapshot(snapshot);

        // Check for system failure prediction
        const prediction = correlationEngine.predictPerformanceIssue(snapshot);
        if (prediction.predicted && prediction.estimatedImpact === 'high') {
          systemFailurePredicted = true;
        }
      });

      // Assert - Should predict system-wide failure
      expect(systemFailurePredicted).toBe(true);
      
      // Should detect strong correlations
      const dbHealthCorr = Math.abs(correlationEngine.getCorrelation('db_to_health'));
      expect(dbHealthCorr).toBeGreaterThan(0.85);
    });
  });

  describe('Cross-System Performance Cascading Effects', () => {
    test('should detect cascading performance failure across all systems', async () => {
      // Arrange - Cascading failure starting from database
      const cascadeStages = [
        // Stage 1: Database starts degrading
        {
          stage: 'db_degradation',
          db: { queryTime: 50, lockWait: 2, cacheHit: 0.7 },
          api: { responseTime: 200, rps: 25, errorRate: 0.02 },
          connections: { active: 800, rejected: 5 },
          system: { cpu: 45, memory: 55, health: 80 }
        },
        // Stage 2: API performance affected
        {
          stage: 'api_impact',
          db: { queryTime: 120, lockWait: 5, cacheHit: 0.5 },
          api: { responseTime: 600, rps: 18, errorRate: 0.08 },
          connections: { active: 750, rejected: 25 },
          system: { cpu: 65, memory: 70, health: 65 }
        },
        // Stage 3: Connection handling degraded
        {
          stage: 'connection_impact',
          db: { queryTime: 250, lockWait: 12, cacheHit: 0.3 },
          api: { responseTime: 1200, rps: 8, errorRate: 0.18 },
          connections: { active: 600, rejected: 80 },
          system: { cpu: 85, memory: 85, health: 40 }
        },
        // Stage 4: System-wide failure
        {
          stage: 'system_failure',
          db: { queryTime: 500, lockWait: 30, cacheHit: 0.1 },
          api: { responseTime: 3000, rps: 2, errorRate: 0.35 },
          connections: { active: 200, rejected: 200 },
          system: { cpu: 95, memory: 95, health: 15 }
        }
      ];

      const correlationSnapshots: string[] = [];

      // Act - Process cascading failure
      cascadeStages.forEach((stage, index) => {
        const snapshot: PerformanceSnapshot = {
          timestamp: Date.now() + (index * 120000), // 2 minute intervals
          connections: {
            active: stage.connections.active,
            rate: Math.max(0.5, 5 - index),
            setupTime: 50 + (index * 100),
            rejectedCount: stage.connections.rejected
          },
          api: {
            responseTime: stage.api.responseTime,
            requestsPerSecond: stage.api.rps,
            errorRate: stage.api.errorRate,
            pendingRequests: stage.api.responseTime / 50
          },
          system: {
            cpu: stage.system.cpu,
            memory: stage.system.memory,
            disk: 30 + (index * 10),
            networkIO: Math.max(20, 200 - (index * 50)),
            healthScore: stage.system.health
          },
          database: {
            connections: Math.min(100, 20 + (index * 25)),
            queryTime: stage.db.queryTime,
            lockWaitTime: stage.db.lockWait,
            cacheHitRate: stage.db.cacheHit
          }
        };

        correlationEngine.addSnapshot(snapshot);
        correlationSnapshots.push(stage.stage);

        // Check for cascade detection
        if (index >= 2) { // After API impact stage
          const prediction = correlationEngine.predictPerformanceIssue(snapshot);
          if (prediction.predicted) {
            // Cascade detected
          }
        }
      });

      // Assert - Should detect cascading effects
      expect(correlationSnapshots).toHaveLength(4);
      
      // Should show strong correlations across all systems
      const connectionApiCorr = Math.abs(correlationEngine.getCorrelation('connection_to_api'));
      const memoryResponseCorr = Math.abs(correlationEngine.getCorrelation('memory_to_response'));
      const dbHealthCorr = Math.abs(correlationEngine.getCorrelation('db_to_health'));

      expect(connectionApiCorr).toBeGreaterThan(0.6);
      expect(memoryResponseCorr).toBeGreaterThan(0.6);
      expect(dbHealthCorr).toBeGreaterThan(0.7);

      // Should detect overall performance degradation
      expect(correlationEngine.detectPerformanceDegradation()).toBe(true);
    });

    test('should identify recovery patterns after performance issues', async () => {
      // Arrange - Performance issue followed by recovery
      const recoveryScenario = [
        // Problem state
        { phase: 'problem', memory: 92, queryTime: 180, responseTime: 1400, health: 25 },
        // Recovery begins (e.g., after restart or scaling)
        { phase: 'recovery_start', memory: 85, queryTime: 120, responseTime: 800, health: 45 },
        { phase: 'recovery_progress', memory: 70, queryTime: 60, responseTime: 400, health: 65 },
        { phase: 'recovery_stabilizing', memory: 55, queryTime: 25, responseTime: 220, health: 80 },
        { phase: 'recovered', memory: 45, queryTime: 12, responseTime: 160, health: 92 }
      ];

      const recoveryCorrelations: number[] = [];

      // Act - Process recovery scenario
      recoveryScenario.forEach((stage, index) => {
        const snapshot: PerformanceSnapshot = {
          timestamp: Date.now() + (index * 180000), // 3 minute intervals
          connections: {
            active: Math.min(1000, 200 + (stage.health * 8)),
            rate: Math.max(1, stage.health / 20),
            setupTime: Math.max(30, 200 - (stage.health * 2)),
            rejectedCount: Math.max(0, 100 - stage.health)
          },
          api: {
            responseTime: stage.responseTime,
            requestsPerSecond: Math.min(40, stage.health / 3),
            errorRate: Math.max(0.01, (100 - stage.health) / 500),
            pendingRequests: stage.responseTime / 20
          },
          system: {
            cpu: Math.max(20, 100 - stage.health),
            memory: stage.memory,
            disk: 25,
            networkIO: stage.health * 2,
            healthScore: stage.health
          },
          database: {
            connections: Math.min(80, stage.health / 2 + 20),
            queryTime: stage.queryTime,
            lockWaitTime: Math.max(0.1, (100 - stage.health) / 20),
            cacheHitRate: Math.min(0.95, 0.4 + (stage.health / 100))
          }
        };

        correlationEngine.addSnapshot(snapshot);
        
        // Track recovery correlation strength
        if (index > 0) {
          const healthCorr = correlationEngine.getCorrelation('db_to_health');
          recoveryCorrelations.push(healthCorr);
        }
      });

      // Assert - Should show recovery pattern
      expect(recoveryCorrelations.length).toBeGreaterThan(0);
      
      // Correlation should strengthen during recovery
      const finalCorrelation = recoveryCorrelations[recoveryCorrelations.length - 1];
      expect(Math.abs(finalCorrelation)).toBeGreaterThan(0.6);
      
      // Final prediction should show healthy state
      const finalSnapshot = recoveryScenario[recoveryScenario.length - 1];
      const finalPrediction = correlationEngine.predictPerformanceIssue({
        timestamp: Date.now(),
        connections: { active: 900, rate: 4.5, setupTime: 40, rejectedCount: 0 },
        api: { responseTime: 160, requestsPerSecond: 30, errorRate: 0.01, pendingRequests: 8 },
        system: { cpu: 30, memory: 45, disk: 25, networkIO: 180, healthScore: 92 },
        database: { connections: 65, queryTime: 12, lockWaitTime: 0.2, cacheHitRate: 0.92 }
      });

      expect(finalPrediction.predicted).toBe(false);
      expect(finalPrediction.estimatedImpact).toBe('low');
    });
  });

  describe('Predictive Performance Analytics', () => {
    test('should predict future performance issues based on trending data', async () => {
      // Arrange - Gradual performance degradation trend
      const trendData = Array.from({ length: 15 }, (_, i) => {
        const degradationFactor = i / 14; // 0 to 1 over 15 points
        return {
          timestamp: Date.now() + (i * 300000), // 5 minute intervals
          connections: 500 + (degradationFactor * 800), // 500 to 1300
          responseTime: 180 + (degradationFactor * 620), // 180 to 800ms
          memory: 45 + (degradationFactor * 40), // 45% to 85%
          healthScore: 95 - (degradationFactor * 50) // 95 to 45
        };
      });

      let earlyWarningTriggered = false;
      const predictionTimestamps: number[] = [];

      // Act - Process trending degradation
      trendData.forEach((point, index) => {
        const snapshot: PerformanceSnapshot = {
          timestamp: point.timestamp,
          connections: {
            active: point.connections,
            rate: Math.max(2, 6 - (index / 3)),
            setupTime: 50 + (index * 15),
            rejectedCount: Math.max(0, point.connections - 1000)
          },
          api: {
            responseTime: point.responseTime,
            requestsPerSecond: Math.max(8, 35 - (index * 2)),
            errorRate: Math.min(0.12, index / 100),
            pendingRequests: point.responseTime / 10
          },
          system: {
            cpu: 30 + (index * 4),
            memory: point.memory,
            disk: 20 + (index * 2),
            networkIO: Math.max(80, 200 - (index * 8)),
            healthScore: point.healthScore
          },
          database: {
            connections: Math.min(90, 40 + (index * 3)),
            queryTime: 8 + (index * 8),
            lockWaitTime: index / 5,
            cacheHitRate: Math.max(0.4, 0.95 - (index / 20))
          }
        };

        correlationEngine.addSnapshot(snapshot);

        // Check for predictive warnings (should trigger before critical state)
        const prediction = correlationEngine.predictPerformanceIssue(snapshot);
        if (prediction.predicted && index < 12) { // Early warning before final degraded state
          earlyWarningTriggered = true;
          predictionTimestamps.push(point.timestamp);
        }
      });

      // Assert - Should provide early warning
      expect(earlyWarningTriggered).toBe(true);
      expect(predictionTimestamps.length).toBeGreaterThan(0);
      
      // Should detect performance degradation trend
      expect(correlationEngine.detectPerformanceDegradation()).toBe(true);
      
      // Correlations should be strong due to clear trend
      const connectionApiCorr = Math.abs(correlationEngine.getCorrelation('connection_to_api'));
      const memoryResponseCorr = Math.abs(correlationEngine.getCorrelation('memory_to_response'));
      
      expect(connectionApiCorr).toBeGreaterThan(0.8);
      expect(memoryResponseCorr).toBeGreaterThan(0.7);
    });

    test('should calibrate prediction accuracy over time', async () => {
      // Arrange - Mixed scenarios to test prediction calibration
      const calibrationScenarios = [
        // True positive scenario
        { type: 'tp', actualIssue: true, predictedIssue: true, accuracy: 'correct' },
        // True negative scenario  
        { type: 'tn', actualIssue: false, predictedIssue: false, accuracy: 'correct' },
        // False positive scenario
        { type: 'fp', actualIssue: false, predictedIssue: true, accuracy: 'incorrect' },
        // False negative scenario
        { type: 'fn', actualIssue: true, predictedIssue: false, accuracy: 'incorrect' }
      ];

      const predictionResults: { predicted: boolean; actual: boolean; accuracy: string }[] = [];

      // Act - Test prediction accuracy across scenarios
      for (const scenario of calibrationScenarios) {
        const testSnapshot: PerformanceSnapshot = {
          timestamp: Date.now(),
          connections: {
            active: scenario.actualIssue ? 1400 : 600,
            rate: scenario.actualIssue ? 2 : 5,
            setupTime: scenario.actualIssue ? 300 : 60,
            rejectedCount: scenario.actualIssue ? 50 : 2
          },
          api: {
            responseTime: scenario.actualIssue ? 1100 : 200,
            requestsPerSecond: scenario.actualIssue ? 8 : 28,
            errorRate: scenario.actualIssue ? 0.15 : 0.02,
            pendingRequests: scenario.actualIssue ? 120 : 15
          },
          system: {
            cpu: scenario.actualIssue ? 88 : 42,
            memory: scenario.actualIssue ? 91 : 48,
            disk: 30,
            networkIO: scenario.actualIssue ? 95 : 175,
            healthScore: scenario.actualIssue ? 35 : 85
          },
          database: {
            connections: scenario.actualIssue ? 95 : 55,
            queryTime: scenario.actualIssue ? 150 : 15,
            lockWaitTime: scenario.actualIssue ? 8 : 0.5,
            cacheHitRate: scenario.actualIssue ? 0.3 : 0.85
          }
        };

        // Add some historical context for better predictions
        for (let i = 0; i < 5; i++) {
          correlationEngine.addSnapshot({
            ...testSnapshot,
            timestamp: Date.now() - ((5 - i) * 60000)
          });
        }

        const prediction = correlationEngine.predictPerformanceIssue(testSnapshot);
        
        predictionResults.push({
          predicted: prediction.predicted,
          actual: scenario.actualIssue,
          accuracy: scenario.accuracy
        });
      }

      // Assert - Prediction accuracy should be reasonable
      const correctPredictions = predictionResults.filter(r => 
        (r.predicted && r.actual) || (!r.predicted && !r.actual)
      ).length;
      
      const accuracy = correctPredictions / predictionResults.length;
      expect(accuracy).toBeGreaterThan(0.6); // At least 60% accuracy
    });
  });
});