import React from 'react';

export const Select = ({ children, className = "", ...props }: any) => (
  <select className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${className}`} {...props}>
    {children}
  </select>
);

export default Select;