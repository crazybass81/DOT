import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RegistrationAPI } from '@/lib/registration/api'

/**
 * Step 1: 기본 회원가입 폼
 * 개인 정보만 입력받고, 역할은 나중에 선택
 */
export default function BasicRegistrationForm() {
  const router = useRouter()
  const api = new RegistrationAPI()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    fullName: '',
    phone: '',
    birthDate: ''
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

      // 나이 확인
      const age = api.calculateAge(formData.birthDate)
      if (age < 15) {
        setError('만 15세 미만은 가입할 수 없습니다')
        setLoading(false)
        return
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

      // 기본 회원가입 처리 (역할 없이)
      const result = await api.registerBasicAccount({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone,
        birthDate: formData.birthDate
      })

      if (result.success) {
        // 역할 선택 페이지로 이동
        router.push('/onboarding/role-selection')
      } else {
        setError(result.error || '회원가입 실패')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            개인 계정을 생성합니다
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            {/* 이름 */}
            <div>
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
            <div>
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
            <div>
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
            <div>
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
                max={new Date().toISOString().split('T')[0]}
              />
              {formData.birthDate && (
                <p className="mt-1 text-xs text-gray-500">
                  만 {api.calculateAge(formData.birthDate)}세
                </p>
              )}
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