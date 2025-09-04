import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RegistrationAPI } from '@/lib/registration/api'

/**
 * Step 3: 법인 설립 폼
 * 법인 정보 + 본인 근로조건 입력
 */
export default function CorporationSetupForm() {
  const router = useRouter()
  const api = new RegistrationAPI()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'business' | 'employment'>('business')
  
  // 법인 정보
  const [businessData, setBusinessData] = useState({
    corporationName: '',
    businessNumber: '',
    businessAddress: '',
    representativeName: '',
    establishDate: ''
  })

  // 근로조건 정보
  const [employmentData, setEmploymentData] = useState({
    position: '대표이사',
    wageType: 'monthly' as 'hourly' | 'monthly' | 'yearly',
    wageAmount: '',
    workStartTime: '09:00',
    workEndTime: '18:00',
    workDays: [1, 2, 3, 4, 5], // 월-금
    lunchBreak: '60', // 점심시간 (분)
    annualLeave: '15' // 연차
  })

  const handleBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 사업자등록번호 형식 검증
    const bizNumPattern = /^\d{3}-\d{2}-\d{5}$/
    if (!bizNumPattern.test(businessData.businessNumber)) {
      setError('사업자등록번호 형식이 올바르지 않습니다 (예: 123-45-67890)')
      return
    }
    
    setStep('employment')
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 법인 설립 및 근로계약 생성
      const result = await api.setupCorporation({
        business: businessData,
        employment: employmentData
      })

      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || '법인 설립 실패')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const workDayLabels = ['월', '화', '수', '목', '금', '토', '일']

  if (step === 'business') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <span className="text-4xl">🏢</span>
            <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
              법인 정보 입력
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              법인 사업자 정보를 입력해주세요
            </p>
          </div>

          <form onSubmit={handleBusinessSubmit} className="space-y-6 bg-white shadow px-6 py-8 rounded-lg">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                법인명 *
              </label>
              <input
                type="text"
                required
                value={businessData.corporationName}
                onChange={(e) => setBusinessData({ ...businessData, corporationName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="(주)우리회사"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                사업자등록번호 *
              </label>
              <input
                type="text"
                required
                value={businessData.businessNumber}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9]/g, '')
                  if (value.length >= 4 && value.length <= 5) {
                    value = `${value.slice(0, 3)}-${value.slice(3)}`
                  } else if (value.length >= 6) {
                    value = `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 10)}`
                  }
                  setBusinessData({ ...businessData, businessNumber: value })
                }}
                maxLength={12}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="123-45-67890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                대표자명 *
              </label>
              <input
                type="text"
                required
                value={businessData.representativeName}
                onChange={(e) => setBusinessData({ ...businessData, representativeName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                설립일 *
              </label>
              <input
                type="date"
                required
                value={businessData.establishDate}
                onChange={(e) => setBusinessData({ ...businessData, establishDate: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                사업장 주소 *
              </label>
              <input
                type="text"
                required
                value={businessData.businessAddress}
                onChange={(e) => setBusinessData({ ...businessData, businessAddress: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="서울특별시 강남구 테헤란로 123"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              다음 단계 →
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <span className="text-4xl">📋</span>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
            근로조건 설정
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            대표이사님의 근로계약이 자동으로 생성됩니다
          </p>
        </div>

        <form onSubmit={handleFinalSubmit} className="space-y-6 bg-white shadow px-6 py-8 rounded-lg">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              직책 *
            </label>
            <select
              value={employmentData.position}
              onChange={(e) => setEmploymentData({ ...employmentData, position: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="대표이사">대표이사</option>
              <option value="이사">이사</option>
              <option value="감사">감사</option>
              <option value="부사장">부사장</option>
              <option value="전무">전무</option>
              <option value="상무">상무</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              급여 형태 *
            </label>
            <select
              value={employmentData.wageType}
              onChange={(e) => setEmploymentData({ ...employmentData, wageType: e.target.value as any })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="monthly">월급</option>
              <option value="yearly">연봉</option>
              <option value="hourly">시급</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              급여액 *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                required
                value={employmentData.wageAmount}
                onChange={(e) => setEmploymentData({ ...employmentData, wageAmount: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={
                  employmentData.wageType === 'hourly' ? '10000' :
                  employmentData.wageType === 'monthly' ? '3000000' :
                  '36000000'
                }
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">
                  {employmentData.wageType === 'hourly' ? '원/시간' :
                   employmentData.wageType === 'monthly' ? '원/월' :
                   '원/년'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                출근 시간 *
              </label>
              <input
                type="time"
                required
                value={employmentData.workStartTime}
                onChange={(e) => setEmploymentData({ ...employmentData, workStartTime: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                퇴근 시간 *
              </label>
              <input
                type="time"
                required
                value={employmentData.workEndTime}
                onChange={(e) => setEmploymentData({ ...employmentData, workEndTime: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              근무 요일 *
            </label>
            <div className="flex space-x-2">
              {workDayLabels.map((day, index) => (
                <label
                  key={index}
                  className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-colors ${
                    employmentData.workDays.includes(index) 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={employmentData.workDays.includes(index)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEmploymentData({ 
                          ...employmentData, 
                          workDays: [...employmentData.workDays, index].sort()
                        })
                      } else {
                        setEmploymentData({ 
                          ...employmentData, 
                          workDays: employmentData.workDays.filter(d => d !== index)
                        })
                      }
                    }}
                  />
                  <span className="text-xs font-medium">{day}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                점심시간 (분)
              </label>
              <input
                type="number"
                value={employmentData.lunchBreak}
                onChange={(e) => setEmploymentData({ ...employmentData, lunchBreak: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                연차 (일)
              </label>
              <input
                type="number"
                value={employmentData.annualLeave}
                onChange={(e) => setEmploymentData({ ...employmentData, annualLeave: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="15"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setStep('business')}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              ← 이전
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '법인 설립 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}