/**
 * NextAuth.js Google OAuth Implementation
 * 사용자의 Google 계정으로 로그인하여 자신의 API 할당량 사용
 */

import NextAuth from 'next-auth';
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// OAuth Scopes - 사용자가 동의할 권한들
const GOOGLE_SCOPES = [
  // YouTube Data API - 크리에이터 검색용
  'https://www.googleapis.com/auth/youtube.readonly',
  
  // 사용자 기본 정보
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  
  // Google My Business (선택적 - 비즈니스 소유자용)
  // 'https://www.googleapis.com/auth/business.manage',
].join(' ');

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: 'offline', // Refresh token 받기
          prompt: 'consent', // 항상 동의 화면 표시
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, account, user }) {
      // 첫 로그인 시 토큰 저장
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.provider = account.provider;
      }
      
      // 토큰 만료 체크 및 갱신
      if (token.expiresAt && Date.now() > (token.expiresAt as number) * 1000) {
        console.log('Token expired, refreshing...');
        // TODO: Implement token refresh logic
      }
      
      return token;
    },
    
    async session({ session, token }) {
      // 세션에 액세스 토큰 추가
      session.accessToken = token.accessToken as string;
      session.provider = token.provider as string;
      
      // API 사용량 정보 추가 (선택적)
      session.quotaInfo = {
        youtube: {
          daily: 10000,
          used: 0, // TODO: Track actual usage
          resetTime: new Date().setHours(24, 0, 0, 0)
        }
      };
      
      return session;
    }
  },
  
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };