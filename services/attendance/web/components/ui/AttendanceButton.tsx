'use client';

import { LogIn, LogOut, Loader2 } from 'lucide-react';

interface AttendanceButtonProps {
  type: 'check-in' | 'check-out';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function AttendanceButton({ 
  type, 
  onClick, 
  disabled = false, 
  loading = false, 
  className = '' 
}: AttendanceButtonProps) {
  const isCheckIn = type === 'check-in';
  
  const baseClasses = "w-full font-semibold py-6 px-8 rounded-2xl text-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:hover:scale-100 shadow-sm";
  
  const typeClasses = isCheckIn 
    ? "bg-green-600 hover:bg-green-700 text-white"
    : "bg-red-600 hover:bg-red-700 text-white";
    
  const disabledClasses = "disabled:bg-gray-300 disabled:cursor-not-allowed";

  const Icon = isCheckIn ? LogIn : LogOut;
  const text = isCheckIn ? '출근하기' : '퇴근하기';
  const loadingText = '처리 중...';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${typeClasses} ${disabledClasses} ${className}`}
    >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2">
          <Icon className="w-6 h-6" />
          <span>{text}</span>
        </div>
      )}
    </button>
  );
}