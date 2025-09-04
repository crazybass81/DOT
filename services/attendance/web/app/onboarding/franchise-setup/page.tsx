'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FranchiseSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <span className="text-4xl">🏬</span>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
            가맹본부 정보 입력
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            가맹본부 정보를 입력해주세요
          </p>
        </div>

        <form className="space-y-6 bg-white shadow px-6 py-8 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              가맹본부명 *
            </label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="(주)프랜차이즈본부"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              사업자등록번호 *
            </label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="123-45-67890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              브랜드명 *
            </label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="브랜드이름"
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            가맹본부 등록 완료
          </button>
        </form>
      </div>
    </div>
  )
}