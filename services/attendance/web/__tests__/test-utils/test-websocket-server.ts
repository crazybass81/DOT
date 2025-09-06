import { Server } from 'socket.io';
import { createServer } from 'http';
import { EventEmitter } from 'events';

/**
 * Mock WebSocket Server for Integration Testing
 * 
 * Provides realistic WebSocket server behavior for testing:
 * - Connection management and lifecycle events
 * - Real-time data broadcasting capabilities  
 * - Configurable latency and failure simulation
 * - Metrics collection and performance monitoring
 * - Load testing support with multiple clients
 */

export interface WebSocketServerConfig {
  port?: number;
  cors?: {
    origin: string | string[];
    methods: string[];
  };
  pingTimeout?: number;
  pingInterval?: number;
  maxConnections?: number;
  simulateLatency?: {
    min: number;
    max: number;
  };
  simulateFailures?: {
    connectionFailureRate: number;
    messageFailureRate: number;
  };
}

export interface ServerMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  averageLatency: number;
  uptime: number;
}

export class TestWebSocketServer extends EventEmitter {
  private httpServer: any;
  private ioServer: Server | null = null;
  private config: Required<WebSocketServerConfig>;
  private metrics: ServerMetrics;
  private startTime: number;
  private connectedClients: Set<string> = new Set();
  private messageLatencies: number[] = [];
  
  constructor(config: WebSocketServerConfig = {}) {
    super();
    
    this.config = {
      port: config.port || 0,
      cors: config.cors || { origin: '*', methods: ['GET', 'POST'] },
      pingTimeout: config.pingTimeout || 60000,
      pingInterval: config.pingInterval || 25000,
      maxConnections: config.maxConnections || 1000,
      simulateLatency: config.simulateLatency || { min: 0, max: 0 },
      simulateFailures: config.simulateFailures || { connectionFailureRate: 0, messageFailureRate: 0 },
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0,
      averageLatency: 0,
      uptime: 0
    };

    this.startTime = Date.now();
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = createServer();
        this.ioServer = new Server(this.httpServer, {
          cors: this.config.cors,
          transports: ['websocket', 'polling'],
          pingTimeout: this.config.pingTimeout,
          pingInterval: this.config.pingInterval
        });

        this.setupEventHandlers();

        this.httpServer.listen(this.config.port, () => {
          const actualPort = this.httpServer.address().port;
          this.emit('server-started', { port: actualPort });
          resolve(actualPort);
        });

        this.httpServer.on('error', reject);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventHandlers() {
    if (!this.ioServer) return;

    this.ioServer.on('connection', (socket) => {
      // Connection limit check
      if (this.connectedClients.size >= this.config.maxConnections) {
        socket.emit('connection-rejected', { reason: 'max_connections_exceeded' });
        socket.disconnect(true);
        return;
      }

      // Simulate connection failure
      if (Math.random() < this.config.simulateFailures.connectionFailureRate) {
        setTimeout(() => {
          socket.emit('connection-error', { reason: 'simulated_failure' });
          socket.disconnect(true);
        }, Math.random() * 1000);
        return;
      }

      // Successful connection
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;
      this.connectedClients.add(socket.id);

      this.emit('client-connected', { 
        socketId: socket.id, 
        totalConnections: this.metrics.activeConnections 
      });

      // Setup client event handlers
      this.setupClientHandlers(socket);

      socket.on('disconnect', (reason) => {
        this.metrics.activeConnections--;
        this.connectedClients.delete(socket.id);
        
        this.emit('client-disconnected', { 
          socketId: socket.id, 
          reason, 
          totalConnections: this.metrics.activeConnections 
        });
      });

      // Send welcome message
      socket.emit('connected', {
        socketId: socket.id,
        serverTime: Date.now(),
        config: {
          pingInterval: this.config.pingInterval,
          maxConnections: this.config.maxConnections
        }
      });
    });

    this.ioServer.on('error', (error) => {
      this.metrics.errors++;
      this.emit('server-error', error);
    });
  }

  private setupClientHandlers(socket: any) {
    // Subscribe to metrics updates
    socket.on('subscribe-metrics', (callback) => {
      this.handleMessage(socket, 'subscribe-metrics');
      
      if (typeof callback === 'function') {
        callback({ status: 'subscribed', timestamp: Date.now() });
      }
      
      // Add to metrics subscribers
      socket.join('metrics-subscribers');
      
      // Send initial data
      this.sendToClient(socket, 'initial-metrics', {
        connections: { active: this.metrics.activeConnections },
        server: { uptime: this.getUptime() },
        timestamp: Date.now()
      });
    });

    // Unsubscribe from metrics
    socket.on('unsubscribe-metrics', () => {
      this.handleMessage(socket, 'unsubscribe-metrics');
      socket.leave('metrics-subscribers');
    });

    // Handle ping messages
    socket.on('ping', (data) => {
      this.handleMessage(socket, 'ping');
      this.sendToClient(socket, 'pong', {
        ...data,
        serverTimestamp: Date.now()
      });
    });

    // Handle load test data
    socket.on('load-test-data', (data) => {
      this.handleMessage(socket, 'load-test-data');
      
      // Simulate processing delay
      const delay = this.getSimulatedLatency();
      
      setTimeout(() => {
        this.sendToClient(socket, 'load-test-response', {
          ...data,
          processed: true,
          serverTimestamp: Date.now(),
          processingDelay: delay
        });
      }, delay);
    });

    // Handle custom message types
    socket.on('custom-message', (data) => {
      this.handleMessage(socket, 'custom-message');
      this.emit('custom-message-received', { socketId: socket.id, data });
    });

    // Handle monitoring requests
    socket.on('get-server-metrics', (callback) => {
      this.handleMessage(socket, 'get-server-metrics');
      
      if (typeof callback === 'function') {
        callback(this.getMetrics());
      }
    });
  }

  private handleMessage(socket: any, messageType: string) {
    this.metrics.messagesReceived++;
    
    // Simulate message failure
    if (Math.random() < this.config.simulateFailures.messageFailureRate) {
      socket.emit('message-error', { 
        type: messageType, 
        reason: 'simulated_failure' 
      });
      this.metrics.errors++;
      return false;
    }

    return true;
  }

  private sendToClient(socket: any, event: string, data: any) {
    const latency = this.getSimulatedLatency();
    
    setTimeout(() => {
      socket.emit(event, data);
      this.metrics.messagesSent++;
      
      if (latency > 0) {
        this.messageLatencies.push(latency);
        this.updateAverageLatency();
      }
    }, latency);
  }

  private getSimulatedLatency(): number {
    const { min, max } = this.config.simulateLatency;
    return min + Math.random() * (max - min);
  }

  private updateAverageLatency() {
    if (this.messageLatencies.length > 100) {
      // Keep only recent latencies
      this.messageLatencies = this.messageLatencies.slice(-100);
    }
    
    this.metrics.averageLatency = this.messageLatencies.reduce((sum, lat) => sum + lat, 0) / this.messageLatencies.length;
  }

  private getUptime(): number {
    return Date.now() - this.startTime;
  }

  // Public API methods

  broadcast(event: string, data: any, room?: string) {
    if (!this.ioServer) return;

    const target = room ? this.ioServer.to(room) : this.ioServer;
    target.emit(event, data);
    
    this.metrics.messagesSent += room ? this.getRoomSize(room) : this.metrics.activeConnections;
  }

  broadcastToMetricsSubscribers(data: any) {
    this.broadcast('metrics-update', data, 'metrics-subscribers');
  }

  simulateConnectionDrop(socketId?: string) {
    if (!this.ioServer) return;

    if (socketId) {
      const socket = this.ioServer.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    } else {
      // Drop a random connection
      const sockets = Array.from(this.ioServer.sockets.sockets.values());
      if (sockets.length > 0) {
        const randomSocket = sockets[Math.floor(Math.random() * sockets.length)];
        randomSocket.disconnect(true);
      }
    }
  }

  simulateServerOverload() {
    // Increase latency and failure rates temporarily
    const originalLatency = this.config.simulateLatency;
    const originalFailureRate = this.config.simulateFailures.messageFailureRate;

    this.config.simulateLatency = { min: 500, max: 2000 };
    this.config.simulateFailures.messageFailureRate = 0.1;

    // Restore after 30 seconds
    setTimeout(() => {
      this.config.simulateLatency = originalLatency;
      this.config.simulateFailures.messageFailureRate = originalFailureRate;
    }, 30000);

    this.emit('server-overload-simulated', { duration: 30000 });
  }

  getMetrics(): ServerMetrics {
    return {
      ...this.metrics,
      uptime: this.getUptime()
    };
  }

  getConnectedClients(): string[] {
    return Array.from(this.connectedClients);
  }

  private getRoomSize(room: string): number {
    if (!this.ioServer) return 0;
    return this.ioServer.sockets.adapter.rooms.get(room)?.size || 0;
  }

  isClientConnected(socketId: string): boolean {
    return this.connectedClients.has(socketId);
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ioServer) {
        this.ioServer.close(() => {
          this.emit('server-stopped');
          resolve();
        });
      }
      
      if (this.httpServer) {
        this.httpServer.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
      
      // Reset state
      this.connectedClients.clear();
      this.messageLatencies = [];
    });
  }

  // Test utilities

  async waitForConnections(count: number, timeout = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.metrics.activeConnections >= count) {
        resolve(true);
        return;
      }

      const timeoutHandle = setTimeout(() => {
        this.removeListener('client-connected', checkConnections);
        resolve(false);
      }, timeout);

      const checkConnections = () => {
        if (this.metrics.activeConnections >= count) {
          clearTimeout(timeoutHandle);
          this.removeListener('client-connected', checkConnections);
          resolve(true);
        }
      };

      this.on('client-connected', checkConnections);
    });
  }

  async waitForMessages(count: number, timeout = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.metrics.messagesReceived >= count) {
        resolve(true);
        return;
      }

      const initialCount = this.metrics.messagesReceived;
      const targetCount = initialCount + count;
      
      const checkMessages = () => {
        if (this.metrics.messagesReceived >= targetCount) {
          resolve(true);
        }
      };

      const interval = setInterval(checkMessages, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
      }, timeout);
    });
  }

  reset() {
    this.metrics = {
      totalConnections: 0,
      activeConnections: this.metrics.activeConnections, // Keep current connections
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0,
      averageLatency: 0,
      uptime: 0
    };
    
    this.messageLatencies = [];
    this.startTime = Date.now();
  }
}

// Helper function to create configured test server
export function createTestWebSocketServer(config?: WebSocketServerConfig): TestWebSocketServer {
  return new TestWebSocketServer(config);
}

// Predefined configurations for common test scenarios
export const TestServerConfigs = {
  development: {
    simulateLatency: { min: 10, max: 50 },
    simulateFailures: { connectionFailureRate: 0, messageFailureRate: 0 }
  },
  
  production: {
    simulateLatency: { min: 50, max: 200 },
    simulateFailures: { connectionFailureRate: 0.001, messageFailureRate: 0.001 }
  },
  
  highLatency: {
    simulateLatency: { min: 200, max: 1000 },
    simulateFailures: { connectionFailureRate: 0.01, messageFailureRate: 0.005 }
  },
  
  unstable: {
    simulateLatency: { min: 100, max: 2000 },
    simulateFailures: { connectionFailureRate: 0.05, messageFailureRate: 0.02 }
  },
  
  loadTesting: {
    maxConnections: 10000,
    pingTimeout: 120000,
    pingInterval: 30000,
    simulateLatency: { min: 5, max: 100 },
    simulateFailures: { connectionFailureRate: 0.001, messageFailureRate: 0.0005 }
  }
};