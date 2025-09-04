import React, { useState, useEffect } from 'react'
import { RegistrationAPI } from '@/lib/registration/api'
import { Organization } from '@/lib/registration/types'

interface RoleSelectionStepProps {
  flowId: string
  api: RegistrationAPI
  registrationType?: string
  onRoleSelected: (role: string, organizationCode?: string) => Promise<void>
  onBack: () => void
  loading: boolean
}

const RoleSelectionStep: React.FC<RoleSelectionStepProps> = ({
  flowId,
  api,
  registrationType,
  onRoleSelected,
  onBack,
  loading
}) => {
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [joinMethod, setJoinMethod] = useState<'create' | 'join'>('join')
  const [organizationCode, setOrganizationCode] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load available organizations
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const orgs = await api.getOrganizations()
      setOrganizations(orgs)
    } catch (err) {
      console.error('Failed to load organizations:', err)
    }
  }

  const getRoleOptions = () => {
    if (registrationType === 'business_owner' || registrationType === 'corporation_founder') {
      return [
        { value: 'master', label: 'Master Admin', description: 'Full control over organization' },
        { value: 'admin', label: 'Admin', description: 'Manage employees and settings' }
      ]
    }
    
    if (registrationType === 'franchise_founder') {
      return [
        { value: 'master', label: 'Franchise Master', description: 'Manage franchise network' },
        { value: 'franchise_staff', label: 'Franchise Staff', description: 'Support franchise operations' }
      ]
    }

    // Personal registration
    return [
      { value: 'worker', label: 'Worker/Employee', description: 'Record attendance and view schedules' },
      { value: 'manager', label: 'Manager', description: 'Manage team schedules and attendance' },
      { value: 'admin', label: 'Admin', description: 'Full administrative access (requires approval)' }
    ]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRole) {
      setError('Please select a role')
      return
    }

    if (joinMethod === 'join' && !organizationCode) {
      setError('Please enter an organization code or select from the list')
      return
    }

    if (joinMethod === 'create' && !newOrgName) {
      setError('Please enter a name for your organization')
      return
    }

    setProcessing(true)
    setError('')

    try {
      let finalOrgCode = organizationCode

      if (joinMethod === 'create') {
        // For business owners creating new organization
        // The Edge Function will handle organization creation
        finalOrgCode = undefined // Will be created by the backend
      }

      await onRoleSelected(selectedRole, finalOrgCode)
    } catch (err: any) {
      setError(err.message || 'Failed to select role')
      setProcessing(false)
    }
  }

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const roleOptions = getRoleOptions()
  const showOrgSelection = selectedRole && selectedRole !== 'master'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select Your Role</h2>
        <p className="mt-2 text-sm text-gray-600">
          Choose your role in the organization
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Choose Your Role
          </label>
          {roleOptions.map((role) => (
            <div
              key={role.value}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedRole === role.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedRole(role.value)}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{role.label}</p>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Organization Selection (for non-master roles) */}
        {showOrgSelection && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Organization
            </label>

            {/* Join Method Selection */}
            {(registrationType === 'business_owner' || registrationType === 'corporation_founder') && (
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="joinMethod"
                    value="create"
                    checked={joinMethod === 'create'}
                    onChange={(e) => setJoinMethod(e.target.value as any)}
                    className="mr-2"
                  />
                  <span>Create New Organization</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="joinMethod"
                    value="join"
                    checked={joinMethod === 'join'}
                    onChange={(e) => setJoinMethod(e.target.value as any)}
                    className="mr-2"
                  />
                  <span>Join Existing</span>
                </label>
              </div>
            )}

            {/* Create New Organization */}
            {joinMethod === 'create' && (
              <div>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your organization name"
                  disabled={processing || loading}
                />
              </div>
            )}

            {/* Join Existing Organization */}
            {joinMethod === 'join' && (
              <>
                <div>
                  <input
                    type="text"
                    value={organizationCode}
                    onChange={(e) => setOrganizationCode(e.target.value.toUpperCase())}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter organization code (e.g., ABC123XY)"
                    maxLength={8}
                    disabled={processing || loading}
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    Ask your organization admin for the 8-character code
                  </p>
                </div>

                {/* Organization Search */}
                <div>
                  <p className="text-sm text-gray-700 mb-2">Or search for your organization:</p>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by name..."
                    disabled={processing || loading}
                  />
                  
                  {searchTerm && filteredOrganizations.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                      {filteredOrganizations.map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            setOrganizationCode(org.code)
                            setSearchTerm('')
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-xs text-gray-600">Code: {org.code}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Role-specific Information */}
        {selectedRole && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {selectedRole === 'master' && (
                <>
                  <strong>Master Admin:</strong> You'll have full control over your organization,
                  including managing employees, settings, and billing.
                </>
              )}
              {selectedRole === 'admin' && (
                <>
                  <strong>Admin:</strong> You'll be able to manage employees, schedules, and
                  most organizational settings. Master admin approval may be required.
                </>
              )}
              {selectedRole === 'manager' && (
                <>
                  <strong>Manager:</strong> You'll manage team schedules, approve time-off requests,
                  and view team attendance reports.
                </>
              )}
              {selectedRole === 'worker' && (
                <>
                  <strong>Worker:</strong> You'll be able to clock in/out, view your schedule,
                  and request time off.
                </>
              )}
              {selectedRole === 'franchise_staff' && (
                <>
                  <strong>Franchise Staff:</strong> You'll support franchise operations and
                  have access to franchise-wide tools and reports.
                </>
              )}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedRole || processing || loading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {processing ? 'Processing...' : 'Continue'}
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

export default RoleSelectionStep