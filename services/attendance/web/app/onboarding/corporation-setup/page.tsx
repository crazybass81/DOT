'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const CorporationSetupForm = dynamic(
  () => import('@/components/onboarding/CorporationSetupForm'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }
)

export default function CorporationSetupRoute() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <CorporationSetupForm />
    </Suspense>
  )
}