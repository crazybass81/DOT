import { EventEmitter } from 'eventemitter3';
import { FileChange } from '../watchers/FileSystemWatcher';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ContextChange {
  filePath: string;
  changeType: string;
  impactLevel: 'minor' | 'major' | 'breaking';
  affectedComponents: string[];
  suggestions: string[];
  requiresDocUpdate: boolean;
  requiresRefactoring: boolean;
}

export interface AnalysisResult {
  changes: ContextChange[];
  overallImpact: 'minor' | 'major' | 'breaking';
  documentationUpdates: string[];
  refactoringTasks: RefactoringTask[];
  dependencies: DependencyChange[];
}

export interface RefactoringTask {
  target: string;
  type: 'extract' | 'rename' | 'move' | 'optimize' | 'cleanup';
  priority: 'low' | 'medium' | 'high';
  description: string;
  estimatedComplexity: number;
}

export interface DependencyChange {
  file: string;
  imports: string[];
  exports: string[];
  affected: string[];
}

export class ContextAnalyzer extends EventEmitter {
  private projectPath: string;
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private componentRegistry: Map<string, ComponentInfo> = new Map();
  private mcpClient: any; // MCP client instance

  constructor(projectPath: string, mcpClient?: any) {
    super();
    this.projectPath = projectPath;
    this.mcpClient = mcpClient;
  }

  async analyzeChanges(changes: FileChange[]): Promise<AnalysisResult> {
    logger.info(`Analyzing ${changes.length} changes`);

    const contextChanges: ContextChange[] = [];
    const documentationUpdates = new Set<string>();
    const refactoringTasks: RefactoringTask[] = [];
    const dependencies: DependencyChange[] = [];

    for (const change of changes) {
      try {
        const analysis = await this.analyzeFileChange(change);
        contextChanges.push(analysis);

        if (analysis.requiresDocUpdate) {
          analysis.affectedComponents.forEach(comp => 
            documentationUpdates.add(comp)
          );
        }

        if (analysis.requiresRefactoring) {
          const tasks = await this.generateRefactoringTasks(analysis);
          refactoringTasks.push(...tasks);
        }

        const deps = await this.analyzeDependencies(change.path);
        if (deps) {
          dependencies.push(deps);
        }
      } catch (error) {
        logger.error(`Error analyzing ${change.path}:`, error);
      }
    }

    const overallImpact = this.calculateOverallImpact(contextChanges);

    const result: AnalysisResult = {
      changes: contextChanges,
      overallImpact,
      documentationUpdates: Array.from(documentationUpdates),
      refactoringTasks: this.prioritizeRefactoringTasks(refactoringTasks),
      dependencies
    };

    this.emit('analysis:complete', result);
    return result;
  }

  private async analyzeFileChange(change: FileChange): Promise<ContextChange> {
    const filePath = path.join(this.projectPath, change.path);
    let content = '';

    if (change.type !== 'deleted') {
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        logger.warn(`Could not read file ${filePath}:`, error);
      }
    }

    const impact = await this.assessImpact(change, content);
    const affected = await this.findAffectedComponents(change.path);
    const suggestions = await this.generateSuggestions(change, impact);

    return {
      filePath: change.path,
      changeType: change.type,
      impactLevel: impact.level,
      affectedComponents: affected,
      suggestions,
      requiresDocUpdate: impact.requiresDoc,
      requiresRefactoring: impact.requiresRefactoring
    };
  }

  private async assessImpact(change: FileChange, content: string): Promise<{
    level: 'minor' | 'major' | 'breaking';
    requiresDoc: boolean;
    requiresRefactoring: boolean;
  }> {
    const fileExt = path.extname(change.path);
    const isSourceCode = ['.ts', '.js', '.tsx', '.jsx'].includes(fileExt);
    const isConfig = ['.json', '.yaml', '.yml', '.env'].includes(fileExt);
    const isDoc = ['.md', '.mdx'].includes(fileExt);

    let level: 'minor' | 'major' | 'breaking' = 'minor';
    let requiresDoc = false;
    let requiresRefactoring = false;

    if (change.type === 'deleted') {
      level = isSourceCode ? 'breaking' : 'major';
      requiresDoc = true;
    } else if (isSourceCode) {
      const analysis = await this.analyzeCodeChanges(content);
      level = analysis.hasBreakingChanges ? 'breaking' : 
              analysis.hasApiChanges ? 'major' : 'minor';
      requiresDoc = analysis.hasApiChanges;
      requiresRefactoring = analysis.complexityScore > 10;
    } else if (isConfig) {
      level = 'major';
      requiresDoc = true;
    } else if (isDoc) {
      level = 'minor';
    }

    if (this.mcpClient) {
      const aiAnalysis = await this.getAIAnalysis(change, content);
      if (aiAnalysis) {
        level = aiAnalysis.impactLevel || level;
        requiresDoc = aiAnalysis.requiresDoc || requiresDoc;
        requiresRefactoring = aiAnalysis.requiresRefactoring || requiresRefactoring;
      }
    }

    return { level, requiresDoc, requiresRefactoring };
  }

  private async analyzeCodeChanges(content: string): Promise<{
    hasBreakingChanges: boolean;
    hasApiChanges: boolean;
    complexityScore: number;
  }> {
    const exportPattern = /export\s+(class|function|const|interface|type)\s+(\w+)/g;
    const exports = [...content.matchAll(exportPattern)].map(m => m[2]);
    
    const hasApiChanges = exports.length > 0;
    const hasBreakingChanges = content.includes('// BREAKING CHANGE') || 
                               content.includes('deprecated');
    
    const lines = content.split('\n');
    const complexityScore = this.calculateComplexity(lines);

    return { hasBreakingChanges, hasApiChanges, complexityScore };
  }

  private calculateComplexity(lines: string[]): number {
    let complexity = 0;
    let nestingLevel = 0;

    for (const line of lines) {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      nestingLevel += openBraces - closeBraces;
      
      if (line.includes('if') || line.includes('for') || line.includes('while')) {
        complexity += 1 + nestingLevel;
      }
      if (line.includes('catch') || line.includes('switch')) {
        complexity += 2;
      }
    }

    return complexity;
  }

  private async findAffectedComponents(filePath: string): Promise<string[]> {
    const affected = new Set<string>();
    
    const directDependents = this.dependencyGraph.get(filePath) || new Set();
    directDependents.forEach(dep => affected.add(dep));
    
    for (const dep of directDependents) {
      const transitive = this.dependencyGraph.get(dep) || new Set();
      transitive.forEach(t => affected.add(t));
    }

    return Array.from(affected);
  }

  private async generateSuggestions(change: FileChange, impact: any): Promise<string[]> {
    const suggestions: string[] = [];

    if (impact.level === 'breaking') {
      suggestions.push('Create migration guide for breaking changes');
      suggestions.push('Update all dependent components');
      suggestions.push('Add deprecation warnings if applicable');
    }

    if (impact.requiresDoc) {
      suggestions.push('Update API documentation');
      suggestions.push('Review and update examples');
    }

    if (impact.requiresRefactoring) {
      suggestions.push('Consider extracting complex logic');
      suggestions.push('Add unit tests for new functionality');
    }

    return suggestions;
  }

  private async generateRefactoringTasks(change: ContextChange): Promise<RefactoringTask[]> {
    const tasks: RefactoringTask[] = [];

    if (change.impactLevel === 'breaking' || change.requiresRefactoring) {
      tasks.push({
        target: change.filePath,
        type: 'optimize',
        priority: 'high',
        description: `Refactor ${change.filePath} to improve maintainability`,
        estimatedComplexity: 5
      });
    }

    for (const component of change.affectedComponents) {
      tasks.push({
        target: component,
        type: 'cleanup',
        priority: 'medium',
        description: `Update ${component} to align with changes in ${change.filePath}`,
        estimatedComplexity: 3
      });
    }

    return tasks;
  }

  private async analyzeDependencies(filePath: string): Promise<DependencyChange | null> {
    try {
      const fullPath = path.join(this.projectPath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      const importPattern = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
      const exportPattern = /export\s+(?:{[^}]*}|(?:class|function|const|interface|type)\s+(\w+))/g;
      
      const imports = [...content.matchAll(importPattern)].map(m => m[1]);
      const exports = [...content.matchAll(exportPattern)].map(m => m[1]).filter(Boolean);
      
      const affected = await this.findAffectedComponents(filePath);

      return {
        file: filePath,
        imports,
        exports,
        affected
      };
    } catch (error) {
      logger.error(`Error analyzing dependencies for ${filePath}:`, error);
      return null;
    }
  }

  private calculateOverallImpact(changes: ContextChange[]): 'minor' | 'major' | 'breaking' {
    if (changes.some(c => c.impactLevel === 'breaking')) {
      return 'breaking';
    }
    if (changes.some(c => c.impactLevel === 'major')) {
      return 'major';
    }
    return 'minor';
  }

  private prioritizeRefactoringTasks(tasks: RefactoringTask[]): RefactoringTask[] {
    return tasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async getAIAnalysis(change: FileChange, content: string): Promise<any> {
    if (!this.mcpClient) {
      return null;
    }

    try {
      const prompt = `
        Analyze this file change:
        File: ${change.path}
        Change Type: ${change.type}
        
        Determine:
        1. Impact level (minor/major/breaking)
        2. Whether documentation needs updating
        3. Whether refactoring is needed
        4. Affected components
      `;

      return await this.mcpClient.analyze(prompt, content);
    } catch (error) {
      logger.error('AI analysis failed:', error);
      return null;
    }
  }

  async updateDependencyGraph(filePath: string, dependencies: string[]): Promise<void> {
    this.dependencyGraph.set(filePath, new Set(dependencies));
    
    for (const dep of dependencies) {
      const existing = this.dependencyGraph.get(dep) || new Set();
      existing.add(filePath);
      this.dependencyGraph.set(dep, existing);
    }
  }

  clearCache(): void {
    this.dependencyGraph.clear();
    this.componentRegistry.clear();
  }
}

interface ComponentInfo {
  path: string;
  type: 'component' | 'service' | 'utility' | 'config';
  exports: string[];
  imports: string[];
  lastModified: number;
}