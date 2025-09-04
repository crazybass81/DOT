import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RegistrationAPI } from '@/lib/registration/api'

/**
 * Step 2: 역할 선택 페이지
 * 회원가입 후 어떤 역할로 시작할지 선택
 */
export default function RoleSelectionPage() {
  const router = useRouter()
  const api = new RegistrationAPI()
  const [loading, setLoading] = useState(false)

  const handleRoleSelect = async (role: string) => {
    setLoading(true)
    
    switch (role) {
      case 'worker':
        // 일반 근로자는 추가 정보 없이 대시보드로
        router.push('/dashboard')
        break
        
      case 'business_owner':
        // 개인사업자 정보 입력 페이지로
        router.push('/onboarding/business-setup')
        break
        
      case 'corporation':
        // 법인 설립 페이지로 (근로조건 포함)
        router.push('/onboarding/corporation-setup')
        break
        
      case 'franchise':
        // 가맹본부 설립 페이지로 (근로조건 포함)
        router.push('/onboarding/franchise-setup')
        break
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            환영합니다! 👋
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            어떤 역할로 시작하시겠습니까?
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 일반 근로자 */}
          <div
            onClick={() => !loading && handleRoleSelect('worker')}
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <span className="text-3xl">🧑‍💼</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900">
                  일반 근로자
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  사업장에서 일하시는 분
                </p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• 출퇴근 기록</li>
                  <li>• 급여 확인</li>
                  <li>• 근로계약서 조회</li>
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                추가 정보 불필요
              </span>
            </div>
          </div>

          {/* 개인사업자 */}
          <div
            onClick={() => !loading && handleRoleSelect('business_owner')}
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <span className="text-3xl">🏪</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900">
                  개인사업자
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  개인사업을 운영하시는 분
                </p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• 직원 관리</li>
                  <li>• 근태 관리</li>
                  <li>• 급여 관리</li>
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                사업자 정보 필요
              </span>
            </div>
          </div>

          {/* 법인 설립 */}
          <div
            onClick={() => !loading && handleRoleSelect('corporation')}
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <span className="text-3xl">🏢</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900">
                  법인 설립
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  법인을 설립하시는 분
                </p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• 법인 관리</li>
                  <li>• 직원 관리</li>
                  <li>• 본인 근로계약 자동생성</li>
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                법인 정보 + 근로조건 필요
              </span>
            </div>
          </div>

          {/* 가맹본부 설립 */}
          <div
            onClick={() => !loading && handleRoleSelect('franchise')}
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <span className="text-3xl">🏬</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900">
                  가맹본부 설립
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  프랜차이즈 본부 운영하시는 분
                </p>
                <ul className="mt-2 text-xs text-gray-400 space-y-1">
                  <li>• 가맹점 관리</li>
                  <li>• 통합 근태 관리</li>
                  <li>• 본인 근로계약 자동생성</li>
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                가맹본부 정보 + 근로조건 필요
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            나중에 추가 역할을 등록할 수 있습니다
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            지금은 건너뛰기 →
          </button>
        </div>
      </div>
    </div>
  )
}