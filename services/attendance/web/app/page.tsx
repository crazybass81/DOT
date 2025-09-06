'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Shield, Users, Clock, CheckCircle } from 'lucide-react';
import { supabaseAuthService } from '../src/services/supabaseAuthService';

export default function Home() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isFindIdPwModalOpen, setFindIdPwModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const idInputRef = useRef<HTMLDivElement>(null);

  // Mock 계정 데이터 (테스트용)
  const testAccounts = [
    { type: '관리자', id: 'archt723@gmail.com', password: 'Master123!@#' },
    { type: '사업자', id: 'crazybass81@naver.com', password: 'Test123!' }
  ];

  const filteredAccounts = id
    ? testAccounts.filter(acc => acc.id.toLowerCase().includes(id.toLowerCase()))
    : testAccounts;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAccountSelect = (account: { id: string, password?: string }) => {
    setId(account.id);
    if (account.password) {
      setPassword(account.password);
    }
    setShowAutocomplete(false);
    setError('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (idInputRef.current && !idInputRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await supabaseAuthService.signIn(id, password);
      
      if (user) {
        // employee 정보에서 position과 organization 확인
        const { data: employee } = await supabaseAuthService.supabase
          .from('employees')
          .select('position, organization_id')
          .eq('user_id', user.id)
          .single();
        
        // 역할에 따라 다른 대시보드로 리다이렉트
        if (employee?.position === 'owner' || employee?.position === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/attendance');
        }
      } else {
        setError('로그인에 실패했습니다');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || '아이디 또는 비밀번호가 일치하지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Login Section */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              환영합니다
            </h2>
            <p className="text-lg text-gray-600">
              DOT 근태관리 시스템에 로그인하세요
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl shadow-xl p-8">
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <div className="relative" ref={idInputRef}>
                <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-2">
                  이메일 또는 사용자 ID
                </label>
                <input
                  type="text"
                  placeholder="이메일을 입력하세요"
                  id="id"
                  name="id"
                  required
                  autoComplete="email"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    if (!showAutocomplete) setShowAutocomplete(true);
                    setError('');
                  }}
                  onFocus={() => setShowAutocomplete(true)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {showAutocomplete && filteredAccounts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <ul className="py-1 max-h-48 overflow-y-auto">
                      {filteredAccounts.map(account => (
                        <li
                          key={`${account.type}-${account.id}`}
                          className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center transition-colors"
                          onClick={() => handleAccountSelect(account)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <span className="text-sm">{account.id}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            account.type === '관리자' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {account.type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  id="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">로그인 안내:</p>
                <p>• 관리자: 등록된 이메일과 비밀번호</p>
                <p>• 직원: 이름(ID)과 생년월일 8자리(PW)</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] disabled:hover:scale-100"
              >
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="w-5 h-5" />
                  {loading ? '로그인 중...' : '로그인'}
                </div>
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                회원가입
              </Link>
              <span className="mx-3 text-gray-400">|</span>
              <button
                onClick={() => setFindIdPwModalOpen(true)}
                className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                ID/PW 찾기
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 bg-white/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-center text-gray-900 mb-6">시스템 특징</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/50 rounded-xl backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">보안 인증</h4>
              <p className="text-xs text-gray-600">안전한 인증 시스템</p>
            </div>
            
            <div className="text-center p-4 bg-white/50 rounded-xl backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">실시간 기록</h4>
              <p className="text-xs text-gray-600">즉시 출퇴근 저장</p>
            </div>
            
            <div className="text-center p-4 bg-white/50 rounded-xl backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">통합 관리</h4>
              <p className="text-xs text-gray-600">중앙 집중 관리</p>
            </div>
            
            <div className="text-center p-4 bg-white/50 rounded-xl backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">간편 사용</h4>
              <p className="text-xs text-gray-600">직관적 인터페이스</p>
            </div>
          </div>
        </div>
      </section>

      {/* Find ID/PW Modal */}
      {isFindIdPwModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">아이디/비밀번호 찾기</h3>
              <button
                onClick={() => setFindIdPwModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium mb-2">계정 복구 안내</p>
                  <p>계정 정보를 포함하여 아래 이메일로 문의해 주시면 최대한 빠르게 답변드리겠습니다.</p>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  setFindIdPwModalOpen(false);
                  alert('문의가 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.');
                }}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="dev-email" className="block text-sm font-medium text-gray-700 mb-2">
                        받는 사람
                      </label>
                      <input
                        id="dev-email"
                        type="email"
                        value="support@dot-attendance.com"
                        disabled
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="find-email" className="block text-sm font-medium text-gray-700 mb-2">
                        회신받을 이메일 주소 *
                      </label>
                      <input
                        id="find-email"
                        type="email"
                        required
                        placeholder="example@company.com"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="find-message" className="block text-sm font-medium text-gray-700 mb-2">
                        문의 내용 *
                      </label>
                      <textarea
                        id="find-message"
                        required
                        rows={4}
                        placeholder="가입 시 입력한 이름, 회사명, 연락처 등을 상세히 입력해주세요."
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setFindIdPwModalOpen(false)}
                        className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                      >
                        문의 보내기
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4 sm:px-6 lg:px-8 bg-white/30 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-600 mb-1">
            © 2024 DOT Attendance System. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Powered by Next.js • Secured by Supabase
          </p>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}