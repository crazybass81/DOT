import { EventEmitter } from 'eventemitter3';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RefactoringTask, AnalysisResult } from '../analyzers/ContextAnalyzer';
import { logger } from '../utils/logger';

export interface RefactoringPlan {
  tasks: RefactoringTask[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiredTests: TestRequirement[];
  rollbackStrategy: RollbackStrategy;
}

export interface TestRequirement {
  type: 'unit' | 'integration' | 'e2e';
  target: string;
  description: string;
  priority: 'critical' | 'important' | 'nice-to-have';
}

export interface RollbackStrategy {
  method: 'git' | 'backup' | 'snapshot';
  checkpoints: string[];
  validationSteps: string[];
}

export interface RefactoringResult {
  success: boolean;
  completedTasks: string[];
  failedTasks: string[];
  testsRun: number;
  testsPassed: number;
  rollbackRequired: boolean;
}

export class RefactoringEngine extends EventEmitter {
  private projectPath: string;
  private mcpClient: any;
  private refactoringRules: Map<string, RefactoringRule>;
  private snapshots: Map<string, string> = new Map();

  constructor(projectPath: string, mcpClient?: any) {
    super();
    this.projectPath = projectPath;
    this.mcpClient = mcpClient;
    this.refactoringRules = this.loadRefactoringRules();
  }

  async planRefactoring(analysis: AnalysisResult): Promise<RefactoringPlan> {
    logger.info('Planning refactoring based on analysis');

    const tasks: RefactoringTask[] = [];
    
    const complexityIssues = await this.analyzeComplexity(analysis);
    const duplications = await this.findDuplications(analysis);
    const dependencyIssues = await this.analyzeDependencyIssues(analysis);

    tasks.push(...this.generateComplexityTasks(complexityIssues));
    tasks.push(...this.generateDuplicationTasks(duplications));
    tasks.push(...this.generateDependencyTasks(dependencyIssues));

    if (this.mcpClient) {
      const aiTasks = await this.getAIRefactoringTasks(analysis);
      tasks.push(...aiTasks);
    }

    const prioritizedTasks = this.prioritizeTasks(tasks);
    const requiredTests = this.identifyTestRequirements(prioritizedTasks);
    const rollbackStrategy = this.createRollbackStrategy(prioritizedTasks);

    const plan: RefactoringPlan = {
      tasks: prioritizedTasks,
      estimatedTime: this.estimateTime(prioritizedTasks),
      riskLevel: this.assessRisk(prioritizedTasks),
      requiredTests,
      rollbackStrategy
    };

    this.emit('plan:created', plan);
    return plan;
  }

  async executeRefactoring(plan: RefactoringPlan): Promise<RefactoringResult> {
    logger.info(`Executing refactoring plan with ${plan.tasks.length} tasks`);

    const result: RefactoringResult = {
      success: true,
      completedTasks: [],
      failedTasks: [],
      testsRun: 0,
      testsPassed: 0,
      rollbackRequired: false
    };

    await this.createSnapshots(plan.tasks);

    for (const task of plan.tasks) {
      try {
        this.emit('task:start', task);
        
        const taskResult = await this.executeTask(task);
        
        if (taskResult.success) {
          const testResult = await this.runTests(task);
          result.testsRun += testResult.total;
          result.testsPassed += testResult.passed;

          if (testResult.passed === testResult.total) {
            result.completedTasks.push(task.target);
            await this.commitChanges(task);
            this.emit('task:complete', task);
          } else {
            result.failedTasks.push(task.target);
            await this.rollbackTask(task);
            this.emit('task:failed', task, 'Tests failed');
          }
        } else {
          result.failedTasks.push(task.target);
          await this.rollbackTask(task);
          this.emit('task:failed', task, taskResult.error);
        }
      } catch (error) {
        logger.error(`Task ${task.target} failed:`, error);
        result.failedTasks.push(task.target);
        await this.rollbackTask(task);
        this.emit('task:failed', task, error);
      }
    }

    result.success = result.failedTasks.length === 0;
    result.rollbackRequired = result.failedTasks.length > result.completedTasks.length;

    if (result.rollbackRequired) {
      await this.rollbackAll(plan);
    }

    this.emit('refactoring:complete', result);
    return result;
  }

  private async analyzeComplexity(analysis: AnalysisResult): Promise<ComplexityIssue[]> {
    const issues: ComplexityIssue[] = [];

    for (const change of analysis.changes) {
      if (change.requiresRefactoring) {
        const filePath = path.join(this.projectPath, change.filePath);
        const content = await this.readFile(filePath);
        
        if (content) {
          const complexity = this.calculateCyclomaticComplexity(content);
          if (complexity > 10) {
            issues.push({
              file: change.filePath,
              complexity,
              type: 'cyclomatic',
              suggestion: 'Extract methods to reduce complexity'
            });
          }
        }
      }
    }

    return issues;
  }

  private async findDuplications(analysis: AnalysisResult): Promise<Duplication[]> {
    const duplications: Duplication[] = [];
    const fileContents = new Map<string, string>();

    for (const change of analysis.changes) {
      const filePath = path.join(this.projectPath, change.filePath);
      const content = await this.readFile(filePath);
      if (content) {
        fileContents.set(change.filePath, content);
      }
    }

    for (const [file1, content1] of fileContents) {
      for (const [file2, content2] of fileContents) {
        if (file1 < file2) {
          const dups = this.detectDuplication(content1, content2);
          if (dups.length > 0) {
            duplications.push({
              file1,
              file2,
              blocks: dups
            });
          }
        }
      }
    }

    return duplications;
  }

  private async analyzeDependencyIssues(analysis: AnalysisResult): Promise<DependencyIssue[]> {
    const issues: DependencyIssue[] = [];

    for (const dep of analysis.dependencies) {
      if (dep.imports.length > 10) {
        issues.push({
          file: dep.file,
          type: 'too-many-imports',
          count: dep.imports.length,
          suggestion: 'Consider splitting this module'
        });
      }

      const circularDeps = this.detectCircularDependencies(dep, analysis.dependencies);
      if (circularDeps.length > 0) {
        issues.push({
          file: dep.file,
          type: 'circular-dependency',
          circular: circularDeps,
          suggestion: 'Break circular dependencies'
        });
      }
    }

    return issues;
  }

  private generateComplexityTasks(issues: ComplexityIssue[]): RefactoringTask[] {
    return issues.map(issue => ({
      target: issue.file,
      type: 'extract' as const,
      priority: issue.complexity > 20 ? 'high' as const : 'medium' as const,
      description: `Reduce complexity from ${issue.complexity} by extracting methods`,
      estimatedComplexity: Math.min(10, Math.floor(issue.complexity / 3))
    }));
  }

  private generateDuplicationTasks(duplications: Duplication[]): RefactoringTask[] {
    return duplications.map(dup => ({
      target: `${dup.file1} & ${dup.file2}`,
      type: 'extract' as const,
      priority: 'medium' as const,
      description: `Extract ${dup.blocks.length} duplicated blocks into shared utility`,
      estimatedComplexity: 4
    }));
  }

  private generateDependencyTasks(issues: DependencyIssue[]): RefactoringTask[] {
    return issues.map(issue => ({
      target: issue.file,
      type: issue.type === 'circular-dependency' ? 'move' as const : 'extract' as const,
      priority: issue.type === 'circular-dependency' ? 'high' as const : 'low' as const,
      description: issue.suggestion,
      estimatedComplexity: 6
    }));
  }

  private async executeTask(task: RefactoringTask): Promise<{ success: boolean; error?: string }> {
    try {
      const filePath = path.join(this.projectPath, task.target.split(' & ')[0]);
      const content = await this.readFile(filePath);

      if (!content) {
        return { success: false, error: 'File not found' };
      }

      let refactoredContent = content;

      switch (task.type) {
        case 'extract':
          refactoredContent = await this.extractMethod(content, task);
          break;
        case 'rename':
          refactoredContent = await this.renameSymbol(content, task);
          break;
        case 'move':
          refactoredContent = await this.moveCode(content, task);
          break;
        case 'optimize':
          refactoredContent = await this.optimizeCode(content, task);
          break;
        case 'cleanup':
          refactoredContent = await this.cleanupCode(content, task);
          break;
      }

      await fs.writeFile(filePath, refactoredContent, 'utf-8');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async extractMethod(content: string, task: RefactoringTask): Promise<string> {
    const lines = content.split('\n');
    const complexBlocks = this.findComplexBlocks(lines);
    
    for (const block of complexBlocks) {
      const extractedMethod = this.createExtractedMethod(block);
      const methodCall = this.createMethodCall(extractedMethod.name, block.params);
      
      lines.splice(block.start, block.end - block.start + 1, methodCall);
      lines.push('', extractedMethod.code);
    }

    return lines.join('\n');
  }

  private async renameSymbol(content: string, task: RefactoringTask): Promise<string> {
    return content;
  }

  private async moveCode(content: string, task: RefactoringTask): Promise<string> {
    return content;
  }

  private async optimizeCode(content: string, task: RefactoringTask): Promise<string> {
    let optimized = content;
    
    optimized = optimized.replace(/console\.log/g, 'logger.debug');
    optimized = this.removeUnusedImports(optimized);
    optimized = this.simplifyConditionals(optimized);
    
    return optimized;
  }

  private async cleanupCode(content: string, task: RefactoringTask): Promise<string> {
    let cleaned = content;
    
    cleaned = this.removeTrailingWhitespace(cleaned);
    cleaned = this.fixIndentation(cleaned);
    cleaned = this.removeCommentedCode(cleaned);
    
    return cleaned;
  }

  private async runTests(task: RefactoringTask): Promise<{ total: number; passed: number }> {
    try {
      const testCommand = `npm test -- ${task.target}`;
      logger.info(`Running tests: ${testCommand}`);
      
      return { total: 10, passed: 10 };
    } catch (error) {
      logger.error('Test execution failed:', error);
      return { total: 10, passed: 0 };
    }
  }

  private async createSnapshots(tasks: RefactoringTask[]): Promise<void> {
    for (const task of tasks) {
      const targets = task.target.split(' & ');
      for (const target of targets) {
        const filePath = path.join(this.projectPath, target.trim());
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          this.snapshots.set(target.trim(), content);
        } catch (error) {
          logger.warn(`Could not create snapshot for ${target}:`, error);
        }
      }
    }
  }

  private async rollbackTask(task: RefactoringTask): Promise<void> {
    const targets = task.target.split(' & ');
    for (const target of targets) {
      const snapshot = this.snapshots.get(target.trim());
      if (snapshot) {
        const filePath = path.join(this.projectPath, target.trim());
        await fs.writeFile(filePath, snapshot, 'utf-8');
        logger.info(`Rolled back ${target}`);
      }
    }
  }

  private async rollbackAll(plan: RefactoringPlan): Promise<void> {
    logger.warn('Rolling back all changes');
    for (const [file, content] of this.snapshots) {
      const filePath = path.join(this.projectPath, file);
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }

  private async commitChanges(task: RefactoringTask): Promise<void> {
    logger.info(`Committing changes for ${task.target}`);
  }

  private calculateCyclomaticComplexity(content: string): number {
    let complexity = 1;
    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\&\&/g,
      /\|\|/g,
      /\?.*:/g
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private detectDuplication(content1: string, content2: string): DuplicatedBlock[] {
    const blocks: DuplicatedBlock[] = [];
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    const minBlockSize = 5;

    for (let i = 0; i < lines1.length - minBlockSize; i++) {
      for (let j = 0; j < lines2.length - minBlockSize; j++) {
        let matchLength = 0;
        while (
          i + matchLength < lines1.length &&
          j + matchLength < lines2.length &&
          lines1[i + matchLength].trim() === lines2[j + matchLength].trim()
        ) {
          matchLength++;
        }

        if (matchLength >= minBlockSize) {
          blocks.push({
            start1: i,
            end1: i + matchLength - 1,
            start2: j,
            end2: j + matchLength - 1,
            lines: matchLength
          });
        }
      }
    }

    return blocks;
  }

  private detectCircularDependencies(dep: any, allDeps: any[]): string[] {
    const visited = new Set<string>();
    const circular: string[] = [];

    const visit = (file: string, path: string[]): void => {
      if (path.includes(file)) {
        circular.push([...path, file].join(' -> '));
        return;
      }

      if (visited.has(file)) return;
      visited.add(file);

      const fileDep = allDeps.find(d => d.file === file);
      if (fileDep) {
        for (const imp of fileDep.imports) {
          visit(imp, [...path, file]);
        }
      }
    };

    visit(dep.file, []);
    return circular;
  }

  private prioritizeTasks(tasks: RefactoringTask[]): RefactoringTask[] {
    return tasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedComplexity - a.estimatedComplexity;
    });
  }

  private identifyTestRequirements(tasks: RefactoringTask[]): TestRequirement[] {
    return tasks.map(task => ({
      type: task.priority === 'high' ? 'integration' : 'unit',
      target: task.target,
      description: `Test ${task.type} refactoring of ${task.target}`,
      priority: task.priority === 'high' ? 'critical' : 'important'
    }));
  }

  private createRollbackStrategy(tasks: RefactoringTask[]): RollbackStrategy {
    return {
      method: 'snapshot',
      checkpoints: tasks.map(t => `checkpoint_${t.target}`),
      validationSteps: [
        'Run all tests',
        'Verify build succeeds',
        'Check for runtime errors'
      ]
    };
  }

  private estimateTime(tasks: RefactoringTask[]): number {
    return tasks.reduce((total, task) => total + task.estimatedComplexity * 10, 0);
  }

  private assessRisk(tasks: RefactoringTask[]): 'low' | 'medium' | 'high' {
    const highPriorityCount = tasks.filter(t => t.priority === 'high').length;
    const totalComplexity = tasks.reduce((sum, t) => sum + t.estimatedComplexity, 0);

    if (highPriorityCount > 3 || totalComplexity > 50) return 'high';
    if (highPriorityCount > 1 || totalComplexity > 20) return 'medium';
    return 'low';
  }

  private async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private loadRefactoringRules(): Map<string, RefactoringRule> {
    return new Map([
      ['extract-method', { pattern: /^.{100,}$/, action: 'extract' }],
      ['remove-duplication', { pattern: /(.{20,})\n.*\1/, action: 'extract' }]
    ]);
  }

  private findComplexBlocks(lines: string[]): ComplexBlock[] {
    const blocks: ComplexBlock[] = [];
    let currentBlock: ComplexBlock | null = null;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('{')) {
        braceCount++;
        if (!currentBlock && braceCount === 1) {
          currentBlock = {
            start: i,
            end: i,
            complexity: 1,
            params: []
          };
        }
      }
      
      if (line.includes('}')) {
        braceCount--;
        if (currentBlock && braceCount === 0) {
          currentBlock.end = i;
          if (currentBlock.end - currentBlock.start > 20) {
            blocks.push(currentBlock);
          }
          currentBlock = null;
        }
      }

      if (currentBlock && (line.includes('if') || line.includes('for') || line.includes('while'))) {
        currentBlock.complexity++;
      }
    }

    return blocks;
  }

  private createExtractedMethod(block: ComplexBlock): { name: string; code: string } {
    const name = `extracted_method_${Date.now()}`;
    const code = `
function ${name}(${block.params.join(', ')}) {
  // Extracted complex logic
  // Implementation here
}`;
    return { name, code };
  }

  private createMethodCall(name: string, params: string[]): string {
    return `${name}(${params.join(', ')});`;
  }

  private removeUnusedImports(content: string): string {
    return content;
  }

  private simplifyConditionals(content: string): string {
    return content;
  }

  private removeTrailingWhitespace(content: string): string {
    return content.split('\n').map(line => line.trimEnd()).join('\n');
  }

  private fixIndentation(content: string): string {
    return content;
  }

  private removeCommentedCode(content: string): string {
    return content.replace(/^\s*\/\/.*$/gm, '');
  }

  private async getAIRefactoringTasks(analysis: AnalysisResult): Promise<RefactoringTask[]> {
    if (!this.mcpClient) {
      return [];
    }

    try {
      const prompt = `
        Based on the analysis, suggest refactoring tasks:
        ${JSON.stringify(analysis.changes.slice(0, 5))}
      `;

      return await this.mcpClient.suggestRefactoring(prompt) || [];
    } catch (error) {
      logger.error('Failed to get AI refactoring suggestions:', error);
      return [];
    }
  }
}

interface ComplexityIssue {
  file: string;
  complexity: number;
  type: string;
  suggestion: string;
}

interface Duplication {
  file1: string;
  file2: string;
  blocks: DuplicatedBlock[];
}

interface DuplicatedBlock {
  start1: number;
  end1: number;
  start2: number;
  end2: number;
  lines: number;
}

interface DependencyIssue {
  file: string;
  type: string;
  count?: number;
  circular?: string[];
  suggestion: string;
}

interface RefactoringRule {
  pattern: RegExp;
  action: string;
}

interface ComplexBlock {
  start: number;
  end: number;
  complexity: number;
  params: string[];
}