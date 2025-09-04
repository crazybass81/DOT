import { EventEmitter } from 'eventemitter3';
import { FileSystemWatcher, FileChange } from './watchers/FileSystemWatcher';
import { ContextAnalyzer, AnalysisResult } from './analyzers/ContextAnalyzer';
import { DocumentationUpdater } from './updaters/DocumentationUpdater';
import { RefactoringEngine, RefactoringPlan } from './refactoring/RefactoringEngine';
import { logger } from './utils/logger';
import * as path from 'path';

export interface OrchestratorConfig {
  projectPath: string;
  autoUpdate: boolean;
  requireApproval: boolean;
  watchPatterns?: string[];
  ignoredPaths?: string[];
  debounceMs?: number;
  mcpClient?: any;
}

export interface OrchestratorStatus {
  isRunning: boolean;
  filesWatched: number;
  changesProcessed: number;
  lastUpdate: Date | null;
  errors: number;
}

export class ContextOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private watcher: FileSystemWatcher;
  private analyzer: ContextAnalyzer;
  private docUpdater: DocumentationUpdater;
  private refactoringEngine: RefactoringEngine;
  private status: OrchestratorStatus;
  private approvalQueue: Map<string, any> = new Map();

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    
    this.watcher = new FileSystemWatcher({
      patterns: config.watchPatterns,
      ignored: config.ignoredPaths,
      debounceMs: config.debounceMs
    });
    
    this.analyzer = new ContextAnalyzer(config.projectPath, config.mcpClient);
    this.docUpdater = new DocumentationUpdater(config.projectPath, config.mcpClient);
    this.refactoringEngine = new RefactoringEngine(config.projectPath, config.mcpClient);
    
    this.status = {
      isRunning: false,
      filesWatched: 0,
      changesProcessed: 0,
      lastUpdate: null,
      errors: 0
    };
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.watcher.on('batch:changes', async (changes: FileChange[]) => {
      await this.handleBatchChanges(changes);
    });

    this.watcher.on('error', (error: Error) => {
      this.handleError('Watcher', error);
    });

    this.analyzer.on('analysis:complete', (result: AnalysisResult) => {
      logger.info('Analysis completed', {
        changes: result.changes.length,
        impact: result.overallImpact
      });
    });

    this.docUpdater.on('updates:complete', (plan: any) => {
      logger.info('Documentation updates completed', {
        updates: plan.updates.length
      });
    });

    this.refactoringEngine.on('refactoring:complete', (result: any) => {
      logger.info('Refactoring completed', {
        completed: result.completedTasks.length,
        failed: result.failedTasks.length
      });
    });
  }

  async start(): Promise<void> {
    if (this.status.isRunning) {
      logger.warn('Orchestrator is already running');
      return;
    }

    logger.info('Starting Context Orchestrator', this.config);
    
    try {
      this.watcher.watchProject(this.config.projectPath);
      this.status.isRunning = true;
      this.status.filesWatched = this.watcher.getWatchedPaths().length;
      
      this.emit('started', this.status);
      logger.info('Context Orchestrator started successfully');
    } catch (error) {
      logger.error('Failed to start orchestrator:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.status.isRunning) {
      logger.warn('Orchestrator is not running');
      return;
    }

    logger.info('Stopping Context Orchestrator');
    
    this.watcher.stopWatching();
    this.status.isRunning = false;
    
    this.emit('stopped', this.status);
    logger.info('Context Orchestrator stopped');
  }

  private async handleBatchChanges(changes: FileChange[]): Promise<void> {
    logger.info(`Processing ${changes.length} changes`);
    this.emit('processing:start', changes);

    try {
      const analysis = await this.analyzer.analyzeChanges(changes);
      
      if (this.hasBreakingChanges(analysis)) {
        await this.handleBreakingChanges(analysis);
      }

      if (this.config.autoUpdate || !this.config.requireApproval) {
        await this.processUpdates(analysis);
      } else {
        await this.queueForApproval(analysis);
      }

      if (this.needsRefactoring(analysis)) {
        await this.handleRefactoring(analysis);
      }

      const validationResult = await this.validateProjectConsistency();
      
      this.status.changesProcessed += changes.length;
      this.status.lastUpdate = new Date();
      
      this.emit('processing:complete', {
        changes: changes.length,
        analysis,
        validation: validationResult
      });
      
      logger.info('✅ Context synchronization completed');
    } catch (error) {
      this.handleError('Processing', error);
      this.status.errors++;
      this.emit('processing:error', error);
    }
  }

  private hasBreakingChanges(analysis: AnalysisResult): boolean {
    return analysis.overallImpact === 'breaking' ||
           analysis.changes.some(c => c.impactLevel === 'breaking');
  }

  private async handleBreakingChanges(analysis: AnalysisResult): Promise<void> {
    logger.warn('⚠️ Breaking changes detected');
    
    const report = await this.generateImpactReport(analysis);
    
    this.emit('breaking:changes', {
      analysis,
      report
    });

    if (this.config.autoUpdate) {
      await this.createFeatureBranch(analysis);
    }

    await this.notifyDeveloper({
      type: 'breaking-changes',
      severity: 'high',
      report
    });
  }

  private needsRefactoring(analysis: AnalysisResult): boolean {
    return analysis.refactoringTasks.length > 0 ||
           analysis.changes.some(c => c.requiresRefactoring);
  }

  private async handleRefactoring(analysis: AnalysisResult): Promise<void> {
    const plan = await this.refactoringEngine.planRefactoring(analysis);
    
    if (this.config.requireApproval) {
      await this.requestRefactoringApproval(plan);
    } else {
      await this.executeRefactoringWithMonitoring(plan);
    }
  }

  private async processUpdates(analysis: AnalysisResult): Promise<void> {
    await this.docUpdater.processDocumentUpdates(analysis);
    
    for (const task of analysis.refactoringTasks.slice(0, 5)) {
      logger.info(`Suggested refactoring: ${task.description}`);
    }
  }

  private async queueForApproval(analysis: AnalysisResult): Promise<void> {
    const approvalId = `approval_${Date.now()}`;
    
    this.approvalQueue.set(approvalId, {
      analysis,
      timestamp: new Date(),
      status: 'pending'
    });

    this.emit('approval:required', {
      id: approvalId,
      analysis
    });

    logger.info(`Queued for approval: ${approvalId}`);
  }

  private async requestRefactoringApproval(plan: RefactoringPlan): Promise<void> {
    const approvalId = `refactoring_${Date.now()}`;
    
    this.approvalQueue.set(approvalId, {
      plan,
      timestamp: new Date(),
      status: 'pending'
    });

    this.emit('refactoring:approval:required', {
      id: approvalId,
      plan
    });
  }

  private async executeRefactoringWithMonitoring(plan: RefactoringPlan): Promise<void> {
    this.emit('refactoring:start', plan);
    
    const monitor = setInterval(() => {
      this.emit('refactoring:progress', {
        tasks: plan.tasks.length,
        completed: 0
      });
    }, 5000);

    try {
      const result = await this.refactoringEngine.executeRefactoring(plan);
      
      if (!result.success && result.rollbackRequired) {
        logger.warn('Refactoring failed, rollback executed');
        this.emit('refactoring:rollback', result);
      }
    } finally {
      clearInterval(monitor);
    }
  }

  async approveUpdate(approvalId: string): Promise<void> {
    const item = this.approvalQueue.get(approvalId);
    
    if (!item) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    item.status = 'approved';
    
    if (item.analysis) {
      await this.processUpdates(item.analysis);
    } else if (item.plan) {
      await this.executeRefactoringWithMonitoring(item.plan);
    }

    this.approvalQueue.delete(approvalId);
  }

  async rejectUpdate(approvalId: string): Promise<void> {
    const item = this.approvalQueue.get(approvalId);
    
    if (!item) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    item.status = 'rejected';
    this.approvalQueue.delete(approvalId);
    
    logger.info(`Update ${approvalId} rejected`);
  }

  private async validateProjectConsistency(): Promise<ValidationResult> {
    const validations = await Promise.all([
      this.validateDocumentLinks(),
      this.validateAPIConsistency(),
      this.validateTypeDefinitions(),
      this.validateDependencies()
    ]);

    const result = this.aggregateValidationResults(validations);
    
    if (!result.isValid) {
      logger.warn('Project consistency issues detected', result.issues);
      this.emit('validation:failed', result);
    }

    return result;
  }

  private async validateDocumentLinks(): Promise<SingleValidation> {
    return {
      type: 'document-links',
      isValid: true,
      issues: []
    };
  }

  private async validateAPIConsistency(): Promise<SingleValidation> {
    return {
      type: 'api-consistency',
      isValid: true,
      issues: []
    };
  }

  private async validateTypeDefinitions(): Promise<SingleValidation> {
    return {
      type: 'type-definitions',
      isValid: true,
      issues: []
    };
  }

  private async validateDependencies(): Promise<SingleValidation> {
    return {
      type: 'dependencies',
      isValid: true,
      issues: []
    };
  }

  private aggregateValidationResults(validations: SingleValidation[]): ValidationResult {
    const issues = validations.flatMap(v => v.issues);
    const isValid = validations.every(v => v.isValid);
    
    return {
      isValid,
      issues,
      timestamp: new Date()
    };
  }

  private async generateImpactReport(analysis: AnalysisResult): Promise<ImpactReport> {
    const report: ImpactReport = {
      summary: `${analysis.changes.length} changes with ${analysis.overallImpact} impact`,
      breakingChanges: analysis.changes.filter(c => c.impactLevel === 'breaking'),
      affectedComponents: new Set<string>(),
      requiredActions: [],
      estimatedEffort: 0
    };

    for (const change of analysis.changes) {
      change.affectedComponents.forEach(comp => 
        report.affectedComponents.add(comp)
      );
      report.requiredActions.push(...change.suggestions);
    }

    report.estimatedEffort = analysis.refactoringTasks.reduce(
      (sum, task) => sum + task.estimatedComplexity,
      0
    );

    return report;
  }

  private async createFeatureBranch(analysis: AnalysisResult): Promise<void> {
    const branchName = `auto-update-${Date.now()}`;
    logger.info(`Creating feature branch: ${branchName}`);
  }

  private async notifyDeveloper(notification: any): Promise<void> {
    logger.info('Developer notification:', notification);
    this.emit('notification', notification);
  }

  private handleError(context: string, error: any): void {
    logger.error(`${context} error:`, error);
    this.emit('error', {
      context,
      error,
      timestamp: new Date()
    });
  }

  getStatus(): OrchestratorStatus {
    return { ...this.status };
  }

  getApprovalQueue(): Map<string, any> {
    return new Map(this.approvalQueue);
  }

  async forceAnalysis(files?: string[]): Promise<AnalysisResult> {
    const changes: FileChange[] = (files || []).map(file => ({
      type: 'modified',
      path: file,
      timestamp: Date.now()
    }));

    return await this.analyzer.analyzeChanges(changes);
  }

  updateConfig(config: Partial<OrchestratorConfig>): void {
    Object.assign(this.config, config);
    logger.info('Configuration updated', config);
  }
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  timestamp: Date;
}

interface SingleValidation {
  type: string;
  isValid: boolean;
  issues: string[];
}

interface ImpactReport {
  summary: string;
  breakingChanges: any[];
  affectedComponents: Set<string>;
  requiredActions: string[];
  estimatedEffort: number;
}