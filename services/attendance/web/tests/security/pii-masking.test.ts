/**
 * 🔴 RED Phase: PII Data Masking Security Tests
 * CVE-2025-006: Personal Identifiable Information exposure in API responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  PIIMaskingSystem,
  DataClassifier,
  ComplianceValidator,
  AuditLogger,
  SensitiveDataTypes
} from '../../src/lib/security/pii-masking';

describe('🔴 CRITICAL: PII Data Protection Tests', () => {
  let piiMasker: PIIMaskingSystem;
  let dataClassifier: DataClassifier;
  let complianceValidator: ComplianceValidator;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    piiMasker = new PIIMaskingSystem();
    dataClassifier = new DataClassifier();
    complianceValidator = new ComplianceValidator();
    auditLogger = new AuditLogger();
  });

  describe('Email Masking', () => {
    test('Should mask email addresses correctly', () => {
      const testCases = [
        {
          input: 'john.doe@example.com',
          expected: 'john****@example.com'
        },
        {
          input: 'admin@company.co.kr',
          expected: 'admi****@company.co.kr'
        },
        {
          input: 'a@b.com',
          expected: 'a****@b.com'
        },
        {
          input: 'very.long.email.address@subdomain.example.com',
          expected: 'very****@subdomain.example.com'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const masked = piiMasker.maskEmail(input);
        expect(masked).toBe(expected);
      });
    });

    test('Should mask emails in nested objects', () => {
      const userData = {
        id: '123',
        profile: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          alternativeEmails: [
            'johndoe@gmail.com',
            'john@work.com'
          ]
        },
        settings: {
          notificationEmail: 'john.notifications@example.com'
        }
      };

      const masked = piiMasker.maskObject(userData);
      
      expect(masked.profile.email).toBe('john****@example.com');
      expect(masked.profile.alternativeEmails[0]).toBe('john****@gmail.com');
      expect(masked.profile.alternativeEmails[1]).toBe('john****@work.com');
      expect(masked.settings.notificationEmail).toBe('john****@example.com');
    });
  });

  describe('Phone Number Masking', () => {
    test('Should mask Korean phone numbers', () => {
      const testCases = [
        {
          input: '010-1234-5678',
          expected: '010-****-5678'
        },
        {
          input: '01012345678',
          expected: '010****5678'
        },
        {
          input: '02-1234-5678',
          expected: '02-****-5678'
        },
        {
          input: '+82-10-1234-5678',
          expected: '+82-10-****-5678'
        },
        {
          input: '070-1234-5678',
          expected: '070-****-5678'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const masked = piiMasker.maskPhoneNumber(input);
        expect(masked).toBe(expected);
      });
    });

    test('Should mask international phone numbers', () => {
      const testCases = [
        {
          input: '+1-555-123-4567',
          expected: '+1-555-***-4567'
        },
        {
          input: '+44 20 1234 5678',
          expected: '+44 20 **** 5678'
        },
        {
          input: '+81-3-1234-5678',
          expected: '+81-3-****-5678'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const masked = piiMasker.maskPhoneNumber(input);
        expect(masked).toBe(expected);
      });
    });
  });

  describe('Address Masking', () => {
    test('Should mask Korean addresses', () => {
      const testCases = [
        {
          input: '서울시 강남구 테헤란로 123',
          expected: '서울시 ***구 ***'
        },
        {
          input: '경기도 성남시 분당구 판교로 456번길 78',
          expected: '경기도 ***시 ***구 ***'
        },
        {
          input: '부산광역시 해운대구 마린시티 789',
          expected: '부산광역시 ***구 ***'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const masked = piiMasker.maskAddress(input);
        expect(masked).toBe(expected);
      });
    });

    test('Should mask detailed address information', () => {
      const address = {
        street: '테헤란로 123',
        district: '강남구',
        city: '서울시',
        postalCode: '06234',
        country: 'Korea',
        details: '5층 501호'
      };

      const masked = piiMasker.maskAddressObject(address);
      
      expect(masked.street).toBe('***');
      expect(masked.district).toBe('***구');
      expect(masked.city).toBe('서울시');
      expect(masked.postalCode).toBe('06***');
      expect(masked.details).toBe('[REDACTED]');
    });
  });

  describe('Business Registration Number Masking', () => {
    test('Should mask business registration numbers', () => {
      const testCases = [
        {
          input: '123-45-67890',
          expected: '123-**-*****'
        },
        {
          input: '1234567890',
          expected: '123**-*****'
        },
        {
          input: '987-65-43210',
          expected: '987-**-*****'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const masked = piiMasker.maskBusinessNumber(input);
        expect(masked).toBe(expected);
      });
    });
  });

  describe('Personal Notes and Memos Masking', () => {
    test('Should redact personal notes and sensitive comments', () => {
      const testCases = [
        {
          input: 'User has medical condition requiring special accommodation',
          expected: '[REDACTED - SENSITIVE INFORMATION]'
        },
        {
          input: 'Employee salary: $100,000',
          expected: '[REDACTED - SENSITIVE INFORMATION]'
        },
        {
          input: 'Performance review: needs improvement in communication',
          expected: '[REDACTED - SENSITIVE INFORMATION]'
        },
        {
          input: 'Regular work note',
          expected: 'Regular work note' // Non-sensitive should not be masked
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const isSensitive = dataClassifier.isSensitiveText(input);
        const masked = isSensitive ? '[REDACTED - SENSITIVE INFORMATION]' : input;
        expect(masked).toBe(expected);
      });
    });
  });

  describe('API Response Masking', () => {
    test('Should automatically mask PII in API responses', async () => {
      const response = {
        users: [
          {
            id: '1',
            name: '홍길동',
            email: 'hong@example.com',
            phone: '010-1234-5678',
            address: '서울시 강남구 테헤란로 123',
            businessNumber: '123-45-67890',
            notes: 'Has allergies to peanuts'
          },
          {
            id: '2',
            name: '김철수',
            email: 'kim@company.com',
            phone: '010-9876-5432',
            address: '경기도 성남시 분당구 판교로 456',
            businessNumber: '987-65-43210',
            notes: 'Excellent performance last quarter'
          }
        ]
      };

      const masked = await piiMasker.maskApiResponse(response);
      
      // Check first user
      expect(masked.users[0].email).toBe('hong****@example.com');
      expect(masked.users[0].phone).toBe('010-****-5678');
      expect(masked.users[0].address).toBe('서울시 ***구 ***');
      expect(masked.users[0].businessNumber).toBe('123-**-*****');
      expect(masked.users[0].notes).toBe('[REDACTED - SENSITIVE INFORMATION]');
      
      // Check second user
      expect(masked.users[1].email).toBe('kim****@company.com');
      expect(masked.users[1].phone).toBe('010-****-5432');
    });

    test('Should handle different response formats', async () => {
      // Array response
      const arrayResponse = [
        { email: 'test1@example.com' },
        { email: 'test2@example.com' }
      ];
      
      const maskedArray = await piiMasker.maskApiResponse(arrayResponse);
      expect(maskedArray[0].email).toBe('test****@example.com');
      
      // Single object response
      const objectResponse = {
        email: 'single@example.com',
        phone: '010-1111-2222'
      };
      
      const maskedObject = await piiMasker.maskApiResponse(objectResponse);
      expect(maskedObject.email).toBe('sing****@example.com');
      expect(maskedObject.phone).toBe('010-****-2222');
      
      // Nested response
      const nestedResponse = {
        data: {
          user: {
            contact: {
              email: 'nested@example.com'
            }
          }
        }
      };
      
      const maskedNested = await piiMasker.maskApiResponse(nestedResponse);
      expect(maskedNested.data.user.contact.email).toBe('nest****@example.com');
    });
  });

  describe('GDPR Compliance', () => {
    test('Should comply with GDPR Article 32 - Data Security', () => {
      const userData = {
        email: 'gdpr@test.com',
        phone: '010-1234-5678',
        gdprConsent: true,
        dataProcessingAgreement: true
      };

      const validation = complianceValidator.validateGDPR(userData);
      
      expect(validation.isCompliant).toBe(true);
      expect(validation.requiresEncryption).toBe(true);
      expect(validation.requiresPseudonymization).toBe(true);
      expect(validation.maxRetentionDays).toBe(2555); // 7 years
    });

    test('Should handle right to erasure (GDPR Article 17)', async () => {
      const userId = 'user-123';
      
      // Request data erasure
      const erasureResult = await complianceValidator.processErasureRequest(userId);
      
      expect(erasureResult.status).toBe('SUCCESS');
      expect(erasureResult.dataErased).toContain('personal_information');
      expect(erasureResult.dataRetained).toContain('legal_obligations');
      expect(erasureResult.retentionReason).toBe('Legal requirement - 7 years');
    });

    test('Should provide data portability (GDPR Article 20)', async () => {
      const userId = 'user-456';
      
      const exportData = await complianceValidator.exportUserData(userId);
      
      expect(exportData.format).toBe('JSON');
      expect(exportData.data).toBeDefined();
      expect(exportData.masked).toBe(true);
      expect(exportData.includesPII).toBe(false);
    });
  });

  describe('CCPA Compliance', () => {
    test('Should comply with CCPA Section 1798.150', () => {
      const californiaUser = {
        email: 'user@california.com',
        state: 'CA',
        ccpaOptOut: false
      };

      const validation = complianceValidator.validateCCPA(californiaUser);
      
      expect(validation.isCompliant).toBe(true);
      expect(validation.requiresNotice).toBe(true);
      expect(validation.allowsSale).toBe(false);
      expect(validation.requiresOptOut).toBe(true);
    });

    test('Should handle opt-out requests', async () => {
      const userId = 'ca-user-789';
      
      const optOutResult = await complianceValidator.processCCPAOptOut(userId);
      
      expect(optOutResult.status).toBe('SUCCESS');
      expect(optOutResult.dataSalesStopped).toBe(true);
      expect(optOutResult.thirdPartySharing).toBe('DISABLED');
    });
  });

  describe('Audit Logging', () => {
    test('Should log all PII access attempts', async () => {
      const accessLog = {
        userId: 'admin-001',
        action: 'VIEW',
        resource: 'user_profile',
        piiFields: ['email', 'phone', 'address'],
        timestamp: new Date(),
        ip: '192.168.1.100'
      };

      await auditLogger.logPIIAccess(accessLog);
      
      const logs = await auditLogger.getAccessLogs(accessLog.userId);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('VIEW');
      expect(logs[0].piiFields).toContain('email');
    });

    test('Should retain audit logs for 7 years', async () => {
      const oldLog = {
        userId: 'user-old',
        action: 'EXPORT',
        timestamp: new Date('2018-01-01'),
        retentionYears: 7
      };

      await auditLogger.logPIIAccess(oldLog);
      
      const retentionCheck = await auditLogger.checkRetention(oldLog);
      expect(retentionCheck.shouldRetain).toBe(true);
      expect(retentionCheck.expiryDate).toBeDefined();
      expect(retentionCheck.daysRemaining).toBeGreaterThan(0);
    });

    test('Should alert on suspicious PII access patterns', async () => {
      const suspiciousUser = 'suspicious-user';
      
      // Simulate bulk PII access
      for (let i = 0; i < 100; i++) {
        await auditLogger.logPIIAccess({
          userId: suspiciousUser,
          action: 'EXPORT',
          resource: `user_${i}`,
          piiFields: ['email', 'phone', 'address', 'ssn'],
          timestamp: new Date()
        });
      }

      const alerts = await auditLogger.checkSuspiciousActivity(suspiciousUser);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('BULK_PII_ACCESS');
      expect(alerts[0].severity).toBe('HIGH');
    });
  });

  describe('Performance Impact', () => {
    test('Should mask PII with minimal performance impact', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        email: `user${i}@example.com`,
        phone: `010-${1000 + i}-5678`,
        address: `서울시 강남구 테헤란로 ${i}`,
        notes: `Performance test user ${i}`
      }));

      const startTime = Date.now();
      const masked = await piiMasker.maskApiResponse(largeDataset);
      const elapsed = Date.now() - startTime;

      expect(masked.length).toBe(1000);
      expect(elapsed).toBeLessThan(100); // Should complete within 100ms
      expect(masked[0].email).toContain('****');
    });

    test('Should handle real-time masking for streaming responses', async () => {
      const stream = piiMasker.createMaskingStream();
      const chunks = [
        { email: 'chunk1@test.com' },
        { phone: '010-1111-2222' },
        { address: '서울시 강남구 역삼동' }
      ];

      const maskedChunks = [];
      
      for (const chunk of chunks) {
        const masked = await stream.processChunk(chunk);
        maskedChunks.push(masked);
      }

      expect(maskedChunks[0].email).toBe('chun****@test.com');
      expect(maskedChunks[1].phone).toBe('010-****-2222');
      expect(maskedChunks[2].address).toBe('서울시 ***구 ***');
    });
  });
});

describe('Data Classification Tests', () => {
  let classifier: DataClassifier;

  beforeEach(() => {
    classifier = new DataClassifier();
  });

  test('Should correctly classify PII data types', () => {
    const testData = {
      email: 'test@example.com',
      phone: '010-1234-5678',
      name: 'John Doe',
      age: 30,
      id: '123456',
      ssn: '123-45-6789',
      creditCard: '1234-5678-9012-3456',
      ipAddress: '192.168.1.1',
      regularData: 'This is normal text'
    };

    const classification = classifier.classifyObject(testData);
    
    expect(classification.email).toBe(SensitiveDataTypes.EMAIL);
    expect(classification.phone).toBe(SensitiveDataTypes.PHONE);
    expect(classification.ssn).toBe(SensitiveDataTypes.SSN);
    expect(classification.creditCard).toBe(SensitiveDataTypes.FINANCIAL);
    expect(classification.ipAddress).toBe(SensitiveDataTypes.IP_ADDRESS);
    expect(classification.regularData).toBe(SensitiveDataTypes.NONE);
  });

  test('Should detect sensitive keywords in text', () => {
    const sensitiveTexts = [
      'password: abc123',
      'social security number is 123-45-6789',
      'credit card: 1234 5678 9012 3456',
      'medical diagnosis: diabetes',
      'salary: $100,000'
    ];

    sensitiveTexts.forEach(text => {
      expect(classifier.containsSensitiveData(text)).toBe(true);
    });

    const normalTexts = [
      'The meeting is at 3pm',
      'Please review the document',
      'The project deadline is next week'
    ];

    normalTexts.forEach(text => {
      expect(classifier.containsSensitiveData(text)).toBe(false);
    });
  });
});