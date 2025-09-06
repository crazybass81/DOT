#!/usr/bin/env node

/**
 * Real Supabase Connection Test Script
 * Verifies actual connection to Supabase without mocks
 */

import { getSupabaseClient } from '../src/lib/supabase/client';
import { performHealthCheck, getDatabaseStats } from '../src/lib/supabase/health';
import { config } from '../src/lib/supabase/config';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testConnection() {
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   DOT Attendance - Real Supabase Test    ${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);

  // 1. Environment Configuration
  console.log(`${colors.blue}📋 Environment Configuration:${colors.reset}`);
  console.log(`   Environment: ${config.name}`);
  console.log(`   Supabase URL: ${config.supabase.url}`);
  console.log(`   Has Service Role: ${config.supabase.serviceRoleKey ? '✅' : '❌'}`);
  console.log();

  // 2. Test Client Creation
  console.log(`${colors.blue}🔧 Creating Supabase Client...${colors.reset}`);
  try {
    const client = getSupabaseClient();
    console.log(`${colors.green}   ✅ Client created successfully${colors.reset}`);
    console.log(`   Client type: ${typeof client}`);
    console.log(`   Has auth: ${client.auth ? '✅' : '❌'}`);
    console.log(`   Has realtime: ${client.realtime ? '✅' : '❌'}`);
    console.log(`   Has storage: ${client.storage ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`${colors.red}   ❌ Failed to create client: ${error}${colors.reset}`);
    process.exit(1);
  }
  console.log();

  // 3. Test Database Connection
  console.log(`${colors.blue}🗄️  Testing Database Connection...${colors.reset}`);
  try {
    const stats = await getDatabaseStats();
    console.log(`${colors.green}   ✅ Database connection: ${stats.isConnected ? 'Connected' : 'Failed'}${colors.reset}`);
    console.log(`   PostGIS enabled: ${stats.hasPostGIS ? '✅' : '❌'}`);
    console.log(`   Latency: ${stats.latency}ms`);
  } catch (error) {
    console.log(`${colors.red}   ❌ Database test failed: ${error}${colors.reset}`);
  }
  console.log();

  // 4. Test Auth Service
  console.log(`${colors.blue}🔐 Testing Auth Service...${colors.reset}`);
  try {
    const client = getSupabaseClient();
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      console.log(`${colors.yellow}   ⚠️  Auth service error: ${error.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}   ✅ Auth service accessible${colors.reset}`);
      console.log(`   Current session: ${session ? 'Active' : 'None'}`);
    }
  } catch (error) {
    console.log(`${colors.red}   ❌ Auth test failed: ${error}${colors.reset}`);
  }
  console.log();

  // 5. Test Real-time Connection
  console.log(`${colors.blue}📡 Testing Real-time Connection...${colors.reset}`);
  try {
    const client = getSupabaseClient();
    const channel = client.channel('test-channel');
    
    const result = await new Promise<string>((resolve) => {
      const timeout = setTimeout(() => resolve('TIMEOUT'), 5000);
      
      channel.subscribe((status) => {
        clearTimeout(timeout);
        resolve(status);
      });
    });
    
    await channel.unsubscribe();
    
    if (result === 'SUBSCRIBED') {
      console.log(`${colors.green}   ✅ Real-time connection established${colors.reset}`);
    } else {
      console.log(`${colors.yellow}   ⚠️  Real-time connection status: ${result}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}   ❌ Real-time test failed: ${error}${colors.reset}`);
  }
  console.log();

  // 6. Comprehensive Health Check
  console.log(`${colors.blue}🏥 Running Comprehensive Health Check...${colors.reset}`);
  try {
    const health = await performHealthCheck();
    
    const statusColor = health.status === 'healthy' ? colors.green :
                       health.status === 'degraded' ? colors.yellow : colors.red;
    
    console.log(`${statusColor}   Overall Status: ${health.status.toUpperCase()}${colors.reset}`);
    console.log(`   Message: ${health.message}`);
    console.log(`   Database: ${health.checks.database ? '✅' : '❌'}`);
    console.log(`   PostGIS: ${health.checks.postgis ? '✅' : '❌'}`);
    console.log(`   Auth: ${health.checks.auth ? '✅' : '❌'}`);
    console.log(`   Realtime: ${health.checks.realtime ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`${colors.red}   ❌ Health check failed: ${error}${colors.reset}`);
  }
  console.log();

  // 7. Test Table Access (if available)
  console.log(`${colors.blue}📊 Testing Table Access...${colors.reset}`);
  try {
    const client = getSupabaseClient();
    
    // Try to query employees table
    const { data, error } = await client
      .from('employees')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`${colors.yellow}   ⚠️  Employees table does not exist yet${colors.reset}`);
      } else if (error.code === '42501') {
        console.log(`${colors.yellow}   ⚠️  Permission denied (RLS enabled)${colors.reset}`);
      } else {
        console.log(`${colors.yellow}   ⚠️  Query error: ${error.message}${colors.reset}`);
      }
    } else {
      console.log(`${colors.green}   ✅ Table access successful${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}   ❌ Table access test failed: ${error}${colors.reset}`);
  }
  console.log();

  // Summary
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}               Test Complete               ${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
}

// Run the test
testConnection().catch(error => {
  console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
  process.exit(1);
});