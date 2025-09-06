/**
 * TDD Phase 3: REFACTOR - Environment Configuration
 * Centralized configuration for Supabase connections
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  options?: {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
      flowType?: 'implicit' | 'pkce';
      storage?: any;
    };
    realtime?: {
      params?: {
        eventsPerSecond?: number;
      };
    };
    db?: {
      schema?: string;
    };
    global?: {
      headers?: Record<string, string>;
      fetch?: any;
    };
  };
}

export interface EnvironmentConfig {
  name: 'development' | 'staging' | 'production' | 'test';
  supabase: SupabaseConfig;
  features: {
    enableRealtime: boolean;
    enableOfflineMode: boolean;
    enableQRCode: boolean;
    enableGPSVerification: boolean;
    enableBiometricAuth: boolean;
  };
  monitoring: {
    healthCheckInterval: number;
    connectionRetries: number;
    connectionTimeout: number;
  };
}

// Get current environment
export function getCurrentEnvironment(): EnvironmentConfig['name'] {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'production';
    case 'test':
      return 'test';
    case 'staging':
      return 'staging';
    default:
      return 'development';
  }
}

// Development configuration
const developmentConfig: EnvironmentConfig = {
  name: 'development',
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'DOT Attendance Dev'
        }
      }
    }
  },
  features: {
    enableRealtime: true,
    enableOfflineMode: true,
    enableQRCode: true,
    enableGPSVerification: true,
    enableBiometricAuth: false
  },
  monitoring: {
    healthCheckInterval: 30000, // 30 seconds
    connectionRetries: 3,
    connectionTimeout: 10000 // 10 seconds
  }
};

// Test configuration
const testConfig: EnvironmentConfig = {
  name: 'test',
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    options: {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        flowType: 'pkce'
      },
      db: {
        schema: 'public'
      }
    }
  },
  features: {
    enableRealtime: false,
    enableOfflineMode: false,
    enableQRCode: true,
    enableGPSVerification: true,
    enableBiometricAuth: false
  },
  monitoring: {
    healthCheckInterval: 5000, // 5 seconds for faster tests
    connectionRetries: 1,
    connectionTimeout: 5000 // 5 seconds
  }
};

// Staging configuration
const stagingConfig: EnvironmentConfig = {
  name: 'staging',
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      realtime: {
        params: {
          eventsPerSecond: 5
        }
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'DOT Attendance Staging'
        }
      }
    }
  },
  features: {
    enableRealtime: true,
    enableOfflineMode: true,
    enableQRCode: true,
    enableGPSVerification: true,
    enableBiometricAuth: true
  },
  monitoring: {
    healthCheckInterval: 60000, // 1 minute
    connectionRetries: 5,
    connectionTimeout: 15000 // 15 seconds
  }
};

// Production configuration
const productionConfig: EnvironmentConfig = {
  name: 'production',
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      realtime: {
        params: {
          eventsPerSecond: 2 // Conservative for production
        }
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'DOT Attendance'
        }
      }
    }
  },
  features: {
    enableRealtime: true,
    enableOfflineMode: true,
    enableQRCode: true,
    enableGPSVerification: true,
    enableBiometricAuth: true
  },
  monitoring: {
    healthCheckInterval: 120000, // 2 minutes
    connectionRetries: 10,
    connectionTimeout: 20000 // 20 seconds
  }
};

// Configuration map
const configMap: Record<EnvironmentConfig['name'], EnvironmentConfig> = {
  development: developmentConfig,
  test: testConfig,
  staging: stagingConfig,
  production: productionConfig
};

// Get configuration for current environment
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment();
  return configMap[env];
}

// Validate configuration
export function validateConfig(config: EnvironmentConfig): boolean {
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.error('Missing required Supabase configuration');
    return false;
  }

  // Validate URL format
  try {
    new URL(config.supabase.url);
  } catch {
    console.error('Invalid Supabase URL format');
    return false;
  }

  // Validate JWT format for anon key
  const jwtRegex = /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
  if (!jwtRegex.test(config.supabase.anonKey)) {
    console.error('Invalid Supabase anon key format');
    return false;
  }

  return true;
}

// Export default configuration
export const config = getEnvironmentConfig();