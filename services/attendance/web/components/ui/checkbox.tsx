import React from 'react';

export const Checkbox = ({ className = "", ...props }: any) => (
  <input type="checkbox" className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`} {...props} />
);

export default Checkbox;