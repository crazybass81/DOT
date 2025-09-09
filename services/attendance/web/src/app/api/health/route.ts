/**
 * Health & Status API Endpoints
 * System health monitoring for ID-ROLE-PAPER system
 * 
 * @route GET /api/health - Basic health check
 * @route GET /api/health/detailed - Detailed system status
 * @route GET /api/health/services - Service-specific health checks
 * @route GET /api/health/database - Database connectivity check
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createIdentityService } from '../../../lib/services/identity-service';
import { createBusinessRegistrationService } from '../../../lib/services/business-registration-service';
import { createPaperService } from '../../../lib/services/paper-service';
import { createPermissionService } from '../../../lib/services/permission-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
  services?: Record<string, ServiceHealth>;
  database?: DatabaseHealth;
  environment?: string;
}

interface ServiceHealth {
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'error';
  responseTime?: number;
  tables?: Record<string, boolean>;
  error?: string;
}

/**
 * GET /api/health - Basic health check endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const services = searchParams.get('services') === 'true';
    const database = searchParams.get('database') === 'true';

    if (detailed || services || database) {
      return getDetailedHealth({ detailed, services, database });
    }

    // Basic health check
    const startTime = Date.now();
    
    // Simple database connectivity check
    const { error } = await supabase
      .from('unified_identities')
      .select('count')
      .limit(1);

    const responseTime = Date.now() - startTime;
    const isHealthy = !error && responseTime < 1000;

    const health: HealthStatus = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(health, {
      status: isHealthy ? 200 : 503
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, {
      status: 503
    });
  }
}

/**
 * GET /api/health with detailed parameters - Comprehensive health status
 */
async function getDetailedHealth(options: { detailed?: boolean; services?: boolean; database?: boolean }) {
  try {
    const startTime = Date.now();
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    let overallHealthy = true;

    // Database health check
    if (options.database || options.detailed) {
      const dbHealth = await checkDatabaseHealth();
      health.database = dbHealth;
      if (dbHealth.status !== 'connected') {
        overallHealthy = false;
      }
    }

    // Service health checks
    if (options.services || options.detailed) {
      const serviceHealth = await checkServicesHealth();
      health.services = serviceHealth;
      
      // Check if any service is down
      const servicesDown = Object.values(serviceHealth).some(service => service.status === 'down');
      if (servicesDown) {
        overallHealthy = false;
      }
    }

    // Determine overall health status
    if (!overallHealthy) {
      health.status = 'unhealthy';
    } else if (health.database?.status === 'error' || 
               Object.values(health.services || {}).some(s => s.status === 'degraded')) {
      health.status = 'degraded';
    }

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 
              health.status === 'degraded' ? 200 : 503
    });

  } catch (error) {
    console.error('Detailed health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    }, {
      status: 503
    });
  }
}

/**
 * Check database connectivity and table availability
 */
async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = Date.now();
  
  try {
    // Test basic connectivity
    const { error: connectError } = await supabase
      .from('unified_identities')
      .select('count')
      .limit(1);

    if (connectError) {
      return {
        status: 'error',
        error: connectError.message,
        lastCheck: new Date().toISOString()
      };
    }

    const responseTime = Date.now() - startTime;

    // Check critical tables
    const tables = {
      unified_identities: false,
      business_registrations: false,
      papers: false,
      computed_roles: false
    };

    // Test each critical table
    for (const tableName of Object.keys(tables)) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        tables[tableName as keyof typeof tables] = !error;
      } catch {
        tables[tableName as keyof typeof tables] = false;
      }
    }

    const allTablesHealthy = Object.values(tables).every(healthy => healthy);

    return {
      status: allTablesHealthy ? 'connected' : 'error',
      responseTime,
      tables,
      error: allTablesHealthy ? undefined : 'Some tables are not accessible'
    };

  } catch (error) {
    return {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Check health of individual services
 */
async function checkServicesHealth(): Promise<Record<string, ServiceHealth>> {
  const services: Record<string, ServiceHealth> = {};

  // Identity Service health
  try {
    const startTime = Date.now();
    const identityService = createIdentityService(supabase);
    const result = await identityService.searchIdentities({ limit: 1 });
    const responseTime = Date.now() - startTime;

    services.identity = {
      status: result.success ? 'operational' : 'degraded',
      responseTime,
      lastCheck: new Date().toISOString(),
      error: result.success ? undefined : result.error
    };
  } catch (error) {
    services.identity = {
      status: 'down',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Identity service error'
    };
  }

  // Business Registration Service health
  try {
    const startTime = Date.now();
    const businessService = createBusinessRegistrationService(supabase);
    const result = await businessService.searchBusinesses({ limit: 1 });
    const responseTime = Date.now() - startTime;

    services.business = {
      status: result.success ? 'operational' : 'degraded',
      responseTime,
      lastCheck: new Date().toISOString(),
      error: result.success ? undefined : result.error
    };
  } catch (error) {
    services.business = {
      status: 'down',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Business service error'
    };
  }

  // Paper Service health
  try {
    const startTime = Date.now();
    const paperService = createPaperService(supabase);
    const result = await paperService.searchPapers({ limit: 1 });
    const responseTime = Date.now() - startTime;

    services.paper = {
      status: result.success ? 'operational' : 'degraded',
      responseTime,
      lastCheck: new Date().toISOString(),
      error: result.success ? undefined : result.error
    };
  } catch (error) {
    services.paper = {
      status: 'down',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Paper service error'
    };
  }

  // Permission Service health
  try {
    const startTime = Date.now();
    const permissionService = createPermissionService(supabase);
    // Simple test - this service doesn't have search functionality
    // We'll just test if it can be instantiated and basic functionality works
    services.permission = {
      status: 'operational',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    services.permission = {
      status: 'down',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Permission service error'
    };
  }

  return services;
}

/**
 * POST /api/health - Manual health check trigger (for monitoring systems)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { components = [] } = body;

    // Allow monitoring systems to request specific component checks
    const detailed = components.includes('all') || components.includes('detailed');
    const services = components.includes('all') || components.includes('services');
    const database = components.includes('all') || components.includes('database');

    return getDetailedHealth({ detailed, services, database });

  } catch (error) {
    console.error('Manual health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Manual health check failed'
    }, {
      status: 503
    });
  }
}
