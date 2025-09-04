import React, { useState } from 'react'
import { RegistrationAPI } from '@/lib/registration/api'

interface PasswordStepProps {
  onSubmit: (password: string) => Promise<void>
  onBack: () => void
  loading: boolean
  api: RegistrationAPI
}

const PasswordStep: React.FC<PasswordStepProps> = ({
  onSubmit,
  onBack,
  loading,
  api
}) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const validatePassword = () => {
    const validation = api.validatePassword(password)
    setErrors(validation.errors)
    return validation.isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check password strength
    if (!validatePassword()) {
      return
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setErrors(['Passwords do not match'])
      return
    }

    setProcessing(true)
    setErrors([])

    try {
      await onSubmit(password)
    } catch (err: any) {
      setErrors([err.message || 'Failed to set password'])
      setProcessing(false)
    }
  }

  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[!@#$%^&*]/.test(password)) strength++

    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

    return {
      strength,
      label: labels[strength],
      color: colors[strength],
      percentage: (strength / 5) * 100
    }
  }

  const passwordStrength = getPasswordStrength()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create Your Password</h2>
        <p className="mt-2 text-sm text-gray-600">
          Choose a strong password to secure your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1 relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (e.target.value) validatePassword()
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
              placeholder="Enter your password"
              disabled={processing || loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center"
            >
              {showPassword ? (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Password Strength:</span>
                <span className={`text-xs font-medium ${
                  passwordStrength.strength <= 2 ? 'text-red-600' :
                  passwordStrength.strength === 3 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                  style={{ width: `${passwordStrength.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Re-enter your password"
            disabled={processing || loading}
            required
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
          )}
          {confirmPassword && password === confirmPassword && (
            <p className="mt-1 text-sm text-green-600">Passwords match ✓</p>
          )}
        </div>

        {/* Password Requirements */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className={password.length >= 8 ? 'text-green-600' : ''}>
              {password.length >= 8 ? '✓' : '•'} At least 8 characters
            </li>
            <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
              {/[A-Z]/.test(password) ? '✓' : '•'} One uppercase letter
            </li>
            <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
              {/[a-z]/.test(password) ? '✓' : '•'} One lowercase letter
            </li>
            <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
              {/[0-9]/.test(password) ? '✓' : '•'} One number
            </li>
            <li className={/[!@#$%^&*]/.test(password) ? 'text-green-600' : ''}>
              {/[!@#$%^&*]/.test(password) ? '✓' : '•'} One special character (!@#$%^&*)
            </li>
          </ul>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <ul className="text-sm text-red-600 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Security Tips */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Security Tips:</strong>
            <br />• Don't use personal information (name, birthdate, phone)
            <br />• Avoid common passwords like "password123"
            <br />• Use a unique password for this account
            <br />• Consider using a password manager
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!password || !confirmPassword || processing || loading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {processing ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

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

export default PasswordStep