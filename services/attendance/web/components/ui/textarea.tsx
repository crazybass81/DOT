import React from 'react';

export const Textarea = ({ className = "", ...props }: any) => (
  <textarea className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${className}`} {...props} />
);

export default Textarea;