import React from 'react';

export const Tabs = ({ children, className = "", ...props }: any) => (
  <div className={className} {...props}>{children}</div>
);

export const TabsList = ({ children, className = "", ...props }: any) => (
  <div className={`flex space-x-1 ${className}`} {...props}>{children}</div>
);

export const TabsTrigger = ({ children, className = "", ...props }: any) => (
  <button className={`px-3 py-2 text-sm font-medium rounded-md ${className}`} {...props}>
    {children}
  </button>
);

export const TabsContent = ({ children, className = "", ...props }: any) => (
  <div className={`mt-4 ${className}`} {...props}>{children}</div>
);