import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DOT 근태관리',
  description: '외식업 근태관리 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  )
}