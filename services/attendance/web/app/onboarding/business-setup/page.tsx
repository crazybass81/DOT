'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase-config'
import { supabaseAuthService } from '@/src/services/supabaseAuthService'

export default function BusinessSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    businessName: '',
    businessNumber: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // 현재 사용자 정보 가져오기
      const user = await supabaseAuthService.getCurrentUser()
      if (!user) {
        throw new Error('로그인이 필요합니다')
      }

      // 1. 조직(개인사업자) 생성
      const orgData: any = {
        name: formData.businessName,
        metadata: {
          code: `BIZ_${Date.now()}`,  // code도 metadata에 저장
          registered_by: user.id,
          registered_at: new Date().toISOString(),
          business_type: 'PERSONAL',
          is_active: true
        }
      }
      
      // biz_number가 있으면 추가 (컬럼이 있는 경우를 위해)
      if (formData.businessNumber) {
        orgData.metadata.business_number = formData.businessNumber.replace(/-/g, '')
      }

      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single()

      if (orgError) {
        console.error('Organization creation error:', orgError)
        throw new Error('사업자 등록에 실패했습니다: ' + orgError.message)
      }

      // 2. 사용자를 어드민으로 등록 (user_roles 테이블)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          role: 'admin',
          is_active: true
        })

      if (roleError) {
        console.error('Role creation error:', roleError)
        // 롤 생성 실패해도 계속 진행
      }

      // 3. employees 테이블 업데이트 (조직 연결)
      const { error: empUpdateError } = await supabase
        .from('employees')
        .update({
          organization_id: organization.id,
          position: 'admin'
        })
        .eq('user_id', user.id)

      if (empUpdateError) {
        console.error('Employee update error:', empUpdateError)
        // 업데이트 실패해도 계속 진행
      }

      // 사업자 대시보드로 이동
      router.push('/business-dashboard')
    } catch (err: any) {
      console.error('Business setup error:', err)
      setError(err.message || '사업자 등록 중 오류가 발생했습니다')
      setLoading(false)
    }
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

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

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