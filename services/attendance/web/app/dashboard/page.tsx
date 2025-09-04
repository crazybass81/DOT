'use client'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">
            대시보드
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            회원가입이 완료되었습니다!
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">환영합니다!</h2>
          <p className="text-gray-600">
            성공적으로 로그인되었습니다. 
          </p>
        </div>
      </div>
    </div>
  )
}
