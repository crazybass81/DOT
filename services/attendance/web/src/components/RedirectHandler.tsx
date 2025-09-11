'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function RedirectHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 만약 /dashboard에 있고 사용자가 직접 홈페이지로 이동하려고 한다면
    // 강제로 홈페이지로 리디렉션
    console.log('🔀 RedirectHandler: Current pathname:', pathname);
    
    if (pathname === '/dashboard') {
      console.log('🔀 RedirectHandler: Dashboard 접근 감지, 홈페이지로 강제 리디렉션');
      router.replace('/');
    }
  }, [pathname, router]);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}