'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BusinessSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    businessNumber: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // 여기에 실제 API 호출 추가 가능
    // 지금은 바로 대시보드로 이동
    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <span className="text-4xl">🏪</span>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
            개인사업자 정보 입력
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            사업자 정보를 입력해주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-6 py-8 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              상호명 *
            </label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({...formData, businessName: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="우리가게"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              사업자등록번호 *
            </label>
            <input
              type="text"
              required
              value={formData.businessNumber}
              onChange={(e) => {
                let value = e.target.value.replace(/[^0-9]/g, '')
                if (value.length >= 4 && value.length <= 5) {
                  value = `${value.slice(0, 3)}-${value.slice(3)}`
                } else if (value.length >= 6) {
                  value = `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 10)}`
                }
                setFormData({...formData, businessNumber: value})
              }}
              maxLength={12}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="123-45-67890"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? '처리 중...' : '사업자 등록 완료'}
          </button>
        </form>
      </div>
    </div>
  )
}