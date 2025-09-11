/**
 * Enhanced Registration Page Tests
 * Testing the GitHub reference style multi-step registration flow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import RegisterPage from '@/app/register/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock the RealTimeClock component
jest.mock('@/components/ui/RealTimeClock', () => ({
  OptimizedRealTimeClock: ({ className }: { className: string }) => (
    <div className={className} data-testid="real-time-clock">
      2024년 1월 1일 월요일 09:00:00
    </div>
  ),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Enhanced Registration Page', () => {
  const mockPush = jest.fn();
  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue(null);
  });

  describe('Type Selection Step', () => {
    test('renders registration type selection by default', () => {
      render(<RegisterPage />);
      
      // Check for real-time clock
      expect(screen.getByTestId('real-time-clock')).toBeInTheDocument();
      
      // Check for main heading
      expect(screen.getByText('DOT 회원가입')).toBeInTheDocument();
      expect(screen.getByText('어떤 유형으로 가입하시겠습니까?')).toBeInTheDocument();
      
      // Check for registration type cards
      expect(screen.getByText('개인 회원')).toBeInTheDocument();
      expect(screen.getByText('사업자 회원')).toBeInTheDocument();
      
      // Check features for individual
      expect(screen.getByText('빠른 가입 절차')).toBeInTheDocument();
      expect(screen.getByText('GPS 기반 출퇴근')).toBeInTheDocument();
      expect(screen.getByText('실시간 근태 관리')).toBeInTheDocument();
      
      // Check features for business
      expect(screen.getByText('조직 관리 기능')).toBeInTheDocument();
      expect(screen.getByText('직원 초대 시스템')).toBeInTheDocument();
      expect(screen.getByText('근태 현황 대시보드')).toBeInTheDocument();
    });

    test('shows QR context info when organizationId is present', () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'org') return 'test-org-id';
        return null;
      });

      render(<RegisterPage />);
      
      expect(screen.getByText('조직 초대를 통한 가입')).toBeInTheDocument();
      expect(screen.getByText('가입 완료 후 해당 조직의 직원으로 등록됩니다')).toBeInTheDocument();
    });

    test('navigates to individual form when individual type is selected', () => {
      render(<RegisterPage />);
      
      const individualCard = screen.getByText('개인 회원').closest('button');
      expect(individualCard).toBeInTheDocument();
      
      fireEvent.click(individualCard!);
      
      // Should show individual registration form
      expect(screen.getByText('개인 회원가입')).toBeInTheDocument();
      expect(screen.getByText('DOT 근태관리 시스템에 가입하여 출퇴근을 편리하게 관리하세요')).toBeInTheDocument();
    });

    test('navigates to business form when business type is selected', () => {
      render(<RegisterPage />);
      
      const businessCard = screen.getByText('사업자 회원').closest('button');
      expect(businessCard).toBeInTheDocument();
      
      fireEvent.click(businessCard!);
      
      // Should show business registration form
      expect(screen.getByText('사업자 회원가입')).toBeInTheDocument();
      expect(screen.getByText('사업자 정보를 입력하여 조직을 만들고 직원들을 관리하세요')).toBeInTheDocument();
    });
  });

  describe('Individual Registration Form', () => {
    beforeEach(() => {
      render(<RegisterPage />);
      
      // Navigate to individual form
      const individualCard = screen.getByText('개인 회원').closest('button');
      fireEvent.click(individualCard!);
    });

    test('renders individual registration form with progress indicator', () => {
      // Check progress indicator
      expect(screen.getByText('75% 완료')).toBeInTheDocument();
      
      // Check back button
      expect(screen.getByText('다른 유형 선택')).toBeInTheDocument();
      
      // Check form fields
      expect(screen.getByLabelText(/이름/)).toBeInTheDocument();
      expect(screen.getByLabelText(/휴대폰 번호/)).toBeInTheDocument();
      expect(screen.getByLabelText(/생년월일/)).toBeInTheDocument();
      expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
      expect(screen.getByLabelText(/비밀번호/)).toBeInTheDocument();
      expect(screen.getByLabelText(/비밀번호 확인/)).toBeInTheDocument();
      
      // Should NOT show business fields
      expect(screen.queryByLabelText(/사업자명/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/사업자등록번호/)).not.toBeInTheDocument();
    });

    test('back button returns to type selection', () => {
      const backButton = screen.getByText('다른 유형 선택');
      fireEvent.click(backButton);
      
      // Should return to type selection
      expect(screen.getByText('어떤 유형으로 가입하시겠습니까?')).toBeInTheDocument();
    });

    test('shows individual-specific features highlight', () => {
      expect(screen.getByText('실시간 출근')).toBeInTheDocument();
      expect(screen.getByText('GPS 인증')).toBeInTheDocument();
      expect(screen.getByText('보안 관리')).toBeInTheDocument();
    });
  });

  describe('Business Registration Form', () => {
    beforeEach(() => {
      render(<RegisterPage />);
      
      // Navigate to business form
      const businessCard = screen.getByText('사업자 회원').closest('button');
      fireEvent.click(businessCard!);
    });

    test('renders business registration form with additional fields', () => {
      // Check basic fields
      expect(screen.getByLabelText(/이름/)).toBeInTheDocument();
      expect(screen.getByLabelText(/휴대폰 번호/)).toBeInTheDocument();
      
      // Check business-specific fields
      expect(screen.getByLabelText(/사업자명\/법인명/)).toBeInTheDocument();
      expect(screen.getByLabelText(/사업자등록번호/)).toBeInTheDocument();
      expect(screen.getByLabelText(/사업장 주소/)).toBeInTheDocument();
    });

    test('shows business-specific features highlight', () => {
      expect(screen.getByText('직원 관리')).toBeInTheDocument();
      expect(screen.getByText('조직 운영')).toBeInTheDocument();
    });

    test('formats business registration number correctly', () => {
      const businessNumberInput = screen.getByLabelText(/사업자등록번호/) as HTMLInputElement;
      
      fireEvent.change(businessNumberInput, { target: { value: '1234567890' } });
      
      expect(businessNumberInput.value).toBe('123-45-67890');
    });
  });

  describe('Form Validation and Submission', () => {
    beforeEach(() => {
      render(<RegisterPage />);
      
      // Navigate to individual form for testing
      const individualCard = screen.getByText('개인 회원').closest('button');
      fireEvent.click(individualCard!);
    });

    test('validates required fields before submission', async () => {
      const submitButton = screen.getByText('개인 회원가입');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('이름은 2글자 이상이어야 합니다')).toBeInTheDocument();
      });
    });

    test('shows real-time validation on field blur', async () => {
      const nameInput = screen.getByLabelText(/이름/);
      
      fireEvent.change(nameInput, { target: { value: 'a' } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText('이름은 2글자 이상이어야 합니다')).toBeInTheDocument();
      });
    });

    test('formats phone number automatically', () => {
      const phoneInput = screen.getByLabelText(/휴대폰 번호/) as HTMLInputElement;
      
      fireEvent.change(phoneInput, { target: { value: '01012345678' } });
      
      expect(phoneInput.value).toBe('010-1234-5678');
    });

    test('shows password strength indicator', () => {
      const passwordInput = screen.getByLabelText(/비밀번호/);
      
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      
      // Should show password strength bars
      expect(screen.getByText('8글자 이상이어야 합니다')).toBeInTheDocument();
    });

    test('submits form with correct data structure for individual registration', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            userId: 'test-user-id',
            email: 'test@example.com',
            requiresVerification: false,
            verificationMethod: 'none',
          },
        }),
      });

      // Fill form
      fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '홍길동' } });
      fireEvent.change(screen.getByLabelText(/휴대폰 번호/), { target: { value: '01012345678' } });
      fireEvent.change(screen.getByLabelText(/생년월일/), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'TestPass123!' } });
      fireEvent.change(screen.getByLabelText(/비밀번호 확인/), { target: { value: 'TestPass123!' } });
      
      // Agree to terms
      fireEvent.click(screen.getByLabelText(/이용약관에 동의합니다/));
      fireEvent.click(screen.getByLabelText(/개인정보 처리방침에 동의합니다/));
      
      // Submit
      fireEvent.click(screen.getByText('개인 회원가입'));
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: '홍길동',
            phone: '01012345678',
            birthDate: '1990-01-01',
            email: 'test@example.com',
            password: 'TestPass123!',
            registrationType: 'individual',
            qrContext: undefined,
          }),
        });
      });
    });
  });

  describe('Success States', () => {
    test('shows success message after successful registration', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            userId: 'test-user-id',
            email: 'test@example.com',
            requiresVerification: false,
            verificationMethod: 'none',
          },
        }),
      });

      render(<RegisterPage />);
      
      // Navigate and fill form quickly
      const individualCard = screen.getByText('개인 회원').closest('button');
      fireEvent.click(individualCard!);
      
      // Submit with minimal valid data
      fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '홍길동' } });
      fireEvent.change(screen.getByLabelText(/휴대폰 번호/), { target: { value: '01012345678' } });
      fireEvent.change(screen.getByLabelText(/생년월일/), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'TestPass123!' } });
      fireEvent.change(screen.getByLabelText(/비밀번호 확인/), { target: { value: 'TestPass123!' } });
      fireEvent.click(screen.getByLabelText(/이용약관에 동의합니다/));
      fireEvent.click(screen.getByLabelText(/개인정보 처리방침에 동의합니다/));
      
      fireEvent.click(screen.getByText('개인 회원가입'));
      
      await waitFor(() => {
        expect(screen.getByText('가입 완료!')).toBeInTheDocument();
        expect(screen.getByText('로그인하기')).toBeInTheDocument();
      });
    });

    test('shows verification required message when needed', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            userId: 'test-user-id',
            email: 'test@example.com',
            requiresVerification: true,
            verificationMethod: 'email',
          },
        }),
      });

      render(<RegisterPage />);
      
      // Navigate and submit
      const individualCard = screen.getByText('개인 회원').closest('button');
      fireEvent.click(individualCard!);
      
      // Fill and submit form (abbreviated for test)
      fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '홍길동' } });
      fireEvent.change(screen.getByLabelText(/휴대폰 번호/), { target: { value: '01012345678' } });
      fireEvent.change(screen.getByLabelText(/생년월일/), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'TestPass123!' } });
      fireEvent.change(screen.getByLabelText(/비밀번호 확인/), { target: { value: 'TestPass123!' } });
      fireEvent.click(screen.getByLabelText(/이용약관에 동의합니다/));
      fireEvent.click(screen.getByLabelText(/개인정보 처리방침에 동의합니다/));
      
      fireEvent.click(screen.getByText('개인 회원가입'));
      
      await waitFor(() => {
        expect(screen.getByText('이메일 인증 필요')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('shows error message on API failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: '이미 존재하는 사용자입니다',
          },
        }),
      });

      render(<RegisterPage />);
      
      // Navigate and submit
      const individualCard = screen.getByText('개인 회원').closest('button');
      fireEvent.click(individualCard!);
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '홍길동' } });
      fireEvent.change(screen.getByLabelText(/휴대폰 번호/), { target: { value: '01012345678' } });
      fireEvent.change(screen.getByLabelText(/생년월일/), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'TestPass123!' } });
      fireEvent.change(screen.getByLabelText(/비밀번호 확인/), { target: { value: 'TestPass123!' } });
      fireEvent.click(screen.getByLabelText(/이용약관에 동의합니다/));
      fireEvent.click(screen.getByLabelText(/개인정보 처리방침에 동의합니다/));
      
      fireEvent.click(screen.getByText('개인 회원가입'));
      
      await waitFor(() => {
        expect(screen.getByText('가입 실패')).toBeInTheDocument();
        expect(screen.getByText('이미 존재하는 사용자입니다')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<RegisterPage />);
      
      // Check for proper form structure
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check buttons are accessible
      const individualButton = screen.getByText('개인 회원').closest('button');
      const businessButton = screen.getByText('사업자 회원').closest('button');
      
      expect(individualButton).toBeInTheDocument();
      expect(businessButton).toBeInTheDocument();
      expect(individualButton).toHaveAttribute('type', 'button');
      expect(businessButton).toHaveAttribute('type', 'button');
    });

    test('supports keyboard navigation', () => {
      render(<RegisterPage />);
      
      const individualButton = screen.getByText('개인 회원').closest('button');
      
      // Should be focusable
      individualButton?.focus();
      expect(document.activeElement).toBe(individualButton);
    });
  });
});