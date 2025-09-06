'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, CheckCircle, XCircle, ShieldAlert, Users, Lock } from 'lucide-react';
import { useBulkRoleChange } from '@/hooks/use-bulk-role-change';
import { RoleChangeValidator, UserRole, ValidationTarget } from '@/lib/validators/role-change-validator';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from '@/components/ui/use-toast';

interface BulkRoleChangeDialogProps {
  selectedUsers: ValidationTarget[];
  onClose: () => void;
  onComplete?: () => void;
  requiresElevation?: boolean;
}

export function BulkRoleChangeDialog({
  selectedUsers,
  onClose,
  onComplete,
  requiresElevation = false
}: BulkRoleChangeDialogProps) {
  const supabase = createClientComponentClient();
  const {
    isProcessing,
    progress,
    successful,
    failed,
    errors,
    securityAlert,
    alertReason,
    startBulkChange,
    resetState
  } = useBulkRoleChange();

  const [step, setStep] = useState<'configure' | 'validate' | 'confirm' | 'processing' | 'complete'>('configure');
  const [newRole, setNewRole] = useState<UserRole>('EMPLOYEE');
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [validation, setValidation] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  const handleValidate = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Reason for change is required',
        variant: 'destructive'
      });
      return;
    }

    setIsValidating(true);
    setStep('validate');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const validator = new RoleChangeValidator({
        currentUserRole: profile.role as UserRole,
        currentUserOrgId: profile.organization_id,
        targetUsers: selectedUsers,
        newRole
      });

      const result = await validator.validate();
      setValidation(result);

      if (result.isValid) {
        if (result.requiresAdditionalAuth) {
          setRequiresAuth(true);
          setStep('confirm');
        } else {
          setStep('confirm');
        }
      } else {
        toast({
          title: 'Validation Failed',
          description: result.errors.join(', '),
          variant: 'destructive'
        });
        setStep('configure');
      }
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: error instanceof Error ? error.message : 'Failed to validate changes',
        variant: 'destructive'
      });
      setStep('configure');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirm = async () => {
    if (requiresAuth && !password) {
      toast({
        title: 'Authentication Required',
        description: 'Please enter your password to continue',
        variant: 'destructive'
      });
      return;
    }

    setStep('processing');

    try {
      const additionalAuth = requiresAuth ? { password, mfaToken: mfaToken || undefined } : undefined;
      
      const result = await startBulkChange(
        selectedUsers,
        newRole,
        reason,
        additionalAuth
      );

      setStep('complete');
      
      if (result.success) {
        toast({
          title: 'Role Changes Complete',
          description: `Successfully updated ${result.successfulChanges.length} users`,
          variant: 'default'
        });
        onComplete?.();
      } else {
        toast({
          title: 'Partial Success',
          description: `Updated ${result.successfulChanges.length} users, ${result.failedChanges.length} failed`,
          variant: 'default'
        });
      }
    } catch (error) {
      toast({
        title: 'Role Change Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
      setStep('configure');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'MASTER_ADMIN': return 'destructive';
      case 'ADMIN': return 'default';
      case 'MANAGER': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Role Change
          </DialogTitle>
          <DialogDescription>
            Update roles for {selectedUsers.length} selected user{selectedUsers.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {securityAlert && (
          <Alert className="border-orange-200 bg-orange-50">
            <ShieldAlert className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {alertReason || 'Security alert: This action requires additional verification'}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="configure" disabled={isProcessing}>Configure</TabsTrigger>
            <TabsTrigger value="validate" disabled={!reason || isProcessing}>Validate</TabsTrigger>
            <TabsTrigger value="confirm" disabled={!validation?.isValid || isProcessing}>Confirm</TabsTrigger>
            <TabsTrigger value="processing" disabled={!isProcessing}>Processing</TabsTrigger>
            <TabsTrigger value="complete" disabled={step !== 'complete'}>Complete</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="new-role">New Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MASTER_ADMIN">Master Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Change (Required)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for this role change..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Selected Users</Label>
              <ScrollArea className="h-[150px] w-full rounded-md border p-4">
                <div className="space-y-2">
                  {selectedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <span className="text-sm">{user.email || user.id}</span>
                      <div className="flex gap-2">
                        <Badge variant={getRoleBadgeColor(user.current_role)}>
                          {user.current_role}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant={getRoleBadgeColor(newRole)}>
                          {newRole}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="validate" className="space-y-4 mt-4">
            {isValidating ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Validating role changes...</p>
              </div>
            ) : validation && (
              <div className="space-y-4">
                {validation.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validation.errors.map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validation.warnings.length > 0 && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validation.warnings.map((warning: string, i: number) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validation.isValid && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Validation successful. {validation.validatedUsers.length} users ready for role change.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="confirm" className="space-y-4 mt-4">
            {requiresAuth && (
              <Alert className="border-blue-200 bg-blue-50">
                <Lock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  This action requires additional authentication for security
                </AlertDescription>
              </Alert>
            )}

            {requiresAuth && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Enter Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {validation?.authMethods?.includes('mfa') && (
                  <div className="space-y-2">
                    <Label htmlFor="mfa-token">MFA Token</Label>
                    <Input
                      id="mfa-token"
                      type="text"
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value)}
                      placeholder="Enter 6-digit MFA code"
                      maxLength={6}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-semibold">Summary</h4>
              <div className="text-sm space-y-1">
                <p>Users to update: {validation?.validatedUsers?.length || 0}</p>
                <p>New role: <Badge variant={getRoleBadgeColor(newRole)}>{newRole}</Badge></p>
                <p>Reason: {reason}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing {selectedUsers.length} users</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
              <div className="flex justify-between text-sm">
                <span className="text-green-600">✓ {successful} successful</span>
                <span className="text-red-600">✗ {failed} failed</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="complete" className="space-y-4 mt-4">
            <div className="space-y-4">
              <Alert className={successful > 0 && failed === 0 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Role change complete: {successful} successful, {failed} failed
                </AlertDescription>
              </Alert>

              {errors.length > 0 && (
                <div className="space-y-2">
                  <Label>Failed Changes</Label>
                  <ScrollArea className="h-[150px] w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {errors.map((error, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{error.userId}:</span> {error.error}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {step === 'configure' && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleValidate} disabled={!reason.trim()}>
                Validate Changes
              </Button>
            </>
          )}

          {step === 'validate' && !isValidating && (
            <>
              <Button variant="outline" onClick={() => setStep('configure')}>Back</Button>
              {validation?.isValid && (
                <Button onClick={() => setStep('confirm')}>
                  Continue
                </Button>
              )}
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('configure')}>Back</Button>
              <Button onClick={handleConfirm} disabled={requiresAuth && !password}>
                Confirm Changes
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={onClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}