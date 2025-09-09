import React from 'react';

export const Alert = ({ children, className = "", ...props }: any) => (
  <div className={`p-4 rounded-md border ${className}`} {...props}>{children}</div>
);

export const AlertDescription = ({ children, className = "", ...props }: any) => (
  <div className={`text-sm ${className}`} {...props}>{children}</div>
);