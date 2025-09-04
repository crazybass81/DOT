import React, { useState } from 'react'
import { RegistrationAPI } from '@/lib/registration/api'

interface AgeVerificationStepProps {
  flowId: string
  api: RegistrationAPI
  onVerified: (verified: boolean) => Promise<void>
  onBack: () => void
  loading: boolean
  isTeen: boolean
}

const AgeVerificationStep: React.FC<AgeVerificationStepProps> = ({
  flowId,
  api,
  onVerified,
  onBack,
  loading,
  isTeen
}) => {
  const [verificationMethod, setVerificationMethod] = useState<'nice_api' | 'document'>('nice_api')
  const [verificationCode, setVerificationCode] = useState('')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleNiceVerification = async () => {
    setProcessing(true)
    setError('')

    try {
      // In production, this would redirect to NICE API
      // For development, we'll use mock verification
      const verified = await api.mockNiceVerification({
        flowId,
        fullName: 'Test User',
        birthDate: '1990-01-01'
      })

      if (verified) {
        await onVerified(true)
      } else {
        setError('Age verification failed. Please try another method.')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleDocumentUpload = async () => {
    if (!documentFile) {
      setError('Please upload a document')
      return
    }

    setProcessing(true)
    setError('')

    try {
      // In production, this would upload and verify the document
      // For development, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const response = await api.verifyAge({
        flowId,
        verificationType: 'document',
        verificationData: {
          documentUrl: URL.createObjectURL(documentFile)
        }
      })

      if (response.verified) {
        await onVerified(true)
      } else {
        setError('Document verification failed. Please ensure the document is clear and valid.')
      }
    } catch (err: any) {
      setError(err.message || 'Document verification failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Age Verification</h2>
        <p className="mt-2 text-sm text-gray-600">
          {isTeen 
            ? 'As you are between 15-18 years old, we need to verify your age and obtain parent consent.'
            : 'We need to verify your age to complete registration.'}
        </p>
      </div>

      {/* Verification Method Selection */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Choose Verification Method
        </label>
        
        {/* NICE API Method */}
        <div 
          className={`border rounded-lg p-4 cursor-pointer ${
            verificationMethod === 'nice_api' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200'
          }`}
          onClick={() => setVerificationMethod('nice_api')}
        >
          <div className="flex items-center">
            <input
              type="radio"
              name="verificationMethod"
              value="nice_api"
              checked={verificationMethod === 'nice_api'}
              onChange={() => setVerificationMethod('nice_api')}
              className="mr-3"
            />
            <div>
              <p className="font-medium">Online Verification (Recommended)</p>
              <p className="text-sm text-gray-600">
                Quick verification through NICE identity service
              </p>
            </div>
          </div>

          {verificationMethod === 'nice_api' && (
            <div className="mt-4">
              <button
                onClick={handleNiceVerification}
                disabled={processing || loading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {processing ? 'Verifying...' : 'Start Verification'}
              </button>
            </div>
          )}
        </div>

        {/* Document Upload Method */}
        <div 
          className={`border rounded-lg p-4 cursor-pointer ${
            verificationMethod === 'document' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200'
          }`}
          onClick={() => setVerificationMethod('document')}
        >
          <div className="flex items-center">
            <input
              type="radio"
              name="verificationMethod"
              value="document"
              checked={verificationMethod === 'document'}
              onChange={() => setVerificationMethod('document')}
              className="mr-3"
            />
            <div>
              <p className="font-medium">Document Upload</p>
              <p className="text-sm text-gray-600">
                Upload a government-issued ID or passport
              </p>
            </div>
          </div>

          {verificationMethod === 'document' && (
            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {documentFile && (
                <p className="text-sm text-gray-600">
                  Selected: {documentFile.name}
                </p>
              )}
              <button
                onClick={handleDocumentUpload}
                disabled={!documentFile || processing || loading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {processing ? 'Verifying...' : 'Upload and Verify'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Info for Teens */}
      {isTeen && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note for Teen Workers (15-18):</strong><br />
            After age verification, you'll need parent consent to continue.
            Work hours will be limited according to labor laws.
          </p>
        </div>
      )}

      {/* Buttons */}
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

export default AgeVerificationStep