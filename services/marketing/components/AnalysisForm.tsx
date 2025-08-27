'use client'

import { useState } from 'react'
import { StoreProfile } from '@/types/smartplace'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'

interface AnalysisFormProps {
  onAnalysisComplete: (result: any) => void
}

export default function AnalysisForm({ onAnalysisComplete }: AnalysisFormProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState({
    includeReviews: true,
    maxReviews: 30,
    deepAnalysis: true
  })

  const validateUrl = (url: string): boolean => {
    const patterns = [
      /map\.naver\.com.*place/,
      /pcmap\.place\.naver\.com/,
      /m\.place\.naver\.com/,
      /naver\.me/
    ]
    
    return patterns.some(pattern => pattern.test(url))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      setError('네이버 스마트플레이스 URL을 입력해주세요.')
      return
    }
    
    if (!validateUrl(url)) {
      setError('올바른 네이버 스마트플레이스 URL을 입력해주세요.')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          options
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '분석 중 오류가 발생했습니다.')
      }
      
      if (result.success) {
        onAnalysisComplete(result)
      } else {
        throw new Error(result.error || '분석에 실패했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">가게 분석하기</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            네이버 스마트플레이스 URL
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://pcmap.place.naver.com/restaurant/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            네이버 지도에서 가게 페이지 URL을 복사해주세요
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">분석 옵션</h3>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeReviews}
                onChange={(e) => setOptions({ ...options, includeReviews: e.target.checked })}
                className="mr-2"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">리뷰 포함 분석</span>
            </label>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="maxReviews" className="text-sm text-gray-700">리뷰 수:</label>
              <select
                id="maxReviews"
                value={options.maxReviews}
                onChange={(e) => setOptions({ ...options, maxReviews: parseInt(e.target.value) })}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
                disabled={isLoading || !options.includeReviews}
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={30}>30개</option>
                <option value={50}>50개</option>
              </select>
            </div>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.deepAnalysis}
                onChange={(e) => setOptions({ ...options, deepAnalysis: e.target.checked })}
                className="mr-2"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">심화 분석 (감성, 타겟층 등)</span>
            </label>
          </div>
        </div>
        
        {error && <ErrorMessage message={error} />}
        
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={`w-full px-4 py-3 font-semibold rounded-md transition-colors ${
            isLoading || !url.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-opacity-90'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              분석 중...
            </div>
          ) : (
            '분석 시작'
          )}
        </button>
      </form>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>• 네이버 지도에서 가게를 검색 후 URL을 복사해주세요</p>
        <p>• 분석에는 30초~2분 정도 소요됩니다</p>
        <p>• 분석 후 적합한 유튜브 크리에이터를 자동으로 매칭해드립니다</p>
      </div>
    </div>
  )
}