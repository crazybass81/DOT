// Audit Logging Module
interface AuditLogEntry {
  action: string
  userId: string
  resourceId?: string
  organizationId?: string
  error?: string
  metadata?: any
  ipAddress?: string
  userAgent?: string | null
}

/**
 * Create audit log entry
 */
export async function auditLog(supabase: any, entry: AuditLogEntry): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      organization_id: entry.organizationId,
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.action.split('.')[0], // Extract resource type from action
      resource_id: entry.resourceId,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      metadata: entry.metadata || {},
      error_message: entry.error,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    // Log to console if audit log fails - don't break the main flow
    console.error('Audit log failed:', error, entry)
  }
}