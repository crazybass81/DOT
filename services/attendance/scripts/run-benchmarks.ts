#!/usr/bin/env node

import { performance } from 'perf_hooks'
import * as fs from 'fs'
import * as path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

interface BenchmarkConfig {
  supabaseUrl?: string
  supabaseKey?: string
  iterations?: number
  warmup?: number
  outputDir?: string
  generateReport?: boolean
  compareWithBaseline?: boolean
  baselineFile?: string
}

interface QueryBenchmark {
  name: string
  description: string
  query: (client: SupabaseClient) => Promise<any>
  expectedP95?: number  // Expected P95 threshold in ms
  critical?: boolean    // Whether this is a critical path query
}

class PerformanceBenchmarkRunner {
  private client: SupabaseClient
  private config: BenchmarkConfig
  private results: Map<string, any> = new Map()
  private baseline: Map<string, any> | null = null

  constructor(config: BenchmarkConfig = {}) {
    this.config = {
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL!,
      supabaseKey: config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!,
      iterations: config.iterations || 100,
      warmup: config.warmup || 10,
      outputDir: config.outputDir || './benchmark-results',
      generateReport: config.generateReport !== false,
      compareWithBaseline: config.compareWithBaseline || false,
      baselineFile: config.baselineFile
    }

    this.client = createClient(this.config.supabaseUrl!, this.config.supabaseKey!)
    
    // Load baseline if comparison requested
    if (this.config.compareWithBaseline && this.config.baselineFile) {
      this.loadBaseline()
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir!)) {
      fs.mkdirSync(this.config.outputDir!, { recursive: true })
    }
  }

  private loadBaseline(): void {
    try {
      const baselineData = fs.readFileSync(this.config.baselineFile!, 'utf-8')
      this.baseline = new Map(JSON.parse(baselineData))
      console.log(`${colors.cyan}📊 Loaded baseline from ${this.config.baselineFile}${colors.reset}`)
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Could not load baseline: ${error.message}${colors.reset}`)
    }
  }

  private getBenchmarks(): QueryBenchmark[] {
    return [
      {
        name: 'attendance_single_lookup',
        description: 'Single attendance record lookup by ID',
        critical: true,
        expectedP95: 30,
        query: async (client) => {
          const { data, error } = await client
            .from('attendance')
            .select('*')
            .eq('id', '550e8400-e29b-41d4-a716-446655440000')
            .single()
          if (error && error.code !== 'PGRST116') throw error
          return data
        }
      },
      {
        name: 'attendance_daily_summary',
        description: 'Daily attendance summary for organization',
        critical: true,
        expectedP95: 100,
        query: async (client) => {
          const { data, error } = await client
            .from('attendance')
            .select(`
              id,
              employee_id,
              check_in_time,
              check_out_time,
              status,
              employees(name, department)
            `)
            .eq('date', new Date().toISOString().split('T')[0])
            .eq('organization_id', '550e8400-e29b-41d4-a716-446655440000')
            .limit(100)
          if (error) throw error
          return data
        }
      },
      {
        name: 'employee_shift_lookup',
        description: 'Employee shift assignment with details',
        critical: false,
        expectedP95: 75,
        query: async (client) => {
          const { data, error } = await client
            .from('shift_assignments')
            .select(`
              *,
              shifts(
                name,
                start_time,
                end_time,
                break_duration
              )
            `)
            .eq('employee_id', '550e8400-e29b-41d4-a716-446655440000')
            .single()
          if (error && error.code !== 'PGRST116') throw error
          return data
        }
      },
      {
        name: 'attendance_stats_monthly',
        description: 'Monthly attendance statistics aggregation',
        critical: false,
        expectedP95: 200,
        query: async (client) => {
          const { data, error } = await client
            .rpc('calculate_monthly_stats', {
              org_id: '550e8400-e29b-41d4-a716-446655440000',
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear()
            })
          if (error) throw error
          return data
        }
      },
      {
        name: 'overtime_calculation',
        description: 'Calculate overtime for multiple employees',
        critical: true,
        expectedP95: 150,
        query: async (client) => {
          const { data, error } = await client
            .rpc('calculate_overtime_batch', {
              employee_ids: Array.from({ length: 10 }, (_, i) => 
                `550e8400-e29b-41d4-a716-44665544000${i}`
              ),
              start_date: '2024-01-01',
              end_date: '2024-01-31'
            })
          if (error) throw error
          return data
        }
      },
      {
        name: 'leave_balance_check',
        description: 'Check leave balance for employee',
        critical: false,
        expectedP95: 50,
        query: async (client) => {
          const { data, error } = await client
            .from('leave_balances')
            .select('*')
            .eq('employee_id', '550e8400-e29b-41d4-a716-446655440000')
            .eq('year', new Date().getFullYear())
          if (error) throw error
          return data
        }
      },
      {
        name: 'attendance_bulk_insert',
        description: 'Bulk insert attendance records',
        critical: true,
        expectedP95: 300,
        query: async (client) => {
          const records = Array.from({ length: 20 }, (_, i) => ({
            employee_id: `550e8400-e29b-41d4-a716-44665544000${i % 10}`,
            date: new Date().toISOString().split('T')[0],
            check_in_time: new Date(Date.now() - i * 60000).toISOString(),
            status: 'present',
            organization_id: '550e8400-e29b-41d4-a716-446655440000'
          }))

          const { data, error } = await client
            .from('attendance_temp')
            .insert(records)
            .select()
          
          if (error) throw error
          
          // Cleanup
          if (data) {
            await client
              .from('attendance_temp')
              .delete()
              .in('id', data.map(d => d.id))
          }
          
          return data
        }
      },
      {
        name: 'location_validation',
        description: 'Validate check-in location',
        critical: true,
        expectedP95: 40,
        query: async (client) => {
          const { data, error } = await client
            .rpc('validate_location', {
              lat: 37.7749,
              lng: -122.4194,
              location_id: '550e8400-e29b-41d4-a716-446655440001'
            })
          if (error) throw error
          return data
        }
      },
      {
        name: 'notification_queue',
        description: 'Fetch pending notifications',
        critical: false,
        expectedP95: 60,
        query: async (client) => {
          const { data, error } = await client
            .from('notifications')
            .select('*')
            .eq('status', 'pending')
            .eq('organization_id', '550e8400-e29b-41d4-a716-446655440000')
            .order('priority', { ascending: false })
            .limit(50)
          if (error) throw error
          return data
        }
      },
      {
        name: 'audit_log_write',
        description: 'Write to audit log',
        critical: false,
        expectedP95: 100,
        query: async (client) => {
          const { data, error } = await client
            .from('audit_logs')
            .insert({
              action: 'benchmark_test',
              entity_type: 'attendance',
              entity_id: '550e8400-e29b-41d4-a716-446655440000',
              user_id: '550e8400-e29b-41d4-a716-446655440002',
              metadata: { test: true, timestamp: Date.now() }
            })
            .select()
            .single()
          
          if (error) throw error
          
          // Cleanup
          if (data) {
            await client
              .from('audit_logs')
              .delete()
              .eq('id', data.id)
          }
          
          return data
        }
      }
    ]
  }

  private async runBenchmark(benchmark: QueryBenchmark): Promise<void> {
    const times: number[] = []
    const errors: any[] = []
    
    // Warmup
    console.log(`${colors.cyan}🔥 Warming up: ${benchmark.name}${colors.reset}`)
    for (let i = 0; i < this.config.warmup!; i++) {
      try {
        await benchmark.query(this.client)
      } catch (error) {
        // Ignore warmup errors
      }
    }
    
    // Actual benchmark
    console.log(`${colors.blue}🏃 Running: ${benchmark.name}${colors.reset}`)
    const progressBar = this.createProgressBar(this.config.iterations!)
    
    for (let i = 0; i < this.config.iterations!; i++) {
      try {
        const start = performance.now()
        await benchmark.query(this.client)
        const end = performance.now()
        times.push(end - start)
      } catch (error) {
        errors.push(error)
      }
      
      progressBar.update(i + 1)
    }
    
    progressBar.complete()
    
    // Calculate statistics
    if (times.length > 0) {
      times.sort((a, b) => a - b)
      const stats = {
        name: benchmark.name,
        description: benchmark.description,
        critical: benchmark.critical,
        expectedP95: benchmark.expectedP95,
        samples: times.length,
        errors: errors.length,
        errorRate: errors.length / this.config.iterations!,
        min: times[0],
        max: times[times.length - 1],
        mean: times.reduce((a, b) => a + b, 0) / times.length,
        median: times[Math.floor(times.length / 2)],
        p50: times[Math.floor(times.length * 0.5)],
        p75: times[Math.floor(times.length * 0.75)],
        p90: times[Math.floor(times.length * 0.9)],
        p95: times[Math.floor(times.length * 0.95)],
        p99: times[Math.floor(times.length * 0.99)],
        stdDev: this.calculateStdDev(times),
        opsPerSec: 1000 / (times.reduce((a, b) => a + b, 0) / times.length)
      }
      
      this.results.set(benchmark.name, stats)
      this.printResult(stats)
    } else {
      console.error(`${colors.red}❌ All iterations failed for ${benchmark.name}${colors.reset}`)
    }
  }

  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
    return Math.sqrt(variance)
  }

  private createProgressBar(total: number) {
    const barLength = 30
    let current = 0
    
    return {
      update: (value: number) => {
        current = value
        const percent = current / total
        const filled = Math.floor(barLength * percent)
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled)
        process.stdout.write(`\r  [${bar}] ${(percent * 100).toFixed(0)}%`)
      },
      complete: () => {
        process.stdout.write('\n')
      }
    }
  }

  private printResult(stats: any): void {
    const statusIcon = stats.p95 <= stats.expectedP95 ? '✅' : '⚠️'
    const statusColor = stats.p95 <= stats.expectedP95 ? colors.green : colors.yellow
    
    console.log(`\n${statusIcon} ${colors.bright}${stats.description}${colors.reset}`)
    console.log(`   Name: ${stats.name}`)
    console.log(`   Samples: ${stats.samples} | Errors: ${stats.errors}`)
    console.log(`   ${statusColor}P95: ${stats.p95.toFixed(2)}ms${colors.reset} (expected: <${stats.expectedP95}ms)`)
    console.log(`   P50: ${stats.p50.toFixed(2)}ms | P99: ${stats.p99.toFixed(2)}ms`)
    console.log(`   Min: ${stats.min.toFixed(2)}ms | Max: ${stats.max.toFixed(2)}ms`)
    console.log(`   Ops/sec: ${stats.opsPerSec.toFixed(0)}`)
    
    // Compare with baseline if available
    if (this.baseline && this.baseline.has(stats.name)) {
      const baselineStats = this.baseline.get(stats.name)
      const p95Diff = ((stats.p95 - baselineStats.p95) / baselineStats.p95) * 100
      const diffColor = p95Diff > 0 ? colors.red : colors.green
      const diffSymbol = p95Diff > 0 ? '↑' : '↓'
      console.log(`   ${diffColor}Baseline P95 diff: ${diffSymbol} ${Math.abs(p95Diff).toFixed(1)}%${colors.reset}`)
    }
  }

  private generateReport(): void {
    const timestamp = new Date().toISOString()
    const reportPath = path.join(
      this.config.outputDir!,
      `benchmark-${timestamp.replace(/[:.]/g, '-')}.json`
    )
    
    const report = {
      timestamp,
      config: {
        iterations: this.config.iterations,
        warmup: this.config.warmup
      },
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: require('os').cpus().length,
        memory: require('os').totalmem()
      },
      results: Array.from(this.results.values()),
      summary: {
        totalBenchmarks: this.results.size,
        criticalPassing: Array.from(this.results.values())
          .filter(r => r.critical && r.p95 <= r.expectedP95).length,
        criticalTotal: Array.from(this.results.values())
          .filter(r => r.critical).length,
        averageP95: Array.from(this.results.values())
          .reduce((sum, r) => sum + r.p95, 0) / this.results.size,
        slowestQuery: Array.from(this.results.values())
          .sort((a, b) => b.p95 - a.p95)[0]?.name
      }
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n${colors.green}📄 Report saved to: ${reportPath}${colors.reset}`)
    
    // Save as baseline if requested
    if (process.argv.includes('--save-baseline')) {
      const baselinePath = path.join(this.config.outputDir!, 'baseline.json')
      const baselineData = Array.from(this.results.entries())
      fs.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2))
      console.log(`${colors.blue}💾 Baseline saved to: ${baselinePath}${colors.reset}`)
    }
  }

  private printSummary(): void {
    console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`)
    console.log(`${colors.bright}📊 PERFORMANCE BENCHMARK SUMMARY${colors.reset}`)
    console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`)
    
    const results = Array.from(this.results.values())
    const critical = results.filter(r => r.critical)
    const passing = results.filter(r => r.p95 <= r.expectedP95)
    const criticalPassing = critical.filter(r => r.p95 <= r.expectedP95)
    
    // Overall status
    const allCriticalPassing = critical.every(r => r.p95 <= r.expectedP95)
    const statusIcon = allCriticalPassing ? '✅' : '❌'
    const statusText = allCriticalPassing ? 'PASSED' : 'FAILED'
    const statusColor = allCriticalPassing ? colors.green : colors.red
    
    console.log(`${statusIcon} ${statusColor}${colors.bright}Overall Status: ${statusText}${colors.reset}`)
    console.log(`   Total Benchmarks: ${results.length}`)
    console.log(`   Passing: ${passing.length}/${results.length} (${(passing.length/results.length*100).toFixed(0)}%)`)
    console.log(`   Critical Passing: ${criticalPassing.length}/${critical.length} (${(criticalPassing.length/critical.length*100).toFixed(0)}%)`)
    
    // Top performers
    console.log(`\n${colors.green}🏆 Top Performers:${colors.reset}`)
    results
      .sort((a, b) => a.p95 - b.p95)
      .slice(0, 3)
      .forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.description}: ${r.p95.toFixed(2)}ms`)
      })
    
    // Needs optimization
    const needsWork = results.filter(r => r.p95 > r.expectedP95)
    if (needsWork.length > 0) {
      console.log(`\n${colors.yellow}⚠️  Needs Optimization:${colors.reset}`)
      needsWork
        .sort((a, b) => b.p95 - a.p95)
        .forEach(r => {
          const overBy = ((r.p95 - r.expectedP95) / r.expectedP95 * 100).toFixed(0)
          console.log(`   - ${r.description}: ${r.p95.toFixed(2)}ms (${overBy}% over target)`)
        })
    }
  }

  async run(): Promise<void> {
    console.log(`${colors.bright}${colors.cyan}🚀 Starting Database Performance Benchmarks${colors.reset}`)
    console.log(`${colors.cyan}   Iterations: ${this.config.iterations}${colors.reset}`)
    console.log(`${colors.cyan}   Warmup: ${this.config.warmup}${colors.reset}\n`)
    
    const benchmarks = this.getBenchmarks()
    
    for (const benchmark of benchmarks) {
      await this.runBenchmark(benchmark)
      // Small delay between benchmarks
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    this.printSummary()
    
    if (this.config.generateReport) {
      this.generateReport()
    }
  }
}

// CLI execution
if (require.main === module) {
  const runner = new PerformanceBenchmarkRunner({
    iterations: parseInt(process.env.BENCHMARK_ITERATIONS || '100'),
    warmup: parseInt(process.env.BENCHMARK_WARMUP || '10'),
    generateReport: true,
    compareWithBaseline: process.argv.includes('--compare'),
    baselineFile: './benchmark-results/baseline.json'
  })
  
  runner.run().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`)
    process.exit(1)
  })
}

export { PerformanceBenchmarkRunner }