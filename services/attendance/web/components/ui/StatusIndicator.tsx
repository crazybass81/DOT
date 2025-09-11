'use client';

interface StatusIndicatorProps {
  status: 'working' | 'not-working' | 'on-break' | 'completed';
  className?: string;
}

export default function StatusIndicator({ status, className = '' }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'working':
        return {
          text: '근무중',
          dotColor: 'bg-green-500',
          textColor: 'text-gray-700'
        };
      case 'not-working':
        return {
          text: '미출근',
          dotColor: 'bg-gray-400',
          textColor: 'text-gray-700'
        };
      case 'on-break':
        return {
          text: '휴게중',
          dotColor: 'bg-yellow-500',
          textColor: 'text-gray-700'
        };
      case 'completed':
        return {
          text: '근무완료',
          dotColor: 'bg-blue-500',
          textColor: 'text-gray-700'
        };
      default:
        return {
          text: '알 수 없음',
          dotColor: 'bg-gray-400',
          textColor: 'text-gray-700'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white border border-gray-200 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.dotColor}`}></div>
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  );
}