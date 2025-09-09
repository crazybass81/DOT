// UI Components - Basic exports for build compatibility
import React from 'react';

// Basic Components
export const Button = ({ children, ...props }: any) => React.createElement('button', props, children);
export const Input = ({ ...props }: any) => React.createElement('input', props);

// Card Components
export const Card = ({ children, ...props }: any) => React.createElement('div', props, children);
export const CardContent = ({ children, ...props }: any) => React.createElement('div', props, children);
export const CardHeader = ({ children, ...props }: any) => React.createElement('div', props, children);
export const CardTitle = ({ children, ...props }: any) => React.createElement('h3', props, children);
export const CardDescription = ({ children, ...props }: any) => React.createElement('p', props, children);

// Select Components
export const Select = ({ children, ...props }: any) => React.createElement('div', props, children);
export const SelectTrigger = ({ children, ...props }: any) => React.createElement('button', props, children);
export const SelectValue = ({ children, ...props }: any) => React.createElement('span', props, children);
export const SelectContent = ({ children, ...props }: any) => React.createElement('div', props, children);
export const SelectItem = ({ children, ...props }: any) => React.createElement('div', props, children);

// Tab Components
export const Tabs = ({ children, ...props }: any) => React.createElement('div', props, children);
export const TabsList = ({ children, ...props }: any) => React.createElement('div', props, children);
export const TabsTrigger = ({ children, ...props }: any) => React.createElement('button', props, children);
export const TabsContent = ({ children, ...props }: any) => React.createElement('div', props, children);

// Dialog Components
export const Dialog = ({ children, ...props }: any) => React.createElement('div', props, children);
export const DialogContent = ({ children, ...props }: any) => React.createElement('div', props, children);
export const DialogHeader = ({ children, ...props }: any) => React.createElement('div', props, children);
export const DialogTitle = ({ children, ...props }: any) => React.createElement('h2', props, children);
export const DialogDescription = ({ children, ...props }: any) => React.createElement('p', props, children);
export const DialogTrigger = ({ children, ...props }: any) => React.createElement('button', props, children);

// Form Components
export const Label = ({ children, ...props }: any) => React.createElement('label', props, children);
export const Checkbox = ({ ...props }: any) => React.createElement('input', { type: 'checkbox', ...props });
export const Textarea = ({ ...props }: any) => React.createElement('textarea', props);

// Utility Components
export const Badge = ({ children, ...props }: any) => React.createElement('span', props, children);
export const Alert = ({ children, ...props }: any) => React.createElement('div', props, children);
export const Progress = ({ ...props }: any) => React.createElement('div', props);
export const ScrollArea = ({ children, ...props }: any) => React.createElement('div', props, children);

// Table Components
export const Table = ({ children, ...props }: any) => React.createElement('table', props, children);
export const TableBody = ({ children, ...props }: any) => React.createElement('tbody', props, children);
export const TableCell = ({ children, ...props }: any) => React.createElement('td', props, children);
export const TableHead = ({ children, ...props }: any) => React.createElement('th', props, children);
export const TableHeader = ({ children, ...props }: any) => React.createElement('thead', props, children);
export const TableRow = ({ children, ...props }: any) => React.createElement('tr', props, children);

export default {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  Label,
  Checkbox,
  Textarea,
  Badge,
  Alert,
  Progress,
  ScrollArea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
};