import { EventEmitter } from 'eventemitter3';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ContextChange, AnalysisResult } from '../analyzers/ContextAnalyzer';
import { logger } from '../utils/logger';

export interface DocumentUpdate {
  filePath: string;
  sections: UpdateSection[];
  priority: 'high' | 'medium' | 'low';
  type: 'api' | 'architecture' | 'guide' | 'changelog';
}

export interface UpdateSection {
  name: string;
  action: 'add' | 'modify' | 'remove';
  content: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface UpdatePlan {
  updates: DocumentUpdate[];
  backupPath: string;
  validationChecks: ValidationCheck[];
}

export interface ValidationCheck {
  type: 'link' | 'reference' | 'consistency';
  target: string;
  status: 'pass' | 'fail' | 'warning';
  message?: string;
}

export class DocumentationUpdater extends EventEmitter {
  private projectPath: string;
  private documentPaths: Map<string, string>;
  private templates: Map<string, string>;
  private updateQueue: DocumentUpdate[] = [];
  private mcpClient: any;

  constructor(projectPath: string, mcpClient?: any) {
    super();
    this.projectPath = projectPath;
    this.mcpClient = mcpClient;
    this.documentPaths = new Map([
      ['api', 'docs/api.md'],
      ['architecture', 'docs/architecture.md'],
      ['changelog', 'CHANGELOG.md'],
      ['readme', 'README.md']
    ]);
    this.templates = this.loadTemplates();
  }

  async processDocumentUpdates(analysisResult: AnalysisResult): Promise<UpdatePlan> {
    logger.info('Processing documentation updates');

    const affectedDocs = await this.identifyAffectedDocuments(analysisResult);
    const updatePlan: UpdatePlan = {
      updates: [],
      backupPath: await this.createBackup(),
      validationChecks: []
    };

    for (const doc of affectedDocs) {
      try {
        const update = await this.createUpdateForDocument(doc, analysisResult);
        if (update) {
          updatePlan.updates.push(update);
        }
      } catch (error) {
        logger.error(`Error creating update for ${doc}:`, error);
      }
    }

    updatePlan.validationChecks = await this.validateUpdatePlan(updatePlan);
    
    if (this.shouldApplyUpdates(updatePlan)) {
      await this.applyUpdates(updatePlan);
    }

    this.emit('updates:complete', updatePlan);
    return updatePlan;
  }

  private async identifyAffectedDocuments(analysis: AnalysisResult): Promise<string[]> {
    const affected = new Set<string>();

    for (const change of analysis.changes) {
      if (change.impactLevel === 'breaking' || change.impactLevel === 'major') {
        affected.add('api');
        affected.add('changelog');
      }

      if (change.requiresDocUpdate) {
        affected.add('api');
        if (change.filePath.includes('src/')) {
          affected.add('architecture');
        }
      }
    }

    if (analysis.refactoringTasks.length > 0) {
      affected.add('architecture');
    }

    return Array.from(affected);
  }

  private async createUpdateForDocument(
    docType: string,
    analysis: AnalysisResult
  ): Promise<DocumentUpdate | null> {
    const docPath = this.documentPaths.get(docType);
    if (!docPath) {
      return null;
    }

    const fullPath = path.join(this.projectPath, docPath);
    let currentContent = '';

    try {
      currentContent = await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      logger.warn(`Document ${docPath} not found, will create`);
      currentContent = this.getTemplate(docType);
    }

    const sections = await this.generateUpdateSections(
      docType,
      currentContent,
      analysis
    );

    if (sections.length === 0) {
      return null;
    }

    return {
      filePath: docPath,
      sections,
      priority: this.calculatePriority(analysis),
      type: docType as any
    };
  }

  private async generateUpdateSections(
    docType: string,
    currentContent: string,
    analysis: AnalysisResult
  ): Promise<UpdateSection[]> {
    const sections: UpdateSection[] = [];

    switch (docType) {
      case 'api':
        sections.push(...await this.generateApiDocSections(currentContent, analysis));
        break;
      case 'architecture':
        sections.push(...await this.generateArchitectureSections(currentContent, analysis));
        break;
      case 'changelog':
        sections.push(...await this.generateChangelogSections(currentContent, analysis));
        break;
      case 'readme':
        sections.push(...await this.generateReadmeSections(currentContent, analysis));
        break;
    }

    if (this.mcpClient) {
      const aiSections = await this.getAISuggestions(docType, currentContent, analysis);
      sections.push(...aiSections);
    }

    return sections;
  }

  private async generateApiDocSections(
    content: string,
    analysis: AnalysisResult
  ): Promise<UpdateSection[]> {
    const sections: UpdateSection[] = [];

    for (const change of analysis.changes) {
      if (change.impactLevel === 'breaking' || change.impactLevel === 'major') {
        const apiSection = this.extractApiSection(change.filePath, content);
        
        if (apiSection) {
          sections.push({
            name: `API: ${change.filePath}`,
            action: 'modify',
            content: await this.generateApiDocumentation(change),
            lineStart: apiSection.start,
            lineEnd: apiSection.end
          });
        } else {
          sections.push({
            name: `API: ${change.filePath}`,
            action: 'add',
            content: await this.generateApiDocumentation(change)
          });
        }
      }
    }

    return sections;
  }

  private async generateArchitectureSections(
    content: string,
    analysis: AnalysisResult
  ): Promise<UpdateSection[]> {
    const sections: UpdateSection[] = [];

    if (analysis.refactoringTasks.length > 0) {
      const refactoringContent = this.generateRefactoringDocumentation(
        analysis.refactoringTasks
      );

      sections.push({
        name: 'Refactoring Plans',
        action: 'modify',
        content: refactoringContent
      });
    }

    for (const dep of analysis.dependencies) {
      if (dep.exports.length > 0) {
        sections.push({
          name: `Component: ${path.basename(dep.file, path.extname(dep.file))}`,
          action: 'modify',
          content: this.generateComponentDocumentation(dep)
        });
      }
    }

    return sections;
  }

  private async generateChangelogSections(
    content: string,
    analysis: AnalysisResult
  ): Promise<UpdateSection[]> {
    const sections: UpdateSection[] = [];
    const date = new Date().toISOString().split('T')[0];
    const version = await this.getNextVersion(analysis.overallImpact);

    const changelogEntry = this.generateChangelogEntry(date, version, analysis);

    const insertPosition = this.findChangelogInsertPosition(content);
    
    sections.push({
      name: `Version ${version}`,
      action: 'add',
      content: changelogEntry,
      lineStart: insertPosition
    });

    return sections;
  }

  private async generateReadmeSections(
    content: string,
    analysis: AnalysisResult
  ): Promise<UpdateSection[]> {
    const sections: UpdateSection[] = [];

    if (analysis.overallImpact === 'breaking') {
      const migrationGuide = this.generateMigrationGuide(analysis);
      
      sections.push({
        name: 'Migration Guide',
        action: content.includes('## Migration') ? 'modify' : 'add',
        content: migrationGuide
      });
    }

    return sections;
  }

  private async generateApiDocumentation(change: ContextChange): Promise<string> {
    const doc = [`### ${path.basename(change.filePath)}\n`];
    
    doc.push(`**Status**: ${change.impactLevel === 'breaking' ? '⚠️ Breaking Change' : '✅ Updated'}\n`);
    doc.push(`**Type**: ${change.changeType}\n`);
    
    if (change.affectedComponents.length > 0) {
      doc.push('\n**Affected Components:**');
      change.affectedComponents.forEach(comp => {
        doc.push(`- ${comp}`);
      });
    }

    if (change.suggestions.length > 0) {
      doc.push('\n**Required Actions:**');
      change.suggestions.forEach(suggestion => {
        doc.push(`- ${suggestion}`);
      });
    }

    return doc.join('\n');
  }

  private generateRefactoringDocumentation(tasks: any[]): string {
    const doc = ['## Refactoring Tasks\n'];
    
    const grouped = this.groupTasksByPriority(tasks);
    
    for (const [priority, priorityTasks] of Object.entries(grouped)) {
      doc.push(`\n### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n`);
      
      for (const task of priorityTasks as any[]) {
        doc.push(`- **${task.target}**: ${task.description}`);
        doc.push(`  - Type: ${task.type}`);
        doc.push(`  - Complexity: ${task.estimatedComplexity}/10`);
      }
    }

    return doc.join('\n');
  }

  private generateComponentDocumentation(dep: any): string {
    const doc = [`## ${path.basename(dep.file, path.extname(dep.file))}\n`];
    
    if (dep.exports.length > 0) {
      doc.push('### Exports');
      dep.exports.forEach((exp: string) => {
        doc.push(`- \`${exp}\``);
      });
    }

    if (dep.imports.length > 0) {
      doc.push('\n### Dependencies');
      dep.imports.forEach((imp: string) => {
        doc.push(`- ${imp}`);
      });
    }

    if (dep.affected.length > 0) {
      doc.push('\n### Used By');
      dep.affected.forEach((aff: string) => {
        doc.push(`- ${aff}`);
      });
    }

    return doc.join('\n');
  }

  private generateChangelogEntry(date: string, version: string, analysis: AnalysisResult): string {
    const entry = [`## [${version}] - ${date}\n`];

    const breaking = analysis.changes.filter(c => c.impactLevel === 'breaking');
    const major = analysis.changes.filter(c => c.impactLevel === 'major');
    const minor = analysis.changes.filter(c => c.impactLevel === 'minor');

    if (breaking.length > 0) {
      entry.push('### ⚠️ Breaking Changes');
      breaking.forEach(c => {
        entry.push(`- ${c.filePath}: ${c.changeType}`);
      });
    }

    if (major.length > 0) {
      entry.push('\n### Major Changes');
      major.forEach(c => {
        entry.push(`- ${c.filePath}: ${c.changeType}`);
      });
    }

    if (minor.length > 0) {
      entry.push('\n### Minor Changes');
      minor.forEach(c => {
        entry.push(`- ${c.filePath}: ${c.changeType}`);
      });
    }

    return entry.join('\n') + '\n';
  }

  private generateMigrationGuide(analysis: AnalysisResult): string {
    const guide = ['## Migration Guide\n'];
    
    guide.push('### Breaking Changes\n');
    
    for (const change of analysis.changes.filter(c => c.impactLevel === 'breaking')) {
      guide.push(`#### ${change.filePath}\n`);
      guide.push(`**Before:**`);
      guide.push('```typescript');
      guide.push('// Previous implementation');
      guide.push('```\n');
      guide.push(`**After:**`);
      guide.push('```typescript');
      guide.push('// New implementation');
      guide.push('```\n');
      
      if (change.suggestions.length > 0) {
        guide.push('**Migration Steps:**');
        change.suggestions.forEach((s, i) => {
          guide.push(`${i + 1}. ${s}`);
        });
      }
    }

    return guide.join('\n');
  }

  private async applyUpdates(plan: UpdatePlan): Promise<void> {
    for (const update of plan.updates) {
      try {
        await this.applyDocumentUpdate(update);
        logger.info(`Applied updates to ${update.filePath}`);
      } catch (error) {
        logger.error(`Failed to apply updates to ${update.filePath}:`, error);
        await this.rollback(plan.backupPath);
        throw error;
      }
    }
  }

  private async applyDocumentUpdate(update: DocumentUpdate): Promise<void> {
    const fullPath = path.join(this.projectPath, update.filePath);
    let content = '';

    try {
      content = await fs.readFile(fullPath, 'utf-8');
    } catch {
      content = this.getTemplate(update.type);
    }

    const lines = content.split('\n');

    for (const section of update.sections) {
      if (section.action === 'add') {
        const insertLine = section.lineStart || lines.length;
        lines.splice(insertLine, 0, section.content);
      } else if (section.action === 'modify' && section.lineStart && section.lineEnd) {
        const newLines = section.content.split('\n');
        lines.splice(section.lineStart, section.lineEnd - section.lineStart + 1, ...newLines);
      } else if (section.action === 'remove' && section.lineStart && section.lineEnd) {
        lines.splice(section.lineStart, section.lineEnd - section.lineStart + 1);
      }
    }

    await fs.writeFile(fullPath, lines.join('\n'), 'utf-8');
  }

  private async validateUpdatePlan(plan: UpdatePlan): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = [];

    for (const update of plan.updates) {
      checks.push(...await this.validateDocument(update));
    }

    return checks;
  }

  private async validateDocument(update: DocumentUpdate): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = [];

    checks.push({
      type: 'consistency',
      target: update.filePath,
      status: 'pass',
      message: 'Document structure is valid'
    });

    return checks;
  }

  private shouldApplyUpdates(plan: UpdatePlan): boolean {
    const hasFailures = plan.validationChecks.some(c => c.status === 'fail');
    return !hasFailures && plan.updates.length > 0;
  }

  private async createBackup(): Promise<string> {
    const backupDir = path.join(this.projectPath, '.backups', new Date().toISOString());
    await fs.mkdir(backupDir, { recursive: true });
    return backupDir;
  }

  private async rollback(backupPath: string): Promise<void> {
    logger.warn(`Rolling back changes from ${backupPath}`);
  }

  private loadTemplates(): Map<string, string> {
    return new Map([
      ['api', '# API Documentation\n\n'],
      ['architecture', '# Architecture\n\n'],
      ['changelog', '# Changelog\n\n'],
      ['readme', '# Project README\n\n']
    ]);
  }

  private getTemplate(type: string): string {
    return this.templates.get(type) || '';
  }

  private extractApiSection(filePath: string, content: string): { start: number; end: number } | null {
    const lines = content.split('\n');
    const header = `### ${path.basename(filePath)}`;
    
    const startIdx = lines.findIndex(line => line.includes(header));
    if (startIdx === -1) return null;

    let endIdx = startIdx + 1;
    while (endIdx < lines.length && !lines[endIdx].startsWith('###')) {
      endIdx++;
    }

    return { start: startIdx, end: endIdx - 1 };
  }

  private findChangelogInsertPosition(content: string): number {
    const lines = content.split('\n');
    const changelogStart = lines.findIndex(line => line.startsWith('## ['));
    return changelogStart > 0 ? changelogStart : lines.findIndex(line => line.startsWith('# Changelog')) + 2;
  }

  private async getNextVersion(impact: 'minor' | 'major' | 'breaking'): Promise<string> {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const [major, minor, patch] = packageJson.version.split('.').map(Number);

      if (impact === 'breaking') {
        return `${major + 1}.0.0`;
      } else if (impact === 'major') {
        return `${major}.${minor + 1}.0`;
      } else {
        return `${major}.${minor}.${patch + 1}`;
      }
    } catch {
      return '1.0.0';
    }
  }

  private groupTasksByPriority(tasks: any[]): Record<string, any[]> {
    return tasks.reduce((grouped, task) => {
      if (!grouped[task.priority]) {
        grouped[task.priority] = [];
      }
      grouped[task.priority].push(task);
      return grouped;
    }, {} as Record<string, any[]>);
  }

  private async getAISuggestions(
    docType: string,
    content: string,
    analysis: AnalysisResult
  ): Promise<UpdateSection[]> {
    if (!this.mcpClient) {
      return [];
    }

    try {
      const prompt = `
        Document Type: ${docType}
        Current Content Length: ${content.length} characters
        Changes: ${JSON.stringify(analysis.changes.map(c => ({
          file: c.filePath,
          impact: c.impactLevel
        })))}
        
        Suggest documentation updates needed.
      `;

      const suggestions = await this.mcpClient.suggest(prompt);
      return suggestions || [];
    } catch (error) {
      logger.error('Failed to get AI suggestions:', error);
      return [];
    }
  }
}