'use client';

import { ReactNode, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { configureAmplify } from '@/lib/aws-config';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    configureAmplify();
  }, []);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}