// Import path module for webpack aliases
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router configuration (appDir is now stable in Next.js 15)
  experimental: {
    // Remove deprecated appDir option
  },

  // TypeScript configuration
  typescript: {
    // Type checking during development and build
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Run ESLint during build
    ignoreDuringBuilds: false,
    dirs: ['src'],
  },

  // Image optimization
  images: {
    domains: [
      // Add your Supabase storage domain here
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '.supabase.co') || 'localhost',
    ],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Public runtime configuration
  publicRuntimeConfig: {
    // Expose to client-side
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Server runtime configuration - REMOVED SERVICE KEY FOR SECURITY
  serverRuntimeConfig: {
    // Server-side only - Service keys should never be in runtime config
    // Use process.env directly in API routes instead
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy - STRENGTHENED SECURITY
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // X-Frame-Options
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // X-Content-Type-Options
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=self',
              'accelerometer=',
              'autoplay=',
              'encrypted-media=',
              'fullscreen=',
              'gyroscope=',
              'magnetometer=',
              'payment=',
              'usb='
            ].join(', '),
          },
        ],
      },
    ];
  },

  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/',
        destination: '/id-role-paper',
        permanent: false,
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Custom webpack configuration for ID-ROLE-PAPER system
    
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            priority: 30,
            reuseExistingChunk: true,
          },
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      };
    }

    // Add custom aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '.'),
      '@components': path.resolve(__dirname, 'components'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@contexts': path.resolve(__dirname, 'src/contexts'),
      '@types': path.resolve(__dirname, 'src/types'),
    };

    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // Build output configuration
  output: 'standalone',
  
  // Add outputFileTracingRoot to silence workspace warning
  outputFileTracingRoot: path.join(__dirname, '../../../'),
  
  // Compression
  compress: true,

  // Performance optimizations (swcMinify is now default in Next.js 15)
  // swcMinify: true, // Removed as it's default
  
  // Development configuration
  ...(process.env.NODE_ENV === 'development' && {
    // Enable source maps in development
    productionBrowserSourceMaps: false,
    
    // Faster builds in development
    webpack: (config, options) => {
      if (options.dev) {
        config.devtool = 'eval-source-map';
      }
      return config;
    },
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Enable strict mode in production
    reactStrictMode: true,
    
    // Production source maps (disable for security)
    productionBrowserSourceMaps: false,
    
    // SWC minification is now default in Next.js 15
    // swcMinify: true, // Removed as it's default
  }),
};

module.exports = nextConfig;