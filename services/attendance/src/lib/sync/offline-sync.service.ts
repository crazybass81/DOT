// Offline Sync Service - SOLID Principles Applied
// Handles offline data synchronization for attendance records

import { SyncQueue, SyncStatus, Attendance } from '../../types'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Interface Segregation Principle
export interface IOfflineStorage {
  saveToQueue(operation: SyncOperation): Promise<void>
  getQueueItems(): Promise<SyncOperation[]>
  removeFromQueue(id: string): Promise<void>
  clearQueue(): Promise<void>
}

export interface ISyncStrategy {
  canSync(): boolean
  syncBatch(operations: SyncOperation[]): Promise<SyncResult[]>
  handleConflict(local: SyncOperation, remote: any): Promise<SyncOperation>
}

export interface INetworkMonitor {
  isOnline(): boolean
  onStatusChange(callback: (online: boolean) => void): void
  getConnectionQuality(): 'good' | 'poor' | 'offline'
}

// Data structures
export interface SyncOperation {
  id: string
  type: 'check_in' | 'check_out' | 'update' | 'delete'
  entity: 'attendance' | 'shift' | 'employee'
  data: any
  timestamp: string
  retryCount: number
  status: SyncStatus
  organizationId?: string
}

export interface SyncResult {
  operationId: string
  success: boolean
  error?: string
  conflictResolution?: 'local' | 'remote' | 'merged'
}

// Single Responsibility: Handle browser storage
export class IndexedDBStorage implements IOfflineStorage {
  private dbName = 'AttendanceOfflineDB'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async saveToQueue(operation: SyncOperation): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite')
      const store = transaction.objectStore('syncQueue')
      const request = store.put(operation)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getQueueItems(): Promise<SyncOperation[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly')
      const store = transaction.objectStore('syncQueue')
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite')
      const store = transaction.objectStore('syncQueue')
      const request = store.delete(id)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearQueue(): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite')
      const store = transaction.objectStore('syncQueue')
      const request = store.clear()
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// Single Responsibility: Monitor network status
export class NetworkMonitor implements INetworkMonitor {
  private listeners: ((online: boolean) => void)[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.notifyListeners(true))
      window.addEventListener('offline', () => this.notifyListeners(false))
    }
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine
  }

  onStatusChange(callback: (online: boolean) => void): void {
    this.listeners.push(callback)
  }

  getConnectionQuality(): 'good' | 'poor' | 'offline' {
    if (!this.isOnline()) return 'offline'
    
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    
    if (!connection) return 'good' // Assume good if can't determine
    
    // Check effective connection type
    if (connection.effectiveType === '4g') return 'good'
    if (connection.effectiveType === '3g') return 'poor'
    if (connection.effectiveType === '2g') return 'poor'
    
    // Check RTT (round-trip time)
    if (connection.rtt && connection.rtt > 300) return 'poor'
    
    return 'good'
  }

  private notifyListeners(online: boolean): void {
    this.listeners.forEach(listener => listener(online))
  }
}

// Single Responsibility: Handle conflict resolution
export class ConflictResolver {
  resolveAttendanceConflict(local: any, remote: any): any {
    // Strategy: Server wins for check-in times, latest wins for check-out
    if (local.check_in_time && remote.check_in_time) {
      // Keep server's check-in time
      local.check_in_time = remote.check_in_time
    }
    
    if (local.check_out_time && remote.check_out_time) {
      // Keep the latest check-out time
      const localTime = new Date(local.check_out_time)
      const remoteTime = new Date(remote.check_out_time)
      local.check_out_time = localTime > remoteTime ? local.check_out_time : remote.check_out_time
    }
    
    return local
  }

  resolveShiftConflict(local: any, remote: any): any {
    // Strategy: Server always wins for shift assignments
    return remote
  }

  shouldRetry(error: any, retryCount: number): boolean {
    // Don't retry after 3 attempts
    if (retryCount >= 3) return false
    
    // Retry on network errors
    if (error.code === 'NETWORK_ERROR') return true
    if (error.code === 'TIMEOUT') return true
    
    // Don't retry on validation errors
    if (error.code === 'VALIDATION_ERROR') return false
    if (error.code === 'PERMISSION_DENIED') return false
    
    return true
  }
}

// Main Service - Dependency Inversion Principle
export class OfflineSyncService {
  private syncInProgress = false
  private syncInterval: NodeJS.Timeout | null = null
  private retryDelay = 5000 // Start with 5 seconds
  private maxRetryDelay = 60000 // Max 1 minute

  constructor(
    private storage: IOfflineStorage,
    private networkMonitor: INetworkMonitor,
    private supabase: SupabaseClient,
    private conflictResolver: ConflictResolver
  ) {
    // Start monitoring network status
    this.networkMonitor.onStatusChange((online) => {
      if (online) {
        this.syncPendingOperations()
      }
    })

    // Periodic sync attempt
    this.startPeriodicSync()
  }

  async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<void> {
    const fullOperation: SyncOperation = {
      ...operation,
      id: `${operation.type}_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: SyncStatus.Pending
    }

    await this.storage.saveToQueue(fullOperation)
    
    // Try immediate sync if online
    if (this.networkMonitor.isOnline()) {
      this.syncPendingOperations()
    }
  }

  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress) return
    if (!this.networkMonitor.isOnline()) return
    
    this.syncInProgress = true
    
    try {
      const operations = await this.storage.getQueueItems()
      const pending = operations.filter(op => op.status === SyncStatus.Pending)
      
      if (pending.length === 0) {
        this.syncInProgress = false
        return
      }

      // Process in batches
      const batchSize = 10
      for (let i = 0; i < pending.length; i += batchSize) {
        const batch = pending.slice(i, i + batchSize)
        await this.processBatch(batch)
      }
      
      // Reset retry delay on successful sync
      this.retryDelay = 5000
    } catch (error) {
      console.error('Sync error:', error)
      // Exponential backoff
      this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay)
    } finally {
      this.syncInProgress = false
    }
  }

  private async processBatch(operations: SyncOperation[]): Promise<void> {
    for (const operation of operations) {
      try {
        // Update status to processing
        operation.status = SyncStatus.Processing
        await this.storage.saveToQueue(operation)
        
        // Process based on operation type
        let result: any
        switch (operation.entity) {
          case 'attendance':
            result = await this.syncAttendanceOperation(operation)
            break
          case 'shift':
            result = await this.syncShiftOperation(operation)
            break
          default:
            throw new Error(`Unknown entity type: ${operation.entity}`)
        }
        
        // Success - remove from queue
        await this.storage.removeFromQueue(operation.id)
        
      } catch (error: any) {
        operation.retryCount++
        
        if (this.conflictResolver.shouldRetry(error, operation.retryCount)) {
          operation.status = SyncStatus.Pending
        } else {
          operation.status = SyncStatus.Failed
        }
        
        await this.storage.saveToQueue(operation)
      }
    }
  }

  private async syncAttendanceOperation(operation: SyncOperation): Promise<any> {
    const { type, data } = operation
    
    switch (type) {
      case 'check_in':
        return await this.supabase
          .from('attendance')
          .upsert({
            employee_id: data.employee_id,
            date: data.date,
            check_in_time: data.check_in_time,
            check_in_location_id: data.location_id,
            status: 'present'
          })
          .select()
          .single()
          
      case 'check_out':
        return await this.supabase
          .from('attendance')
          .update({
            check_out_time: data.check_out_time,
            check_out_location_id: data.location_id,
            overtime_minutes: data.overtime_minutes || 0
          })
          .eq('id', data.attendance_id)
          .select()
          .single()
          
      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  private async syncShiftOperation(operation: SyncOperation): Promise<any> {
    const { type, data } = operation
    
    switch (type) {
      case 'update':
        return await this.supabase
          .from('employee_shifts')
          .update(data)
          .eq('id', data.id)
          .select()
          .single()
          
      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.networkMonitor.isOnline()) {
        this.syncPendingOperations()
      }
    }, 30000)
  }

  async getPendingOperationsCount(): Promise<number> {
    const operations = await this.storage.getQueueItems()
    return operations.filter(op => op.status === SyncStatus.Pending).length
  }

  async clearFailedOperations(): Promise<void> {
    const operations = await this.storage.getQueueItems()
    const failed = operations.filter(op => op.status === SyncStatus.Failed)
    
    for (const op of failed) {
      await this.storage.removeFromQueue(op.id)
    }
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}