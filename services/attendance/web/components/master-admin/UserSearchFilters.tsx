import React from 'react';

export function UserSearchFilters() {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="사용자 검색..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
          <option value="">모든 역할</option>
          <option value="user">일반 사용자</option>
          <option value="admin">관리자</option>
        </select>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          검색
        </button>
        <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
          초기화
        </button>
      </div>
    </div>
  );
}