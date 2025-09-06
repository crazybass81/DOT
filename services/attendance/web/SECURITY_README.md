# 🔒 DOT Attendance Security System

## Overview
This document describes the comprehensive security systems implemented to protect the DOT attendance management system against DoS attacks and PII exposure.

## Quick Start

### 1. Verify Security Systems
```bash
# Run security verification script
npm run verify-security

# Or directly
node scripts/verify-security.js
```

### 2. Monitor Security Metrics
Access the security dashboard at: `http://localhost:3002/admin/security`

Or via API: 
```bash
curl http://localhost:3002/api/security/metrics
```

### 3. Emergency Response
In case of active attack:
```bash
# Activate emergency mode
curl -X POST http://localhost:3002/api/security/metrics \
  -H "Content-Type: application/json" \
  -d '{"action": "ACTIVATE_EMERGENCY_MODE"}'
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Request                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Security Middleware                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │            1. IP Blacklist Check                  │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │            2. DDoS Detection                      │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │            3. Rate Limiting                       │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │            4. SQL Injection Check                 │  │
│  └──────────────────┬───────────────────────────────┘  │
└────────────────────┼────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  API Route Handler                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  PII Masking Layer                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │         5. Detect Sensitive Data                  │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │         6. Apply Masking Rules                    │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │         7. Audit Logging                          │  │
│  └──────────────────┬───────────────────────────────┘  │
└────────────────────┼────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Response with Security Headers           │
└──────────────────────────────────────────────────────────┘
```

## Rate Limiting Rules

| API Type | Limit | Window | Scope |
|----------|-------|--------|-------|
| General API | 100 req | 1 min | Per IP |
| Search API | 50 req | 1 min | Per IP |
| Auth API | 10 req | 1 min | Per IP |
| Master Admin | 20 req | 1 min | Per User |
| Bulk Operations | 5 req | 1 min | Per User |

### Progressive Penalties
1. **First Violation**: Warning logged
2. **Second Violation**: 5-minute temporary block
3. **Third Violation**: 1-hour extended block
4. **Fourth Violation**: Permanent blacklist

## PII Masking Patterns

| Data Type | Original | Masked |
|-----------|----------|--------|
| Email | john.doe@example.com | john****@example.com |
| Phone (KR) | 010-1234-5678 | 010-****-5678 |
| Phone (Intl) | +1-555-123-4567 | +1-555-***-4567 |
| Address | 서울시 강남구 테헤란로 | 서울시 ***구 *** |
| Business № | 123-45-67890 | 123-**-***** |
| Personal Notes | Salary: $100,000 | [REDACTED] |

## Compliance Features

### GDPR (EU)
- ✅ Article 17: Right to erasure
- ✅ Article 20: Data portability
- ✅ Article 32: Security of processing
- ✅ Article 33: Breach notification

### CCPA (California)
- ✅ Right to know
- ✅ Right to delete
- ✅ Right to opt-out
- ✅ Non-discrimination

### Audit Requirements
- 7-year retention period
- Immutable audit logs
- PII access tracking
- Compliance reporting

## API Endpoints

### Security Metrics
```http
GET /api/security/metrics
```

Response:
```json
{
  "rateLimiting": {
    "totalRequests": 12345,
    "blockedRequests": 23,
    "currentThreatLevel": "LOW"
  },
  "ddosProtection": {
    "status": "IDLE",
    "attacksDetected": 0,
    "blockedIPs": 5
  },
  "piiMasking": {
    "complianceStatus": "COMPLIANT",
    "fieldsProtected": 1234
  }
}
```

### Security Controls
```http
POST /api/security/metrics
Content-Type: application/json

{
  "action": "WHITELIST_IP",
  "ip": "192.168.1.100"
}
```

## Testing

### Unit Tests
```bash
# Test rate limiting
npm test -- tests/security/rate-limiting-dos.test.ts

# Test PII masking
npm test -- tests/security/pii-masking.test.ts

# Test all security features
npm run test:security
```

### Integration Tests
```bash
# Test with real requests
npm run test:integration

# Test compliance features
npm run test:compliance
```

### Load Testing
```bash
# Simulate DDoS attack (test environment only!)
npm run test:ddos-simulation

# Test rate limiting under load
npm run test:rate-limit-load
```

## Monitoring

### Key Metrics to Watch
1. **Rate Limit Hit Rate**: Should be <5% under normal conditions
2. **PII Fields Masked**: Track volume for compliance
3. **Threat Level Changes**: Alert on MEDIUM or higher
4. **Blocked IPs**: Review for false positives
5. **Audit Log Size**: Monitor storage usage

### Alert Thresholds
- Rate limit violations > 10/min → Investigation required
- DDoS status = MONITORING → Alert security team
- Threat level = HIGH → Immediate response
- Compliance violations > 0 → Legal team notification

## Troubleshooting

### Common Issues

#### High False Positive Rate
```bash
# Review blocked IPs
curl http://localhost:3002/api/security/blocked-ips

# Whitelist legitimate IP
curl -X POST http://localhost:3002/api/security/whitelist \
  -d '{"ip": "legitimate.ip.address"}'
```

#### Performance Degradation
```bash
# Check system metrics
curl http://localhost:3002/api/security/performance

# Adjust rate limits if needed
export RATE_LIMIT_GENERAL=200  # Increase limit
```

#### PII Leakage
```bash
# Run PII scan
npm run security:scan-pii

# Update masking patterns
npm run security:update-patterns
```

## Best Practices

### Development
1. Always test with security middleware enabled
2. Use test IPs for rate limit testing
3. Never commit real PII data
4. Review security logs daily

### Production
1. Use Redis for distributed rate limiting
2. Enable all security features
3. Monitor metrics continuously
4. Maintain IP whitelist for internal services
5. Regular security audits (monthly)
6. Update masking patterns quarterly

### Incident Response
1. **Detect**: Monitor alerts and metrics
2. **Contain**: Activate emergency mode if needed
3. **Investigate**: Review audit logs
4. **Remediate**: Block malicious IPs
5. **Document**: Create incident report
6. **Review**: Update security policies

## Configuration

### Environment Variables
```env
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# PII Masking
PII_MASKING_ENABLED=true
PII_AUDIT_LOGGING=true
PII_RETENTION_YEARS=7

# DDoS Protection
DDOS_PROTECTION_ENABLED=true
DDOS_EMERGENCY_THRESHOLD=1000
DDOS_MITIGATION_AUTO=true

# Redis (Production)
REDIS_URL=redis://localhost:6379
REDIS_RATE_LIMIT_DB=0
REDIS_AUDIT_LOG_DB=1
```

## Support

### Documentation
- [Security Architecture](./docs/security-architecture.md)
- [Compliance Guide](./docs/compliance-guide.md)
- [Incident Response Plan](./docs/incident-response.md)

### Contacts
- Security Team: security@dot.com
- DevOps: devops@dot.com
- Compliance: compliance@dot.com

### Resources
- [OWASP Top 10](https://owasp.org/Top10/)
- [GDPR Guidelines](https://gdpr.eu/)
- [CCPA Compliance](https://oag.ca.gov/privacy/ccpa)

---

**Last Updated:** 2025-09-06
**Version:** 1.0.0
**Status:** 🟢 Active