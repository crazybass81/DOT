import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 날짜/시간 포맷팅
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 응답시간 포맷팅 (밀리초)
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  
  const minutes = seconds / 60;
  return `${minutes.toFixed(2)}m`;
}

/**
 * 백분율 포맷팅
 */
export function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * 숫자를 읽기 쉬운 형태로 포맷팅
 */
export function formatNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }
  
  if (num < 1000000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  
  return `${(num / 1000000).toFixed(1)}M`;
}

/**
 * 바이트 크기를 읽기 쉬운 형태로 포맷팅
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 에러 메시지 정규화
 */
export function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Unknown error occurred';
}