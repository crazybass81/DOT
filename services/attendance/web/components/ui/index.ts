// UI Components - Basic exports for build compatibility
import React from 'react';

export const Button = ({ children, ...props }: any) => React.createElement('button', props, children);
export const Input = ({ ...props }: any) => React.createElement('input', props);
export const Card = ({ children, ...props }: any) => React.createElement('div', props, children);
export const CardContent = ({ children, ...props }: any) => React.createElement('div', props, children);
export const CardHeader = ({ children, ...props }: any) => React.createElement('div', props, children);
export const CardTitle = ({ children, ...props }: any) => React.createElement('h3', props, children);
export const CardDescription = ({ children, ...props }: any) => React.createElement('p', props, children);
export const Tabs = ({ children, ...props }: any) => React.createElement('div', props, children);
export const SelectTrigger = ({ children, ...props }: any) => React.createElement('button', props, children);
export const SelectValue = ({ ...props }: any) => React.createElement('span', props);
export const SelectContent = ({ children, ...props }: any) => React.createElement('div', props, children);
export const SelectItem = ({ children, ...props }: any) => React.createElement('div', props, children);

export default {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle
};