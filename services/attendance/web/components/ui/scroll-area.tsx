import React from 'react';

export const ScrollArea = ({ children, className = "", ...props }: any) => (
  <div className={`overflow-auto ${className}`} {...props}>{children}</div>
);

export default ScrollArea;