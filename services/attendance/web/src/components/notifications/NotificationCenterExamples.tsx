'use client';

import React, { useState, useCallback } from 'react';
import { NotificationCenter } from './NotificationCenter';
import { NotificationMessage, NotificationType, NotificationPriority } from '@/lib/notification-manager';
import { CheckCircle, AlertTriangle, Info, Settings, Clock, Users, Megaphone } from 'lucide-react';

interface NotificationCenterExamplesProps {
  className?: string;
}

// Sample notification data for demonstration
const sampleNotifications: NotificationMessage[] = [
  {
    id: '1',
    type: NotificationType.ATTENDANCE_CHECK_IN,
    title: '출근 알림',
    message: '김철수님이 09:00에 출근했습니다.',
    data: { userId: '1', userName: '김철수', checkInTime: '09:00' },
    priority: NotificationPriority.LOW,
    createdAt: '2025-09-05T09:00:00.000Z',
    createdBy: '1',
    createdByName: '김철수',
  },
  {
    id: '2',
    type: NotificationType.ROLE_CHANGED,
    title: '역할 변경',
    message: '관리자 권한이 부여되었습니다.',
    data: { userId: '2', newRole: 'admin' },
    priority: NotificationPriority.HIGH,
    createdAt: '2025-09-05T08:30:00.000Z',
    createdBy: 'admin',
    createdByName: '관리자',
  },
  {
    id: '3',
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title: '시스템 공지',
    message: '오늘 18:00부터 시스템 점검이 예정되어 있습니다.',
    data: {},
    priority: NotificationPriority.URGENT,
    createdAt: '2025-09-05T08:00:00.000Z',
    createdBy: 'system',
  },
  {
    id: '4',
    type: NotificationType.ORGANIZATION_INVITED,
    title: '조직 초대',
    message: 'DOT 테크에서 개발팀 멤버로 초대되었습니다.',
    data: { organizationName: 'DOT 테크', role: '개발팀' },
    priority: NotificationPriority.MEDIUM,
    createdAt: '2025-09-05T07:00:00.000Z',
    readAt: '2025-09-05T07:30:00.000Z',
    createdBy: 'org-admin',
    createdByName: '조직 관리자',
  },
  {
    id: '5',
    type: NotificationType.ATTENDANCE_CHECK_OUT,
    title: '퇴근 알림',
    message: '이영희님이 18:30에 퇴근했습니다. (연장근무 30분)',
    data: { userId: '3', userName: '이영희', workHours: 8.5, overtimeHours: 0.5 },
    priority: NotificationPriority.LOW,
    createdAt: '2025-09-05T18:30:00.000Z',
    createdBy: '3',
    createdByName: '이영희',
  },
];

// Mock notification manager for examples
const mockNotificationManager = {
  async getUserNotifications(userId: string, options: any = {}) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const { offset = 0, limit = 20 } = options;
    const start = offset;
    const end = start + limit;
    const notifications = sampleNotifications.slice(start, end);
    
    return {
      success: true,
      notifications,
      totalCount: sampleNotifications.length,
    };
  },
  
  async markAsRead(notificationId: string, userId: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Find and mark notification as read in local data
    const notification = sampleNotifications.find(n => n.id === notificationId);
    if (notification && !notification.readAt) {
      notification.readAt = new Date().toISOString();
    }
    
    return { success: true };
  },
  
  async markMultipleAsRead(notificationIds: string[], userId: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    notificationIds.forEach(id => {
      const notification = sampleNotifications.find(n => n.id === id);
      if (notification && !notification.readAt) {
        notification.readAt = new Date().toISOString();
      }
    });
    
    return { success: true };
  },
};

// Override the notification manager for this example
if (typeof window !== 'undefined') {
  (window as any).mockNotificationManager = mockNotificationManager;
}

export const NotificationCenterExamples: React.FC<NotificationCenterExamplesProps> = ({
  className = ''
}) => {
  const [selectedNotification, setSelectedNotification] = useState<NotificationMessage | null>(null);
  const [lastAction, setLastAction] = useState<string>('');

  const handleNotificationClick = useCallback((notification: NotificationMessage) => {
    setSelectedNotification(notification);
    setLastAction(`알림 클릭됨: "${notification.title}"`);
    console.log('알림 클릭됨:', notification);
  }, []);

  const notificationTypeExamples = [
    {
      type: NotificationType.ATTENDANCE_CHECK_IN,
      icon: <Clock className="w-4 h-4" />,
      name: '출근/퇴근 알림',
      description: '직원의 출근 및 퇴근 시간을 실시간으로 알려줍니다.',
      priority: NotificationPriority.LOW,
      color: 'blue',
    },
    {
      type: NotificationType.ROLE_CHANGED,
      icon: <Settings className="w-4 h-4" />,
      name: '역할 변경',
      description: '사용자의 권한이나 역할이 변경될 때 알려줍니다.',
      priority: NotificationPriority.HIGH,
      color: 'orange',
    },
    {
      type: NotificationType.ORGANIZATION_INVITED,
      icon: <Users className="w-4 h-4" />,
      name: '조직 초대',
      description: '새로운 조직에 초대받거나 승인될 때 알려줍니다.',
      priority: NotificationPriority.MEDIUM,
      color: 'yellow',
    },
    {
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      icon: <Megaphone className="w-4 h-4" />,
      name: '시스템 공지',
      description: '시스템 점검이나 중요 공지사항을 알려줍니다.',
      priority: NotificationPriority.URGENT,
      color: 'red',
    },
  ];

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          알림 센터 컴포넌트 예제
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          실시간 알림을 관리하는 드롭다운 컴포넌트입니다. 
          읽지 않은 알림 개수 표시, 우선순위별 스타일링, 무한 스크롤 등의 기능을 제공합니다.
        </p>
      </div>

      {/* Live Demo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">라이브 데모</h3>
            <p className="text-gray-600">우측의 벨 아이콘을 클릭해보세요</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">사용자: 김철수</span>
            <NotificationCenter
              userId="demo-user"
              organizationId="demo-org"
              onNotificationClick={handleNotificationClick}
              className="notification-center-demo"
            />
          </div>
        </div>
        
        {lastAction && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm font-medium">{lastAction}</p>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <CheckCircle className="w-8 h-8 text-green-500 mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">실시간 알림</h4>
          <p className="text-gray-600 text-sm">
            WebSocket을 통한 실시간 알림 수신과 즉시 UI 업데이트
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <AlertTriangle className="w-8 h-8 text-orange-500 mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">우선순위 표시</h4>
          <p className="text-gray-600 text-sm">
            알림의 중요도에 따른 색상 구분과 시각적 표시
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Info className="w-8 h-8 text-blue-500 mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">읽음 상태 관리</h4>
          <p className="text-gray-600 text-sm">
            읽음/안읽음 상태 추적과 자동 배지 업데이트
          </p>
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">알림 타입별 예제</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notificationTypeExamples.map((example, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className={`p-2 rounded-md ${{
                  blue: 'bg-blue-100 text-blue-600',
                  orange: 'bg-orange-100 text-orange-600',
                  yellow: 'bg-yellow-100 text-yellow-600',
                  red: 'bg-red-100 text-red-600',
                }[example.color]}`}>
                  {example.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{example.name}</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${{
                    [NotificationPriority.LOW]: 'bg-blue-100 text-blue-800',
                    [NotificationPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
                    [NotificationPriority.HIGH]: 'bg-orange-100 text-orange-800',
                    [NotificationPriority.URGENT]: 'bg-red-100 text-red-800',
                  }[example.priority]}`}>
                    {example.priority}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600">{example.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Notification Details */}
      {selectedNotification && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">선택된 알림 상세 정보</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <p className="text-gray-900">{selectedNotification.title}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">타입</label>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {selectedNotification.type}
                </code>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  selectedNotification.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                  selectedNotification.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  selectedNotification.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {selectedNotification.priority}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">생성 시간</label>
                <p className="text-gray-900">
                  {new Date(selectedNotification.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">읽음 상태</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  selectedNotification.readAt ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedNotification.readAt ? '읽음' : '읽지 않음'}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">생성자</label>
                <p className="text-gray-900">
                  {selectedNotification.createdByName || selectedNotification.createdBy}
                </p>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">메시지</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
                {selectedNotification.message}
              </p>
            </div>
            
            {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">추가 데이터</label>
                <pre className="bg-gray-50 p-3 rounded-md text-sm overflow-auto">
                  {JSON.stringify(selectedNotification.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">사용법</h3>
        
        <div className="space-y-3 text-blue-800">
          <div className="flex items-start space-x-2">
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <p><strong>벨 아이콘 클릭:</strong> 알림 드롭다운 열기/닫기</p>
          </div>
          
          <div className="flex items-start space-x-2">
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <p><strong>배지 표시:</strong> 읽지 않은 알림 개수가 벨 아이콘 위에 표시됩니다</p>
          </div>
          
          <div className="flex items-start space-x-2">
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <p><strong>알림 클릭:</strong> 개별 알림을 클릭하면 읽음 상태로 변경됩니다</p>
          </div>
          
          <div className="flex items-start space-x-2">
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <p><strong>무한 스크롤:</strong> 드롭다운을 아래로 스크롤하여 추가 알림을 로드합니다</p>
          </div>
          
          <div className="flex items-start space-x-2">
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <p><strong>키보드 지원:</strong> ESC 키로 드롭다운 닫기, 방향키로 알림 탐색</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenterExamples;