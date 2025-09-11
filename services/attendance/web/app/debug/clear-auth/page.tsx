'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearAuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear all authentication-related storage
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('session_info');
    localStorage.removeItem('session_info');
    localStorage.removeItem('user');
    
    // Clear any Supabase auth cookies/tokens
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });

    console.log('✅ All authentication state cleared');
    alert('Authentication state cleared! Redirecting to home page...');
    
    // Redirect to home page
    setTimeout(() => {
      router.push('/');
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-red-800 mb-2">Clearing Authentication State</h1>
        <p className="text-red-600">Removing all stored session data...</p>
      </div>
    </div>
  );
}