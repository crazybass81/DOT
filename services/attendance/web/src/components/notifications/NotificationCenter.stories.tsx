import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { NotificationCenter } from './NotificationCenter';
import { NotificationMessage, NotificationType, NotificationPriority } from '@/lib/notification-manager';

// Mock notification manager for Storybook
const mockNotifications: NotificationMessage[] = [
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
];

// Mock the notification manager
jest.mock('@/lib/notification-manager', () => ({
  notificationManager: {
    getUserNotifications: jest.fn().mockResolvedValue({
      success: true,
      notifications: mockNotifications,
      totalCount: 4,
    }),
    markAsRead: jest.fn().mockResolvedValue({ success: true }),
    markMultipleAsRead: jest.fn().mockResolvedValue({ success: true }),
  },
  NotificationType,
  NotificationPriority,
}));

const meta: Meta<typeof NotificationCenter> = {
  title: 'Components/NotificationCenter',
  component: NotificationCenter,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '실시간 알림 센터 드롭다운 컴포넌트입니다. 벨 아이콘을 클릭하면 알림 목록이 표시됩니다.',
      },
    },
  },
  args: {
    userId: 'user-123',
    organizationId: 'org-123',
  },
  argTypes: {
    userId: {
      control: 'text',
      description: '사용자 ID',
    },
    organizationId: {
      control: 'text',
      description: '조직 ID (선택사항)',
    },
    maxNotifications: {
      control: 'number',
      description: '최대 알림 개수',
      defaultValue: 20,
    },
    onNotificationClick: {
      action: 'notification-clicked',
      description: '알림 클릭 시 호출되는 콜백',
    },
  },
};

export default meta;
type Story = StoryObj<typeof NotificationCenter>;

export const Default: Story = {
  name: '기본 상태',
  parameters: {
    docs: {
      description: {
        story: '기본 알림 센터 상태입니다. 읽지 않은 알림이 있을 때 배지가 표시됩니다.',
      },
    },
  },
};

export const WithManyNotifications: Story = {
  name: '많은 알림',
  args: {
    maxNotifications: 50,
  },
  parameters: {
    docs: {
      description: {
        story: '많은 알림이 있을 때의 상태입니다. 무한 스크롤을 통해 추가 알림을 로드할 수 있습니다.',
      },
    },
  },
};

export const WithCallback: Story = {
  name: '콜백 함수 포함',
  args: {
    onNotificationClick: (notification: NotificationMessage) => {
      alert(`알림 클릭됨: ${notification.title}`);
    },
  },
  parameters: {
    docs: {
      description: {
        story: '알림 클릭 시 콜백 함수가 실행됩니다.',
      },
    },
  },
};

export const EmptyState: Story = {
  name: '빈 상태',
  parameters: {
    docs: {
      description: {
        story: '알림이 없을 때의 빈 상태입니다.',
      },
    },
    mockData: {
      notifications: [],
      totalCount: 0,
    },
  },
};

export const ErrorState: Story = {
  name: '오류 상태',
  parameters: {
    docs: {
      description: {
        story: '알림 로딩 중 오류가 발생했을 때의 상태입니다.',
      },
    },
    mockData: {
      error: '네트워크 오류가 발생했습니다.',
    },
  },
};

export const LoadingState: Story = {
  name: '로딩 상태',
  parameters: {
    docs: {
      description: {
        story: '알림을 로딩 중일 때의 상태입니다.',
      },
    },
    mockData: {
      loading: true,
    },
  },
};