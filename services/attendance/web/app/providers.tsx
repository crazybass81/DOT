'use client';

import { ReactNode, useEffect } from 'react';
import { configureAmplify } from '@/lib/aws-config';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    configureAmplify();
  }, []);

  return <>{children}</>;
}