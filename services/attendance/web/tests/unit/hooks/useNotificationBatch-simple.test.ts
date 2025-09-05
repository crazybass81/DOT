import { renderHook, act } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { useNotificationBatch } from '@/hooks/useNotificationBatch';

// NotificationManager 모킹
const mockNotificationManager = {
  markAsRead: jest.fn(),
  markMultipleAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

jest.mock('@/lib/notification-manager', () => ({
  notificationManager: mockNotificationManager,
}));

describe('useNotificationBatch - 단순 테스트', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationManager.markAsRead.mockResolvedValue({ success: true });
    mockNotificationManager.markMultipleAsRead.mockResolvedValue({ success: true });
  });

  it('훅이 올바른 초기 값을 반환해야 함', () => {
    const { result } = renderHook(() => useNotificationBatch(mockUserId));

    expect(result.current.pendingReads.size).toBe(0);
    expect(result.current.isProcessing).toBe(false);
    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.markAllAsRead).toBe('function');
  });

  it('markAsRead 호출 시 pendingReads에 추가되어야 함', () => {
    const { result } = renderHook(() => useNotificationBatch(mockUserId));

    act(() => {
      result.current.markAsRead('notif-1');
    });

    expect(result.current.pendingReads.has('notif-1')).toBe(true);
    expect(result.current.pendingReads.size).toBe(1);
  });

  it('여러 markAsRead 호출 시 모두 pendingReads에 추가되어야 함', () => {
    const { result } = renderHook(() => useNotificationBatch(mockUserId));

    act(() => {
      result.current.markAsRead('notif-1');
      result.current.markAsRead('notif-2');
      result.current.markAsRead('notif-3');
    });

    expect(result.current.pendingReads.size).toBe(3);
    expect(result.current.pendingReads.has('notif-1')).toBe(true);
    expect(result.current.pendingReads.has('notif-2')).toBe(true);
    expect(result.current.pendingReads.has('notif-3')).toBe(true);
  });

  it('markAllAsRead 호출 시 처리되어야 함', async () => {
    const { result } = renderHook(() => useNotificationBatch(mockUserId, 'org-123'));

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockNotificationManager.markAllAsRead).toHaveBeenCalledWith(mockUserId, 'org-123');
  });
});