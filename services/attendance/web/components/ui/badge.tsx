import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

const getVariantClasses = (variant: BadgeProps['variant']) => {
  switch (variant) {
    case 'secondary':
      return 'bg-gray-600 text-gray-100';
    case 'destructive':
      return 'bg-red-600 text-red-100';
    case 'outline':
      return 'border border-gray-300 bg-transparent text-gray-700';
    default:
      return 'bg-blue-600 text-blue-100';
  }
};

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  className = "", 
  ...props 
}) => (
  <span 
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVariantClasses(variant)} ${className}`} 
    {...props}
  >
    {children}
  </span>
);

export default Badge;