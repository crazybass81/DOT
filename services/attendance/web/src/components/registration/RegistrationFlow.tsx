import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RegistrationAPI } from '@/lib/registration/api'
import { RegistrationFlowData, calculateAge } from '@/lib/registration/types'
import BasicInfoStep from './BasicInfoStep'
import AgeVerificationStep from './AgeVerificationStep'
import ParentConsentStep from './ParentConsentStep'
import BusinessVerificationStep from './BusinessVerificationStep'
import RoleSelectionStep from './RoleSelectionStep'
import PasswordStep from './PasswordStep'
import CompletionStep from './CompletionStep'

interface RegistrationFlowProps {
  supabaseUrl: string
  supabaseAnonKey: string
}

export type RegistrationStep = 
  | 'basic_info'
  | 'age_verification'
  | 'parent_consent'
  | 'business_verification'
  | 'role_selection'
  | 'password'
  | 'completion'

const RegistrationFlow: React.FC<RegistrationFlowProps> = ({
  supabaseUrl,
  supabaseAnonKey,
}) => {
  const router = useRouter()
  const [api] = useState(() => new RegistrationAPI(supabaseUrl, supabaseAnonKey))
  
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('basic_info')
  const [flowId, setFlowId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [flowData, setFlowData] = useState<Partial<RegistrationFlowData>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load saved flow from localStorage
  useEffect(() => {
    const savedFlow = localStorage.getItem('registration_flow')
    if (savedFlow) {
      const parsed = JSON.parse(savedFlow)
      setFlowId(parsed.flowId)
      setSessionId(parsed.sessionId)
      setFlowData(parsed.flowData)
      setCurrentStep(parsed.currentStep)
    }
  }, [])

  // Save flow to localStorage
  useEffect(() => {
    if (flowId) {
      localStorage.setItem('registration_flow', JSON.stringify({
        flowId,
        sessionId,
        flowData,
        currentStep,
      }))
    }
  }, [flowId, sessionId, flowData, currentStep])

  const handleBasicInfoSubmit = async (data: {
    email: string
    phone: string
    fullName: string
    birthDate: string
    registrationType: 'personal' | 'business_owner' | 'corporation_founder' | 'franchise_founder'
  }) => {
    setLoading(true)
    setError(null)

    try {
      // Check availability first
      const availability = await api.checkAvailability(data.email, data.phone)
      
      if (!availability.emailAvailable) {
        setError('This email is already registered')
        setLoading(false)
        return
      }
      
      if (!availability.phoneAvailable) {
        setError('This phone number is already registered')
        setLoading(false)
        return
      }

      // Start registration flow
      const response = await api.startRegistration(data)
      
      if (!response.success) {
        setError(response.error || 'Registration failed')
        setLoading(false)
        return
      }

      setFlowId(response.flowId)
      setSessionId(response.sessionId)
      setFlowData({
        ...data,
        age: calculateAge(data.birthDate),
        requiresParentConsent: response.requiresParentConsent,
      })

      // Determine next step
      if (response.requiresParentConsent) {
        setCurrentStep('parent_consent')
      } else {
        setCurrentStep('age_verification')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAgeVerification = async (verified: boolean) => {
    if (!verified) {
      setError('Age verification failed')
      return
    }

    setFlowData(prev => ({ ...prev, ageVerified: true }))

    // Determine next step based on registration type
    if (flowData.registrationType === 'business_owner') {
      setCurrentStep('business_verification')
    } else {
      setCurrentStep('role_selection')
    }
  }

  const handleParentConsent = async (consented: boolean) => {
    if (!consented) {
      setError('Parent consent is required for registration')
      return
    }

    setFlowData(prev => ({
      ...prev,
      parentConsent: {
        parentName: '',
        parentPhone: '',
        consentedAt: new Date(),
      },
    }))

    setCurrentStep('age_verification')
  }

  const handleBusinessVerification = async (verified: boolean, businessData?: any) => {
    if (!verified) {
      setError('Business verification failed')
      return
    }

    setFlowData(prev => ({
      ...prev,
      businessVerified: true,
      businessNumber: businessData?.businessNumber,
      businessName: businessData?.businessName,
    }))

    setCurrentStep('role_selection')
  }

  const handleRoleSelection = async (role: string, organizationCode?: string) => {
    setFlowData(prev => ({
      ...prev,
      roleType: role as any,
      organizationCode,
    }))

    setCurrentStep('password')
  }

  const handlePasswordSubmit = async (password: string) => {
    if (!flowId) {
      setError('Registration flow not found')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.completeRegistration({
        flowId,
        password,
      })

      if (!response.success) {
        setError(response.error || 'Registration failed')
        setLoading(false)
        return
      }

      setFlowData(prev => ({
        ...prev,
        accountId: response.accountId,
        authUserId: response.authUserId,
      }))

      setCurrentStep('completion')
      
      // Clear localStorage
      localStorage.removeItem('registration_flow')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompletion = () => {
    router.push('/dashboard')
  }

  const handleBack = () => {
    const stepOrder: RegistrationStep[] = [
      'basic_info',
      'parent_consent',
      'age_verification',
      'business_verification',
      'role_selection',
      'password',
      'completion',
    ]

    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  const handleCancel = async () => {
    if (flowId) {
      await api.cancelRegistration(flowId)
    }
    localStorage.removeItem('registration_flow')
    router.push('/')
  }

  // Progress indicator
  const getProgress = () => {
    const steps = [
      'basic_info',
      flowData.requiresParentConsent ? 'parent_consent' : null,
      'age_verification',
      flowData.registrationType === 'business_owner' ? 'business_verification' : null,
      'role_selection',
      'password',
      'completion',
    ].filter(Boolean)

    const currentIndex = steps.indexOf(currentStep)
    return ((currentIndex + 1) / steps.length) * 100
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="relative">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div
                style={{ width: `${getProgress()}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step Components */}
        <div className="bg-white shadow rounded-lg p-6">
          {currentStep === 'basic_info' && (
            <BasicInfoStep
              onSubmit={handleBasicInfoSubmit}
              onCancel={handleCancel}
              loading={loading}
              initialData={flowData}
            />
          )}

          {currentStep === 'age_verification' && flowId && (
            <AgeVerificationStep
              flowId={flowId}
              api={api}
              onVerified={handleAgeVerification}
              onBack={handleBack}
              loading={loading}
              isTeen={flowData.requiresParentConsent || false}
            />
          )}

          {currentStep === 'parent_consent' && flowId && (
            <ParentConsentStep
              flowId={flowId}
              api={api}
              onConsent={handleParentConsent}
              onBack={handleBack}
              loading={loading}
            />
          )}

          {currentStep === 'business_verification' && flowId && (
            <BusinessVerificationStep
              flowId={flowId}
              api={api}
              onVerified={handleBusinessVerification}
              onBack={handleBack}
              loading={loading}
            />
          )}

          {currentStep === 'role_selection' && flowId && (
            <RoleSelectionStep
              flowId={flowId}
              api={api}
              registrationType={flowData.registrationType}
              onRoleSelected={handleRoleSelection}
              onBack={handleBack}
              loading={loading}
            />
          )}

          {currentStep === 'password' && (
            <PasswordStep
              onSubmit={handlePasswordSubmit}
              onBack={handleBack}
              loading={loading}
              api={api}
            />
          )}

          {currentStep === 'completion' && (
            <CompletionStep
              accountData={flowData}
              onComplete={handleCompletion}
            />
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="/support" className="font-medium text-blue-600 hover:text-blue-500">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegistrationFlow