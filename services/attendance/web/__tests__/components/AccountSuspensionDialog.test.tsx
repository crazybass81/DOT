/**
 * AccountSuspensionDialog 컴포넌트 테스트 - TDD RED Phase
 * 계정 정지 다이얼로그 실패 시나리오 테스트
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AccountSuspensionDialog } from '@/components/master-admin/AccountSuspensionDialog';
import { SuspensionReason, SuspensionSeverity } from '@/types/suspension';

// 모킹 설정
jest.mock('@/hooks/useAccountSuspension', () => ({
  useAccountSuspension: jest.fn()
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  }
}));

describe('AccountSuspensionDialog - TDD RED Phase', () => {
  const mockSuspendUser = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const defaultProps = {
    open: true,
    user: {
      id: 'user123',
      email: 'user@example.com',
      full_name: 'Test User',
      status: 'ACTIVE' as const
    },
    onClose: mockOnClose,
    onSuccess: mockOnSuccess
  };

  beforeEach(() => {
    require('@/hooks/useAccountSuspension').useAccountSuspension.mockReturnValue({
      suspendUser: mockSuspendUser,
      loading: false,
      error: null
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🔴 렌더링 실패 테스트', () => {
    test('8.1.1 사용자 정보 없이 다이얼로그 열기 시도', () => {
      // Given: 사용자 정보가 null인 props
      const { container } = render(
        <AccountSuspensionDialog
          {...defaultProps}
          user={null}
        />
      );

      // Then: 다이얼로그가 렌더링되지 않음
      expect(container.firstChild).toBeNull();
    });

    test('8.1.2 필수 props 누락 시 에러 처리', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Given: onClose prop 누락
      expect(() => {
        render(
          <AccountSuspensionDialog
            open={true}
            user={defaultProps.user}
            onSuccess={mockOnSuccess}
            // onClose prop 누락
          />
        );
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('🔴 폼 검증 실패 테스트', () => {
    test('8.1.3 정지 사유 선택하지 않고 제출 시도', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Given: 정지 사유 선택하지 않음
      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      
      // When: 제출 시도
      await user.click(submitButton);

      // Then: 에러 메시지 표시
      expect(screen.getByText('정지 사유를 선택해주세요.')).toBeInTheDocument();
      expect(mockSuspendUser).not.toHaveBeenCalled();
    });

    test('8.1.4 커스텀 사유 선택했지만 상세 설명 미입력', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Given: 커스텀 사유 선택하지만 설명 미입력
      const customReasonRadio = screen.getByLabelText('기타 사유');
      await user.click(customReasonRadio);

      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      await user.click(submitButton);

      // Then: 커스텀 사유 입력 요구 메시지
      expect(screen.getByText('기타 사유를 입력해주세요.')).toBeInTheDocument();
    });

    test('8.1.5 임시 정지 선택했지만 종료일 미설정', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Given: 임시 정지 선택하지만 종료일 미설정
      await user.selectOptions(screen.getByLabelText('정지 사유'), SuspensionReason.POLICY_VIOLATION);
      await user.selectOptions(screen.getByLabelText('정지 유형'), 'TEMPORARY');

      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      await user.click(submitButton);

      // Then: 종료일 설정 요구 메시지
      expect(screen.getByText('임시 정지의 경우 종료일을 설정해주세요.')).toBeInTheDocument();
    });

    test('8.1.6 과거 날짜로 종료일 설정 시도', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Given: 과거 날짜로 종료일 설정
      await user.selectOptions(screen.getByLabelText('정지 사유'), SuspensionReason.POLICY_VIOLATION);
      await user.selectOptions(screen.getByLabelText('정지 유형'), 'TEMPORARY');
      
      const endDateInput = screen.getByLabelText('종료일');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await user.type(endDateInput, yesterday.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      await user.click(submitButton);

      // Then: 과거 날짜 에러 메시지
      expect(screen.getByText('종료일은 현재 날짜 이후여야 합니다.')).toBeInTheDocument();
    });

    test('8.1.7 시작일이 종료일보다 늦을 때', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Given: 시작일이 종료일보다 늦음
      await user.selectOptions(screen.getByLabelText('정지 사유'), SuspensionReason.SECURITY_RISK);
      await user.selectOptions(screen.getByLabelText('정지 유형'), 'TEMPORARY');
      
      const startDateInput = screen.getByLabelText('시작일');
      const endDateInput = screen.getByLabelText('종료일');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const today = new Date();
      
      await user.type(startDateInput, tomorrow.toISOString().split('T')[0]);
      await user.type(endDateInput, today.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      await user.click(submitButton);

      // Then: 날짜 순서 에러 메시지
      expect(screen.getByText('시작일은 종료일보다 이전이어야 합니다.')).toBeInTheDocument();
    });
  });

  describe('🔴 API 호출 실패 테스트', () => {
    test('8.1.8 네트워크 오류로 정지 요청 실패', async () => {
      // Given: API 호출 실패 설정
      mockSuspendUser.mockRejectedValueOnce(new Error('네트워크 오류'));
      
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // When: 유효한 폼 데이터로 제출
      await user.selectOptions(screen.getByLabelText('정지 사유'), SuspensionReason.POLICY_VIOLATION);
      await user.selectOptions(screen.getByLabelText('정지 심각도'), SuspensionSeverity.MEDIUM);
      await user.selectOptions(screen.getByLabelText('정지 유형'), 'PERMANENT');

      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      await user.click(submitButton);

      // Then: 에러 토스트 메시지 표시
      await waitFor(() => {
        expect(require('react-hot-toast').toast.error).toHaveBeenCalledWith(
          '계정 정지 처리 중 오류가 발생했습니다.'
        );
      });
    });

    test('8.1.9 서버 응답에서 성공하지만 경고가 있는 경우', async () => {
      // Given: 성공하지만 경고가 있는 응답
      mockSuspendUser.mockResolvedValueOnce({
        success: true,
        suspension: { id: 'susp123' },
        warnings: ['세션 무효화에 실패했습니다.']
      });
      
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // When: 유효한 폼 데이터로 제출
      await user.selectOptions(screen.getByLabelText('정지 사유'), SuspensionReason.SYSTEM_MAINTENANCE);
      await user.selectOptions(screen.getByLabelText('정지 심각도'), SuspensionSeverity.LOW);
      await user.selectOptions(screen.getByLabelText('정지 유형'), 'TEMPORARY');
      
      const endDateInput = screen.getByLabelText('종료일');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await user.type(endDateInput, tomorrow.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      await user.click(submitButton);

      // Then: 성공 메시지와 경고 메시지 모두 표시
      await waitFor(() => {
        expect(require('react-hot-toast').toast.success).toHaveBeenCalled();
      });
      expect(screen.getByText('경고: 세션 무효화에 실패했습니다.')).toBeInTheDocument();
    });

    test('8.1.10 권한 부족으로 정지 요청 실패 (403)', async () => {
      // Given: 권한 부족 응답
      mockSuspendUser.mockResolvedValueOnce({
        success: false,
        error: '접근 권한이 없습니다.'
      });
      
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // When: 폼 제출
      await user.selectOptions(screen.getByLabelText('정지 사유'), SuspensionReason.POLICY_VIOLATION);
      await user.selectOptions(screen.getByLabelText('정지 심각도'), SuspensionSeverity.HIGH);
      await user.selectOptions(screen.getByLabelText('정지 유형'), 'PERMANENT');

      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      await user.click(submitButton);

      // Then: 권한 부족 에러 메시지
      await waitFor(() => {
        expect(screen.getByText('접근 권한이 없습니다.')).toBeInTheDocument();
      });
    });
  });

  describe('🔴 UI 상호작용 실패 테스트', () => {
    test('8.1.11 로딩 중에 중복 제출 시도', async () => {
      // Given: 로딩 상태 설정
      require('@/hooks/useAccountSuspension').useAccountSuspension.mockReturnValue({
        suspendUser: mockSuspendUser,
        loading: true,
        error: null
      });
      
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // When: 제출 버튼 클릭 시도
      const submitButton = screen.getByRole('button', { name: /처리 중.../i });
      
      // Then: 버튼이 비활성화됨
      expect(submitButton).toBeDisabled();
      
      // 클릭해도 API 호출되지 않음
      await user.click(submitButton);
      expect(mockSuspendUser).not.toHaveBeenCalled();
    });

    test('8.1.12 다이얼로그 닫기 버튼 클릭 시 확인 없이 닫기', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Given: 폼에 일부 데이터 입력
      await user.selectOptions(screen.getByLabelText('정지 사유'), SuspensionReason.POLICY_VIOLATION);

      // When: 닫기 버튼 클릭
      const closeButton = screen.getByRole('button', { name: /닫기/i });
      await user.click(closeButton);

      // Then: 데이터 손실 경고 없이 바로 닫힘 (잠재적 UX 문제)
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('8.1.13 증빙 파일 업로드 실패', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Given: 잘못된 파일 형식 업로드 시도
      const fileInput = screen.getByLabelText('증빙 자료 첨부');
      const invalidFile = new File(['invalid'], 'test.exe', { type: 'application/exe' });
      
      // When: 지원하지 않는 파일 업로드
      await user.upload(fileInput, invalidFile);

      // Then: 파일 형식 에러 메시지
      expect(screen.getByText('지원하지 않는 파일 형식입니다.')).toBeInTheDocument();
    });

    test('8.1.14 파일 크기 초과로 업로드 실패', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Given: 크기가 큰 파일 업로드 시도 (10MB 초과)
      const fileInput = screen.getByLabelText('증빙 자료 첨부');
      const oversizedFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      });
      
      // When: 큰 파일 업로드
      await user.upload(fileInput, oversizedFile);

      // Then: 파일 크기 에러 메시지
      expect(screen.getByText('파일 크기는 10MB를 초과할 수 없습니다.')).toBeInTheDocument();
    });
  });

  describe('🔴 접근성 실패 테스트', () => {
    test('8.1.15 필수 필드에 aria-required 누락', () => {
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Then: 필수 필드에 aria-required 속성이 있어야 함
      const reasonSelect = screen.getByLabelText('정지 사유');
      expect(reasonSelect).toHaveAttribute('aria-required', 'true');
    });

    test('8.1.16 에러 메시지와 입력 필드의 aria-describedby 연결 누락', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // Given: 에러 상태 유발
      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      await user.click(submitButton);

      // Then: 에러 메시지가 입력 필드와 연결되어야 함
      const reasonSelect = screen.getByLabelText('정지 사유');
      const errorMessage = screen.getByText('정지 사유를 선택해주세요.');
      
      expect(reasonSelect).toHaveAttribute('aria-describedby');
      expect(errorMessage).toHaveAttribute('id');
    });

    test('8.1.17 키보드 네비게이션으로 모든 요소 접근 불가', async () => {
      const user = userEvent.setup();
      render(<AccountSuspensionDialog {...defaultProps} />);

      // When: Tab 키로 모든 요소 순회 시도
      await user.tab();
      await user.tab();
      await user.tab();

      // Then: 포커스가 올바르게 이동해야 함
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });
  });

  describe('🔴 비즈니스 로직 검증 실패 테스트', () => {
    test('8.1.18 이미 정지된 사용자에 대한 정지 시도', () => {
      // Given: 이미 정지된 사용자
      const suspendedUser = {
        ...defaultProps.user,
        status: 'SUSPENDED' as const
      };

      render(<AccountSuspensionDialog {...defaultProps} user={suspendedUser} />);

      // Then: 경고 메시지 표시
      expect(screen.getByText('이 사용자는 이미 정지된 상태입니다.')).toBeInTheDocument();
      
      // 제출 버튼 비활성화
      const submitButton = screen.getByRole('button', { name: /계정 정지/i });
      expect(submitButton).toBeDisabled();
    });

    test('8.1.19 MASTER_ADMIN 사용자 정지 시도', () => {
      // Given: MASTER_ADMIN 사용자
      const masterAdminUser = {
        ...defaultProps.user,
        role: 'MASTER_ADMIN'
      };

      render(<AccountSuspensionDialog {...defaultProps} user={masterAdminUser} />);

      // Then: 경고 메시지 표시
      expect(screen.getByText('MASTER_ADMIN 사용자는 정지할 수 없습니다.')).toBeInTheDocument();
    });

    test('8.1.20 자기 자신 정지 시도 방지', () => {
      // Given: 현재 사용자가 자기 자신을 정지하려는 시도
      const currentUser = {
        ...defaultProps.user,
        id: 'current-admin-123' // 현재 로그인한 관리자 ID와 동일
      };

      // 현재 사용자 ID 모킹
      Object.defineProperty(window, 'currentUserId', {
        value: 'current-admin-123',
        writable: true
      });

      render(<AccountSuspensionDialog {...defaultProps} user={currentUser} />);

      // Then: 자신 정지 방지 메시지
      expect(screen.getByText('자신의 계정을 정지할 수 없습니다.')).toBeInTheDocument();
    });
  });
});