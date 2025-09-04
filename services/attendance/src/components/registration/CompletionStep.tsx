import React from 'react'

interface CompletionStepProps {
  accountData: any
  onComplete: () => void
}

const CompletionStep: React.FC<CompletionStepProps> = ({
  accountData,
  onComplete
}) => {
  return (
    <div className="space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">회원가입 완료!</h2>
        <p className="text-gray-600">
          계정이 성공적으로 생성되었습니다.
        </p>
      </div>

      {/* Account Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">계정 정보</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">이름:</span>
            <span className="font-medium">{accountData.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">이메일:</span>
            <span className="font-medium">{accountData.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">전화번호:</span>
            <span className="font-medium">{accountData.phone}</span>
          </div>
          {accountData.roleType && (
            <div className="flex justify-between">
              <span className="text-gray-600">역할:</span>
              <span className="font-medium capitalize">{getRoleLabel(accountData.roleType)}</span>
            </div>
          )}
          {accountData.organizationCode && (
            <div className="flex justify-between">
              <span className="text-gray-600">조직 코드:</span>
              <span className="font-medium">{accountData.organizationCode}</span>
            </div>
          )}
          {accountData.businessName && (
            <div className="flex justify-between">
              <span className="text-gray-600">사업체명:</span>
              <span className="font-medium">{accountData.businessName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">다음 단계</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          {accountData.roleType === 'worker' && (
            <>
              <li>• 관리자 승인을 기다려 주세요</li>
              <li>• 승인 완료 시 SMS로 알림을 받게 됩니다</li>
              <li>• 승인 후 출퇴근 기록이 가능합니다</li>
            </>
          )}
          {accountData.roleType === 'admin' && (
            <>
              <li>• 조직 설정을 완료하세요</li>
              <li>• 직원들을 초대하세요</li>
              <li>• 근무 일정을 설정하세요</li>
            </>
          )}
          {accountData.roleType === 'master' && (
            <>
              <li>• 조직 초기 설정을 진행하세요</li>
              <li>• 결제 정보를 등록하세요</li>
              <li>• 관리자와 직원을 초대하세요</li>
            </>
          )}
          {accountData.roleType === 'manager' && (
            <>
              <li>• 팀 구성원을 확인하세요</li>
              <li>• 근무 일정을 검토하세요</li>
              <li>• 승인 대기 중인 요청을 확인하세요</li>
            </>
          )}
        </ul>
      </div>

      {/* Important Notice for Teens */}
      {accountData.requiresParentConsent && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>청소년 근로자 안내:</strong><br />
            • 주 35시간, 일 7시간 근무 제한<br />
            • 오후 10시 ~ 오전 6시 근무 금지<br />
            • 4시간마다 30분 휴식 의무<br />
            • 부모님 동의서가 등록되었습니다
          </p>
        </div>
      )}

      {/* Email Verification Notice */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          이메일 인증 링크가 {accountData.email}로 발송되었습니다.<br />
          24시간 내에 이메일을 확인하여 계정을 활성화해주세요.
        </p>
      </div>

      {/* Complete Button */}
      <button
        onClick={onComplete}
        className="w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        대시보드로 이동
      </button>
    </div>
  )
}

// Helper function to get Korean role label
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    'master': '마스터 관리자',
    'admin': '관리자',
    'manager': '매니저',
    'worker': '직원',
    'franchise_staff': '프랜차이즈 스태프'
  }
  return labels[role] || role
}

export default CompletionStep