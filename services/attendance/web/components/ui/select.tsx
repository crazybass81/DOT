import React from 'react';

export const Select = ({ children, className = "", ...props }: any) => (
  <select className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${className}`} {...props}>
    {children}
  </select>
);

export const SelectTrigger = ({ children, className = "", ...props }: any) => (
  <button className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${className}`} {...props}>
    {children}
  </button>
);

export const SelectValue = ({ className = "", placeholder, ...props }: any) => (
  <span className={`text-gray-700 ${className}`} {...props}>{placeholder}</span>
);

export const SelectContent = ({ children, className = "", ...props }: any) => (
  <div className={`absolute z-50 min-w-full bg-white border border-gray-300 rounded-md shadow-lg ${className}`} {...props}>
    {children}
  </div>
);

export const SelectItem = ({ children, className = "", ...props }: any) => (
  <div className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${className}`} {...props}>
    {children}
  </div>
);

export default Select;