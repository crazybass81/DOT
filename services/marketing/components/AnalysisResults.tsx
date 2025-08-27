'use client'

import { useState } from 'react'
import { Creator } from '@/types'
import CreatorList from './CreatorList'

interface AnalysisResultsProps {
  result: {
    analysisId: string
    storeProfile: {
      name: string
      category: string
      location: {
        fullAddress: string
        city: string
        district: string
      }
      priceLevel: string
      keywords: {
        menu: string[]
        experience: string[]
        hashtags: string[]
      }
      sentiment: {
        overall: string
        score: number
        aspects: Record<string, number>
      }
    }
    creatorMatches: Array<{
      channelId: string
      channelName: string
      subscriberCount: number
      category: string
      location?: string
      matchScore: number
      matchReasons: string[]
      engagementScore: number
      recentPerformance: {
        avgViews: number
        avgEngagement: number
        uploadFrequency: number
      }
    }>
    summary: {
      totalMatches: number
      avgMatchScore: number
      topCategories: string[]
    }
    processingTime: number
  }
  onReset: () => void
}

export default function AnalysisResults({ result, onReset }: AnalysisResultsProps) {
  const [selectedCreators, setSelectedCreators] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'creators' | 'insights'>('overview')

  const { storeProfile, creatorMatches, summary } = result

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const getPriceLevelLabel = (level: string): string => {
    const labels: Record<string, string> = {
      budget: '저가',
      moderate: '중가',
      premium: '고급',
      luxury: '최고급'
    }
    return labels[level] || level
  }

  const getSentimentColor = (score: number): string => {
    if (score >= 70) return 'text-green-600 bg-green-100'
    if (score >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const creators: Creator[] = creatorMatches.map(match => ({
    id: match.channelId,
    channelId: match.channelId,
    channelName: match.channelName,
    subscriberCount: match.subscriberCount,
    videoCount: 0, // Not provided in match data
    viewCount: 0, // Not provided in match data
    category: match.category,
    location: match.location,
    engagementScore: match.engagementScore,
    activityScore: 0, // Not provided in match data
    fitScore: match.matchScore,
    lastUpdated: new Date(),
    metadata: {
      averageViews: match.recentPerformance.avgViews,
      uploadFrequency: match.recentPerformance.uploadFrequency,
      recentVideos: [],
      description: match.matchReasons.join(', ')
    }
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{storeProfile.name} 분석 결과</h2>
            <p className="text-gray-600 mt-1">
              {storeProfile.location.city} {storeProfile.location.district} • {storeProfile.category}
            </p>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 text-primary border border-primary rounded-md hover:bg-primary hover:text-white transition-colors"
          >
            새로 분석
          </button>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.totalMatches}</div>
            <div className="text-sm text-blue-600">매칭된 크리에이터</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{summary.avgMatchScore}%</div>
            <div className="text-sm text-green-600">평균 적합도</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{getPriceLevelLabel(storeProfile.priceLevel)}</div>
            <div className="text-sm text-purple-600">가격대</div>
          </div>
          <div className={`rounded-lg p-4 ${getSentimentColor(storeProfile.sentiment.score)}`}>
            <div className="text-2xl font-bold">{storeProfile.sentiment.score}</div>
            <div className="text-sm">고객 만족도</div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: '개요' },
              { id: 'creators', label: '크리에이터 (' + summary.totalMatches + ')' },
              { id: 'insights', label: '인사이트' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Store Keywords */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">키워드 분석</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">메뉴 키워드</h4>
                      <div className="flex flex-wrap gap-2">
                        {storeProfile.keywords.menu.map((keyword, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">경험 키워드</h4>
                      <div className="flex flex-wrap gap-2">
                        {storeProfile.keywords.experience.map((keyword, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">해시태그</h4>
                      <div className="flex flex-wrap gap-2">
                        {storeProfile.keywords.hashtags.map((hashtag, index) => (
                          <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded">
                            {hashtag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sentiment Analysis */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">감성 분석</h3>
                  <div className="space-y-3">
                    {Object.entries(storeProfile.sentiment.aspects).map(([aspect, score]) => {
                      const aspectLabels: Record<string, string> = {
                        taste: '맛',
                        service: '서비스',
                        atmosphere: '분위기',
                        value: '가성비',
                        cleanliness: '청결도'
                      }
                      return (
                        <div key={aspect} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{aspectLabels[aspect] || aspect}</span>
                          <div className="flex items-center">
                            <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{score}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Creators Tab */}
          {activeTab === 'creators' && (
            <div>
              <CreatorList 
                creators={creators}
                selectedCreators={selectedCreators}
                onSelectionChange={setSelectedCreators}
                showMatchInfo={true}
              />
            </div>
          )}
          
          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">매칭 요약</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">주요 카테고리</h4>
                    <div className="flex flex-wrap gap-2">
                      {summary.topCategories.map((category, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">처리 시간</h4>
                    <p className="text-2xl font-bold text-primary">{(result.processingTime / 1000).toFixed(1)}초</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">추천 전략</h3>
                <div className="space-y-3">
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <h4 className="font-medium text-blue-800">최적 크리에이터</h4>
                    <p className="text-blue-700 text-sm">
                      매칭 점수 {Math.max(...creatorMatches.map(c => c.matchScore))}% 이상의 크리에이터를 우선 연락하세요.
                    </p>
                  </div>
                  <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <h4 className="font-medium text-green-800">컷텐츠 전략</h4>
                    <p className="text-green-700 text-sm">
                      &apos;{storeProfile.keywords.menu.slice(0, 2).join(', ')}&apos; 메뉴를 활용한 컴텐츠 제작을 제안하세요.
                    </p>
                  </div>
                  <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
                    <h4 className="font-medium text-purple-800">타겟 시기</h4>
                    <p className="text-purple-700 text-sm">
                      고객 만족도가 {storeProfile.sentiment.score}점이므로 지금이 협업하기 좋은 시기입니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}