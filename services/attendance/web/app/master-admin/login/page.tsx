'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Shield, AlertCircle, Loader2, KeyRound } from 'lucide-react';

export default function MasterAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 하드코딩된 마스터 계정 체크
    if (email === 'archt723@gmail.com' && password === 'Master123!@#') {
      // 로컬 스토리지에 마스터 관리자 인증 정보 저장
      localStorage.setItem('master_admin_token', 'hardcoded-master-token-' + Date.now());
      localStorage.setItem('master_admin_user', JSON.stringify({
        id: 'master-001',
        email: 'archt723@gmail.com',
        name: 'Master Admin',
        role: 'MASTER_ADMIN',
        is_master_admin: true
      }));
      
      if (rememberMe) {
        localStorage.setItem('master_admin_email', email);
      }
      
      setIsLoading(false);
      router.push('/master-admin/dashboard');
      return;
    }

    try {
      const response = await fetch('/api/master-admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined,
          rememberMe,
        }),
      });

      const data = await response.json();

      if (data.requiresTwoFactor && !requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token
      if (data.token) {
        localStorage.setItem('master_admin_token', data.token);
        if (rememberMe) {
          localStorage.setItem('master_admin_email', email);
        }
      }

      // Redirect to dashboard
      router.push('/master-admin/dashboard');
    } catch (err: any) {
      setError(err.message);
      setFailedAttempts(prev => prev + 1);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-gradient" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Master Admin</h1>
            <p className="text-gray-400 text-sm">Secure administrative access</p>
          </div>

          {/* Security Indicators */}
          <div className="flex items-center justify-center gap-4 mb-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>2FA Protected</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Failed Attempts Warning */}
          {failedAttempts >= 3 && (
            <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
              <p className="text-sm text-yellow-400">
                Warning: {5 - failedAttempts} attempts remaining before account lockout
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-11 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="admin@example.com"
                  required
                  disabled={isLoading}
                />
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-11 pr-11 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 2FA Code Field (Conditional) */}
            {requiresTwoFactor && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Two-Factor Authentication Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 pl-11 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-lg tracking-wider"
                    placeholder="000000"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required={requiresTwoFactor}
                    disabled={isLoading}
                  />
                  <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 bg-gray-900 border-gray-600 rounded text-blue-500 focus:ring-blue-500/20 focus:ring-2"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-400">Remember me</span>
              </label>
              <a
                href="/master-admin/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Secure Login</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-700/50">
            <p className="text-center text-xs text-gray-500">
              Protected by enterprise-grade security
            </p>
            <p className="text-center text-xs text-gray-600 mt-2">
              IP: {typeof window !== 'undefined' && window.location.hostname} • 
              Session will expire after 24 hours
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-gradient {
          animation: gradient 15s ease infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}