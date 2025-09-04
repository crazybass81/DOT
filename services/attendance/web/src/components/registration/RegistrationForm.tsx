import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RegistrationAPI } from '@/lib/registration/api'

export default function RegistrationForm() {
  const router = useRouter()
  const api = new RegistrationAPI()
  
  const [step, setStep] = useState<'info' | 'success'>('info')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    fullName: '',
    phone: '',
    birthDate: '',
    registrationType: 'personal' as 'personal' | 'business_owner' | 'corporation_founder' | 'franchise_founder',
    // 사업자 정보 추가
    businessName: '',
    businessNumber: '',
    businessAddress: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 비밀번호 확인
      if (formData.password !== formData.passwordConfirm) {
        setError('비밀번호가 일치하지 않습니다')
        setLoading(false)
        return
      }

      // 비밀번호 유효성 검사
      const passwordValidation = api.validatePassword(formData.password)
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors.join(', '))
        setLoading(false)
        return
      }

      // 사업자 등록 시 필수 정보 확인
      if (formData.registrationType !== 'personal') {
        if (!formData.businessName || !formData.businessNumber) {
          setError('사업자명과 사업자등록번호는 필수입니다')
          setLoading(false)
          return
        }
        // 사업자등록번호 형식 검증 (xxx-xx-xxxxx)
        const bizNumPattern = /^\d{3}-\d{2}-\d{5}$/
        if (!bizNumPattern.test(formData.businessNumber)) {
          setError('사업자등록번호 형식이 올바르지 않습니다 (예: 123-45-67890)')
          setLoading(false)
          return
        }
      }

      // 중복 확인
      const availability = await api.checkAvailability(formData.email, formData.phone)
      if (!availability.emailAvailable) {
        setError('이미 등록된 이메일입니다')
        setLoading(false)
        return
      }
      if (!availability.phoneAvailable) {
        setError('이미 등록된 전화번호입니다')
        setLoading(false)
        return
      }

      // 회원가입 처리 (사업자 정보 포함)
      const result = await api.register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone,
        birthDate: formData.birthDate,
        registrationType: formData.registrationType,
        businessInfo: formData.registrationType !== 'personal' ? {
          name: formData.businessName,
          bizNumber: formData.businessNumber,
          address: formData.businessAddress
        } : undefined
      })

      if (result.success) {
        setStep('success')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(result.error || '회원가입 실패')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              회원가입 완료!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {formData.registrationType === 'business_owner' && `개인사업자 '${formData.businessName}' 등록이 완료되었습니다.`}
              {formData.registrationType === 'corporation_founder' && `법인 '${formData.businessName}' 등록이 완료되었습니다.`}
              {formData.registrationType === 'franchise_founder' && `가맹본부 '${formData.businessName}' 등록이 완료되었습니다.`}
              {formData.registrationType === 'personal' && '회원가입이 완료되었습니다.'}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            근로 관리 시스템에 오신 것을 환영합니다
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            {/* 가입 유형 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                가입 유형
              </label>
              <select
                value={formData.registrationType}
                onChange={(e) => setFormData({ ...formData, registrationType: e.target.value as any })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                required
              >
                <option value="personal">일반 근로자</option>
                <option value="business_owner">개인사업자</option>
                <option value="corporation_founder">법인 설립자</option>
                <option value="franchise_founder">가맹본부 설립자</option>
              </select>
            </div>

            {/* 사업자 정보 (사업자 유형 선택 시에만 표시) */}
            {formData.registrationType !== 'personal' && (
              <>
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">사업자 정보</h3>
                  
                  {/* 사업자명/법인명 */}
                  <div className="mb-4">
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                      {formData.registrationType === 'business_owner' ? '상호명' : 
                       formData.registrationType === 'corporation_founder' ? '법인명' : 
                       '가맹본부명'} *
                    </label>
                    <input
                      id="businessName"
                      name="businessName"
                      type="text"
                      required={formData.registrationType !== 'personal'}
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                      placeholder={
                        formData.registrationType === 'business_owner' ? '예: 김밥천국 강남점' : 
                        formData.registrationType === 'corporation_founder' ? '예: (주)우리회사' : 
                        '예: 프랜차이즈본부'
                      }
                    />
                  </div>

                  {/* 사업자등록번호 */}
                  <div className="mb-4">
                    <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700">
                      사업자등록번호 *
                    </label>
                    <input
                      id="businessNumber"
                      name="businessNumber"
                      type="text"
                      required={formData.registrationType !== 'personal'}
                      value={formData.businessNumber}
                      onChange={(e) => {
                        // 자동 하이픈 추가
                        let value = e.target.value.replace(/[^0-9]/g, '')
                        if (value.length >= 4 && value.length <= 5) {
                          value = `${value.slice(0, 3)}-${value.slice(3)}`
                        } else if (value.length >= 6) {
                          value = `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 10)}`
                        }
                        setFormData({ ...formData, businessNumber: value })
                      }}
                      maxLength={12}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                      placeholder="123-45-67890"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      10자리 숫자를 입력하세요 (하이픈 자동 입력)
                    </p>
                  </div>

                  {/* 사업장 주소 */}
                  <div>
                    <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700">
                      사업장 주소
                    </label>
                    <input
                      id="businessAddress"
                      name="businessAddress"
                      type="text"
                      value={formData.businessAddress}
                      onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                      placeholder="서울특별시 강남구 테헤란로 123"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">개인 정보</h3>

              {/* 이름 */}
              <div className="mb-4">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  이름 *
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="홍길동"
                />
              </div>

              {/* 이메일 */}
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  이메일 *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="example@email.com"
                />
              </div>

              {/* 전화번호 */}
              <div className="mb-4">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  전화번호 *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => {
                    // 자동 하이픈 추가
                    let value = e.target.value.replace(/[^0-9]/g, '')
                    if (value.length >= 4 && value.length <= 7) {
                      value = `${value.slice(0, 3)}-${value.slice(3)}`
                    } else if (value.length >= 8) {
                      value = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`
                    }
                    setFormData({ ...formData, phone: value })
                  }}
                  maxLength={13}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="010-0000-0000"
                />
              </div>

              {/* 생년월일 */}
              <div className="mb-4">
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                  생년월일 *
                </label>
                <input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  required
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">비밀번호 설정</h3>

              {/* 비밀번호 */}
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  비밀번호 *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="8자 이상, 대소문자, 숫자, 특수문자 포함"
                />
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
                  비밀번호 확인 *
                </label>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  required
                  value={formData.passwordConfirm}
                  onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="비밀번호 재입력"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '회원가입'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                로그인
              </a>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}