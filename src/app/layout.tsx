/**
 * Root Layout for ID-ROLE-PAPER System
 * Provides global providers, styling, and metadata
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Toaster } from '../components/common/Toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ID-ROLE-PAPER System | DOT 출석 관리',
  description: '통합 신원, 사업자, 문서, 권한 관리 시스템 - DOT 출석 관리 서비스',
  keywords: ['출석관리', '신원관리', '사업자등록', '권한관리', 'RBAC', '한국사업자'],
  authors: [{ name: 'DOT Team' }],
  creator: 'DOT Team',
  publisher: 'DOT Platform',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
    title: 'ID-ROLE-PAPER System',
    description: '통합 신원, 사업자, 문서, 권한 관리 시스템',
    siteName: 'DOT 출석 관리',
  },
  twitter: {
    card: 'summary',
    title: 'ID-ROLE-PAPER System',
    description: '통합 신원, 사업자, 문서, 권한 관리 시스템',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ID-ROLE-PAPER" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900`}>
        <ErrorBoundary>
          <AuthProvider>
            <div id="root" className="min-h-screen">
              {children}
            </div>
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
        
        {/* Development helpers */}
        {process.env.NODE_ENV === 'development' && (
          <>
            <div id="development-info" className="fixed bottom-2 left-2 z-50 opacity-30 hover:opacity-100 transition-opacity">
              <div className="bg-black text-white text-xs px-2 py-1 rounded">
                ENV: {process.env.NODE_ENV}
              </div>
            </div>
            <div id="portal-root" />
          </>
        )}
      </body>
    </html>
  );
}