'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// MVP 메인 페이지: SmartPlace URL 입력
export default function HomePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // URL 검증
    if (!url.includes('naver.com') || !url.includes('place')) {
      setError('올바른 Naver SmartPlace URL을 입력해주세요');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        // 결과 페이지로 이동
        router.push(`/results/${data.analysisId}`);
      } else {
        setError(data.message || '분석 중 오류가 발생했습니다');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            DOT Marketing
          </h1>
          <p className="text-xl text-gray-600">
            AI가 찾아주는 우리 가게에 딱 맞는 YouTube 크리에이터
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naver SmartPlace URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://pcmap.place.naver.com/restaurant/..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                disabled={loading}
              />
              <p className="mt-2 text-sm text-gray-500">
                네이버에서 내 가게를 검색하고 URL을 복사해주세요
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !url}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all
                ${loading || !url
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 transform hover:scale-[1.02]'
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  AI가 분석 중입니다... (약 30초)
                </span>
              ) : (
                '크리에이터 추천받기'
              )}
            </button>
          </form>
        </div>

        {/* 특징 설명 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">정확한 매칭</h3>
            <p className="text-sm text-gray-600">
              AI가 최근 30일 데이터를 분석해 최적의 크리에이터를 찾아드립니다
            </p>
          </div>

          <div className="text-center">
            <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">ROI 예측</h3>
            <p className="text-sm text-gray-600">
              예상 조회수와 마케팅 효과를 미리 확인할 수 있습니다
            </p>
          </div>

          <div className="text-center">
            <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">실시간 분석</h3>
            <p className="text-sm text-gray-600">
              가입 없이 URL만 입력하면 30초 만에 결과를 받아보세요
            </p>
          </div>
        </div>

        {/* 예시 URL */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setUrl('https://pcmap.place.naver.com/restaurant/1796955053')}
            className="text-sm text-indigo-600 hover:text-indigo-700 underline"
          >
            예시 URL로 테스트해보기
          </button>
        </div>
      </div>
    </div>
  );
}