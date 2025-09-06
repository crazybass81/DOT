/**
 * Circular Buffer Implementation
 * 메모리 효율적인 순환 버퍼 - API 메트릭 데이터 저장용
 */

import { CircularBufferConfig } from '../../types/performance-metrics';

export interface BufferStatistics {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
}

export class CircularBuffer<T> {
  private buffer: (T | null)[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readonly maxSize: number;
  private readonly retentionTime?: number;
  private readonly autoCleanup: boolean;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: CircularBufferConfig) {
    this.maxSize = config.maxSize;
    this.retentionTime = config.retentionTime;
    this.autoCleanup = config.autoCleanup || false;
    
    this.buffer = new Array(this.maxSize).fill(null);
    
    if (this.autoCleanup && this.retentionTime) {
      this.startAutoCleanup(config.cleanupInterval || 60000);
    }
  }

  /**
   * 버퍼에 항목 추가
   */
  add(item: T): void {
    this.buffer[this.head] = item;
    
    if (this.count < this.maxSize) {
      this.count++;
    } else {
      // 버퍼가 가득 찼으면 tail 이동
      this.tail = (this.tail + 1) % this.maxSize;
    }
    
    this.head = (this.head + 1) % this.maxSize;
  }

  /**
   * 모든 항목 반환 (삽입 순서대로)
   */
  getAll(): T[] {
    const result: T[] = [];
    
    if (this.count === 0) {
      return result;
    }

    let index = this.tail;
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[index];
      if (item !== null) {
        result.push(item);
      }
      index = (index + 1) % this.maxSize;
    }
    
    return result;
  }

  /**
   * 조건에 맞는 항목들 필터링
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }

  /**
   * 첫 번째 매치되는 항목 찾기
   */
  find(predicate: (item: T) => boolean): T | undefined {
    const items = this.getAll();
    return items.find(predicate);
  }

  /**
   * 최근 N개 항목 반환
   */
  getLatest(n: number): T[] {
    const all = this.getAll();
    return all.slice(-n);
  }

  /**
   * 시간 범위 내의 항목들 반환
   */
  getItemsInTimeRange(startTime: Date, endTime: Date): T[] {
    if (startTime > endTime) {
      return [];
    }

    return this.filter((item: any) => {
      if (!item.timestamp || !(item.timestamp instanceof Date)) {
        return false;
      }
      return item.timestamp >= startTime && item.timestamp <= endTime;
    });
  }

  /**
   * 통계 계산
   */
  getStatistics(valueExtractor: (items: T[]) => number[]): BufferStatistics {
    const items = this.getAll();
    const values = valueExtractor(items);
    
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
      };
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = sum / values.length;

    return {
      count: values.length,
      sum: Math.round(sum * 100) / 100,
      average: Math.round(average * 100) / 100,
      min,
      max,
    };
  }

  /**
   * 버퍼 크기 반환
   */
  size(): number {
    return this.count;
  }

  /**
   * 버퍼가 비어있는지 확인
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * 버퍼가 가득 찼는지 확인
   */
  isFull(): boolean {
    return this.count === this.maxSize;
  }

  /**
   * 버퍼 초기화
   */
  clear(): void {
    this.buffer.fill(null);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * 만료된 항목들 정리
   */
  cleanup(): void {
    if (!this.retentionTime) {
      return;
    }

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.retentionTime);
    
    const validItems = this.filter((item: any) => {
      if (!item.timestamp || !(item.timestamp instanceof Date)) {
        return true; // timestamp가 없으면 유지
      }
      return item.timestamp >= cutoffTime;
    });

    // 버퍼 재구성
    this.clear();
    validItems.forEach(item => this.add(item));
  }

  /**
   * 자동 정리 시작
   */
  private startAutoCleanup(interval: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, interval);
  }

  /**
   * 자동 정리 중지
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clear();
  }
}