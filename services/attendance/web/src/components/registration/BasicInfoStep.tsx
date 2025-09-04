import React, { useState } from 'react'
import { emailRegex, phoneRegex } from '@/lib/registration/types'

interface BasicInfoStepProps {
  onSubmit: (data: {
    email: string
    phone: string
    fullName: string
    birthDate: string
    registrationType: 'personal' | 'business_owner' | 'corporation_founder' | 'franchise_founder'
  }) => Promise<void>
  onCancel: () => void
  loading: boolean
  initialData?: any
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  onSubmit,
  onCancel,
  loading,
  initialData = {}
}) => {
  const [formData, setFormData] = useState({
    email: initialData.email || '',
    phone: initialData.phone || '',
    fullName: initialData.fullName || '',
    birthDate: initialData.birthDate || '',
    registrationType: initialData.registrationType || 'personal'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Phone number should be in format: 010-1234-5678'
    }

    if (!formData.fullName || formData.fullName.length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters'
    }

    if (!formData.birthDate) {
      newErrors.birthDate = 'Birth date is required'
    } else {
      const birthYear = new Date(formData.birthDate).getFullYear()
      const currentYear = new Date().getFullYear()
      const age = currentYear - birthYear
      
      if (age < 15) {
        newErrors.birthDate = 'Must be at least 15 years old to register'
      }
      
      if (age > 100) {
        newErrors.birthDate = 'Please enter a valid birth date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    await onSubmit(formData)
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Start by entering your basic information
        </p>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.email 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
          placeholder="you@example.com"
          disabled={loading}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.phone 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
          placeholder="010-1234-5678"
          maxLength={13}
          disabled={loading}
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
        )}
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          type="text"
          id="fullName"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.fullName 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
          placeholder="John Doe"
          disabled={loading}
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
        )}
      </div>

      {/* Birth Date */}
      <div>
        <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
          Date of Birth
        </label>
        <input
          type="date"
          id="birthDate"
          value={formData.birthDate}
          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.birthDate 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
          max={new Date().toISOString().split('T')[0]}
          disabled={loading}
        />
        {errors.birthDate && (
          <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
        )}
      </div>

      {/* Registration Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Registration Type
        </label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="registrationType"
              value="personal"
              checked={formData.registrationType === 'personal'}
              onChange={(e) => setFormData({ ...formData, registrationType: e.target.value as any })}
              className="mr-2"
              disabled={loading}
            />
            <span>Personal (Worker/Employee)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="registrationType"
              value="business_owner"
              checked={formData.registrationType === 'business_owner'}
              onChange={(e) => setFormData({ ...formData, registrationType: e.target.value as any })}
              className="mr-2"
              disabled={loading}
            />
            <span>Business Owner</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="registrationType"
              value="corporation_founder"
              checked={formData.registrationType === 'corporation_founder'}
              onChange={(e) => setFormData({ ...formData, registrationType: e.target.value as any })}
              className="mr-2"
              disabled={loading}
            />
            <span>Corporation Founder</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="registrationType"
              value="franchise_founder"
              checked={formData.registrationType === 'franchise_founder'}
              onChange={(e) => setFormData({ ...formData, registrationType: e.target.value as any })}
              className="mr-2"
              disabled={loading}
            />
            <span>Franchise Founder</span>
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </form>
  )
}

export default BasicInfoStep