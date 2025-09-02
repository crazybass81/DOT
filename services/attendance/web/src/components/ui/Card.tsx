import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  gradient?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  hover = false,
  gradient = false,
  glass = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white shadow-sm transition-all duration-200',
        hover && 'hover:shadow-lg hover:-translate-y-1 cursor-pointer',
        gradient && 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100',
        glass && 'backdrop-blur-md bg-white/70 border-white/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('p-6 pb-4', className)} {...props}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('p-6 pt-2', className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('p-6 pt-2 border-t', className)} {...props}>
      {children}
    </div>
  );
};