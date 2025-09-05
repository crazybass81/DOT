'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseAuthService } from '@/services/supabaseAuthService';

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isFindIdPwModalOpen, setFindIdPwModalOpen] = useState(false);
  const idInputRef = useRef<HTMLDivElement>(null);

  // Mock 계정 데이터 (테스트용)
  const testAccounts = [
    { type: '관리자', id: 'archt723@gmail.com', password: 'Master123!@#' },
    { type: '사업자', id: 'crazybass81@naver.com', password: 'Test123!' }
  ];

  const filteredAccounts = id
    ? testAccounts.filter(acc => acc.id.toLowerCase().includes(id.toLowerCase()))
    : testAccounts;

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
          router.push('/business-dashboard');
        } else {
          router.push('/worker-dashboard');
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
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Blob Animations */}
      <div className="absolute inset-0 z-0">
        <div className="blob blob-admin-1"></div>
        <div className="blob blob-admin-2"></div>
        <div className="blob blob-admin-3"></div>
        <div className="blob blob-admin-4"></div>
        <div className="blob blob-admin-5"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-700">DOT ATTENDANCE</h1>
            <p className="text-lg text-slate-600 mt-1">출퇴근 관리 시스템</p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-lg shadow-xl p-6">
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="relative" ref={idInputRef}>
                <input
                  type="text"
                  placeholder="ID"
                  id="id"
                  name="id"
                  required
                  autoComplete="off"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    if (!showAutocomplete) setShowAutocomplete(true);
                    setError('');
                  }}
                  onFocus={() => setShowAutocomplete(true)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {showAutocomplete && filteredAccounts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg">
                    <ul className="py-1 max-h-48 overflow-y-auto">
                      {filteredAccounts.map(account => (
                        <li
                          key={`${account.type}-${account.id}`}
                          className="px-3 py-2 cursor-pointer hover:bg-slate-100 flex justify-between items-center"
                          onClick={() => handleAccountSelect(account)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <span>{account.id}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            account.type === '관리자' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {account.type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <input
                type="password"
                placeholder="비밀번호"
                id="password"
                name="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />

              <p className="text-xs text-slate-500 pt-1 px-1">
                근로자는 ID(이름), PW(생년월일 8자리)로 로그인하세요.
              </p>

              {error && (
                <p className="text-sm text-red-500 text-center -my-1 whitespace-pre-wrap">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="text-center pt-4 text-sm text-slate-700">
              <Link href="/signup" className="font-semibold text-blue-600 hover:underline">
                회원가입
              </Link>
              <span className="mx-2 text-slate-400">|</span>
              <button
                onClick={() => setFindIdPwModalOpen(true)}
                className="font-semibold text-blue-600 hover:underline"
              >
                ID/PW 찾기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Find ID/PW Modal */}
      {isFindIdPwModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">아이디/비밀번호 찾기</h3>
              <button
                onClick={() => setFindIdPwModalOpen(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                <span className="text-xl" role="img" aria-label="Close">❌</span>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <p className="text-sm text-slate-600 bg-slate-100 p-3 rounded-md">
                  계정 정보를 포함하여 아래 메일로 문의주시면 최대한 빠르게 답변드리겠습니다.
                </p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  setFindIdPwModalOpen(false);
                }}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="dev-email" className="block text-sm font-medium text-slate-700 mb-1">
                        받는 사람
                      </label>
                      <input
                        id="dev-email"
                        type="email"
                        value="developer@dot-attendance.com"
                        disabled
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="find-email" className="block text-sm font-medium text-slate-700 mb-1">
                        회신받을 메일 주소
                      </label>
                      <input
                        id="find-email"
                        type="email"
                        required
                        placeholder="example@company.com"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="find-message" className="block text-sm font-medium text-slate-700 mb-1">
                        문의 내용
                      </label>
                      <textarea
                        id="find-message"
                        required
                        rows={3}
                        placeholder="가입 시 입력한 이름, 회사명, 연락처 등을 입력해주세요."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setFindIdPwModalOpen(false)}
                        className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        메일 보내기
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}