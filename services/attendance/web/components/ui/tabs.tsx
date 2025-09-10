import React, { createContext, useContext, useState } from 'react';
import { clsx } from 'clsx';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

interface TabsProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ 
  children, 
  value: controlledValue, 
  defaultValue = '',
  onValueChange,
  className = "",
  ...props 
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  
  const value = controlledValue ?? internalValue;
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = "", ...props }) => (
  <div className={clsx("inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500", className)} {...props}>
    {children}
  </div>
);

interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ children, value, className = "", ...props }) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs');
  }

  const isActive = context.value === value;
  
  return (
    <button 
      className={clsx(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "bg-white text-gray-950 shadow-sm" 
          : "text-gray-600 hover:text-gray-900",
        className
      )} 
      onClick={() => context.onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ children, value, className = "", ...props }) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be used within Tabs');
  }

  if (context.value !== value) {
    return null;
  }

  return (
    <div className={clsx("mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2", className)} {...props}>
      {children}
    </div>
  );
};