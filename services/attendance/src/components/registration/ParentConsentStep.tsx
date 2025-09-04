import React, { useState } from 'react'
import { RegistrationAPI } from '@/lib/registration/api'

interface ParentConsentStepProps {
  flowId: string
  api: RegistrationAPI
  onConsent: (consented: boolean) => Promise<void>
  onBack: () => void
  loading: boolean
}

const ParentConsentStep: React.FC<ParentConsentStepProps> = ({
  flowId,
  api,
  onConsent,
  onBack,
  loading
}) => {
  const [parentInfo, setParentInfo] = useState({
    parentName: '',
    parentPhone: '',
    relationship: 'mother'
  })
  const [consentCode, setConsentCode] = useState('')
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [consentUrl, setConsentUrl] = useState('')

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  const handleRequestConsent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!parentInfo.parentName || !parentInfo.parentPhone) {
      setError('Please provide parent information')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const response = await api.requestParentConsent(
        flowId,
        parentInfo.parentPhone,
        parentInfo.parentName
      )

      if (response.success) {
        setConsentUrl(response.consentUrl || '')
        setStep('verify')
      } else {
        setError(response.error || 'Failed to send consent request')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request consent')
    } finally {
      setProcessing(false)
    }
  }

  const handleVerifyConsent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!consentCode || consentCode.length !== 6) {
      setError('Please enter the 6-digit verification code')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const response = await api.verifyParentConsent(flowId, consentCode)

      if (response.verified) {
        await onConsent(true)
      } else {
        setError('Invalid verification code. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleResendCode = async () => {
    setProcessing(true)
    setError('')

    try {
      await api.resendVerification(flowId, 'parent')
      setError('') // Clear any previous errors
      alert('Verification code has been resent to your parent')
    } catch (err: any) {
      setError(err.message || 'Failed to resend code')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Parent/Guardian Consent</h2>
        <p className="mt-2 text-sm text-gray-600">
          Since you are under 18, we need your parent or guardian's consent to continue.
        </p>
      </div>

      {step === 'request' ? (
        <form onSubmit={handleRequestConsent} className="space-y-4">
          {/* Parent Name */}
          <div>
            <label htmlFor="parentName" className="block text-sm font-medium text-gray-700">
              Parent/Guardian Name
            </label>
            <input
              type="text"
              id="parentName"
              value={parentInfo.parentName}
              onChange={(e) => setParentInfo({ ...parentInfo, parentName: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Parent's full name"
              disabled={processing || loading}
              required
            />
          </div>

          {/* Parent Phone */}
          <div>
            <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700">
              Parent/Guardian Phone Number
            </label>
            <input
              type="tel"
              id="parentPhone"
              value={parentInfo.parentPhone}
              onChange={(e) => setParentInfo({ ...parentInfo, parentPhone: formatPhoneNumber(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="010-1234-5678"
              maxLength={13}
              disabled={processing || loading}
              required
            />
          </div>

          {/* Relationship */}
          <div>
            <label htmlFor="relationship" className="block text-sm font-medium text-gray-700">
              Relationship
            </label>
            <select
              id="relationship"
              value={parentInfo.relationship}
              onChange={(e) => setParentInfo({ ...parentInfo, relationship: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={processing || loading}
            >
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="guardian">Legal Guardian</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={processing || loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {processing ? 'Sending...' : 'Send Consent Request'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyConsent} className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              A verification code has been sent to your parent's phone number.
              They will receive a link to review and approve your registration.
            </p>
            {consentUrl && (
              <p className="mt-2 text-xs text-blue-600">
                Parent consent URL: {consentUrl}
              </p>
            )}
          </div>

          {/* Verification Code */}
          <div>
            <label htmlFor="consentCode" className="block text-sm font-medium text-gray-700">
              Enter Verification Code
            </label>
            <input
              type="text"
              id="consentCode"
              value={consentCode}
              onChange={(e) => setConsentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-2xl"
              placeholder="000000"
              maxLength={6}
              disabled={processing || loading}
              required
            />
            <p className="mt-1 text-xs text-gray-600">
              Ask your parent to check their SMS and enter the 6-digit code
            </p>
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={processing || loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {processing ? 'Verifying...' : 'Verify Consent'}
          </button>

          {/* Resend Code */}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={processing || loading}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Resend Code
          </button>
        </form>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Legal Notice */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Legal Notice:</strong> Parent consent is required for users under 18 years old.
          Work hours will be limited to comply with youth labor protection laws:
          <br />• Maximum 7 hours per day, 35 hours per week
          <br />• No work between 10 PM and 6 AM
          <br />• Required break time every 4 hours
        </p>
      </div>

      {/* Back Button */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={processing || loading}
        >
          Back
        </button>
      </div>
    </div>
  )
}

export default ParentConsentStep