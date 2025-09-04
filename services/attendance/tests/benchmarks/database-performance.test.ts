import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { performance } from 'perf_hooks'

// Benchmark configuration
interface BenchmarkResult {
  operation: string
  averageTime: number
  minTime: number
  maxTime: number
  p50: number
  p95: number
  p99: number
  iterations: number
  opsPerSecond: number
}

interface QueryBenchmark {
  name: string
  query: () => Promise<any>
  iterations?: number
  warmup?: number
}

class DatabaseBenchmark {
  private supabase: SupabaseClient
  private results: BenchmarkResult[] = []

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  // Utility to measure query execution time
  private async measureQuery(
    queryFn: () => Promise<any>,
    iterations: number = 100,
    warmup: number = 10
  ): Promise<BenchmarkResult> {
    const times: number[] = []
    
    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      await queryFn()
    }

    // Actual benchmark runs
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await queryFn()
      const end = performance.now()
      times.push(end - start)
    }

    // Calculate statistics
    times.sort((a, b) => a - b)
    const average = times.reduce((sum, t) => sum + t, 0) / times.length
    const min = times[0]
    const max = times[times.length - 1]
    const p50 = times[Math.floor(times.length * 0.5)]
    const p95 = times[Math.floor(times.length * 0.95)]
    const p99 = times[Math.floor(times.length * 0.99)]
    const opsPerSecond = 1000 / average

    return {
      operation: queryFn.name || 'anonymous',
      averageTime: average,
      minTime: min,
      maxTime: max,
      p50,
      p95,
      p99,
      iterations,
      opsPerSecond
    }
  }

  // Benchmark: Simple attendance query
  async benchmarkSimpleAttendanceQuery(): Promise<BenchmarkResult> {
    const query = async () => {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('id, employee_id, check_in_time, check_out_time')
        .eq('employee_id', '550e8400-e29b-41d4-a716-446655440000')
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    }

    const result = await this.measureQuery(query, 100, 10)
    result.operation = 'Simple Attendance Query'
    return result
  }

  // Benchmark: Complex attendance query with joins
  async benchmarkComplexAttendanceQuery(): Promise<BenchmarkResult> {
    const query = async () => {
      const { data, error } = await this.supabase
        .from('attendance')
        .select(`
          *,
          employees!inner(
            id,
            name,
            email,
            department
          ),
          shift_assignments!inner(
            shift_id,
            shifts!inner(
              name,
              start_time,
              end_time
            )
          )
        `)
        .eq('date', new Date().toISOString().split('T')[0])
        .limit(50)
      
      if (error) throw error
      return data
    }

    const result = await this.measureQuery(query, 50, 5)
    result.operation = 'Complex Attendance Query with Joins'
    return result
  }

  // Benchmark: Aggregation query
  async benchmarkAggregationQuery(): Promise<BenchmarkResult> {
    const query = async () => {
      const { data, error } = await this.supabase
        .rpc('get_attendance_stats', {
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          organization_id: '550e8400-e29b-41d4-a716-446655440000'
        })
      
      if (error) throw error
      return data
    }

    const result = await this.measureQuery(query, 50, 5)
    result.operation = 'Attendance Statistics Aggregation'
    return result
  }

  // Benchmark: Batch insert operation
  async benchmarkBatchInsert(): Promise<BenchmarkResult> {
    const query = async () => {
      const records = Array.from({ length: 10 }, (_, i) => ({
        employee_id: `550e8400-e29b-41d4-a716-44665544000${i}`,
        date: new Date().toISOString().split('T')[0],
        check_in_time: new Date().toISOString(),
        status: 'present',
        location_id: '550e8400-e29b-41d4-a716-446655440001'
      }))

      const { data, error } = await this.supabase
        .from('attendance_temp')
        .insert(records)
        .select()
      
      if (error) throw error
      
      // Clean up
      if (data) {
        await this.supabase
          .from('attendance_temp')
          .delete()
          .in('id', data.map(d => d.id))
      }
      
      return data
    }

    const result = await this.measureQuery(query, 20, 2)
    result.operation = 'Batch Insert (10 records)'
    return result
  }

  // Benchmark: Update operation
  async benchmarkUpdateOperation(): Promise<BenchmarkResult> {
    const query = async () => {
      const { data, error } = await this.supabase
        .from('attendance')
        .update({ 
          check_out_time: new Date().toISOString(),
          overtime_minutes: Math.floor(Math.random() * 60)
        })
        .eq('id', '550e8400-e29b-41d4-a716-446655440000')
        .select()
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    }

    const result = await this.measureQuery(query, 50, 5)
    result.operation = 'Update Operation'
    return result
  }

  // Benchmark: Real-time subscription setup
  async benchmarkRealtimeSubscription(): Promise<BenchmarkResult> {
    const query = async () => {
      const channel = this.supabase
        .channel('attendance-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance',
            filter: 'organization_id=eq.550e8400-e29b-41d4-a716-446655440000'
          },
          () => {}
        )
        .subscribe()
      
      // Wait for subscription to be established
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Cleanup
      await this.supabase.removeChannel(channel)
    }

    const result = await this.measureQuery(query, 20, 2)
    result.operation = 'Realtime Subscription Setup'
    return result
  }

  // Benchmark: Full-text search
  async benchmarkFullTextSearch(): Promise<BenchmarkResult> {
    const query = async () => {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .textSearch('name', 'john | jane | smith', {
          type: 'websearch',
          config: 'english'
        })
        .limit(20)
      
      if (error) throw error
      return data
    }

    const result = await this.measureQuery(query, 50, 5)
    result.operation = 'Full-Text Search'
    return result
  }

  // Benchmark: Pagination query
  async benchmarkPaginationQuery(): Promise<BenchmarkResult> {
    const query = async () => {
      const pageSize = 20
      const page = Math.floor(Math.random() * 10) + 1
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error } = await this.supabase
        .from('attendance')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }

    const result = await this.measureQuery(query, 100, 10)
    result.operation = 'Pagination Query'
    return result
  }

  // Benchmark: Index performance
  async benchmarkIndexPerformance(): Promise<BenchmarkResult> {
    const query = async () => {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', '550e8400-e29b-41d4-a716-446655440000')
        .gte('date', '2024-01-01')
        .lte('date', '2024-12-31')
        .order('date', { ascending: false })
      
      if (error) throw error
      return data
    }

    const result = await this.measureQuery(query, 100, 10)
    result.operation = 'Index Performance (employee_id + date range)'
    return result
  }

  // Benchmark: Transaction simulation
  async benchmarkTransactionSimulation(): Promise<BenchmarkResult> {
    const query = async () => {
      // Simulate transaction with multiple operations
      const employeeId = '550e8400-e29b-41d4-a716-446655440000'
      
      // Operation 1: Check existing attendance
      const { data: existing } = await this.supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', new Date().toISOString().split('T')[0])
        .single()
      
      if (!existing) {
        // Operation 2: Insert new attendance
        await this.supabase
          .from('attendance')
          .insert({
            employee_id: employeeId,
            date: new Date().toISOString().split('T')[0],
            check_in_time: new Date().toISOString(),
            status: 'present'
          })
      } else {
        // Operation 3: Update existing attendance
        await this.supabase
          .from('attendance')
          .update({ check_out_time: new Date().toISOString() })
          .eq('id', existing.id)
      }
      
      // Operation 4: Update statistics
      await this.supabase.rpc('update_attendance_stats', { 
        emp_id: employeeId 
      })
    }

    const result = await this.measureQuery(query, 30, 3)
    result.operation = 'Transaction Simulation (4 operations)'
    return result
  }

  // Run all benchmarks
  async runAllBenchmarks(): Promise<void> {
    console.log('🚀 Starting Database Performance Benchmarks\n')
    console.log('=' .repeat(80))
    
    const benchmarks: Array<() => Promise<BenchmarkResult>> = [
      () => this.benchmarkSimpleAttendanceQuery(),
      () => this.benchmarkComplexAttendanceQuery(),
      () => this.benchmarkAggregationQuery(),
      () => this.benchmarkBatchInsert(),
      () => this.benchmarkUpdateOperation(),
      () => this.benchmarkRealtimeSubscription(),
      () => this.benchmarkFullTextSearch(),
      () => this.benchmarkPaginationQuery(),
      () => this.benchmarkIndexPerformance(),
      () => this.benchmarkTransactionSimulation()
    ]

    for (const benchmark of benchmarks) {
      try {
        const result = await benchmark()
        this.results.push(result)
        this.printResult(result)
      } catch (error) {
        console.error(`❌ Benchmark failed: ${error.message}`)
      }
    }

    this.printSummary()
  }

  // Pretty print benchmark result
  private printResult(result: BenchmarkResult): void {
    console.log(`\n📊 ${result.operation}`)
    console.log('-'.repeat(60))
    console.log(`  Average: ${result.averageTime.toFixed(2)}ms`)
    console.log(`  Min: ${result.minTime.toFixed(2)}ms`)
    console.log(`  Max: ${result.maxTime.toFixed(2)}ms`)
    console.log(`  P50: ${result.p50.toFixed(2)}ms`)
    console.log(`  P95: ${result.p95.toFixed(2)}ms`)
    console.log(`  P99: ${result.p99.toFixed(2)}ms`)
    console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(0)}`)
    console.log(`  Iterations: ${result.iterations}`)
    
    // Performance classification
    let rating = '🟢 Excellent'
    if (result.p95 > 100) rating = '🟡 Good'
    if (result.p95 > 200) rating = '🟠 Fair'
    if (result.p95 > 500) rating = '🔴 Needs Optimization'
    
    console.log(`  Performance: ${rating}`)
  }

  // Print overall summary
  private printSummary(): void {
    console.log('\n' + '='.repeat(80))
    console.log('📈 BENCHMARK SUMMARY')
    console.log('='.repeat(80))
    
    // Sort by average time
    const sorted = [...this.results].sort((a, b) => a.averageTime - b.averageTime)
    
    console.log('\n🏆 Performance Ranking (by average time):')
    sorted.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.operation}: ${result.averageTime.toFixed(2)}ms`)
    })
    
    // Identify optimization candidates
    console.log('\n⚠️  Optimization Candidates (P95 > 200ms):')
    const slow = this.results.filter(r => r.p95 > 200)
    if (slow.length > 0) {
      slow.forEach(result => {
        console.log(`  - ${result.operation}: P95=${result.p95.toFixed(2)}ms`)
      })
    } else {
      console.log('  ✅ All queries performing well!')
    }
    
    // Overall statistics
    const totalAvg = this.results.reduce((sum, r) => sum + r.averageTime, 0) / this.results.length
    const totalOps = this.results.reduce((sum, r) => sum + r.opsPerSecond, 0)
    
    console.log('\n📊 Overall Statistics:')
    console.log(`  Average query time: ${totalAvg.toFixed(2)}ms`)
    console.log(`  Total ops/sec capacity: ${totalOps.toFixed(0)}`)
    
    // Export results to JSON
    this.exportResults()
  }

  // Export results to JSON file
  private exportResults(): void {
    const timestamp = new Date().toISOString().replace(/:/g, '-')
    const filename = `benchmark-results-${timestamp}.json`
    const data = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      results: this.results,
      summary: {
        totalBenchmarks: this.results.length,
        averageQueryTime: this.results.reduce((sum, r) => sum + r.averageTime, 0) / this.results.length,
        slowQueries: this.results.filter(r => r.p95 > 200).length
      }
    }
    
    require('fs').writeFileSync(
      `./benchmark-results/${filename}`,
      JSON.stringify(data, null, 2)
    )
    
    console.log(`\n💾 Results exported to: benchmark-results/${filename}`)
  }
}

// Test suite
describe('Database Performance Benchmarks', () => {
  let benchmark: DatabaseBenchmark

  beforeAll(() => {
    benchmark = new DatabaseBenchmark()
  })

  describe('Query Performance', () => {
    test('Simple attendance query should complete under 50ms (P95)', async () => {
      const result = await benchmark.benchmarkSimpleAttendanceQuery()
      expect(result.p95).toBeLessThan(50)
    }, 30000)

    test('Complex query with joins should complete under 100ms (P95)', async () => {
      const result = await benchmark.benchmarkComplexAttendanceQuery()
      expect(result.p95).toBeLessThan(100)
    }, 30000)

    test('Aggregation query should complete under 150ms (P95)', async () => {
      const result = await benchmark.benchmarkAggregationQuery()
      expect(result.p95).toBeLessThan(150)
    }, 30000)

    test('Pagination query should complete under 50ms (P95)', async () => {
      const result = await benchmark.benchmarkPaginationQuery()
      expect(result.p95).toBeLessThan(50)
    }, 30000)
  })

  describe('Write Performance', () => {
    test('Batch insert should complete under 200ms (P95)', async () => {
      const result = await benchmark.benchmarkBatchInsert()
      expect(result.p95).toBeLessThan(200)
    }, 30000)

    test('Update operation should complete under 75ms (P95)', async () => {
      const result = await benchmark.benchmarkUpdateOperation()
      expect(result.p95).toBeLessThan(75)
    }, 30000)
  })

  describe('Advanced Operations', () => {
    test('Full-text search should complete under 100ms (P95)', async () => {
      const result = await benchmark.benchmarkFullTextSearch()
      expect(result.p95).toBeLessThan(100)
    }, 30000)

    test('Index performance should be optimized (<50ms P95)', async () => {
      const result = await benchmark.benchmarkIndexPerformance()
      expect(result.p95).toBeLessThan(50)
    }, 30000)

    test('Transaction simulation should complete under 300ms (P95)', async () => {
      const result = await benchmark.benchmarkTransactionSimulation()
      expect(result.p95).toBeLessThan(300)
    }, 30000)
  })

  describe('Realtime Features', () => {
    test('Realtime subscription setup should complete under 500ms (P95)', async () => {
      const result = await benchmark.benchmarkRealtimeSubscription()
      expect(result.p95).toBeLessThan(500)
    }, 30000)
  })

  // Full benchmark suite run
  test.skip('Run complete benchmark suite', async () => {
    await benchmark.runAllBenchmarks()
  }, 120000)
})

// CLI execution
if (require.main === module) {
  const benchmark = new DatabaseBenchmark()
  benchmark.runAllBenchmarks().catch(console.error)
}