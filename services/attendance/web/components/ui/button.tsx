import React from 'react';

export const Button = ({ children, className = "", ...props }: any) => (
  <button className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${className}`} {...props}>
    {children}
  </button>
);

export default Button;