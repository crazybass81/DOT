import React, { useState } from 'react'
import { RegistrationAPI } from '@/lib/registration/api'
import { businessNumberRegex } from '@/lib/registration/types'

interface BusinessVerificationStepProps {
  flowId: string
  api: RegistrationAPI
  onVerified: (verified: boolean, businessData?: any) => Promise<void>
  onBack: () => void
  loading: boolean
}

const BusinessVerificationStep: React.FC<BusinessVerificationStepProps> = ({
  flowId,
  api,
  onVerified,
  onBack,
  loading
}) => {
  const [businessInfo, setBusinessInfo] = useState({
    businessNumber: '',
    businessName: '',
    representativeName: ''
  })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const formatBusinessNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`
  }

  const validateForm = () => {
    if (!businessNumberRegex.test(businessInfo.businessNumber)) {
      setError('Business number must be in format: 123-45-67890')
      return false
    }

    if (!businessInfo.businessName || businessInfo.businessName.length < 2) {
      setError('Please enter a valid business name')
      return false
    }

    if (!businessInfo.representativeName || businessInfo.representativeName.length < 2) {
      setError('Please enter the representative name')
      return false
    }

    return true
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setProcessing(true)
    setError('')

    try {
      // In production, this would call the NTS API
      // For development, we'll use mock verification
      const mockResult = await api.mockNtsVerification(businessInfo.businessNumber)
      
      if (mockResult.isValid) {
        setVerificationResult({
          businessName: mockResult.businessName,
          representativeName: mockResult.representativeName,
          status: 'active',
          verifiedAt: new Date().toISOString()
        })

        // Verify through the Edge Function
        const response = await api.verifyBusiness({
          flowId,
          businessNumber: businessInfo.businessNumber,
          businessName: businessInfo.businessName,
          representativeName: businessInfo.representativeName
        })

        if (response.verified) {
          await onVerified(true, {
            businessNumber: businessInfo.businessNumber,
            businessName: mockResult.businessName,
            representativeName: mockResult.representativeName
          })
        } else {
          setError('Business verification failed. Please check your information.')
        }
      } else {
        setError('Business number not found or inactive. Please check your information.')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Business Verification</h2>
        <p className="mt-2 text-sm text-gray-600">
          As a business owner, we need to verify your business registration.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        {/* Business Number */}
        <div>
          <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700">
            Business Registration Number
          </label>
          <input
            type="text"
            id="businessNumber"
            value={businessInfo.businessNumber}
            onChange={(e) => setBusinessInfo({ 
              ...businessInfo, 
              businessNumber: formatBusinessNumber(e.target.value) 
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="123-45-67890"
            maxLength={12}
            disabled={processing || loading}
            required
          />
          <p className="mt-1 text-xs text-gray-600">
            Enter your 10-digit business registration number
          </p>
        </div>

        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
            Business Name
          </label>
          <input
            type="text"
            id="businessName"
            value={businessInfo.businessName}
            onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Your Business Co., Ltd."
            disabled={processing || loading}
            required
          />
        </div>

        {/* Representative Name */}
        <div>
          <label htmlFor="representativeName" className="block text-sm font-medium text-gray-700">
            Representative Name
          </label>
          <input
            type="text"
            id="representativeName"
            value={businessInfo.representativeName}
            onChange={(e) => setBusinessInfo({ ...businessInfo, representativeName: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Full name of the business representative"
            disabled={processing || loading}
            required
          />
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={processing || loading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {processing ? 'Verifying...' : 'Verify Business'}
        </button>
      </form>

      {/* Verification Result */}
      {verificationResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-2">Verification Successful</h3>
          <dl className="text-sm text-green-700 space-y-1">
            <div className="flex">
              <dt className="font-medium mr-2">Business Name:</dt>
              <dd>{verificationResult.businessName}</dd>
            </div>
            <div className="flex">
              <dt className="font-medium mr-2">Representative:</dt>
              <dd>{verificationResult.representativeName}</dd>
            </div>
            <div className="flex">
              <dt className="font-medium mr-2">Status:</dt>
              <dd className="capitalize">{verificationResult.status}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Information */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> Business verification is performed through the National Tax Service (NTS) API.
          Only active businesses registered with the tax office can be verified.
          The business representative must match the registered information.
        </p>
      </div>

      {/* Alternative Options */}
      <div className="border-t pt-4">
        <p className="text-sm text-gray-600 mb-3">
          Having trouble with verification?
        </p>
        <div className="space-y-2">
          <button
            type="button"
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={processing || loading}
          >
            Upload Business Registration Certificate
          </button>
          <button
            type="button"
            onClick={() => onVerified(false)}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={processing || loading}
          >
            Register as Individual Instead
          </button>
        </div>
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

export default BusinessVerificationStep