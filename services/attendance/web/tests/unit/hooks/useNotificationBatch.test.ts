import { renderHook, act, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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

describe('useNotificationBatch', () => {
  const mockUserId = 'user-123';
  const mockOrgId = 'org-456';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockNotificationManager.markAsRead.mockResolvedValue({ success: true });
    mockNotificationManager.markMultipleAsRead.mockResolvedValue({ success: true });
    mockNotificationManager.markAllAsRead.mockResolvedValue({ success: true, markedCount: 2 });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('단일 알림 처리', () => {
    it('단일 알림을 배치에 추가하고 지연 후 처리해야 함', async () => {
      const { result } = renderHook(() =>
        useNotificationBatch(mockUserId, mockOrgId, { delay: 100 })
      );

      // 알림을 배치에 추가
      act(() => {
        result.current.markAsRead('notif-1');
      });

      // 배치에 추가되었는지 확인
      expect(result.current.pendingReads.has('notif-1')).toBe(true);
      expect(mockNotificationManager.markAsRead).not.toHaveBeenCalled();

      // 지연 시간 경과
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // 처리 완료까지 기다리기
      await waitFor(() => {
        expect(mockNotificationManager.markAsRead).toHaveBeenCalledWith('notif-1', mockUserId);
      });

      // 배치에서 제거되었는지 확인
      await waitFor(() => {
        expect(result.current.pendingReads.has('notif-1')).toBe(false);
      });
    });

    it('여러 알림이 추가되면 배치로 처리해야 함', async () => {
      const { result } = renderHook(() =>
        useNotificationBatch(mockUserId, mockOrgId, { delay: 100 })
      );

      // 여러 알림을 연속으로 추가
      act(() => {
        result.current.markAsRead('notif-1');
        result.current.markAsRead('notif-2');
        result.current.markAsRead('notif-3');
      });

      // 모든 알림이 배치에 추가되었는지 확인
      expect(result.current.pendingReads.has('notif-1')).toBe(true);
      expect(result.current.pendingReads.has('notif-2')).toBe(true);
      expect(result.current.pendingReads.has('notif-3')).toBe(true);
      expect(result.current.pendingReads.size).toBe(3);

      // 아직 처리되지 않았는지 확인
      expect(mockNotificationManager.markAsRead).not.toHaveBeenCalled();
      expect(mockNotificationManager.markMultipleAsRead).not.toHaveBeenCalled();

      // 지연 시간 경과
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // 배치 처리 호출 확인
      await waitFor(() => {
        expect(mockNotificationManager.markMultipleAsRead).toHaveBeenCalledWith(
          ['notif-1', 'notif-2', 'notif-3'],
          mockUserId
        );
      });

      // 개별 처리는 호출되지 않았는지 확인
      expect(mockNotificationManager.markAsRead).not.toHaveBeenCalled();
    });

    it('최대 배치 크기에 도달하면 즉시 처리해야 함', async () => {
      const { result } = renderHook(() =>
        useNotificationBatch(mockUserId, mockOrgId, { delay: 1000, maxBatchSize: 2 })
      );

      // 첫 번째 알림 추가
      act(() => {
        result.current.markAsRead('notif-1');
      });

      expect(mockNotificationManager.markMultipleAsRead).not.toHaveBeenCalled();

      // 두 번째 알림 추가 (최대 크기 도달)
      act(() => {
        result.current.markAsRead('notif-2');
      });

      // 즉시 처리되어야 함 (지연 시간 기다리지 않음)
      await waitFor(() => {
        expect(mockNotificationManager.markMultipleAsRead).toHaveBeenCalledWith(
          ['notif-1', 'notif-2'],
          mockUserId
        );
      });
    });

    it('디바운싱이 올바르게 작동해야 함', async () => {
      const { result } = renderHook(() =>
        useNotificationBatch(mockUserId, mockOrgId, { delay: 100 })
      );

      // 빠르게 연속으로 알림 추가
      act(() => {
        result.current.markAsRead('notif-1');
      });

      // 50ms 후 또 다른 알림 추가
      act(() => {
        jest.advanceTimersByTime(50);
        result.current.markAsRead('notif-2');
      });

      // 50ms 후 또 다른 알림 추가
      act(() => {
        jest.advanceTimersByTime(50);
        result.current.markAsRead('notif-3');
      });

      // 아직 처리되지 않았어야 함 (디바운싱으로 인해)
      expect(mockNotificationManager.markMultipleAsRead).not.toHaveBeenCalled();

      // 마지막 추가 후 100ms 경과
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // 이제 배치 처리 호출되어야 함
      await waitFor(() => {
        expect(mockNotificationManager.markMultipleAsRead).toHaveBeenCalledWith(
          ['notif-1', 'notif-2', 'notif-3'],
          mockUserId
        );
      });

      // 한 번만 호출되어야 함
      expect(mockNotificationManager.markMultipleAsRead).toHaveBeenCalledTimes(1);
    });
  });

  describe('전체 읽음 처리', () => {
    it('전체 읽음 처리 시 기존 배치를 취소하고 즉시 처리해야 함', async () => {
      const { result } = renderHook(() =>
        useNotificationBatch(mockUserId, mockOrgId, { delay: 1000 })
      );

      // 개별 알림들을 배치에 추가
      act(() => {
        result.current.markAsRead('notif-1');
        result.current.markAsRead('notif-2');
      });

      // 배치에 추가되었는지 확인
      expect(result.current.pendingReads.size).toBe(2);

      // 전체 읽음 처리 호출
      await act(async () => {
        await result.current.markAllAsRead();
      });

      // markAllAsRead가 호출되었는지 확인
      expect(mockNotificationManager.markAllAsRead).toHaveBeenCalledWith(mockUserId, mockOrgId);

      // 기존 배치가 취소되었는지 확인 (배치 큐가 비워짐)
      expect(result.current.pendingReads.size).toBe(0);

      // 시간이 경과해도 개별 배치 처리는 호출되지 않아야 함
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockNotificationManager.markMultipleAsRead).not.toHaveBeenCalled();
    });

    it('전체 읽음 처리 실패 시 에러를 전파해야 함', async () => {
      mockNotificationManager.markAllAsRead.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useNotificationBatch(mockUserId, mockOrgId)
      );

      await expect(
        act(async () => {
          await result.current.markAllAsRead();
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('처리 상태', () => {
    it('처리 중일 때 isProcessing이 true여야 함', async () => {
      // markAsRead가 오래 걸리도록 설정
      let resolveMarkAsRead: () => void;
      const markAsReadPromise = new Promise<void>((resolve) => {
        resolveMarkAsRead = resolve;
      });

      mockNotificationManager.markAsRead.mockImplementation(() => markAsReadPromise);

      const { result } = renderHook(() =>
        useNotificationBatch(mockUserId, mockOrgId, { delay: 100 })
      );

      // 알림 추가
      act(() => {
        result.current.markAsRead('notif-1');
      });

      // 지연 시간 경과
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // 처리가 시작되면 isProcessing이 true여야 함
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      });

      // 처리 완료
      act(() => {
        resolveMarkAsRead!();
      });

      // 처리 완료 후 isProcessing이 false여야 함
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });
    });
  });

  describe('에러 처리', () => {
    it('배치 처리 실패 시에도 UI 상태에 영향을 주지 않아야 함', async () => {
      mockNotificationManager.markMultipleAsRead.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useNotificationBatch(mockUserId, mockOrgId, { delay: 100 })
      );

      // 알림들 추가
      act(() => {
        result.current.markAsRead('notif-1');
        result.current.markAsRead('notif-2');
      });

      // 지연 시간 경과
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // 처리 완료까지 기다리기 (에러가 발생하지만 컴포넌트는 정상 작동해야 함)
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      // 배치 큐가 비워졌는지 확인
      expect(result.current.pendingReads.size).toBe(0);
    });
  });

  describe('언마운트 처리', () => {
    it('컴포넌트 언마운트 시 남은 배치를 즉시 처리해야 함', async () => {
      const { result, unmount } = renderHook(() =>
        useNotificationBatch(mockUserId, mockOrgId, { delay: 1000 })
      );

      // 알림 추가
      act(() => {
        result.current.markAsRead('notif-1');
        result.current.markAsRead('notif-2');
      });

      // 지연 시간이 끝나기 전에 언마운트
      unmount();

      // 남은 배치가 즉시 처리되어야 함
      await waitFor(() => {
        expect(mockNotificationManager.markMultipleAsRead).toHaveBeenCalledWith(
          ['notif-1', 'notif-2'],
          mockUserId
        );
      });
    });
  });
});