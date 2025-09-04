import { ContextOrchestrator } from '../src';

async function main() {
  // Create orchestrator instance
  const orchestrator = new ContextOrchestrator({
    projectPath: process.cwd(),
    autoUpdate: true,
    requireApproval: false,
    watchPatterns: [
      'src/**/*.ts',
      'docs/**/*.md'
    ],
    ignoredPaths: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**'
    ]
  });

  // Setup event handlers
  orchestrator.on('started', (status) => {
    console.log('✅ Context Manager started');
    console.log(`📁 Watching ${status.filesWatched} paths`);
  });

  orchestrator.on('processing:start', (changes) => {
    console.log(`\n🔄 Processing ${changes.length} changes...`);
    changes.forEach(change => {
      console.log(`  - ${change.type}: ${change.path}`);
    });
  });

  orchestrator.on('processing:complete', (result) => {
    console.log('✅ Processing complete');
    console.log(`  Overall impact: ${result.analysis.overallImpact}`);
    console.log(`  Documentation updates: ${result.analysis.documentationUpdates.length}`);
    console.log(`  Refactoring suggestions: ${result.analysis.refactoringTasks.length}`);
  });

  orchestrator.on('breaking:changes', (data) => {
    console.log('\n⚠️  BREAKING CHANGES DETECTED');
    console.log('Affected components:', data.report.affectedComponents);
    console.log('Required actions:', data.report.requiredActions);
  });

  orchestrator.on('refactoring:start', (plan) => {
    console.log('\n🔧 Starting refactoring');
    console.log(`  Tasks: ${plan.tasks.length}`);
    console.log(`  Risk level: ${plan.riskLevel}`);
    console.log(`  Estimated time: ${plan.estimatedTime}ms`);
  });

  orchestrator.on('refactoring:complete', (result) => {
    console.log('✅ Refactoring complete');
    console.log(`  Completed: ${result.completedTasks.length}`);
    console.log(`  Failed: ${result.failedTasks.length}`);
    console.log(`  Tests: ${result.testsPassed}/${result.testsRun} passed`);
  });

  orchestrator.on('validation:failed', (result) => {
    console.log('❌ Validation failed');
    console.log('Issues:', result.issues);
  });

  orchestrator.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  // Start the orchestrator
  await orchestrator.start();

  console.log('\n👀 Monitoring project for changes...');
  console.log('Press Ctrl+C to stop\n');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await orchestrator.stop();
    process.exit(0);
  });
}

// Example: Manual analysis
async function manualAnalysis() {
  const orchestrator = new ContextOrchestrator({
    projectPath: process.cwd(),
    autoUpdate: false,
    requireApproval: true
  });

  // Analyze specific files
  const analysis = await orchestrator.forceAnalysis([
    'src/api/auth.ts',
    'src/components/Login.tsx'
  ]);

  console.log('Analysis Results:');
  console.log(`- Overall Impact: ${analysis.overallImpact}`);
  console.log(`- Changes: ${analysis.changes.length}`);
  
  for (const change of analysis.changes) {
    console.log(`\n📄 ${change.filePath}`);
    console.log(`  Impact: ${change.impactLevel}`);
    console.log(`  Affected: ${change.affectedComponents.join(', ')}`);
    
    if (change.suggestions.length > 0) {
      console.log('  Suggestions:');
      change.suggestions.forEach(s => console.log(`    - ${s}`));
    }
  }

  if (analysis.refactoringTasks.length > 0) {
    console.log('\n🔧 Refactoring Opportunities:');
    for (const task of analysis.refactoringTasks) {
      console.log(`  [${task.priority}] ${task.description}`);
      console.log(`    Target: ${task.target}`);
      console.log(`    Complexity: ${task.estimatedComplexity}/10`);
    }
  }
}

// Example: Approval workflow
async function approvalWorkflow() {
  const orchestrator = new ContextOrchestrator({
    projectPath: process.cwd(),
    autoUpdate: false,
    requireApproval: true
  });

  orchestrator.on('approval:required', async (data) => {
    console.log(`\n⏳ Approval required: ${data.id}`);
    console.log('Changes:', data.analysis.changes.length);
    
    // Simulate user approval
    const approved = await promptUser('Approve these changes? (y/n): ');
    
    if (approved) {
      await orchestrator.approveUpdate(data.id);
      console.log('✅ Changes approved and applied');
    } else {
      await orchestrator.rejectUpdate(data.id);
      console.log('❌ Changes rejected');
    }
  });

  await orchestrator.start();
}

// Helper function for user input
async function promptUser(question: string): Promise<boolean> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Run based on command line argument
const mode = process.argv[2] || 'monitor';

switch (mode) {
  case 'monitor':
    main().catch(console.error);
    break;
  case 'analyze':
    manualAnalysis().catch(console.error);
    break;
  case 'approval':
    approvalWorkflow().catch(console.error);
    break;
  default:
    console.log('Usage: npm run example [monitor|analyze|approval]');
}