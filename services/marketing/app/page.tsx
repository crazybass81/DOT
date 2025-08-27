'use client'

import { useState, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface CreatorMatch {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  subscribers: string;
  videoCount: string;
  viewCount: string;
  matchScore: number;
  matchReasons: string[];
  businessEmail?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  recentVideos?: Array<{
    title: string;
    publishedAt: string;
  }>;
  proposal?: {
    subject: string;
    body: string;
    preview: string;
  };
}

interface AnalysisResult {
  store: {
    name: string;
    category: string;
    address: string;
    rating?: number;
    reviewCount?: number;
    priceLevel: string;
  };
  creators: CreatorMatch[];
  quotaUsage: {
    used: number;
    remaining: number;
    canSearchMore: number;
    dailyLimit: number;
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          type: input.includes('google.com/maps') ? 'url' : 'search'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '분석 실패');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [input]);
  
  // 로그인 필요
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!session) {
    router.push('/login');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">DOT Marketing</h1>
              <p className="text-sm text-gray-600">Google OAuth로 구동되는 글로벌 매칭 서비스</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
                <p className="text-xs text-gray-600">{session.user?.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">🔍 스토어 분석 & 크리에이터 매칭</h2>
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Google Maps URL 또는 가게 이름 입력 (예: 스타벅스 강남점)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              disabled={loading}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '분석중...' : '분석하기'}
            </button>
          </div>
          
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            💡 Tip: Google Maps에서 가게를 검색한 후 URL을 복사하거나, 직접 가게 이름을 입력하세요
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {/* Results */}
        {result && (
          <>
            {/* Store Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">📍 분석된 스토어</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">이름</p>
                  <p className="font-medium">{result.store.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">카테고리</p>
                  <p className="font-medium">{result.store.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">평점</p>
                  <p className="font-medium">
                    {result.store.rating ? `⭐ ${result.store.rating} (${result.store.reviewCount}개)` : '정보 없음'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">가격대</p>
                  <p className="font-medium">{result.store.priceLevel}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-600">주소</p>
                <p className="font-medium">{result.store.address}</p>
              </div>
            </div>
            
            {/* Quota Usage */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">📊 오늘의 YouTube API 사용량</h4>
                <span className="text-sm text-blue-700">
                  {result.quotaUsage.canSearchMore}회 더 검색 가능
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${((result.quotaUsage.dailyLimit - result.quotaUsage.remaining) / result.quotaUsage.dailyLimit) * 100}%`
                  }}
                />
              </div>
              <p className="text-xs text-blue-700 mt-1">
                {result.quotaUsage.used} / {result.quotaUsage.dailyLimit} units 사용 (매일 자정 리셋)
              </p>
            </div>
            
            {/* Creator Matches */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">
                🎯 매칭된 YouTube 크리에이터 ({result.creators.length}명)
              </h3>
              
              <div className="grid gap-4">
                {result.creators.map((creator) => (
                  <div key={creator.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      <img
                        src={creator.thumbnail}
                        alt={creator.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-lg">{creator.name}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {creator.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                              매칭도 {creator.matchScore}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-6 text-sm text-gray-600 mb-2">
                          <span>👥 구독자 {Number(creator.subscribers).toLocaleString()}명</span>
                          <span>📹 동영상 {Number(creator.videoCount).toLocaleString()}개</span>
                          <span>👁️ 조회수 {Number(creator.viewCount).toLocaleString()}회</span>
                        </div>
                        
                        {/* 연락처 정보 */}
                        {(creator.businessEmail || creator.socialLinks) && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-2">
                            {creator.businessEmail && (
                              <div className="text-sm mb-1">
                                <span className="font-semibold">📧 비즈니스 이메일:</span>{' '}
                                <a href={`mailto:${creator.businessEmail}`} className="text-blue-600 hover:underline">
                                  {creator.businessEmail}
                                </a>
                              </div>
                            )}
                            {creator.socialLinks && (
                              <div className="text-sm flex gap-3">
                                {creator.socialLinks.instagram && (
                                  <a href={creator.socialLinks.instagram} target="_blank" rel="noopener noreferrer" 
                                     className="text-pink-600 hover:underline">Instagram</a>
                                )}
                                {creator.socialLinks.twitter && (
                                  <a href={creator.socialLinks.twitter} target="_blank" rel="noopener noreferrer" 
                                     className="text-blue-400 hover:underline">Twitter</a>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* 제안서 미리보기 */}
                        {creator.proposal && (
                          <details className="bg-yellow-50 rounded-lg p-3 mb-2">
                            <summary className="cursor-pointer font-semibold text-sm">
                              📝 협업 제안서 보기
                            </summary>
                            <div className="mt-2">
                              <p className="text-sm font-semibold mb-1">제목: {creator.proposal.subject}</p>
                              <div className="bg-white rounded p-2 max-h-40 overflow-y-auto">
                                <pre className="text-xs whitespace-pre-wrap font-sans">{creator.proposal.body}</pre>
                              </div>
                              {creator.businessEmail && (
                                <a 
                                  href={`mailto:${creator.businessEmail}?subject=${encodeURIComponent(creator.proposal.subject)}&body=${encodeURIComponent(creator.proposal.body)}`}
                                  className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  이메일 보내기
                                </a>
                              )}
                            </div>
                          </details>
                        )}
                        
                        <div className="flex gap-2 mt-2">
                          {creator.matchReasons.map((reason, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <a
                            href={`https://youtube.com/channel/${creator.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                          >
                            채널 방문
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}