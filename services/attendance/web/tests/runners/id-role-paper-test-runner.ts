/**
 * ID-ROLE-PAPER Test Runner
 * 
 * Comprehensive test runner for the complete ID-ROLE-PAPER architecture:
 * - Orchestrates all test suites
 * - Manages test data setup and cleanup
 * - Provides performance metrics and reporting
 * - Handles test environment configuration
 * - Generates comprehensive test reports
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface TestSuite {
  name: string;
  description: string;
  pattern: string;
  timeout: number;
  parallel: boolean;
  dependencies: string[];
  tags: string[];
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  errors: string[];
  warnings: string[];
}

interface TestRunSummary {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  suiteResults: TestResult[];
  overallCoverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  recommendations: string[];
  environment: {
    nodeVersion: string;
    testFramework: string;
    database: string;
    timestamp: string;
  };
}

export class IdRolePaperTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      description: 'Core business logic and service tests',
      pattern: 'tests/unit/**/*.test.ts',
      timeout: 30000,
      parallel: true,
      dependencies: [],
      tags: ['unit', 'fast', 'core']
    },
    {
      name: 'Integration Tests',
      description: 'API endpoints and database integration',
      pattern: 'tests/integration/**/*.test.ts',
      timeout: 60000,
      parallel: false,
      dependencies: ['database'],
      tags: ['integration', 'database', 'api']
    },
    {
      name: 'Security Tests',
      description: 'Security vulnerabilities and privilege escalation',
      pattern: 'tests/security/**/*.test.ts',
      timeout: 120000,
      parallel: false,
      dependencies: ['database', 'auth'],
      tags: ['security', 'critical', 'slow']
    },
    {
      name: 'Performance Tests',
      description: 'Load testing and performance benchmarks',
      pattern: 'tests/performance/**/*.test.ts',
      timeout: 300000,
      parallel: false,
      dependencies: ['database'],
      tags: ['performance', 'slow', 'optional']
    },
    {
      name: 'E2E Tests',
      description: 'End-to-end user workflow tests',
      pattern: 'tests/e2e/**/*.test.ts',
      timeout: 180000,
      parallel: false,
      dependencies: ['database', 'server'],
      tags: ['e2e', 'slow', 'ui']
    }
  ];

  private results: TestResult[] = [];
  private startTime: Date = new Date();

  constructor(private config: {
    skipSlow?: boolean;
    skipOptional?: boolean;
    coverage?: boolean;
    verbose?: boolean;
    reporter?: 'console' | 'json' | 'html';
    outputDir?: string;
    parallel?: boolean;
  } = {}) {
    this.config = {
      skipSlow: false,
      skipOptional: false,
      coverage: true,
      verbose: false,
      reporter: 'console',
      outputDir: 'test-results',
      parallel: false,
      ...config
    };
  }

  async runAllTests(): Promise<TestRunSummary> {
    console.log('🚀 Starting ID-ROLE-PAPER Test Suite');
    console.log('=====================================');

    this.startTime = new Date();
    this.results = [];

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Filter test suites based on configuration
      const suitesToRun = this.filterTestSuites();

      // Run test suites
      for (const suite of suitesToRun) {
        console.log(`\n📋 Running ${suite.name}...`);
        console.log(`Description: ${suite.description}`);
        console.log(`Tags: ${suite.tags.join(', ')}`);

        try {
          const result = await this.runTestSuite(suite);
          this.results.push(result);

          if (result.failed > 0) {
            console.log(`❌ ${suite.name} completed with ${result.failed} failures`);
            
            // Stop on critical failures unless configured otherwise
            if (suite.tags.includes('critical') && !this.config.skipOptional) {
              console.log('🛑 Critical test failures detected, stopping execution');
              break;
            }
          } else {
            console.log(`✅ ${suite.name} completed successfully`);
          }
        } catch (error) {
          console.error(`💥 ${suite.name} failed to run: ${error}`);
          this.results.push({
            suite: suite.name,
            passed: 0,
            failed: 1,
            skipped: 0,
            duration: 0,
            errors: [(error as Error).message],
            warnings: []
          });
        }
      }

      // Generate comprehensive report
      const summary = this.generateTestSummary();

      // Output results
      await this.outputResults(summary);

      return summary;

    } catch (error) {
      console.error('💥 Test runner failed:', error);
      throw error;
    } finally {
      await this.cleanupTestEnvironment();
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('⚙️ Setting up test environment...');

    // Create output directories
    if (this.config.outputDir && !existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Check database connectivity
    try {
      execSync('npm run test:db-check', { stdio: 'pipe' });
      console.log('✅ Database connection verified');
    } catch (error) {
      console.log('⚠️ Database connection check failed, some tests may be skipped');
    }

    // Setup test data
    try {
      execSync('npm run test:setup-data', { stdio: 'pipe' });
      console.log('✅ Test data initialized');
    } catch (error) {
      console.log('⚠️ Test data setup failed:', error);
    }

    // Verify dependencies
    const dependencies = ['@supabase/supabase-js', 'jest', '@testing-library/jest-dom'];
    for (const dep of dependencies) {
      try {
        require.resolve(dep);
      } catch (error) {
        throw new Error(`Required dependency missing: ${dep}`);
      }
    }

    console.log('✅ Test environment ready');
  }

  private filterTestSuites(): TestSuite[] {
    return this.testSuites.filter(suite => {
      if (this.config.skipSlow && suite.tags.includes('slow')) {
        console.log(`⏭️ Skipping ${suite.name} (slow test)`);
        return false;
      }

      if (this.config.skipOptional && suite.tags.includes('optional')) {
        console.log(`⏭️ Skipping ${suite.name} (optional test)`);
        return false;
      }

      return true;
    });
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      suite: suite.name,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
      warnings: []
    };

    try {
      // Build Jest command
      let jestCommand = `npx jest "${suite.pattern}"`;
      
      // Add options
      const jestOptions = [
        `--testTimeout=${suite.timeout}`,
        '--passWithNoTests',
        '--detectOpenHandles',
        '--forceExit'
      ];

      if (this.config.coverage) {
        jestOptions.push('--coverage');
        jestOptions.push('--collectCoverageFrom="src/**/*.{js,ts,tsx}"');
        jestOptions.push('--coverageReporters=text,lcov,json');
      }

      if (this.config.verbose) {
        jestOptions.push('--verbose');
      }

      if (!suite.parallel) {
        jestOptions.push('--runInBand');
      }

      if (this.config.reporter === 'json') {
        jestOptions.push('--json');
        jestOptions.push(`--outputFile=${this.config.outputDir}/${suite.name.toLowerCase().replace(/\s+/g, '-')}-results.json`);
      }

      jestCommand += ' ' + jestOptions.join(' ');

      if (this.config.verbose) {
        console.log(`Running: ${jestCommand}`);
      }

      // Execute tests
      const output = execSync(jestCommand, { 
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // Parse results from output
      this.parseJestOutput(output, result);

    } catch (error: any) {
      // Jest exits with non-zero code on test failures
      if (error.stdout) {
        this.parseJestOutput(error.stdout, result);
      }
      if (error.stderr) {
        result.errors.push(error.stderr);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private parseJestOutput(output: string, result: TestResult): void {
    const lines = output.split('\n');

    // Parse test summary
    const summaryMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (summaryMatch) {
      result.failed = parseInt(summaryMatch[1]);
      result.passed = parseInt(summaryMatch[2]);
      // Total includes failed + passed + skipped
    }

    // Parse individual test results
    const passedMatch = output.match(/(\d+)\s+passing/);
    const failedMatch = output.match(/(\d+)\s+failing/);
    const skippedMatch = output.match(/(\d+)\s+pending/);

    if (passedMatch) result.passed = parseInt(passedMatch[1]);
    if (failedMatch) result.failed = parseInt(failedMatch[1]);
    if (skippedMatch) result.skipped = parseInt(skippedMatch[1]);

    // Parse coverage information
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      result.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }

    // Extract errors and warnings
    lines.forEach(line => {
      if (line.includes('FAIL') || line.includes('Error:')) {
        result.errors.push(line.trim());
      } else if (line.includes('Warning:') || line.includes('WARN')) {
        result.warnings.push(line.trim());
      }
    });
  }

  private generateTestSummary(): TestRunSummary {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    const summary: TestRunSummary = {
      startTime: this.startTime,
      endTime,
      totalDuration,
      totalTests: this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
      suiteResults: this.results,
      recommendations: [],
      environment: {
        nodeVersion: process.version,
        testFramework: 'Jest',
        database: 'Supabase',
        timestamp: new Date().toISOString()
      }
    };

    // Calculate overall coverage
    const coverageResults = this.results.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      summary.overallCoverage = {
        lines: coverageResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageResults.length,
        functions: coverageResults.reduce((sum, r) => sum + (r.coverage?.functions || 0), 0) / coverageResults.length,
        branches: coverageResults.reduce((sum, r) => sum + (r.coverage?.branches || 0), 0) / coverageResults.length,
        statements: coverageResults.reduce((sum, r) => sum + (r.coverage?.statements || 0), 0) / coverageResults.length
      };
    }

    // Generate recommendations
    summary.recommendations = this.generateRecommendations(summary);

    return summary;
  }

  private generateRecommendations(summary: TestRunSummary): string[] {
    const recommendations: string[] = [];

    // Test failure recommendations
    if (summary.totalFailed > 0) {
      recommendations.push(`🔧 ${summary.totalFailed} tests failed - Review failed tests before deployment`);
    }

    // Coverage recommendations
    if (summary.overallCoverage) {
      if (summary.overallCoverage.lines < 80) {
        recommendations.push(`📊 Line coverage is ${summary.overallCoverage.lines.toFixed(1)}% - Aim for 80%+ coverage`);
      }
      if (summary.overallCoverage.branches < 70) {
        recommendations.push(`🌿 Branch coverage is ${summary.overallCoverage.branches.toFixed(1)}% - Improve conditional testing`);
      }
    }

    // Performance recommendations
    const slowSuites = summary.suiteResults.filter(r => r.duration > 60000);
    if (slowSuites.length > 0) {
      recommendations.push(`⚡ ${slowSuites.length} test suites are slow (>1min) - Consider optimization`);
    }

    // Security recommendations
    const securitySuite = summary.suiteResults.find(r => r.suite === 'Security Tests');
    if (securitySuite && securitySuite.failed > 0) {
      recommendations.push(`🛡️ Security tests failed - Address security issues immediately`);
    }

    // Test maintenance recommendations
    const errorCount = summary.suiteResults.reduce((sum, r) => sum + r.errors.length, 0);
    if (errorCount > 5) {
      recommendations.push(`🧹 Many test errors detected - Review test stability and maintenance`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✨ All tests passing with good coverage - Great job!');
    }

    return recommendations;
  }

  private async outputResults(summary: TestRunSummary): Promise<void> {
    console.log('\n🎯 Test Run Summary');
    console.log('==================');
    console.log(`Duration: ${(summary.totalDuration / 1000).toFixed(1)}s`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.totalPassed} (${((summary.totalPassed / summary.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${summary.totalFailed}`);
    console.log(`Skipped: ${summary.totalSkipped}`);

    if (summary.overallCoverage) {
      console.log('\n📊 Overall Coverage:');
      console.log(`Lines: ${summary.overallCoverage.lines.toFixed(1)}%`);
      console.log(`Functions: ${summary.overallCoverage.functions.toFixed(1)}%`);
      console.log(`Branches: ${summary.overallCoverage.branches.toFixed(1)}%`);
      console.log(`Statements: ${summary.overallCoverage.statements.toFixed(1)}%`);
    }

    console.log('\n📋 Suite Results:');
    summary.suiteResults.forEach(result => {
      const status = result.failed > 0 ? '❌' : '✅';
      const duration = (result.duration / 1000).toFixed(1);
      console.log(`${status} ${result.suite}: ${result.passed}/${result.passed + result.failed} (${duration}s)`);
      
      if (result.errors.length > 0 && this.config.verbose) {
        result.errors.forEach(error => console.log(`   Error: ${error}`));
      }
    });

    if (summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      summary.recommendations.forEach(rec => console.log(`   ${rec}`));
    }

    // Write detailed results to files
    if (this.config.outputDir) {
      await this.writeResultFiles(summary);
    }

    // Exit with appropriate code
    if (summary.totalFailed > 0) {
      console.log('\n💥 Some tests failed - Check the output above for details');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    }
  }

  private async writeResultFiles(summary: TestRunSummary): Promise<void> {
    const outputDir = this.config.outputDir!;

    // Write JSON summary
    const jsonFile = join(outputDir, 'test-summary.json');
    writeFileSync(jsonFile, JSON.stringify(summary, null, 2));

    // Write HTML report
    if (this.config.reporter === 'html') {
      const htmlFile = join(outputDir, 'test-report.html');
      const htmlContent = this.generateHTMLReport(summary);
      writeFileSync(htmlFile, htmlContent);
      console.log(`📄 HTML report generated: ${htmlFile}`);
    }

    // Write markdown summary
    const markdownFile = join(outputDir, 'test-summary.md');
    const markdownContent = this.generateMarkdownReport(summary);
    writeFileSync(markdownFile, markdownContent);

    console.log(`📊 Test results written to ${outputDir}/`);
  }

  private generateHTMLReport(summary: TestRunSummary): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ID-ROLE-PAPER Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; flex: 1; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .suite { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .recommendations { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ID-ROLE-PAPER Test Report</h1>
        <p>Generated: ${summary.endTime.toLocaleString()}</p>
        <p>Duration: ${(summary.totalDuration / 1000).toFixed(1)}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.totalTests}</div>
        </div>
        <div class="metric">
            <h3 class="passed">Passed</h3>
            <div style="font-size: 2em; font-weight: bold; color: #28a745;">${summary.totalPassed}</div>
        </div>
        <div class="metric">
            <h3 class="failed">Failed</h3>
            <div style="font-size: 2em; font-weight: bold; color: #dc3545;">${summary.totalFailed}</div>
        </div>
        <div class="metric">
            <h3 class="skipped">Skipped</h3>
            <div style="font-size: 2em; font-weight: bold; color: #ffc107;">${summary.totalSkipped}</div>
        </div>
    </div>

    ${summary.overallCoverage ? `
    <div class="summary">
        <div class="metric">
            <h3>Line Coverage</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.overallCoverage.lines.toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Function Coverage</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.overallCoverage.functions.toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Branch Coverage</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.overallCoverage.branches.toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Statement Coverage</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.overallCoverage.statements.toFixed(1)}%</div>
        </div>
    </div>
    ` : ''}

    <h2>Suite Results</h2>
    ${summary.suiteResults.map(result => `
    <div class="suite">
        <h3>${result.failed > 0 ? '❌' : '✅'} ${result.suite}</h3>
        <p>Passed: ${result.passed} | Failed: ${result.failed} | Skipped: ${result.skipped}</p>
        <p>Duration: ${(result.duration / 1000).toFixed(1)}s</p>
        ${result.errors.length > 0 ? `
        <details>
            <summary>Errors (${result.errors.length})</summary>
            <ul>${result.errors.map(error => `<li>${error}</li>`).join('')}</ul>
        </details>
        ` : ''}
    </div>
    `).join('')}

    ${summary.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>💡 Recommendations</h2>
        <ul>${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
    </div>
    ` : ''}

</body>
</html>
    `;
  }

  private generateMarkdownReport(summary: TestRunSummary): string {
    return `# ID-ROLE-PAPER Test Report

**Generated:** ${summary.endTime.toLocaleString()}  
**Duration:** ${(summary.totalDuration / 1000).toFixed(1)}s  
**Environment:** ${summary.environment.nodeVersion}, ${summary.environment.testFramework}, ${summary.environment.database}

## Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Tests | ${summary.totalTests} | 100% |
| Passed | ${summary.totalPassed} | ${((summary.totalPassed / summary.totalTests) * 100).toFixed(1)}% |
| Failed | ${summary.totalFailed} | ${((summary.totalFailed / summary.totalTests) * 100).toFixed(1)}% |
| Skipped | ${summary.totalSkipped} | ${((summary.totalSkipped / summary.totalTests) * 100).toFixed(1)}% |

${summary.overallCoverage ? `
## Coverage

| Type | Coverage |
|------|----------|
| Lines | ${summary.overallCoverage.lines.toFixed(1)}% |
| Functions | ${summary.overallCoverage.functions.toFixed(1)}% |
| Branches | ${summary.overallCoverage.branches.toFixed(1)}% |
| Statements | ${summary.overallCoverage.statements.toFixed(1)}% |
` : ''}

## Suite Results

${summary.suiteResults.map(result => `
### ${result.failed > 0 ? '❌' : '✅'} ${result.suite}

- **Passed:** ${result.passed}
- **Failed:** ${result.failed}  
- **Skipped:** ${result.skipped}
- **Duration:** ${(result.duration / 1000).toFixed(1)}s

${result.errors.length > 0 ? `
**Errors:**
${result.errors.map(error => `- ${error}`).join('\n')}
` : ''}
`).join('')}

${summary.recommendations.length > 0 ? `
## 💡 Recommendations

${summary.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}
`;
  }

  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');

    try {
      execSync('npm run test:cleanup', { stdio: 'pipe' });
      console.log('✅ Test cleanup completed');
    } catch (error) {
      console.log('⚠️ Test cleanup had issues:', error);
    }
  }

  // CLI entry point
  static async runFromCLI(): Promise<void> {
    const args = process.argv.slice(2);
    const config: any = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--skip-slow':
          config.skipSlow = true;
          break;
        case '--skip-optional':
          config.skipOptional = true;
          break;
        case '--no-coverage':
          config.coverage = false;
          break;
        case '--verbose':
          config.verbose = true;
          break;
        case '--reporter':
          config.reporter = args[++i];
          break;
        case '--output-dir':
          config.outputDir = args[++i];
          break;
        case '--parallel':
          config.parallel = true;
          break;
        case '--help':
          console.log(`
ID-ROLE-PAPER Test Runner

Usage: npm run test:id-role-paper [options]

Options:
  --skip-slow      Skip slow running tests (performance, e2e)
  --skip-optional  Skip optional tests
  --no-coverage    Disable code coverage collection
  --verbose        Enable verbose output
  --reporter       Output format: console, json, html (default: console)
  --output-dir     Directory for test results (default: test-results)
  --parallel       Enable parallel test execution where possible
  --help           Show this help message

Examples:
  npm run test:id-role-paper
  npm run test:id-role-paper -- --skip-slow --reporter html
  npm run test:id-role-paper -- --verbose --output-dir ./coverage
          `);
          process.exit(0);
      }
    }

    const runner = new IdRolePaperTestRunner(config);
    await runner.runAllTests();
  }
}

// CLI execution
if (require.main === module) {
  IdRolePaperTestRunner.runFromCLI().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export default IdRolePaperTestRunner;