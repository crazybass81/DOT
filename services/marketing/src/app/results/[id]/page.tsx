'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Recommendation {
  channelName: string;
  channelUrl: string;
  score: number;
  subscribers: number;
  matchReasons: string[];
  expectedROI: number;
}

interface AnalysisResult {
  store: {
    name: string;
    category: string;
    location: {
      city: string;
      district: string;
    };
  };
  recommendations: Recommendation[];
}

// MVP 결과 페이지: 추천 크리에이터 목록
export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResults();
  }, [params.id]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/results/${params.id}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError('결과를 불러올 수 없습니다');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-700 underline"
          >
            다시 시도하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-700 text-sm mb-4 inline-block"
          >
            ← 새로운 분석 시작
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {data.store.name}
          </h1>
          <p className="text-gray-600">
            {data.store.location.city} {data.store.location.district} · {data.store.category}
          </p>
          
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              ✨ 총 <span className="font-bold">{data.recommendations.length}명</span>의 
              크리에이터를 찾았습니다
            </p>
          </div>
        </div>

        {/* 추천 크리에이터 목록 */}
        <div className="space-y-4">
          {data.recommendations.map((creator, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* 순위 뱃지 */}
                  <div className="flex items-center mb-3">
                    <span className={`
                      px-3 py-1 rounded-full text-sm font-bold mr-3
                      ${index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-50 text-gray-600'}
                    `}>
                      #{index + 1}
                    </span>
                    
                    {/* 매칭 점수 */}
                    <div className="flex items-center">
                      <div className="relative w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full
                            ${creator.score >= 80 ? 'bg-green-500' :
                              creator.score >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'}`}
                          style={{ width: `${creator.score}%` }}
                        />
                      </div>
                      <span className="ml-3 font-semibold text-gray-700">
                        {creator.score}점
                      </span>
                    </div>
                  </div>

                  {/* 채널 정보 */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {creator.channelName}
                  </h3>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <span>평균 조회수: {creator.subscribers.toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-semibold text-green-600">
                      예상 ROI: {creator.expectedROI.toLocaleString()}원
                    </span>
                  </div>

                  {/* 매칭 이유 */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">추천 이유:</p>
                    <div className="flex flex-wrap gap-2">
                      {creator.matchReasons.map((reason, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="ml-6 flex flex-col space-y-2">
                  <a
                    href={creator.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-center font-medium"
                  >
                    YouTube 방문
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(creator.channelUrl)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-center"
                  >
                    URL 복사
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 다운로드 버튼 */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => window.print()}
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            결과 인쇄하기
          </button>
          <button
            onClick={() => {
              const csv = generateCSV(data);
              downloadCSV(csv, `${data.store.name}_크리에이터_추천.csv`);
            }}
            className="px-8 py-3 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-medium"
          >
            CSV 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

// CSV 생성 함수
function generateCSV(data: AnalysisResult): string {
  const headers = ['순위', '채널명', 'URL', '매칭점수', '평균조회수', '예상ROI', '추천이유'];
  const rows = data.recommendations.map((rec, idx) => [
    idx + 1,
    rec.channelName,
    rec.channelUrl,
    rec.score,
    rec.subscribers,
    rec.expectedROI,
    rec.matchReasons.join('; ')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

// CSV 다운로드 함수
function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}