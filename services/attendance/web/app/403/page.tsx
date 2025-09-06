/**
 * 403 Forbidden Page
 * Displayed when users attempt to access MASTER_ADMIN resources without proper authorization
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForbiddenPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const [attemptLogged, setAttemptLogged] = useState(false);

  useEffect(() => {
    // Log the unauthorized access attempt
    if (!attemptLogged) {
      logUnauthorizedAccess();
      setAttemptLogged(true);
    }

    // Countdown timer for auto-redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, attemptLogged]);

  const logUnauthorizedAccess = async () => {
    try {
      // Log the attempt to the server
      await fetch('/api/security/log-unauthorized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Failed to log unauthorized access:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Security Shield Icon */}
          <div className="mx-auto h-24 w-24 bg-red-600 rounded-full flex items-center justify-center mb-8">
            <svg
              className="h-16 w-16 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* Error Code */}
          <h1 className="text-6xl font-bold text-red-600 mb-4">403</h1>
          
          {/* Error Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Access Forbidden
          </h2>
          
          {/* Error Description */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <p className="text-gray-600 mb-4">
              You do not have permission to access this resource.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">
                <strong>Security Notice:</strong> This incident has been logged.
                Repeated unauthorized access attempts may result in account suspension.
              </p>
            </div>
          </div>

          {/* Required Role Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-full mb-6">
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            MASTER_ADMIN Role Required
          </div>

          {/* Auto-redirect Notice */}
          <div className="text-sm text-gray-600 mb-6">
            Redirecting to dashboard in <span className="font-bold text-red-600">{countdown}</span> seconds...
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
            >
              <svg
                className="h-5 w-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Go to Dashboard
            </Link>
            
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
            >
              <svg
                className="h-5 w-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Go Back
            </button>
          </div>
        </div>

        {/* Security Information */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Why am I seeing this?
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              Your account does not have MASTER_ADMIN privileges
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              The resource you're trying to access requires elevated permissions
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              Contact your system administrator if you believe this is an error
            </li>
          </ul>
        </div>

        {/* Incident ID */}
        <div className="text-center text-xs text-gray-500">
          Incident ID: {generateIncidentId()}
        </div>
      </div>
    </div>
  );
}

function generateIncidentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `SEC-${timestamp}-${random}`.toUpperCase();
}