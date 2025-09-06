import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkRoleChangeDialog } from '@/components/admin/bulk-role-change-dialog';
import { RoleChangeValidator } from '@/lib/validators/role-change-validator';
import { useBulkRoleChange } from '@/hooks/use-bulk-role-change';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}));

describe('Bulk Role Change System', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    })),
    rpc: jest.fn()
  };

  beforeEach(() => {
    (createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase);
    jest.clearAllMocks();
  });

  describe('Role Change Validation', () => {
    it('should prevent users from assigning roles higher than their own', async () => {
      const validator = new RoleChangeValidator({
        currentUserRole: 'ADMIN',
        targetUsers: [{ id: '1', current_role: 'EMPLOYEE' }],
        newRole: 'MASTER_ADMIN'
      });

      const result = await validator.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot assign role higher than your own');
    });

    it('should prevent removing the last MASTER_ADMIN', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: '1', role: 'MASTER_ADMIN' }],
          error: null
        })
      });

      const validator = new RoleChangeValidator({
        currentUserRole: 'MASTER_ADMIN',
        targetUsers: [{ id: '1', current_role: 'MASTER_ADMIN' }],
        newRole: 'ADMIN'
      });

      const result = await validator.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot remove the last MASTER_ADMIN');
    });

    it('should validate organization scope restrictions', async () => {
      const validator = new RoleChangeValidator({
        currentUserRole: 'ADMIN',
        currentUserOrgId: 'org-1',
        targetUsers: [
          { id: '1', current_role: 'EMPLOYEE', organization_id: 'org-2' }
        ],
        newRole: 'MANAGER'
      });

      const result = await validator.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot change roles outside your organization');
    });

    it('should require additional authentication for privilege escalation', async () => {
      const validator = new RoleChangeValidator({
        currentUserRole: 'MASTER_ADMIN',
        targetUsers: [{ id: '1', current_role: 'EMPLOYEE' }],
        newRole: 'ADMIN',
        requiresElevation: true
      });

      const result = await validator.validate();
      
      expect(result.requiresAdditionalAuth).toBe(true);
      expect(result.authMethods).toContain('password');
      expect(result.authMethods).toContain('mfa');
    });
  });

  describe('Batch Processing', () => {
    it('should show progress during bulk role changes', async () => {
      const selectedUsers = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        current_role: 'EMPLOYEE'
      }));

      const { result } = renderHook(() => useBulkRoleChange());
      
      act(() => {
        result.current.startBulkChange(selectedUsers, 'MANAGER');
      });

      expect(result.current.progress).toBe(0);
      expect(result.current.isProcessing).toBe(true);

      // Simulate progress updates
      await waitFor(() => {
        expect(result.current.progress).toBeGreaterThan(0);
      });
    });

    it('should rollback all changes on partial failure', async () => {
      mockSupabase.rpc.mockImplementation((name) => {
        if (name === 'bulk_update_roles') {
          return Promise.reject(new Error('Partial failure on user-5'));
        }
        if (name === 'rollback_role_changes') {
          return Promise.resolve({ data: true, error: null });
        }
      });

      const { result } = renderHook(() => useBulkRoleChange());
      
      const selectedUsers = [
        { id: 'user-1', email: 'user1@example.com', current_role: 'EMPLOYEE' },
        { id: 'user-5', email: 'user5@example.com', current_role: 'EMPLOYEE' }
      ];

      await act(async () => {
        await result.current.startBulkChange(selectedUsers, 'MANAGER');
      });

      expect(result.current.error).toContain('Partial failure');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rollback_role_changes');
      expect(result.current.rollbackCompleted).toBe(true);
    });

    it('should handle concurrent role change attempts', async () => {
      mockSupabase.rpc.mockImplementation((name) => {
        if (name === 'acquire_role_change_lock') {
          return Promise.resolve({ data: false, error: null });
        }
      });

      const { result } = renderHook(() => useBulkRoleChange());
      
      await act(async () => {
        await result.current.startBulkChange(
          [{ id: 'user-1', current_role: 'EMPLOYEE' }],
          'MANAGER'
        );
      });

      expect(result.current.error).toContain('Another role change is in progress');
    });
  });

  describe('Security Confirmation', () => {
    it('should require password confirmation for privilege escalation', async () => {
      render(
        <BulkRoleChangeDialog
          selectedUsers={[{ id: '1', current_role: 'EMPLOYEE' }]}
          onClose={() => {}}
          requiresElevation={true}
        />
      );

      const roleSelect = screen.getByLabelText(/new role/i);
      await userEvent.selectOptions(roleSelect, 'ADMIN');

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      expect(screen.getByText(/password confirmation required/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enter password/i)).toBeInTheDocument();
    });

    it('should validate MFA token when required', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { user_metadata: { mfa_enabled: true } } },
        error: null
      });

      render(
        <BulkRoleChangeDialog
          selectedUsers={[{ id: '1', current_role: 'EMPLOYEE' }]}
          onClose={() => {}}
          requiresElevation={true}
        />
      );

      const roleSelect = screen.getByLabelText(/new role/i);
      await userEvent.selectOptions(roleSelect, 'ADMIN');

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      expect(screen.getByLabelText(/mfa token/i)).toBeInTheDocument();
    });

    it('should require change reason for audit log', async () => {
      render(
        <BulkRoleChangeDialog
          selectedUsers={[{ id: '1', current_role: 'EMPLOYEE' }]}
          onClose={() => {}}
        />
      );

      const reasonInput = screen.getByLabelText(/reason for change/i);
      expect(reasonInput).toBeRequired();

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
    });
  });

  describe('Audit Logging', () => {
    it('should create detailed audit log for each role change', async () => {
      const auditLogSpy = jest.spyOn(mockSupabase.from('audit_logs'), 'insert');

      const { result } = renderHook(() => useBulkRoleChange());
      
      await act(async () => {
        await result.current.startBulkChange(
          [{ id: 'user-1', current_role: 'EMPLOYEE' }],
          'MANAGER',
          'Promotion after performance review'
        );
      });

      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROLE_CHANGE',
          target_user_id: 'user-1',
          old_value: 'EMPLOYEE',
          new_value: 'MANAGER',
          reason: 'Promotion after performance review',
          ip_address: expect.any(String),
          user_agent: expect.any(String)
        })
      );
    });

    it('should detect and flag suspicious patterns', async () => {
      const { result } = renderHook(() => useBulkRoleChange());
      
      // Simulate rapid role changes
      const users = Array.from({ length: 50 }, (_, i) => ({
        id: `user-${i}`,
        current_role: 'EMPLOYEE'
      }));

      await act(async () => {
        await result.current.startBulkChange(users, 'ADMIN');
      });

      expect(result.current.securityAlert).toBe(true);
      expect(result.current.alertReason).toContain('Unusual bulk privilege escalation');
    });
  });

  describe('UI Components', () => {
    it('should display batch progress indicator', async () => {
      render(
        <BulkRoleChangeDialog
          selectedUsers={Array.from({ length: 5 }, (_, i) => ({
            id: `user-${i}`,
            current_role: 'EMPLOYEE'
          }))}
          onClose={() => {}}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/processing 0 of 5/i)).toBeInTheDocument();
    });

    it('should show detailed results after completion', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          successful: 3,
          failed: 2,
          errors: [
            { user_id: 'user-3', error: 'Insufficient permissions' },
            { user_id: 'user-4', error: 'User not found' }
          ]
        },
        error: null
      });

      render(
        <BulkRoleChangeDialog
          selectedUsers={Array.from({ length: 5 }, (_, i) => ({
            id: `user-${i}`,
            current_role: 'EMPLOYEE'
          }))}
          onClose={() => {}}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/3 successful/i)).toBeInTheDocument();
        expect(screen.getByText(/2 failed/i)).toBeInTheDocument();
        expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notification System', () => {
    it('should send notifications to affected users', async () => {
      const notificationSpy = jest.spyOn(mockSupabase.from('notifications'), 'insert');

      const { result } = renderHook(() => useBulkRoleChange());
      
      await act(async () => {
        await result.current.startBulkChange(
          [{ id: 'user-1', email: 'user1@example.com', current_role: 'EMPLOYEE' }],
          'MANAGER'
        );
      });

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          type: 'ROLE_CHANGE',
          title: 'Your role has been updated',
          message: expect.stringContaining('MANAGER')
        })
      );
    });

    it('should send email notifications for critical role changes', async () => {
      const emailSpy = jest.fn();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(() => useBulkRoleChange());
      
      await act(async () => {
        await result.current.startBulkChange(
          [{ id: 'user-1', email: 'user1@example.com', current_role: 'MANAGER' }],
          'ADMIN'
        );
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications/email',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('user1@example.com')
        })
      );
    });
  });
});