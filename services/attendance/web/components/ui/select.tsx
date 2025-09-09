import React from 'react';

export const Select = ({ children, className = "", ...props }: any) => (
  <div className={`relative ${className}`} {...props}>
    {children}
  </div>
);

export const SelectTrigger = ({ children, className = "", ...props }: any) => (
  <button 
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-left ${className}`} 
    {...props}
  >
    {children}
  </button>
);

export const SelectValue = ({ children, className = "", placeholder = "", ...props }: any) => (
  <span className={`${className}`} {...props}>
    {children || placeholder}
  </span>
);

export const SelectContent = ({ children, className = "", ...props }: any) => (
  <div className={`absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-50 ${className}`} {...props}>
    {children}
  </div>
);

export const SelectItem = ({ children, className = "", ...props }: any) => (
  <div className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${className}`} {...props}>
    {children}
  </div>
);

export default Select;