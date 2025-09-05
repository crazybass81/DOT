import { useState, useCallback, useRef, useEffect } from 'react';
import { notificationManager } from '@/lib/notification-manager';

interface BatchOptions {
  delay?: number;
  maxBatchSize?: number;
}

interface UseBatchNotificationReturn {
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  pendingReads: Set<string>;
  isProcessing: boolean;
}

/**
 * 알림 읽음 처리를 배치로 최적화하는 커스텀 훅
 */
export const useNotificationBatch = (
  userId: string,
  organizationId?: string,
  options: BatchOptions = {}
): UseBatchNotificationReturn => {
  const { delay = 500, maxBatchSize = 50 } = options;
  
  const [pendingReads, setPendingReads] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  // 배치 처리 실행
  const processBatch = useCallback(async () => {
    if (processingRef.current || pendingReads.size === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const idsToProcess = Array.from(pendingReads);
      setPendingReads(new Set());

      if (idsToProcess.length === 1) {
        // 단일 처리
        await notificationManager.markAsRead(idsToProcess[0], userId);
      } else {
        // 배치 처리
        await notificationManager.markMultipleAsRead(idsToProcess, userId);
      }
    } catch (error) {
      console.error('Batch notification processing failed:', error);
      // 실패한 경우 다시 대기열에 추가하지 않음 (UI는 이미 업데이트됨)
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [pendingReads, userId]);

  // 디바운스된 배치 처리
  const scheduleBatchProcess = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      processBatch();
    }, delay);
  }, [processBatch, delay]);

  // 단일 알림 읽음 처리
  const markAsRead = useCallback((notificationId: string) => {
    setPendingReads(prev => {
      const newSet = new Set(prev);
      newSet.add(notificationId);

      // 최대 배치 크기에 도달하면 즉시 처리
      if (newSet.size >= maxBatchSize) {
        // 다음 틱에서 처리하여 UI 업데이트가 먼저 일어나도록 함
        setTimeout(() => processBatch(), 0);
        return newSet;
      }

      return newSet;
    });

    scheduleBatchProcess();
  }, [scheduleBatchProcess, processBatch, maxBatchSize]);

  // 전체 읽음 처리
  const markAllAsRead = useCallback(async () => {
    // 기존 대기 중인 배치 처리 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setPendingReads(new Set());
    setIsProcessing(true);

    try {
      await notificationManager.markAllAsRead(userId, organizationId);
    } catch (error) {
      console.error('Mark all as read failed:', error);
      throw error; // 상위 컴포넌트에서 처리할 수 있도록 에러 전파
    } finally {
      setIsProcessing(false);
    }
  }, [userId, organizationId]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // 남은 배치가 있으면 즉시 처리
      if (pendingReads.size > 0 && !processingRef.current) {
        processBatch();
      }
    };
  }, [pendingReads, processBatch]);

  return {
    markAsRead,
    markAllAsRead,
    pendingReads,
    isProcessing,
  };
};