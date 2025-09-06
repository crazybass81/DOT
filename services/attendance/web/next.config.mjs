import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: {
    outputFileTracingRoot: __dirname
  },
  // 모바일 GPS 접근을 위한 설정
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(*)'
          }
        ]
      }
    ];
  },
};

export default nextConfig;