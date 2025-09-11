'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Button } from './button';

interface DropdownMenuContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextType>({
  isOpen: false,
  setIsOpen: () => {}
});

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger = ({ 
  asChild, 
  children, 
  ...props 
}: { 
  asChild?: boolean; 
  children: React.ReactNode;
  [key: string]: any;
}) => {
  const { isOpen, setIsOpen } = useContext(DropdownMenuContext);
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e: any) => {
        e.preventDefault();
        setIsOpen(!isOpen);
        if (children.props.onClick) {
          children.props.onClick(e);
        }
      }
    });
  }
  
  return (
    <Button
      {...props}
      onClick={(e) => {
        e.preventDefault();
        setIsOpen(!isOpen);
      }}
    >
      {children}
    </Button>
  );
};

export const DropdownMenuContent = ({ 
  align = 'start',
  className = '',
  children,
  ...props 
}: { 
  align?: 'start' | 'end' | 'center';
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) => {
  const { isOpen, setIsOpen } = useContext(DropdownMenuContext);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, setIsOpen]);
  
  if (!isOpen) return null;
  
  const alignmentClasses = {
    start: 'left-0',
    end: 'right-0',
    center: 'left-1/2 transform -translate-x-1/2'
  };
  
  return (
    <div
      ref={contentRef}
      className={`
        absolute top-full mt-1 z-50 min-w-[8rem] overflow-hidden rounded-md border 
        bg-popover p-1 text-popover-foreground shadow-md 
        ${alignmentClasses[align]} ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem = ({ 
  className = '',
  children,
  onClick,
  ...props 
}: { 
  className?: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  [key: string]: any;
}) => {
  const { setIsOpen } = useContext(DropdownMenuContext);
  
  return (
    <div
      className={`
        relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 
        text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground 
        focus:bg-accent focus:text-accent-foreground ${className}
      `}
      onClick={(e) => {
        onClick?.(e);
        setIsOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuSeparator = ({ className = '' }: { className?: string }) => (
  <div className={`-mx-1 my-1 h-px bg-muted ${className}`} />
);