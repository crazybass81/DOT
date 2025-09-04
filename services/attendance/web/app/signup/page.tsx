'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Supabase
const RegistrationForm = dynamic(
  () => import('@/components/registration/RegistrationForm'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">회원가입 준비 중...</p>
        </div>
      </div>
    )
  }
)

export default function SignUpPage() {
  // Supabase URL and key are already configured in lib/supabase-config.ts
  // No need to pass them as props
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    }>
      <RegistrationForm />
    </Suspense>
  )
}