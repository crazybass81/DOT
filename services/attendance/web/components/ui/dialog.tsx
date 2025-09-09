import React from 'react';

export const DialogDescription = ({ children, ...props }: any) => 
  React.createElement('p', props, children);

export const Dialog = ({ children, open, ...props }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      {children}
    </div>
  );
};

export const DialogContent = ({ children, className = "", ...props }: any) => (
  <div className={`bg-white rounded-lg p-6 max-w-md w-full mx-4 ${className}`} {...props}>
    {children}
  </div>
);

export const DialogHeader = ({ children, className = "", ...props }: any) => (
  <div className={`mb-4 ${className}`} {...props}>{children}</div>
);

export const DialogTitle = ({ children, className = "", ...props }: any) => (
  <h2 className={`text-lg font-semibold ${className}`} {...props}>{children}</h2>
);

export const DialogFooter = ({ children, className = "", ...props }: any) => (
  <div className={`mt-6 flex justify-end space-x-2 ${className}`} {...props}>{children}</div>
);

export const DialogTrigger = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);