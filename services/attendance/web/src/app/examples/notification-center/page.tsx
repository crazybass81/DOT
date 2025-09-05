'use client';

import React, { useState } from 'react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { NotificationMessage } from '@/lib/notification-manager';

export default function NotificationCenterExamplePage() {
  const [selectedNotification, setSelectedNotification] = useState<NotificationMessage | null>(null);
  const [lastClickedNotification, setLastClickedNotification] = useState<string>('');

  const handleNotificationClick = (notification: NotificationMessage) => {
    setSelectedNotification(notification);
    setLastClickedNotification(`${notification.title}: ${notification.message}`);
    console.log('알림 클릭됨:', notification);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          알림 센터 컴포넌트 예제
        </h1>

        {/* Header with NotificationCenter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                DOT 근태관리 시스템
              </h2>
              <p className="text-gray-600">
                알림 센터가 우측 상단에 위치합니다
              </p>
            </div>
            
            {/* NotificationCenter Component */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">사용자: 김철수</span>
              <NotificationCenter
                userId="user-123"
                organizationId="org-123"
                onNotificationClick={handleNotificationClick}
                className="notification-center-demo"
              />
            </div>
          </div>
        </div>

        {/* Demo Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              사용법
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                벨 아이콘을 클릭하여 알림 드롭다운 열기/닫기
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                읽지 않은 알림 개수가 배지로 표시됨
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                알림 클릭 시 읽음 상태로 변경됨
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                스크롤하여 추가 알림 로드 (무한 스크롤)
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                ESC 키 또는 외부 클릭으로 드롭다운 닫기
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              알림 타입
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded border-l-4 border-blue-500"></div>
                <span className="text-sm text-gray-600">출근/퇴근 알림 (낮은 우선순위)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded border-l-4 border-yellow-500"></div>
                <span className="text-sm text-gray-600">조직 초대/승인 (보통 우선순위)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded border-l-4 border-orange-500"></div>
                <span className="text-sm text-gray-600">역할 변경 (높은 우선순위)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded border-l-4 border-red-500"></div>
                <span className="text-sm text-gray-600">시스템 공지 (긴급 우선순위)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Clicked Notification Display */}
        {lastClickedNotification && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              마지막 클릭한 알림
            </h3>
            <p className="text-green-700">{lastClickedNotification}</p>
          </div>
        )}

        {/* Selected Notification Details */}
        {selectedNotification && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              선택된 알림 상세 정보
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목
                </label>
                <p className="text-sm text-gray-900">{selectedNotification.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  타입
                </label>
                <p className="text-sm text-gray-900">{selectedNotification.type}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메시지
                </label>
                <p className="text-sm text-gray-900">{selectedNotification.message}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  우선순위
                </label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  selectedNotification.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                  selectedNotification.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  selectedNotification.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {selectedNotification.priority}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  생성 시간
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedNotification.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  읽음 상태
                </label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  selectedNotification.readAt ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedNotification.readAt ? '읽음' : '읽지 않음'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  생성자
                </label>
                <p className="text-sm text-gray-900">
                  {selectedNotification.createdByName || selectedNotification.createdBy}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}