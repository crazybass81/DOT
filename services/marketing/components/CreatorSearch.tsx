'use client'

import { useState } from 'react'
import { SearchFilters } from '@/types'

interface CreatorSearchProps {
  onSearch?: (filters: SearchFilters) => void
}

export default function CreatorSearch({ onSearch }: CreatorSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    category: '',
    location: '',
    minSubscribers: undefined,
    maxSubscribers: undefined,
  })

  const handleSearch = () => {
    if (onSearch) {
      onSearch(filters)
    }
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">크리에이터 검색</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
            검색어
          </label>
          <input
            id="keyword"
            type="text"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            placeholder="채널명, 키워드 등"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            카테고리
          </label>
          <select
            id="category"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">전체</option>
            <option value="음식">음식/먹방</option>
            <option value="여행">여행</option>
            <option value="일상">일상/브이로그</option>
            <option value="뷰티">뷰티</option>
            <option value="게임">게임</option>
            <option value="기타">기타</option>
          </select>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            지역
          </label>
          <select
            id="location"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">전체</option>
            <option value="서울">서울</option>
            <option value="경기">경기</option>
            <option value="인천">인천</option>
            <option value="부산">부산</option>
            <option value="대구">대구</option>
            <option value="광주">광주</option>
            <option value="대전">대전</option>
            <option value="울산">울산</option>
            <option value="제주">제주</option>
          </select>
        </div>

        <div>
          <label htmlFor="minSubscribers" className="block text-sm font-medium text-gray-700 mb-1">
            최소 구독자
          </label>
          <input
            id="minSubscribers"
            type="number"
            value={filters.minSubscribers || ''}
            onChange={(e) => setFilters({ ...filters, minSubscribers: parseInt(e.target.value) || undefined })}
            placeholder="1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="maxSubscribers" className="block text-sm font-medium text-gray-700 mb-1">
            최대 구독자
          </label>
          <input
            id="maxSubscribers"
            type="number"
            value={filters.maxSubscribers || ''}
            onChange={(e) => setFilters({ ...filters, maxSubscribers: parseInt(e.target.value) || undefined })}
            placeholder="1000000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleSearch}
            className="w-full px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-opacity-90 transition-colors"
          >
            검색하기
          </button>
        </div>
      </div>
    </div>
  )
}