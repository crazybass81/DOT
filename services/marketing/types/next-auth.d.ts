/**
 * NextAuth TypeScript 확장
 * 세션에 커스텀 필드 추가
 */

import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    provider?: string;
    quotaInfo?: {
      youtube: {
        daily: number;
        used: number;
        resetTime: number;
      };
    };
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } & DefaultSession['user'];
  }
  
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    provider?: string;
  }
}