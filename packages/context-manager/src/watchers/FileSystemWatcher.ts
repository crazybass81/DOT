import { EventEmitter } from 'eventemitter3';
import * as chokidar from 'chokidar';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface FileChange {
  type: 'added' | 'modified' | 'deleted';
  path: string;
  timestamp: number;
  size?: number;
  hash?: string;
}

export interface WatcherOptions {
  patterns?: string[];
  ignored?: string[];
  debounceMs?: number;
  persistent?: boolean;
  depth?: number;
}

export class FileSystemWatcher extends EventEmitter {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private changeQueue: FileChange[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private options: Required<WatcherOptions>;
  private isProcessing: boolean = false;

  constructor(options: WatcherOptions = {}) {
    super();
    this.options = {
      patterns: options.patterns || ['**/*.ts', '**/*.js', '**/*.md', '**/*.json', '**/*.yaml'],
      ignored: options.ignored || ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.next/**'],
      debounceMs: options.debounceMs || 2000,
      persistent: options.persistent ?? true,
      depth: options.depth ?? 99
    };
  }

  watchProject(projectPath: string, customPatterns?: string[]): void {
    if (this.watchers.has(projectPath)) {
      logger.warn(`Already watching project: ${projectPath}`);
      return;
    }

    const patterns = customPatterns || this.options.patterns;
    const absolutePatterns = patterns.map(p => path.join(projectPath, p));

    logger.info(`Starting file watcher for: ${projectPath}`, { patterns });

    const watcher = chokidar.watch(absolutePatterns, {
      cwd: projectPath,
      ignored: this.options.ignored,
      persistent: this.options.persistent,
      ignoreInitial: true,
      depth: this.options.depth,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });

    watcher
      .on('add', filepath => this.handleFileEvent('added', projectPath, filepath))
      .on('change', filepath => this.handleFileEvent('modified', projectPath, filepath))
      .on('unlink', filepath => this.handleFileEvent('deleted', projectPath, filepath))
      .on('error', error => this.handleError(error));

    this.watchers.set(projectPath, watcher);
    this.emit('watcher:started', projectPath);
  }

  private handleFileEvent(type: FileChange['type'], projectPath: string, filepath: string): void {
    const change: FileChange = {
      type,
      path: path.relative(projectPath, filepath),
      timestamp: Date.now()
    };

    this.queueChange(change);
  }

  private queueChange(change: FileChange): void {
    const existingIndex = this.changeQueue.findIndex(
      c => c.path === change.path && c.type === change.type
    );

    if (existingIndex >= 0) {
      this.changeQueue[existingIndex] = change;
    } else {
      this.changeQueue.push(change);
    }

    this.scheduleProcessing();
  }

  private scheduleProcessing(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processChanges();
    }, this.options.debounceMs);
  }

  private async processChanges(): Promise<void> {
    if (this.isProcessing || this.changeQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const changes = [...this.changeQueue];
    this.changeQueue = [];

    try {
      logger.info(`Processing ${changes.length} file changes`);
      
      const groupedChanges = this.groupChangesByType(changes);
      
      this.emit('batch:changes', changes);
      this.emit('changes:grouped', groupedChanges);
      
      for (const [type, typeChanges] of Object.entries(groupedChanges)) {
        this.emit(`changes:${type}`, typeChanges);
      }
    } catch (error) {
      logger.error('Error processing changes:', error);
      this.emit('error', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private groupChangesByType(changes: FileChange[]): Record<string, FileChange[]> {
    return changes.reduce((grouped, change) => {
      const ext = path.extname(change.path).slice(1) || 'unknown';
      if (!grouped[ext]) {
        grouped[ext] = [];
      }
      grouped[ext].push(change);
      return grouped;
    }, {} as Record<string, FileChange[]>);
  }

  private handleError(error: Error): void {
    logger.error('Watcher error:', error);
    this.emit('error', error);
  }

  stopWatching(projectPath?: string): void {
    if (projectPath) {
      const watcher = this.watchers.get(projectPath);
      if (watcher) {
        watcher.close();
        this.watchers.delete(projectPath);
        logger.info(`Stopped watching: ${projectPath}`);
      }
    } else {
      for (const [path, watcher] of this.watchers) {
        watcher.close();
        logger.info(`Stopped watching: ${path}`);
      }
      this.watchers.clear();
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  getWatchedPaths(): string[] {
    return Array.from(this.watchers.keys());
  }

  getQueueSize(): number {
    return this.changeQueue.length;
  }
}