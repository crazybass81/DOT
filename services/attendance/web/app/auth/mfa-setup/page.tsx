'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Temporarily comment out AWS Amplify auth imports until properly configured
// import { setUpTOTP, updateMFAPreference } from '@aws-amplify/auth';
import QRCode from 'qrcode';

export default function MFASetupPage() {
  const router = useRouter();
  const [mfaType, setMfaType] = useState<'sms' | 'totp'>('totp');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'setup' | 'verify'>('select');

  const setupTOTP = async () => {
    setLoading(true);
    setError('');

    try {
      // TODO: Implement actual TOTP setup with AWS Cognito
      // const totpSetup = await setUpTOTP();
      // const setupUri = totpSetup.getSetupUri('DOT Attendance');
      // setSecretCode(totpSetup.sharedSecret || '');
      
      // For now, generate a mock QR code
      const mockUri = 'otpauth://totp/DOT%20Attendance:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DOT%20Attendance';
      const qrDataUrl = await QRCode.toDataURL(mockUri);
      setQrCodeUrl(qrDataUrl);
      setSecretCode('JBSWY3DPEHPK3PXP'); // Mock secret
      
      setStep('setup');
    } catch (err: any) {
      console.error('TOTP setup error:', err);
      setError(err.message || 'MFA 설정에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const verifyTOTP = async () => {
    if (verificationCode.length !== 6) {
      setError('6자리 코드를 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Implement actual TOTP verification
      // For now, accept any 6-digit code for demo
      if (verificationCode.length === 6) {
        // Mock successful verification
        // Success - redirect to main page
        router.push('/attendance');
      }
    } catch (err: any) {
      console.error('TOTP verification error:', err);
      setError(err.message || 'MFA 인증에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const skipMFA = () => {
    router.push('/attendance');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            다단계 인증 설정 (MFA)
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            계정 보안을 강화하기 위해 MFA를 설정하세요
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div 
                onClick={() => {
                  setMfaType('totp');
                  setupTOTP();
                }}
                className="cursor-pointer border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-500 transition-colors"
              >
                <h3 className="font-semibold text-lg">인증 앱 (TOTP)</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Google Authenticator, Microsoft Authenticator 등의 앱을 사용합니다
                </p>
              </div>

              <div 
                onClick={() => {
                  setMfaType('sms');
                  setStep('setup');
                }}
                className="cursor-pointer border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-500 transition-colors"
              >
                <h3 className="font-semibold text-lg">SMS 인증</h3>
                <p className="text-sm text-gray-600 mt-1">
                  휴대폰 번호로 인증 코드를 받습니다
                </p>
              </div>
            </div>

            <button
              onClick={skipMFA}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              나중에 설정하기
            </button>
          </div>
        )}

        {step === 'setup' && mfaType === 'totp' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-4">1. 인증 앱에서 QR 코드 스캔</h3>
              {qrCodeUrl && (
                <div className="flex justify-center mb-4">
                  <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                </div>
              )}
              
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-600 mb-2">QR 코드를 스캔할 수 없는 경우 수동으로 입력:</p>
                <code className="text-xs bg-white px-2 py-1 rounded font-mono break-all">
                  {secretCode}
                </code>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">2. 인증 앱의 6자리 코드 입력</h3>
              <input
                type="text"
                maxLength={6}
                pattern="[0-9]{6}"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              />

              <button
                onClick={verifyTOTP}
                disabled={loading || verificationCode.length !== 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? '확인 중...' : 'MFA 활성화'}
              </button>
            </div>
          </div>
        )}

        {step === 'setup' && mfaType === 'sms' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">휴대폰 번호 입력</h3>
              <input
                type="tel"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="+82 10-1234-5678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />

              <button
                onClick={() => setStep('verify')}
                disabled={loading || !phoneNumber}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? '전송 중...' : '인증 코드 전송'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}