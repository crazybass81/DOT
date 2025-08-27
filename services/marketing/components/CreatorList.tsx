'use client'

import { useState, useEffect } from 'react'
import { Creator } from '@/types'

interface CreatorListProps {
  creators?: Creator[]
  selectedCreators: string[]
  onSelectionChange: (selected: string[]) => void
  showMatchInfo?: boolean
}

export default function CreatorList({ 
  creators: propCreators, 
  selectedCreators, 
  onSelectionChange,
  showMatchInfo = false 
}: CreatorListProps) {
  const [creators, setCreators] = useState<Creator[]>([])

  useEffect(() => {
    if (propCreators) {
      setCreators(propCreators)
      return
    }
    
    const mockCreators: Creator[] = [
      {
        id: '1',
        channelId: 'UCxxxxxx1',
        channelName: '맛집탐방TV',
        subscriberCount: 125000,
        videoCount: 324,
        viewCount: 45000000,
        category: '음식',
        location: '서울',
        email: 'foodtour@example.com',
        engagementScore: 85,
        activityScore: 92,
        fitScore: 95,
        lastUpdated: new Date(),
        metadata: {
          averageViews: 138888,
          uploadFrequency: 2.5,
          recentVideos: [],
          thumbnailUrl: 'https://via.placeholder.com/120x90',
          description: '전국 맛집을 소개하는 채널입니다',
        },
      },
      {
        id: '2',
        channelId: 'UCxxxxxx2',
        channelName: '일상브이로거',
        subscriberCount: 45000,
        videoCount: 156,
        viewCount: 12000000,
        category: '일상',
        location: '경기',
        email: 'dailyvlog@example.com',
        engagementScore: 72,
        activityScore: 88,
        fitScore: 78,
        lastUpdated: new Date(),
        metadata: {
          averageViews: 76923,
          uploadFrequency: 3.2,
          recentVideos: [],
          thumbnailUrl: 'https://via.placeholder.com/120x90',
          description: '소소한 일상을 기록합니다',
        },
      },
      {
        id: '3',
        channelId: 'UCxxxxxx3',
        channelName: '먹방왕',
        subscriberCount: 890000,
        videoCount: 512,
        viewCount: 320000000,
        category: '음식',
        location: '서울',
        engagementScore: 93,
        activityScore: 85,
        fitScore: 98,
        lastUpdated: new Date(),
        metadata: {
          averageViews: 625000,
          uploadFrequency: 4.1,
          recentVideos: [],
          thumbnailUrl: 'https://via.placeholder.com/120x90',
          description: '대한민국 최고의 먹방 채널',
        },
      },
    ]
    setCreators(mockCreators)
  }, [propCreators])

  const toggleSelection = (creatorId: string) => {
    if (selectedCreators.includes(creatorId)) {
      onSelectionChange(selectedCreators.filter(id => id !== creatorId))
    } else {
      onSelectionChange([...selectedCreators, creatorId])
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">검색 결과</h3>
        <span className="text-sm text-gray-500">
          {creators.length}개 채널 / {selectedCreators.length}개 선택됨
        </span>
      </div>

      <div className="grid gap-4">
        {creators.map((creator) => (
          <div
            key={creator.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedCreators.includes(creator.id)
                ? 'border-primary bg-primary bg-opacity-5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => toggleSelection(creator.id)}
          >
            <div className="flex items-start space-x-4">
              <img
                src={creator.metadata.thumbnailUrl}
                alt={creator.channelName}
                className="w-20 h-20 rounded-lg object-cover"
              />
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">{creator.channelName}</h4>
                  <input
                    type="checkbox"
                    checked={selectedCreators.includes(creator.id)}
                    onChange={() => {}}
                    className="w-5 h-5 text-primary"
                  />
                </div>
                
                <p className="text-sm text-gray-600 mt-1">
                  {creator.metadata.description}
                </p>
                
                <div className="flex items-center space-x-4 mt-2 text-sm">
                  <span className="text-gray-700">
                    구독자 <strong>{formatNumber(creator.subscriberCount)}</strong>
                  </span>
                  <span className="text-gray-700">
                    조회수 <strong>{formatNumber(creator.viewCount)}</strong>
                  </span>
                  <span className="text-gray-700">
                    동영상 <strong>{creator.videoCount}개</strong>
                  </span>
                </div>
                
                <div className="flex items-center space-x-3 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {creator.category}
                  </span>
                  {creator.location && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {creator.location}
                    </span>
                  )}
                  {creator.email && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      이메일 있음
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 mt-3">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">호감도</span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                        style={{ width: `${creator.engagementScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold ml-1">{creator.engagementScore}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">활성도</span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-500"
                        style={{ width: `${creator.activityScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold ml-1">{creator.activityScore}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">적합도</span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
                        style={{ width: `${creator.fitScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold ml-1">{creator.fitScore}</span>
                  </div>
                </div>
                
                {showMatchInfo && creator.fitScore > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">매칭 점수</span>
                      <span className="text-lg font-bold text-primary">{creator.fitScore}%</span>
                    </div>
                    {creator.metadata.description && (
                      <p className="text-xs text-gray-600 mt-1">
                        매칭 이유: {creator.metadata.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}