'use client';

import { useState } from 'react';
import { Employee } from '@/lib/supabase-config';

interface ApprovalActionsProps {
  employee: Employee;
  onApprove: (employeeData: EmployeeUpdateData) => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export interface EmployeeUpdateData {
  department?: string;
  position?: string;
  startDate?: string;
  role?: Employee['role'];
  notes?: string;
}

export default function ApprovalActions({
  employee,
  onApprove,
  onReject,
  onCancel,
  loading
}: ApprovalActionsProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeUpdateData>({
    startDate: new Date().toISOString().split('T')[0],
    role: 'EMPLOYEE'
  });
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    try {
      await onApprove(employeeData);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleReject = async () => {
    try {
      await onReject(rejectionReason);
    } catch (error) {
      console.error('Rejection failed:', error);
    }
  };

  if (!action) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Process Employee Registration
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              What would you like to do with <strong>{employee.name}</strong>'s registration?
            </p>
            
            {/* Employee Info */}\n            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div><span className="font-medium">Name:</span> {employee.name}</div>
                <div><span className="font-medium">Email:</span> {employee.email}</div>
                {employee.phone && (
                  <div><span className="font-medium">Phone:</span> {employee.phone}</div>
                )}
                {employee.date_of_birth && (
                  <div><span className="font-medium">Birth Date:</span> {new Date(employee.date_of_birth).toLocaleDateString()}</div>
                )}
                <div><span className="font-medium">Applied:</span> {new Date(employee.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAction('approve')}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => setAction('reject')}
                disabled={loading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (action === 'approve') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Approve Employee: {employee.name}
          </h3>
          
          <div className="space-y-4">
            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={employeeData.department || ''}
                onChange={(e) => setEmployeeData({ ...employeeData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Sales, Engineering"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <input
                type="text"
                value={employeeData.position || ''}
                onChange={(e) => setEmployeeData({ ...employeeData, position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Software Engineer, Sales Associate"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={employeeData.role}
                onChange={(e) => setEmployeeData({ ...employeeData, role: e.target.value as Employee['role'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={employeeData.startDate || ''}
                onChange={(e) => setEmployeeData({ ...employeeData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={employeeData.notes || ''}
                onChange={(e) => setEmployeeData({ ...employeeData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about the approval..."
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Approve Employee'
              )}
            </button>
            <button
              onClick={() => setAction(null)}
              disabled={loading}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:bg-gray-400 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (action === 'reject') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Reject Employee Registration
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to reject <strong>{employee.name}</strong>'s registration?
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason (Optional)
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Please provide a reason for rejection (this will be sent to the employee)..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Reject Registration'
              )}
            </button>
            <button
              onClick={() => setAction(null)}
              disabled={loading}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}