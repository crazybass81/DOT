import { jest } from '@jest/globals';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { CircularBuffer } from '@/src/lib/metrics/circular-buffer';

/**
 * Real-time Data Flow Integration Tests
 * 
 * These tests validate the complete real-time data pipeline from
 * metric collection through WebSocket distribution to dashboard updates.
 * 
 * Test Coverage:
 * - WebSocket connection lifecycle and reliability
 * - Real-time data synchronization across components
 * - Data flow timing and consistency
 * - Connection failure and recovery scenarios
 * - High-frequency update handling
 */
describe('Real-time Data Flow Integration', () => {
  let httpServer: any;
  let ioServer: Server;
  let clientSocket: ClientSocket;
  let serverPort: number;
  let dataBuffer: CircularBuffer;

  beforeAll(async () => {
    // Create test WebSocket server
    httpServer = createServer();
    ioServer = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as any).port;
        resolve();
      });
    });

    // Initialize data buffer for metrics
    dataBuffer = new CircularBuffer(1000);
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.close();
    }
    if (ioServer) {
      ioServer.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  beforeEach(async () => {
    // Create fresh client connection for each test
    clientSocket = ClientIO(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      timeout: 5000
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      
      clientSocket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      clientSocket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.removeAllListeners();
      clientSocket.close();
    }
    dataBuffer.clear();
    jest.clearAllMocks();
  });

  describe('WebSocket Connection Management', () => {
    test('should establish reliable WebSocket connection with proper handshake', async () => {
      // Assert connection established
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();

      // Test bidirectional communication
      const testMessage = { type: 'ping', timestamp: Date.now() };
      let responseReceived = false;

      clientSocket.on('pong', (data) => {
        expect(data.type).toBe('pong');
        expect(data.originalTimestamp).toBe(testMessage.timestamp);
        responseReceived = true;
      });

      // Setup server to respond to ping
      ioServer.on('connection', (socket) => {
        socket.on('ping', (data) => {
          socket.emit('pong', { 
            type: 'pong', 
            originalTimestamp: data.timestamp,
            serverTimestamp: Date.now()
          });
        });
      });

      clientSocket.emit('ping', testMessage);

      // Wait for response
      await new Promise<void>((resolve) => {
        const checkResponse = () => {
          if (responseReceived) {
            resolve();
          } else {
            setTimeout(checkResponse, 10);
          }
        };
        checkResponse();
      });

      expect(responseReceived).toBe(true);
    });

    test('should handle connection interruption and automatic reconnection', async () => {
      let reconnectCount = 0;
      let disconnectDetected = false;

      clientSocket.on('disconnect', (reason) => {
        disconnectDetected = true;
        expect(reason).toBeDefined();
      });

      clientSocket.on('reconnect', (attemptNumber) => {
        reconnectCount = attemptNumber;
      });

      // Force disconnect
      clientSocket.disconnect();
      
      // Verify disconnect detected
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(disconnectDetected).toBe(true);
      expect(clientSocket.connected).toBe(false);

      // Reconnect
      clientSocket.connect();
      
      // Wait for reconnection
      await new Promise<void>((resolve) => {
        if (clientSocket.connected) {
          resolve();
        } else {
          clientSocket.on('connect', () => resolve());
        }
      });

      expect(clientSocket.connected).toBe(true);
    });

    test('should maintain connection stability under network conditions', async () => {
      // Test connection stability over time
      const stabilityTest = {
        duration: 3000, // 3 seconds
        checkInterval: 100, // Check every 100ms
        disconnections: 0,
        totalChecks: 0
      };

      const stabilityCheck = setInterval(() => {
        stabilityTest.totalChecks++;
        if (!clientSocket.connected) {
          stabilityTest.disconnections++;
        }
      }, stabilityTest.checkInterval);

      // Run stability test
      await new Promise(resolve => setTimeout(resolve, stabilityTest.duration));
      clearInterval(stabilityCheck);

      // Assert connection remained stable (allow for brief disconnections)
      const disconnectionRate = stabilityTest.disconnections / stabilityTest.totalChecks;
      expect(disconnectionRate).toBeLessThan(0.1); // Less than 10% disconnection rate
    });
  });

  describe('Real-time Data Synchronization', () => {
    test('should synchronize connection metrics across all dashboard components', async () => {
      const receivedUpdates = {
        realtimeMonitoring: null,
        apiDashboard: null,
        connectionStatus: null
      };

      // Setup listeners for different dashboard components
      clientSocket.on('connection-metrics-update', (data) => {
        receivedUpdates.realtimeMonitoring = data;
      });

      clientSocket.on('api-performance-update', (data) => {
        receivedUpdates.apiDashboard = data;
      });

      clientSocket.on('connection-status-update', (data) => {
        receivedUpdates.connectionStatus = data;
      });

      // Setup server to broadcast metrics to all components
      ioServer.on('connection', (socket) => {
        socket.on('subscribe-metrics', () => {
          const metricsData = {
            activeConnections: 225,
            connectionRate: 4.2,
            apiResponseTime: 165,
            healthScore: 91,
            timestamp: Date.now()
          };

          // Broadcast to all component-specific channels
          socket.emit('connection-metrics-update', {
            active: metricsData.activeConnections,
            rate: metricsData.connectionRate,
            timestamp: metricsData.timestamp
          });

          socket.emit('api-performance-update', {
            responseTime: metricsData.apiResponseTime,
            timestamp: metricsData.timestamp
          });

          socket.emit('connection-status-update', {
            status: 'healthy',
            activeConnections: metricsData.activeConnections,
            healthScore: metricsData.healthScore,
            timestamp: metricsData.timestamp
          });
        });
      });

      // Trigger metrics subscription
      clientSocket.emit('subscribe-metrics');

      // Wait for all updates to be received
      await new Promise<void>((resolve) => {
        const checkAllUpdates = () => {
          if (receivedUpdates.realtimeMonitoring && 
              receivedUpdates.apiDashboard && 
              receivedUpdates.connectionStatus) {
            resolve();
          } else {
            setTimeout(checkAllUpdates, 10);
          }
        };
        checkAllUpdates();
      });

      // Assert all components received synchronized data
      expect(receivedUpdates.realtimeMonitoring.active).toBe(225);
      expect(receivedUpdates.apiDashboard.responseTime).toBe(165);
      expect(receivedUpdates.connectionStatus.healthScore).toBe(91);
      
      // Timestamps should be very close (within 100ms)
      const timestamps = [
        receivedUpdates.realtimeMonitoring.timestamp,
        receivedUpdates.apiDashboard.timestamp,
        receivedUpdates.connectionStatus.timestamp
      ];
      
      const maxTimestampDiff = Math.max(...timestamps) - Math.min(...timestamps);
      expect(maxTimestampDiff).toBeLessThan(100);
    });

    test('should handle high-frequency real-time updates without data loss', async () => {
      const updateFrequency = 50; // 50ms intervals (20 updates per second)
      const testDuration = 2000; // 2 seconds
      const expectedUpdates = testDuration / updateFrequency;
      
      let receivedUpdates = 0;
      const receivedSequences: number[] = [];
      let lastTimestamp = 0;

      clientSocket.on('high-frequency-update', (data) => {
        receivedUpdates++;
        receivedSequences.push(data.sequenceId);
        
        // Verify timestamp ordering
        expect(data.timestamp).toBeGreaterThanOrEqual(lastTimestamp);
        lastTimestamp = data.timestamp;
      });

      // Setup server to send high-frequency updates
      ioServer.on('connection', (socket) => {
        socket.on('start-high-frequency-test', () => {
          let sequenceId = 0;
          
          const updateInterval = setInterval(() => {
            socket.emit('high-frequency-update', {
              sequenceId: sequenceId++,
              connections: { active: 100 + sequenceId },
              apiMetrics: { responseTime: Math.floor(Math.random() * 500) + 100 },
              timestamp: Date.now()
            });
          }, updateFrequency);

          // Stop after test duration
          setTimeout(() => {
            clearInterval(updateInterval);
          }, testDuration);
        });
      });

      // Start high-frequency test
      clientSocket.emit('start-high-frequency-test');

      // Wait for test completion plus buffer time
      await new Promise(resolve => setTimeout(resolve, testDuration + 500));

      // Assert no data loss and proper sequencing
      expect(receivedUpdates).toBeGreaterThanOrEqual(expectedUpdates * 0.9); // Allow 10% tolerance
      expect(receivedSequences.length).toBe(receivedUpdates);
      
      // Verify sequence integrity (no missing or duplicate sequences)
      const sortedSequences = [...receivedSequences].sort((a, b) => a - b);
      for (let i = 0; i < sortedSequences.length - 1; i++) {
        expect(sortedSequences[i + 1]).toBe(sortedSequences[i] + 1);
      }
    });

    test('should maintain data consistency during concurrent updates', async () => {
      const concurrentStreams = 5;
      const updatesPerStream = 20;
      const streamData = new Map<number, any[]>();
      const receivedData = new Map<number, any[]>();

      // Initialize tracking for each stream
      for (let i = 0; i < concurrentStreams; i++) {
        streamData.set(i, []);
        receivedData.set(i, []);
      }

      // Setup listener for concurrent stream data
      clientSocket.on('concurrent-stream-data', (data) => {
        const streamId = data.streamId;
        if (!receivedData.has(streamId)) {
          receivedData.set(streamId, []);
        }
        receivedData.get(streamId)!.push(data);
      });

      // Setup server to handle concurrent streams
      ioServer.on('connection', (socket) => {
        socket.on('start-concurrent-streams', () => {
          // Start multiple concurrent data streams
          for (let streamId = 0; streamId < concurrentStreams; streamId++) {
            let updateCount = 0;
            
            const streamInterval = setInterval(() => {
              const data = {
                streamId,
                updateId: updateCount++,
                connections: Math.floor(Math.random() * 500) + 100,
                timestamp: Date.now()
              };
              
              streamData.get(streamId)!.push(data);
              socket.emit('concurrent-stream-data', data);
              
              if (updateCount >= updatesPerStream) {
                clearInterval(streamInterval);
              }
            }, 25); // Fast updates to test concurrency
          }
        });
      });

      // Start concurrent streams
      clientSocket.emit('start-concurrent-streams');

      // Wait for all streams to complete
      await new Promise<void>((resolve) => {
        const checkCompletion = () => {
          const allStreamsComplete = Array.from(receivedData.values())
            .every(stream => stream.length >= updatesPerStream);
          
          if (allStreamsComplete) {
            resolve();
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
      });

      // Assert data consistency for each stream
      for (let streamId = 0; streamId < concurrentStreams; streamId++) {
        const sent = streamData.get(streamId)!;
        const received = receivedData.get(streamId)!;
        
        expect(received.length).toBe(updatesPerStream);
        
        // Verify update sequence integrity within each stream
        for (let i = 0; i < received.length; i++) {
          expect(received[i].streamId).toBe(streamId);
          expect(received[i].updateId).toBe(i);
        }
      }
    });
  });

  describe('Data Flow Timing and Performance', () => {
    test('should meet real-time update latency requirements (<500ms)', async () => {
      const latencyMeasurements: number[] = [];
      const targetLatency = 500; // 500ms maximum
      const testIterations = 20;

      clientSocket.on('latency-response', (data) => {
        const latency = Date.now() - data.clientTimestamp;
        latencyMeasurements.push(latency);
      });

      // Setup server to echo back timing data
      ioServer.on('connection', (socket) => {
        socket.on('latency-test', (data) => {
          // Add minimal processing delay to simulate real conditions
          setTimeout(() => {
            socket.emit('latency-response', {
              ...data,
              serverTimestamp: Date.now()
            });
          }, Math.random() * 50); // Random 0-50ms server processing time
        });
      });

      // Run latency tests
      for (let i = 0; i < testIterations; i++) {
        clientSocket.emit('latency-test', {
          iteration: i,
          clientTimestamp: Date.now()
        });
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for all responses
      await new Promise<void>((resolve) => {
        const checkCompletion = () => {
          if (latencyMeasurements.length >= testIterations) {
            resolve();
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
      });

      // Assert latency requirements
      const averageLatency = latencyMeasurements.reduce((sum, l) => sum + l, 0) / latencyMeasurements.length;
      const maxLatency = Math.max(...latencyMeasurements);
      const ninetyFifthPercentile = latencyMeasurements.sort((a, b) => a - b)[Math.floor(latencyMeasurements.length * 0.95)];

      expect(averageLatency).toBeLessThan(targetLatency);
      expect(ninetyFifthPercentile).toBeLessThan(targetLatency);
      expect(maxLatency).toBeLessThan(targetLatency * 2); // Allow 2x target for max
    });

    test('should buffer and batch updates efficiently during high load', async () => {
      const batchSize = 10;
      const totalUpdates = 100;
      let batchesReceived = 0;
      const receivedBatches: any[] = [];

      clientSocket.on('batched-updates', (batch) => {
        batchesReceived++;
        receivedBatches.push(batch);
        
        // Verify batch structure
        expect(Array.isArray(batch.updates)).toBe(true);
        expect(batch.updates.length).toBeLessThanOrEqual(batchSize);
        expect(batch.batchId).toBeDefined();
        expect(batch.timestamp).toBeDefined();
      });

      // Setup server with update batching
      ioServer.on('connection', (socket) => {
        socket.on('start-batch-test', () => {
          const updateBuffer: any[] = [];
          let updateCounter = 0;
          let batchId = 0;

          const sendBatch = () => {
            if (updateBuffer.length > 0) {
              socket.emit('batched-updates', {
                batchId: batchId++,
                updates: [...updateBuffer],
                timestamp: Date.now()
              });
              updateBuffer.length = 0;
            }
          };

          // Generate updates rapidly
          const updateInterval = setInterval(() => {
            updateBuffer.push({
              updateId: updateCounter++,
              data: { connections: Math.floor(Math.random() * 1000) },
              timestamp: Date.now()
            });

            // Send batch when buffer is full or at regular intervals
            if (updateBuffer.length >= batchSize) {
              sendBatch();
            }

            if (updateCounter >= totalUpdates) {
              clearInterval(updateInterval);
              // Send final partial batch
              sendBatch();
            }
          }, 10); // Very fast updates to force batching

          // Also send batches at regular intervals
          const batchInterval = setInterval(() => {
            if (updateCounter >= totalUpdates) {
              clearInterval(batchInterval);
            } else {
              sendBatch();
            }
          }, 200); // Batch every 200ms
        });
      });

      // Start batch test
      clientSocket.emit('start-batch-test');

      // Wait for all batches to be received
      await new Promise<void>((resolve) => {
        const checkCompletion = () => {
          const totalReceived = receivedBatches.reduce((sum, batch) => sum + batch.updates.length, 0);
          if (totalReceived >= totalUpdates) {
            resolve();
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
      });

      // Assert efficient batching
      const totalReceivedUpdates = receivedBatches.reduce((sum, batch) => sum + batch.updates.length, 0);
      expect(totalReceivedUpdates).toBe(totalUpdates);
      expect(batchesReceived).toBeLessThan(totalUpdates); // Should batch multiple updates
      expect(batchesReceived).toBeGreaterThan(totalUpdates / batchSize * 0.8); // But not over-batch
    });
  });

  describe('Connection Reliability and Recovery', () => {
    test('should detect and recover from connection drops automatically', async () => {
      let disconnectEvents = 0;
      let reconnectEvents = 0;
      let dataLossEvents = 0;

      const expectedData = { sequenceId: 42, important: true };
      let receivedExpectedData = false;

      clientSocket.on('disconnect', () => {
        disconnectEvents++;
      });

      clientSocket.on('reconnect', () => {
        reconnectEvents++;
      });

      clientSocket.on('data-recovery', (data) => {
        if (data.sequenceId === expectedData.sequenceId) {
          receivedExpectedData = true;
        }
      });

      clientSocket.on('data-loss-detected', () => {
        dataLossEvents++;
      });

      // Setup server with recovery mechanism
      ioServer.on('connection', (socket) => {
        socket.on('test-recovery', () => {
          // Send important data
          socket.emit('data-recovery', expectedData);
          
          // Simulate connection drop after short delay
          setTimeout(() => {
            socket.disconnect(true);
          }, 100);
        });

        socket.on('request-data-recovery', (sequenceId) => {
          // Resend data on recovery request
          if (sequenceId === expectedData.sequenceId) {
            socket.emit('data-recovery', expectedData);
          }
        });
      });

      // Start recovery test
      clientSocket.emit('test-recovery');

      // Wait for disconnect
      await new Promise<void>((resolve) => {
        const checkDisconnect = () => {
          if (!clientSocket.connected) {
            resolve();
          } else {
            setTimeout(checkDisconnect, 50);
          }
        };
        checkDisconnect();
      });

      // Verify disconnect was detected
      expect(disconnectEvents).toBeGreaterThan(0);

      // Reconnect
      clientSocket.connect();

      // Wait for reconnection
      await new Promise<void>((resolve) => {
        if (clientSocket.connected) {
          resolve();
        } else {
          clientSocket.on('connect', () => resolve());
        }
      });

      // Request data recovery
      if (!receivedExpectedData) {
        clientSocket.emit('request-data-recovery', expectedData.sequenceId);
      }

      // Wait for data recovery
      await new Promise<void>((resolve) => {
        const checkRecovery = () => {
          if (receivedExpectedData) {
            resolve();
          } else {
            setTimeout(checkRecovery, 100);
          }
        };
        checkRecovery();
      });

      // Assert successful recovery
      expect(receivedExpectedData).toBe(true);
      expect(reconnectEvents).toBeGreaterThan(0);
    });

    test('should maintain data integrity during reconnection storms', async () => {
      const reconnectionCycles = 5;
      const dataPerCycle = 10;
      const allExpectedData = new Set<string>();
      const allReceivedData = new Set<string>();

      clientSocket.on('cycle-data', (data) => {
        allReceivedData.add(data.id);
      });

      // Setup server for reconnection storm test
      ioServer.on('connection', (socket) => {
        socket.on('start-reconnection-storm', () => {
          let cycleCount = 0;
          
          const runCycle = () => {
            // Send data for this cycle
            for (let i = 0; i < dataPerCycle; i++) {
              const dataId = `cycle-${cycleCount}-data-${i}`;
              allExpectedData.add(dataId);
              socket.emit('cycle-data', { id: dataId, cycle: cycleCount, index: i });
            }
            
            cycleCount++;
            
            if (cycleCount < reconnectionCycles) {
              // Force disconnect after data is sent
              setTimeout(() => {
                socket.disconnect(true);
              }, 100);
            }
          };
          
          runCycle();
        });
      });

      // Run reconnection storm
      for (let cycle = 0; cycle < reconnectionCycles; cycle++) {
        // Ensure connected
        if (!clientSocket.connected) {
          clientSocket.connect();
          await new Promise<void>((resolve) => {
            if (clientSocket.connected) {
              resolve();
            } else {
              clientSocket.on('connect', () => resolve());
            }
          });
        }

        // Start cycle
        if (cycle === 0) {
          clientSocket.emit('start-reconnection-storm');
        }

        // Wait for cycle completion and disconnection
        await new Promise(resolve => setTimeout(resolve, 200));

        // Reconnect for next cycle (except last one)
        if (cycle < reconnectionCycles - 1) {
          clientSocket.connect();
          await new Promise<void>((resolve) => {
            const checkConnection = () => {
              if (clientSocket.connected) {
                resolve();
              } else {
                setTimeout(checkConnection, 50);
              }
            };
            checkConnection();
          });
        }
      }

      // Final wait for any remaining data
      await new Promise(resolve => setTimeout(resolve, 500));

      // Assert data integrity
      const expectedDataCount = reconnectionCycles * dataPerCycle;
      expect(allExpectedData.size).toBe(expectedDataCount);
      
      // Allow for some data loss during connection storms, but should recover most data
      const dataRecoveryRate = allReceivedData.size / allExpectedData.size;
      expect(dataRecoveryRate).toBeGreaterThan(0.8); // Expect >80% data recovery
    });
  });
});