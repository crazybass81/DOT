import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RoleChangeValidator, UserRole, ValidationTarget } from '@/lib/validators/role-change-validator';
import { toast } from '@/components/ui/use-toast';

export interface BulkRoleChangeState {
  isProcessing: boolean;
  progress: number;
  totalUsers: number;
  processedUsers: number;
  successful: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
  rollbackCompleted: boolean;
  securityAlert: boolean;
  alertReason: string | null;
  error: string | null;
}

export interface BulkRoleChangeResult {
  success: boolean;
  successfulChanges: string[];
  failedChanges: Array<{ userId: string; reason: string }>;
  rollbackRequired: boolean;
  auditLogIds: string[];
}

export function useBulkRoleChange() {
  const supabase = createClientComponentClient();
  const [state, setState] = useState<BulkRoleChangeState>({
    isProcessing: false,
    progress: 0,
    totalUsers: 0,
    processedUsers: 0,
    successful: 0,
    failed: 0,
    errors: [],
    rollbackCompleted: false,
    securityAlert: false,
    alertReason: null,
    error: null
  });

  const resetState = useCallback(() => {
    setState({
      isProcessing: false,
      progress: 0,
      totalUsers: 0,
      processedUsers: 0,
      successful: 0,
      failed: 0,
      errors: [],
      rollbackCompleted: false,
      securityAlert: false,
      alertReason: null,
      error: null
    });
  }, []);

  const startBulkChange = useCallback(async (
    users: ValidationTarget[],
    newRole: UserRole,
    reason?: string,
    additionalAuth?: { password?: string; mfaToken?: string }
  ): Promise<BulkRoleChangeResult> => {
    resetState();
    
    setState(prev => ({
      ...prev,
      isProcessing: true,
      totalUsers: users.length
    }));

    try {
      // Get current user info
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', currentUser.id)
        .single();

      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      // Validate the changes
      const validator = new RoleChangeValidator({
        currentUserRole: currentProfile.role as UserRole,
        currentUserOrgId: currentProfile.organization_id,
        targetUsers: users,
        newRole
      });

      const validation = await validator.validate();
      
      if (!validation.isValid) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: validation.errors.join(', ')
        }));
        throw new Error(validation.errors.join(', '));
      }

      // Check for security alerts
      if (validation.warnings.some(w => w.includes('Unusual'))) {
        setState(prev => ({
          ...prev,
          securityAlert: true,
          alertReason: validation.warnings.find(w => w.includes('Unusual')) || null
        }));
      }

      // Verify additional authentication if required
      if (validation.requiresAdditionalAuth && !additionalAuth) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: 'Additional authentication required'
        }));
        throw new Error('Additional authentication required');
      }

      // Acquire lock to prevent concurrent changes
      const lockAcquired = await validator.acquireLock(currentUser.id);
      if (!lockAcquired) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: 'Another role change is in progress'
        }));
        throw new Error('Another role change is in progress');
      }

      try {
        // Prepare batch update data
        const batchData = validation.validatedUsers.map(user => ({
          user_id: user.id,
          old_role: user.current_role,
          new_role: newRole,
          changed_by: currentUser.id,
          reason: reason || 'No reason provided',
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent
        }));

        // Execute bulk role change with transaction
        const { data: result, error: updateError } = await supabase.rpc('bulk_update_roles', {
          changes: batchData,
          require_transaction: true
        });

        if (updateError) {
          // Attempt rollback
          await rollbackChanges(batchData.map(d => d.user_id));
          setState(prev => ({
            ...prev,
            rollbackCompleted: true,
            error: `Partial failure: ${updateError.message}`
          }));
          throw new Error(`Partial failure: ${updateError.message}`);
        }

        // Update progress as changes are processed
        const successfulChanges: string[] = [];
        const failedChanges: Array<{ userId: string; reason: string }> = [];
        
        for (let i = 0; i < batchData.length; i++) {
          const change = batchData[i];
          
          // Simulate progress (in production, this would be real-time updates)
          setState(prev => ({
            ...prev,
            processedUsers: i + 1,
            progress: ((i + 1) / batchData.length) * 100
          }));

          // Check individual result
          if (result?.processed?.[change.user_id]?.success) {
            successfulChanges.push(change.user_id);
            setState(prev => ({ ...prev, successful: prev.successful + 1 }));
            
            // Send notification to user
            await sendRoleChangeNotification(change.user_id, change.old_role, newRole);
          } else {
            failedChanges.push({
              userId: change.user_id,
              reason: result?.processed?.[change.user_id]?.error || 'Unknown error'
            });
            setState(prev => ({ 
              ...prev, 
              failed: prev.failed + 1,
              errors: [...prev.errors, {
                userId: change.user_id,
                error: result?.processed?.[change.user_id]?.error || 'Unknown error'
              }]
            }));
          }

          // Add small delay for UI updates
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Create audit logs
        const auditLogIds = await createAuditLogs(batchData, successfulChanges);

        // Send summary notification to admin
        await sendAdminSummaryNotification(successfulChanges.length, failedChanges.length);

        setState(prev => ({
          ...prev,
          isProcessing: false,
          progress: 100
        }));

        return {
          success: failedChanges.length === 0,
          successfulChanges,
          failedChanges,
          rollbackRequired: false,
          auditLogIds
        };

      } finally {
        // Always release lock
        await validator.releaseLock();
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));

      toast({
        title: 'Role Change Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });

      throw error;
    }
  }, [supabase, resetState]);

  const rollbackChanges = async (userIds: string[]): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('rollback_role_changes', {
        user_ids: userIds,
        rollback_window_minutes: 5
      });

      if (error) {
        console.error('Rollback failed:', error);
        return false;
      }

      toast({
        title: 'Changes Rolled Back',
        description: 'All role changes have been reverted',
        variant: 'default'
      });

      return true;
    } catch (error) {
      console.error('Rollback error:', error);
      return false;
    }
  };

  const sendRoleChangeNotification = async (
    userId: string,
    oldRole: string,
    newRole: string
  ): Promise<void> => {
    try {
      // In-app notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'ROLE_CHANGE',
        title: 'Your role has been updated',
        message: `Your role has been changed from ${oldRole} to ${newRole}`,
        created_at: new Date().toISOString()
      });

      // Email notification for critical changes
      if (newRole === 'ADMIN' || newRole === 'MASTER_ADMIN') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();

        if (profile?.email) {
          await fetch('/api/notifications/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: profile.email,
              subject: 'Important: Your role has been updated',
              template: 'role-change',
              data: { oldRole, newRole }
            })
          });
        }
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const sendAdminSummaryNotification = async (
    successful: number,
    failed: number
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'BULK_OPERATION_COMPLETE',
        title: 'Bulk Role Change Complete',
        message: `Successfully updated ${successful} users. ${failed} failures.`,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send admin notification:', error);
    }
  };

  const createAuditLogs = async (
    changes: any[],
    successfulIds: string[]
  ): Promise<string[]> => {
    try {
      const logs = changes
        .filter(c => successfulIds.includes(c.user_id))
        .map(change => ({
          action: 'ROLE_CHANGE',
          actor_id: change.changed_by,
          target_user_id: change.user_id,
          old_value: change.old_role,
          new_value: change.new_role,
          reason: change.reason,
          ip_address: change.ip_address,
          user_agent: change.user_agent,
          created_at: new Date().toISOString()
        }));

      const { data, error } = await supabase
        .from('audit_logs')
        .insert(logs)
        .select('id');

      if (error) {
        console.error('Failed to create audit logs:', error);
        return [];
      }

      return data.map(log => log.id);
    } catch (error) {
      console.error('Audit log error:', error);
      return [];
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  return {
    ...state,
    startBulkChange,
    rollbackChanges,
    resetState
  };
}