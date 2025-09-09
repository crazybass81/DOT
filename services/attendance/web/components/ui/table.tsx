import React from 'react';

export const Table = ({ children, className = "", ...props }: any) => (
  <table className={`min-w-full divide-y divide-gray-200 ${className}`} {...props}>{children}</table>
);

export const TableHeader = ({ children, className = "", ...props }: any) => (
  <thead className={`bg-gray-50 ${className}`} {...props}>{children}</thead>
);

export const TableBody = ({ children, className = "", ...props }: any) => (
  <tbody className={`bg-white divide-y divide-gray-200 ${className}`} {...props}>{children}</tbody>
);

export const TableRow = ({ children, className = "", ...props }: any) => (
  <tr className={className} {...props}>{children}</tr>
);

export const TableHead = ({ children, className = "", ...props }: any) => (
  <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell = ({ children, className = "", ...props }: any) => (
  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`} {...props}>
    {children}
  </td>
);