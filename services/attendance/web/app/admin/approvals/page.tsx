'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase, Employee } from '@/lib/supabase-config';
import ApprovalTable from '@/components/admin/ApprovalTable';
import ApprovalActions, { EmployeeUpdateData } from '@/components/admin/ApprovalActions';

export default function ApprovalsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('employee-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        () => {
          fetchEmployees();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        toast.error('Failed to fetch employees');
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (employeeData: EmployeeUpdateData) => {
    if (!selectedEmployee) return;

    try {
      setActionLoading(true);
      
      // Get current user for approved_by field
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Update employee approval status and additional data
      const updateData: Partial<Employee> = {
        approval_status: 'APPROVED',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        is_active: true,
        role: employeeData.role || selectedEmployee.role,
        join_date: employeeData.startDate || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', selectedEmployee.id);

      if (error) {
        console.error('Error approving employee:', error);
        throw error;
      }

      toast.success(`${selectedEmployee.name} has been approved successfully!`);
      setSelectedEmployee(null);
      await fetchEmployees();
    } catch (error: any) {
      console.error('Error approving employee:', error);
      toast.error(error.message || 'Failed to approve employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    if (!confirm(`Are you sure you want to reject ${employee.name}'s registration?`)) {
      return;
    }

    try {
      setActionLoading(true);
      
      // Get current user for rejected_by field
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('employees')
        .update({
          approval_status: 'REJECTED',
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId);

      if (error) {
        console.error('Error rejecting employee:', error);
        throw error;
      }

      toast.success(`${employee.name}'s registration has been rejected`);
      await fetchEmployees();
    } catch (error: any) {
      console.error('Error rejecting employee:', error);
      toast.error(error.message || 'Failed to reject employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectWithReason = async (reason?: string) => {
    if (!selectedEmployee) return;

    try {
      setActionLoading(true);
      
      // Get current user for rejected_by field
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('employees')
        .update({
          approval_status: 'REJECTED',
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason || null,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEmployee.id);

      if (error) {
        console.error('Error rejecting employee:', error);
        throw error;
      }

      toast.success(`${selectedEmployee.name}'s registration has been rejected`);
      setSelectedEmployee(null);
      await fetchEmployees();
    } catch (error: any) {
      console.error('Error rejecting employee:', error);
      toast.error(error.message || 'Failed to reject employee');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = employees.filter(emp => emp.approval_status === 'PENDING').length;
  const approvedCount = employees.filter(emp => emp.approval_status === 'APPROVED').length;
  const rejectedCount = employees.filter(emp => emp.approval_status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Approvals</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and approve employee registrations
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-4 sm:mt-0 flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <div className="text-xs text-gray-500">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <div className="text-xs text-gray-500">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <ApprovalTable
        employees={employees}
        loading={loading}
        onApprove={(employee) => setSelectedEmployee(employee)}
        onReject={handleReject}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Approval/Rejection Modal */}
      {selectedEmployee && (
        <ApprovalActions
          employee={selectedEmployee}
          onApprove={handleApprove}
          onReject={handleRejectWithReason}
          onCancel={() => setSelectedEmployee(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}