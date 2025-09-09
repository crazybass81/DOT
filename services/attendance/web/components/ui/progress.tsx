import React from 'react';

export const Progress = ({ value = 0, className = "", ...props }: any) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`} {...props}>
    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${value}%` }}></div>
  </div>
);

export default Progress;