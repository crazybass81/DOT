'use client'

import Link from 'next/link';
import { QrCode, Calendar, Users, Settings } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white">
            DOT 출퇴근 관리 시스템
          </h1>
          <p className="mt-2 text-lg text-slate-300">
            QR 코드와 GPS를 활용한 스마트 출퇴근 관리
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* QR 관리 시스템 */}
          <Link href="/qr/manage" className="group">
            <div className="backdrop-blur-xl bg-white/10 border-white/20 rounded-lg p-6 shadow-2xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-lg mb-4 group-hover:bg-blue-500/30 transition-colors">
                <QrCode className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">QR 관리</h3>
              <p className="text-slate-300 text-sm">QR 코드 생성 및 스캔 테스트</p>
            </div>
          </Link>

          {/* 출퇴근 기록 */}
          <div className="backdrop-blur-xl bg-white/10 border-white/20 rounded-lg p-6 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-lg mb-4">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">출퇴근 기록</h3>
            <p className="text-slate-300 text-sm">일일 출퇴근 현황 조회</p>
          </div>

          {/* 직원 관리 */}
          <div className="backdrop-blur-xl bg-white/10 border-white/20 rounded-lg p-6 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-lg mb-4">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">직원 관리</h3>
            <p className="text-slate-300 text-sm">직원 정보 및 권한 관리</p>
          </div>

          {/* 시스템 설정 */}
          <div className="backdrop-blur-xl bg-white/10 border-white/20 rounded-lg p-6 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-500/20 rounded-lg mb-4">
              <Settings className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">시스템 설정</h3>
            <p className="text-slate-300 text-sm">조직 설정 및 정책 관리</p>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/10 border-white/20 rounded-lg p-6 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-white">시스템 개요</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-2">QR 코드 시스템</h3>
              <ul className="text-slate-300 space-y-1 text-sm">
                <li>• 직원용 개인 QR 코드</li>
                <li>• 장소 기반 조직 QR 코드</li>
                <li>• AES 암호화 보안</li>
                <li>• 24시간 자동 만료</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">GPS 위치 시스템</h3>
              <ul className="text-slate-300 space-y-1 text-sm">
                <li>• 실시간 위치 확인</li>
                <li>• 허용 반경 설정</li>
                <li>• 정확한 거리 계산</li>
                <li>• 위치 기반 출퇴근 제한</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
