/**
 * Step Progress Component - GitHub Reference Style
 * Visual progress indicator for multi-step forms
 */

'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  progress: number;
}

interface StepProgressProps {
  steps: Step[];
  currentStepIndex: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

export default function StepProgress({
  steps,
  currentStepIndex,
  className = '',
  size = 'md',
  orientation = 'horizontal'
}: StepProgressProps) {
  const sizeClasses = {
    sm: {
      icon: 'w-6 h-6',
      iconContainer: 'w-8 h-8',
      text: 'text-xs',
      title: 'text-sm'
    },
    md: {
      icon: 'w-4 h-4',
      iconContainer: 'w-8 h-8',
      text: 'text-sm',
      title: 'text-base'
    },
    lg: {
      icon: 'w-5 h-5',
      iconContainer: 'w-10 h-10',
      text: 'text-sm',
      title: 'text-lg'
    }
  };

  const classes = sizeClasses[size];

  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div key={step.id} className="flex items-start space-x-3">
              <div className={`${classes.iconContainer} rounded-full flex items-center justify-center flex-shrink-0 ${
                isActive 
                  ? 'bg-blue-100 border-2 border-blue-500' 
                  : isCompleted 
                    ? 'bg-green-100 border-2 border-green-500' 
                    : 'bg-gray-100 border-2 border-gray-300'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className={`${classes.icon} text-green-600`} />
                ) : (
                  <Icon className={`${classes.icon} ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`${classes.title} font-medium ${
                  isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </h3>
                <p className={`${classes.text} ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center space-x-4 ${className}`}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center space-x-2">
              <div className={`${classes.iconContainer} rounded-full flex items-center justify-center ${
                isActive 
                  ? 'bg-blue-100 border-2 border-blue-500' 
                  : isCompleted 
                    ? 'bg-green-100 border-2 border-green-500' 
                    : 'bg-gray-100 border-2 border-gray-300'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className={`${classes.icon} text-green-600`} />
                ) : (
                  <Icon className={`${classes.icon} ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                )}
              </div>
              <div className="hidden sm:block">
                <span className={`${classes.text} font-medium font-korean ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
            </div>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 ${
                index < currentStepIndex ? 'bg-green-300' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Progress bar variant for simpler use cases
interface ProgressBarProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'indigo';
}

export function ProgressBar({
  current,
  total,
  showPercentage = true,
  className = '',
  color = 'blue'
}: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500'
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 font-korean">
            진행률
          </span>
          <span className="text-sm text-gray-600 font-korean">
            {percentage}% 완료
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}