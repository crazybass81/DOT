import type { Metadata } from 'next'
import { AuthProvider } from '../src/contexts/AuthContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'DOT 근태관리',
  description: '외식업 근태관리 시스템 - ID-ROLE-PAPER 아키텍처 기반',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}