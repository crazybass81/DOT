# 🔐 Security Implementation Guide - Phase 3.3.2

## Critical Security Fixes Required

### ⚠️ IMMEDIATE ACTION REQUIRED

The security audit has identified **CRITICAL vulnerabilities** that must be fixed before production deployment.

---

## 🚨 Priority 1: Critical Fixes (24 Hours)

### 1. Fix MASTER_ADMIN Authorization

**File**: `/app/api/master-admin/users/bulk-role-change/route.ts`

**Current (VULNERABLE)**:
```typescript
if (!['ADMIN', 'MASTER_ADMIN'].includes(profile.role)) {
```

**Fixed (SECURE)**:
```typescript
import { requireMasterAdminOnly } from '@/security-patches/critical-fixes';

// In your route handler:
const authCheck = await requireMasterAdminOnly(request, user);
if (authCheck) return authCheck; // Returns 403 if not MASTER_ADMIN
```

### 2. Implement Input Sanitization

**Every API Route Must Add**:
```typescript
import { sanitizeAndValidateRoleChange } from '@/security-patches/critical-fixes';

// Before processing any user input:
try {
  const validatedData = sanitizeAndValidateRoleChange(body);
  // Use validatedData instead of raw body
} catch (error) {
  return NextResponse.json({ error: error.message }, { status: 400 });
}
```

### 3. Add Rate Limiting

**Add to All Sensitive Operations**:
```typescript
import { checkRateLimit } from '@/security-patches/critical-fixes';

// At the start of your handler:
const rateLimitCheck = await checkRateLimit(user.id, 'bulk-role-change');
if (!rateLimitCheck.allowed) {
  return NextResponse.json(
    { 
      error: 'Too many requests', 
      retryAfter: rateLimitCheck.retryAfter 
    }, 
    { status: 429 }
  );
}
```

---

## 🔧 Priority 2: High-Priority Fixes (72 Hours)

### 1. Session Invalidation on Role Changes

**Add After Any Role Change**:
```typescript
import { invalidateUserSessions } from '@/security-patches/critical-fixes';

// After successful role change:
for (const userId of affectedUserIds) {
  await invalidateUserSessions(userId, 'Role changed');
}
```

### 2. CSRF Protection

**Add to All State-Changing Operations**:
```typescript
import { generateCSRFToken, validateCSRFToken } from '@/security-patches/critical-fixes';

// Generate token on page load:
const csrfToken = generateCSRFToken(sessionId);

// Validate on submission:
if (!validateCSRFToken(sessionId, request.headers.get('X-CSRF-Token'))) {
  return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
}
```

### 3. PII Data Masking

**Apply to All API Responses**:
```typescript
import { maskSensitiveData } from '@/security-patches/critical-fixes';

// Before sending response:
const maskedData = maskSensitiveData(userData);
return NextResponse.json(maskedData);
```

---

## 📋 Implementation Checklist

### For Each API Endpoint:

- [ ] Add MASTER_ADMIN check (if applicable)
- [ ] Implement input validation
- [ ] Add rate limiting
- [ ] Mask PII in responses
- [ ] Add CSRF protection
- [ ] Implement audit logging
- [ ] Add error handling
- [ ] Test with security script

### For Frontend Components:

- [ ] Never trust user input
- [ ] Sanitize all displayed data
- [ ] Add CSRF tokens to forms
- [ ] Implement proper error handling
- [ ] Remove console.logs with sensitive data

---

## 🧪 Testing Your Implementation

### 1. Run Security Tests

```bash
cd /home/ec2-user/DOT/services/attendance/web
chmod +x security-patches/security-test.sh
./security-patches/security-test.sh
```

### 2. Manual Testing Checklist

```bash
# Test 1: SQL Injection
curl -X POST [endpoint] -d '{"id": "1 OR 1=1--"}'
# Should return: Validation error

# Test 2: XSS
curl -X POST [endpoint] -d '{"name": "<script>alert(1)</script>"}'
# Should return: Sanitized value

# Test 3: Authorization
curl -X POST [master-admin-endpoint] -H "Authorization: Bearer [ADMIN_TOKEN]"
# Should return: 403 Forbidden

# Test 4: Rate Limiting
for i in {1..10}; do curl -X POST [endpoint]; done
# Should block after 5 requests
```

---

## 🚀 Deployment Checklist

### Before Production:

1. **Security Patches Applied**
   - [ ] All critical fixes implemented
   - [ ] High-priority fixes completed
   - [ ] Security tests passing

2. **Environment Variables**
   ```env
   JWT_SECRET=<strong-random-secret>
   ENCRYPTION_KEY=<32-byte-key>
   RATE_LIMIT_ENABLED=true
   AUDIT_LOG_ENABLED=true
   ```

3. **Database Security**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
   
   -- Revoke unnecessary permissions
   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
   ```

4. **Monitoring Setup**
   - [ ] Security alerts configured
   - [ ] Audit logs streaming
   - [ ] Rate limit monitoring
   - [ ] Error tracking enabled

---

## 📊 Security Metrics to Monitor

### Real-time Alerts Required For:

1. **Failed Authentication** > 5 attempts/minute
2. **Role Escalation Attempts** (any)
3. **Rate Limit Violations** > 10/hour
4. **SQL Injection Attempts** (any)
5. **XSS Attempts** (any)
6. **Unauthorized Access** (403 errors) > 20/hour

### Daily Security Reports:

- Total authentication attempts
- Failed login attempts by user
- Role changes performed
- Audit log analysis
- API error rates
- Performance metrics

---

## 🆘 Emergency Response

### If Security Incident Detected:

1. **Immediate Actions**:
   ```bash
   # Block affected user
   UPDATE profiles SET is_active = false WHERE id = 'affected_user_id';
   
   # Invalidate all sessions
   DELETE FROM sessions WHERE user_id = 'affected_user_id';
   
   # Alert security team
   curl -X POST [alert_webhook] -d '{"severity": "CRITICAL", "incident": "..."}'
   ```

2. **Investigation**:
   - Check audit logs
   - Review recent changes
   - Analyze access patterns
   - Document findings

3. **Recovery**:
   - Apply security patches
   - Reset affected credentials
   - Notify affected users
   - Post-mortem analysis

---

## 📚 Security Resources

### Documentation:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GDPR Compliance](https://gdpr.eu/checklist/)
- [SOX Compliance](https://www.sox-law.com/)

### Tools:
- **SAST**: SonarQube, Checkmarx
- **DAST**: OWASP ZAP, Burp Suite
- **Dependencies**: Snyk, npm audit

### Contacts:
- Security Team: security@company.com
- Emergency: +1-XXX-XXX-XXXX
- On-call: [PagerDuty Link]

---

## ⚡ Quick Reference

### Common Security Headers:
```typescript
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-XSS-Protection': '1; mode=block'
};
```

### Validation Patterns:
```typescript
const patterns = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  role: /^(EMPLOYEE|MANAGER|ADMIN|MASTER_ADMIN)$/
};
```

---

**Remember**: Security is not optional. Every vulnerability is a potential data breach.

**Last Updated**: 2025-09-06  
**Next Security Review**: 2025-09-13