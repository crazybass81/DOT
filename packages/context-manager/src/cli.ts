#!/usr/bin/env node

import { Command } from 'commander';
import { ContextOrchestrator } from './ContextOrchestrator';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './utils/logger';

const program = new Command();

program
  .name('context-manager')
  .description('Enterprise Context Management System for maintaining codebase consistency')
  .version('1.0.0');

program
  .command('start')
  .description('Start the context manager for a project')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-c, --config <config>', 'Configuration file path')
  .option('--auto-update', 'Enable automatic updates', false)
  .option('--no-approval', 'Disable approval requirement')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config || '.vscode/context-manager.json');
      
      const orchestrator = new ContextOrchestrator({
        projectPath: options.path,
        autoUpdate: options.autoUpdate || config['context-manager']?.autoUpdate,
        requireApproval: options.approval !== false,
        watchPatterns: config['context-manager']?.watchPatterns,
        ignoredPaths: config['context-manager']?.ignoredPaths
      });

      setupEventHandlers(orchestrator);
      
      await orchestrator.start();
      
      console.log('✅ Context Manager started successfully');
      console.log(`📁 Watching: ${options.path}`);
      console.log('Press Ctrl+C to stop...');
      
      process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping Context Manager...');
        await orchestrator.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Failed to start:', error);
      process.exit(1);
    }
  });

program
  .command('analyze <files...>')
  .description('Analyze specific files for context changes')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (files, options) => {
    try {
      const orchestrator = new ContextOrchestrator({
        projectPath: options.path,
        autoUpdate: false,
        requireApproval: true
      });

      const analysis = await orchestrator.forceAnalysis(files);
      
      console.log('\n📊 Analysis Results:');
      console.log(`Overall Impact: ${analysis.overallImpact}`);
      console.log(`Changes: ${analysis.changes.length}`);
      console.log(`Documentation Updates Needed: ${analysis.documentationUpdates.length}`);
      console.log(`Refactoring Tasks: ${analysis.refactoringTasks.length}`);
      
      if (analysis.changes.length > 0) {
        console.log('\n📝 Change Details:');
        for (const change of analysis.changes) {
          console.log(`  - ${change.filePath}: ${change.impactLevel}`);
          if (change.suggestions.length > 0) {
            console.log(`    Suggestions: ${change.suggestions.join(', ')}`);
          }
        }
      }
      
      if (analysis.refactoringTasks.length > 0) {
        console.log('\n🔧 Refactoring Tasks:');
        for (const task of analysis.refactoringTasks.slice(0, 5)) {
          console.log(`  - [${task.priority}] ${task.description}`);
        }
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate project consistency')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (options) => {
    try {
      console.log('🔍 Validating project consistency...');
      
      const validations = [
        validateDocumentStructure(options.path),
        validateDependencies(options.path),
        validateTypeConsistency(options.path)
      ];
      
      const results = await Promise.all(validations);
      const hasErrors = results.some(r => !r.valid);
      
      if (hasErrors) {
        console.log('\n❌ Validation failed:');
        for (const result of results) {
          if (!result.valid) {
            console.log(`  - ${result.type}: ${result.errors.join(', ')}`);
          }
        }
        process.exit(1);
      } else {
        console.log('✅ All validations passed');
      }
    } catch (error) {
      console.error('❌ Validation error:', error);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch project and display changes in real-time')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('--patterns <patterns>', 'Watch patterns (comma-separated)')
  .action(async (options) => {
    try {
      const patterns = options.patterns ? 
        options.patterns.split(',') : 
        ['**/*.ts', '**/*.js', '**/*.md'];
      
      const orchestrator = new ContextOrchestrator({
        projectPath: options.path,
        autoUpdate: false,
        requireApproval: true,
        watchPatterns: patterns
      });

      orchestrator.on('processing:start', (changes) => {
        console.log(`\n🔄 Processing ${changes.length} changes...`);
      });

      orchestrator.on('processing:complete', (result) => {
        console.log(`✅ Processed successfully`);
        console.log(`  Impact: ${result.analysis.overallImpact}`);
        console.log(`  Documentation updates: ${result.analysis.documentationUpdates.length}`);
        console.log(`  Refactoring tasks: ${result.analysis.refactoringTasks.length}`);
      });

      orchestrator.on('breaking:changes', (data) => {
        console.log('\n⚠️  BREAKING CHANGES DETECTED:');
        for (const change of data.analysis.changes.filter((c: any) => c.impactLevel === 'breaking')) {
          console.log(`  - ${change.filePath}`);
        }
      });

      await orchestrator.start();
      
      console.log('👀 Watching for changes...');
      console.log('Press Ctrl+C to stop');
      
      process.on('SIGINT', async () => {
        await orchestrator.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Watch failed:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize context manager configuration')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (options) => {
    try {
      const configPath = path.join(options.path, '.vscode', 'context-manager.json');
      
      if (fs.existsSync(configPath)) {
        console.log('⚠️  Configuration already exists');
        return;
      }

      const defaultConfig = {
        'context-manager': {
          enabled: true,
          autoUpdate: false,
          requireApproval: true,
          watchPatterns: [
            'src/**/*.{js,ts,jsx,tsx}',
            'docs/**/*.md',
            '*.md'
          ],
          ignoredPaths: [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**'
          ],
          refactoring: {
            autoSuggest: true,
            requireApproval: true,
            complexityThreshold: 10
          },
          documentation: {
            autoGenerate: true,
            updateOnSave: true
          }
        }
      };

      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      
      console.log('✅ Configuration created:', configPath);
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      process.exit(1);
    }
  });

async function loadConfig(configPath: string): Promise<any> {
  try {
    const fullPath = path.resolve(configPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    logger.warn('Could not load config:', error);
  }
  return {};
}

function setupEventHandlers(orchestrator: ContextOrchestrator): void {
  orchestrator.on('started', (status) => {
    logger.info('Orchestrator started', status);
  });

  orchestrator.on('processing:start', (changes) => {
    logger.info(`Processing ${changes.length} changes`);
  });

  orchestrator.on('processing:complete', (result) => {
    logger.info('Processing complete', result);
  });

  orchestrator.on('breaking:changes', (data) => {
    logger.warn('Breaking changes detected', data);
  });

  orchestrator.on('error', (error) => {
    logger.error('Orchestrator error', error);
  });

  orchestrator.on('notification', (notification) => {
    console.log(`\n📢 ${notification.type}: ${notification.message || notification.report?.summary}`);
  });
}

async function validateDocumentStructure(projectPath: string): Promise<any> {
  const docsPath = path.join(projectPath, 'docs');
  const errors = [];
  
  if (!fs.existsSync(docsPath)) {
    errors.push('Documentation directory not found');
  }
  
  return {
    type: 'Document Structure',
    valid: errors.length === 0,
    errors
  };
}

async function validateDependencies(projectPath: string): Promise<any> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const errors = [];
  
  if (!fs.existsSync(packageJsonPath)) {
    errors.push('package.json not found');
  }
  
  return {
    type: 'Dependencies',
    valid: errors.length === 0,
    errors
  };
}

async function validateTypeConsistency(projectPath: string): Promise<any> {
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  const errors = [];
  
  if (!fs.existsSync(tsconfigPath)) {
    errors.push('tsconfig.json not found');
  }
  
  return {
    type: 'Type Consistency',
    valid: errors.length === 0,
    errors
  };
}

program.parse(process.argv);