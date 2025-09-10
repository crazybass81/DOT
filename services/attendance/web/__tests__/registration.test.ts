/**
 * Registration System Tests
 * Comprehensive tests for the individual user registration system
 */

import { 
  RegistrationFormSchema,
  RegistrationRequestSchema,
  validatePhoneNumber,
  validateKoreanName,
  validatePasswordStrength,
  formatPhoneNumber,
} from '@/src/schemas/registration.schema';

describe('Registration Schema Validation', () => {
  describe('RegistrationFormSchema', () => {
    it('should validate a complete valid form', () => {
      const validData = {
        name: '홍길동',
        phone: '010-1234-5678',
        birthDate: '1990-01-01',
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        accountNumber: '국민은행 123-456-789012',
        agreeToTerms: true,
        agreeToPrivacy: true,
        agreeToMarketing: false,
      };

      const result = RegistrationFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid phone number', () => {
      const invalidData = {
        name: '홍길동',
        phone: '123-456-7890', // Invalid Korean phone
        birthDate: '1990-01-01',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreeToTerms: true,
        agreeToPrivacy: true,
      };

      const result = RegistrationFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail with password mismatch', () => {
      const invalidData = {
        name: '홍길동',
        phone: '010-1234-5678',
        birthDate: '1990-01-01',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        agreeToTerms: true,
        agreeToPrivacy: true,
      };

      const result = RegistrationFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.path.includes('confirmPassword'))).toBe(true);
      }
    });

    it('should fail with invalid age (under 18)', () => {
      const today = new Date();
      const underageDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
      
      const invalidData = {
        name: '홍길동',
        phone: '010-1234-5678',
        birthDate: underageDate.toISOString().split('T')[0],
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreeToTerms: true,
        agreeToPrivacy: true,
      };

      const result = RegistrationFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes('만 18세'))).toBe(true);
      }
    });

    it('should fail without required agreements', () => {
      const invalidData = {
        name: '홍길동',
        phone: '010-1234-5678',
        birthDate: '1990-01-01',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreeToTerms: false, // Required
        agreeToPrivacy: false, // Required
      };

      const result = RegistrationFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('RegistrationRequestSchema', () => {
    it('should validate API request data', () => {
      const validData = {
        name: '홍길동',
        phone: '01012345678', // No formatting for API
        birthDate: '1990-01-01',
        email: 'test@example.com',
        password: 'Password123!',
        accountNumber: '국민은행 123-456-789012',
        qrContext: {
          organizationId: '550e8400-e29b-41d4-a716-446655440000',
        },
      };

      const result = RegistrationRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields to be undefined', () => {
      const minimalData = {
        name: '홍길동',
        phone: '01012345678',
        birthDate: '1990-01-01',
        password: 'Password123!',
      };

      const result = RegistrationRequestSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
  });
});

describe('Phone Number Validation', () => {
  it('should validate correct Korean phone numbers', () => {
    const validNumbers = [
      '010-1234-5678',
      '010 1234 5678',
      '01012345678',
      '010-1234-5678',
    ];

    validNumbers.forEach(phone => {
      expect(validatePhoneNumber(phone)).toBe(true);
    });
  });

  it('should reject invalid phone numbers', () => {
    const invalidNumbers = [
      '123-456-7890',
      '011-1234-5678', // Old format
      '010-123-4567', // Too short
      '010-12345-67890', // Too long
      'not-a-phone',
    ];

    invalidNumbers.forEach(phone => {
      expect(validatePhoneNumber(phone)).toBe(false);
    });
  });

  it('should format phone numbers correctly', () => {
    expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678');
    expect(formatPhoneNumber('010 1234 5678')).toBe('010-1234-5678');
    expect(formatPhoneNumber('010')).toBe('010');
    expect(formatPhoneNumber('0101234')).toBe('010-1234');
  });
});

describe('Korean Name Validation', () => {
  it('should validate correct Korean names', () => {
    const validNames = [
      '홍길동',
      '김민수',
      '이영희',
      '박서준',
      'John Doe', // English names allowed
      '홍 길동', // Spaces allowed
    ];

    validNames.forEach(name => {
      expect(validateKoreanName(name)).toBe(true);
    });
  });

  it('should reject invalid names', () => {
    const invalidNames = [
      '홍', // Too short
      '가나다라마바사아자차카타파하가나다라마바사', // Too long
      '홍길동123', // Numbers not allowed
      '홍길동!@#', // Special characters not allowed
      '', // Empty
      '   ', // Only spaces
    ];

    invalidNames.forEach(name => {
      expect(validateKoreanName(name)).toBe(false);
    });
  });
});

describe('Password Strength Validation', () => {
  it('should validate strong passwords', () => {
    const strongPasswords = [
      'Password123!',
      'MyStr0ngP@ssw0rd',
      'C0mplexP@ssw0rd123',
      'Aa1@bcdefg',
    ];

    strongPasswords.forEach(password => {
      const result = validatePasswordStrength(password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should reject weak passwords', () => {
    const weakPasswords = [
      'password', // No uppercase, numbers, special chars
      'PASSWORD', // No lowercase, numbers, special chars
      '12345678', // No letters
      '!@#$%^&*', // No letters or numbers
      'Pass1!', // Too short
      'passwordwithoutuppercase1!', // No uppercase
      'PASSWORDWITHOUTLOWERCASE1!', // No lowercase
      'PasswordWithoutNumber!', // No numbers
      'PasswordWithoutSpecial123', // No special chars
    ];

    weakPasswords.forEach(password => {
      const result = validatePasswordStrength(password);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  it('should provide specific error messages', () => {
    const result = validatePasswordStrength('pass');
    expect(result.errors).toContain('8글자 이상이어야 합니다');
    expect(result.errors).toContain('영문 대문자를 포함해야 합니다');
    expect(result.errors).toContain('숫자를 포함해야 합니다');
    expect(result.errors).toContain('특수문자를 포함해야 합니다');
  });
});

describe('Edge Cases', () => {
  it('should handle empty values gracefully', () => {
    const emptyData = {
      name: '',
      phone: '',
      birthDate: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
      agreeToPrivacy: false,
    };

    const result = RegistrationFormSchema.safeParse(emptyData);
    expect(result.success).toBe(false);
    // Should have multiple validation errors
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(3);
    }
  });

  it('should handle Unicode characters in names', () => {
    const unicodeData = {
      name: '김민수', // Korean characters
      phone: '010-1234-5678',
      birthDate: '1990-01-01',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      agreeToTerms: true,
      agreeToPrivacy: true,
    };

    const result = RegistrationFormSchema.safeParse(unicodeData);
    expect(result.success).toBe(true);
  });

  it('should validate maximum birth date (today)', () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const data = {
      name: '홍길동',
      phone: '010-1234-5678',
      birthDate: todayString,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      agreeToTerms: true,
      agreeToPrivacy: true,
    };

    const result = RegistrationFormSchema.safeParse(data);
    // Should fail because person would be 0 years old
    expect(result.success).toBe(false);
  });

  it('should validate future dates are rejected', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = tomorrow.toISOString().split('T')[0];
    
    const data = {
      name: '홍길동',
      phone: '010-1234-5678',
      birthDate: futureDate,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      agreeToTerms: true,
      agreeToPrivacy: true,
    };

    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some(e => e.message.includes('미래 날짜'))).toBe(true);
    }
  });
});

// Mock API Response Tests
describe('API Response Handling', () => {
  it('should handle successful registration response', async () => {
    const mockSuccessResponse = {
      success: true,
      data: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        requiresVerification: true,
        verificationMethod: 'email' as const,
      },
      message: '회원가입이 완료되었습니다',
    };

    // This would be the actual API response structure
    expect(mockSuccessResponse.success).toBe(true);
    expect(mockSuccessResponse.data.userId).toBeDefined();
    expect(mockSuccessResponse.data.email).toBeDefined();
  });

  it('should handle error registration response', async () => {
    const mockErrorResponse = {
      success: false,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: '이미 사용중인 이메일입니다',
      },
    };

    expect(mockErrorResponse.success).toBe(false);
    expect(mockErrorResponse.error.code).toBeDefined();
    expect(mockErrorResponse.error.message).toBeDefined();
  });
});

describe('QR Context Integration', () => {
  it('should include QR context in registration request', () => {
    const dataWithQR = {
      name: '홍길동',
      phone: '01012345678',
      birthDate: '1990-01-01',
      password: 'Password123!',
      qrContext: {
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        locationId: 'store-123',
        inviteCode: 'INVITE2024',
      },
    };

    const result = RegistrationRequestSchema.safeParse(dataWithQR);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.qrContext?.organizationId).toBeDefined();
      expect(result.data.qrContext?.locationId).toBeDefined();
      expect(result.data.qrContext?.inviteCode).toBeDefined();
    }
  });

  it('should work without QR context', () => {
    const dataWithoutQR = {
      name: '홍길동',
      phone: '01012345678',
      birthDate: '1990-01-01',
      password: 'Password123!',
    };

    const result = RegistrationRequestSchema.safeParse(dataWithoutQR);
    expect(result.success).toBe(true);
  });
});