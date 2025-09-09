// Phase 2.1: 확장된 회원가입 폼 테스트
// TDD: 6단계 회원가입 플로우 요구사항 정의

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// 테스트할 컴포넌트 import (아직 구현 안됨)
import { EnhancedSignupForm } from '@/components/auth/EnhancedSignupForm';
import { SignupStepProvider, useSignupStep } from '@/contexts/SignupStepContext';
import { RoleType } from '@/types/multi-role';

// Mock 외부 의존성
jest.mock('@/services/multiRoleAuthService');
jest.mock('@/services/businessVerificationService');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <SignupStepProvider>
      {component}
    </SignupStepProvider>
  );
};

describe('확장된 회원가입 폼 (6단계)', () => {

  describe('Step 1: 기본 정보 입력', () => {
    test('필수 필드들이 올바르게 렌더링되어야 함', () => {
      renderWithProvider(<EnhancedSignupForm />);
      
      expect(screen.getByLabelText('이메일')).toBeInTheDocument();
      expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
      expect(screen.getByLabelText('비밀번호 확인')).toBeInTheDocument();
      expect(screen.getByLabelText('이름')).toBeInTheDocument();
      expect(screen.getByLabelText('전화번호')).toBeInTheDocument();
      expect(screen.getByText('다음 단계')).toBeInTheDocument();
    });

    test('이메일 형식 검증이 작동해야 함', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm />);
      
      const emailInput = screen.getByLabelText('이메일');
      await user.type(emailInput, 'invalid-email');
      
      const nextButton = screen.getByText('다음 단계');
      await user.click(nextButton);
      
      expect(screen.getByText('올바른 이메일 형식을 입력해주세요')).toBeInTheDocument();
    });

    test('비밀번호 확인이 일치하지 않으면 에러 표시', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm />);
      
      await user.type(screen.getByLabelText('비밀번호'), 'password123');
      await user.type(screen.getByLabelText('비밀번호 확인'), 'password456');
      
      const nextButton = screen.getByText('다음 단계');
      await user.click(nextButton);
      
      expect(screen.getByText('비밀번호가 일치하지 않습니다')).toBeInTheDocument();
    });

    test('모든 필수 정보 입력 시 다음 단계로 진행', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm />);
      
      await user.type(screen.getByLabelText('이메일'), 'test@example.com');
      await user.type(screen.getByLabelText('비밀번호'), 'Password123!');
      await user.type(screen.getByLabelText('비밀번호 확인'), 'Password123!');
      await user.type(screen.getByLabelText('이름'), '홍길동');
      await user.type(screen.getByLabelText('전화번호'), '010-1234-5678');
      
      const nextButton = screen.getByText('다음 단계');
      await user.click(nextButton);
      
      // Step 2로 이동했는지 확인
      expect(screen.getByText('나이 및 본인인증')).toBeInTheDocument();
    });
  });

  describe('Step 2: 나이 및 본인인증 (새로 추가)', () => {
    test('생년월일 입력 필드가 렌더링되어야 함', () => {
      renderWithProvider(<EnhancedSignupForm initialStep={2} />);
      
      expect(screen.getByLabelText('생년월일')).toBeInTheDocument();
      expect(screen.getByText('본인인증 진행')).toBeInTheDocument();
    });

    test('만 15세 미만은 가입 불가 메시지 표시', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={2} />);
      
      // 만 10세 (2014년생) 입력
      const birthdateInput = screen.getByLabelText('생년월일');
      await user.type(birthdateInput, '2014-01-01');
      
      const nextButton = screen.getByText('다음 단계');
      await user.click(nextButton);
      
      expect(screen.getByText('만 15세 이상만 가입할 수 있습니다')).toBeInTheDocument();
    });

    test('만 15-17세는 부모 동의 절차 표시', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={2} />);
      
      // 만 16세 (2008년생) 입력
      const birthdateInput = screen.getByLabelText('생년월일');
      await user.type(birthdateInput, '2008-01-01');
      
      const nextButton = screen.getByText('다음 단계');
      await user.click(nextButton);
      
      expect(screen.getByText('부모님 동의가 필요합니다')).toBeInTheDocument();
      expect(screen.getByText('부모님 휴대폰 인증')).toBeInTheDocument();
    });

    test('만 18세 이상은 일반 본인인증 진행', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={2} />);
      
      // 만 20세 (2004년생) 입력
      const birthdateInput = screen.getByLabelText('생년월일');
      await user.type(birthdateInput, '2004-01-01');
      
      const authButton = screen.getByText('본인인증 진행');
      await user.click(authButton);
      
      // NICE 본인인증 모달이 열려야 함
      expect(screen.getByText('본인인증을 진행해주세요')).toBeInTheDocument();
    });
  });

  describe('Step 3: 사용자 구분 선택 (기존 Step 2)', () => {
    test('4가지 사용자 유형이 표시되어야 함', () => {
      renderWithProvider(<EnhancedSignupForm initialStep={3} />);
      
      expect(screen.getByText('일반 근로자')).toBeInTheDocument();
      expect(screen.getByText('개인사업자')).toBeInTheDocument();
      expect(screen.getByText('법인 설립')).toBeInTheDocument();
      expect(screen.getByText('가맹본부 설립')).toBeInTheDocument();
    });

    test('사용자 유형 선택 시 다음 단계로 진행', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={3} />);
      
      const workerOption = screen.getByText('일반 근로자');
      await user.click(workerOption);
      
      const nextButton = screen.getByText('다음 단계');
      await user.click(nextButton);
      
      // Step 4로 이동했는지 확인
      expect(screen.getByText('세부 정보 입력')).toBeInTheDocument();
    });
  });

  describe('Step 4: 세부 정보 입력 (확장)', () => {
    test('근로자 선택 시 조직 코드 입력 화면 표시', () => {
      renderWithProvider(
        <EnhancedSignupForm 
          initialStep={4} 
          selectedUserType="worker" 
        />
      );
      
      expect(screen.getByLabelText('조직 코드')).toBeInTheDocument();
      expect(screen.getByLabelText('부서')).toBeInTheDocument();
      expect(screen.getByText('조직 코드는 회사에서 제공받은 8자리 코드입니다')).toBeInTheDocument();
    });

    test('개인사업자 선택 시 사업자 정보 입력 화면 표시', () => {
      renderWithProvider(
        <EnhancedSignupForm 
          initialStep={4} 
          selectedUserType="personal-business" 
        />
      );
      
      expect(screen.getByLabelText('사업자등록번호')).toBeInTheDocument();
      expect(screen.getByLabelText('상호명')).toBeInTheDocument();
      expect(screen.getByText('사업자등록번호 검증')).toBeInTheDocument();
    });

    test('법인 설립 시 법인 정보 입력 화면 표시', () => {
      renderWithProvider(
        <EnhancedSignupForm 
          initialStep={4} 
          selectedUserType="corporation" 
        />
      );
      
      expect(screen.getByLabelText('법인명')).toBeInTheDocument();
      expect(screen.getByLabelText('법인등록번호')).toBeInTheDocument();
      expect(screen.getByLabelText('대표자명')).toBeInTheDocument();
      expect(screen.getByLabelText('사업장 주소')).toBeInTheDocument();
    });

    test('가맹본부 설립 시 가맹본부 정보 입력 화면 표시', () => {
      renderWithProvider(
        <EnhancedSignupForm 
          initialStep={4} 
          selectedUserType="franchise" 
        />
      );
      
      expect(screen.getByLabelText('가맹본부명')).toBeInTheDocument();
      expect(screen.getByLabelText('브랜드명')).toBeInTheDocument();
      expect(screen.getByLabelText('가맹점 수')).toBeInTheDocument();
      expect(screen.getByLabelText('본부 주소')).toBeInTheDocument();
    });
  });

  describe('Step 5: 정보 확인 및 동의 (새로 추가)', () => {
    test('입력한 모든 정보가 요약되어 표시되어야 함', () => {
      renderWithProvider(<EnhancedSignupForm initialStep={5} />);
      
      expect(screen.getByText('입력 정보 확인')).toBeInTheDocument();
      expect(screen.getByText('개인정보 처리방침 동의')).toBeInTheDocument();
      expect(screen.getByText('서비스 이용약관 동의')).toBeInTheDocument();
      expect(screen.getByText('근로관련 정보 수집 동의')).toBeInTheDocument();
    });

    test('필수 동의 항목을 체크하지 않으면 진행 불가', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={5} />);
      
      const submitButton = screen.getByText('회원가입 완료');
      await user.click(submitButton);
      
      expect(screen.getByText('필수 동의 항목을 체크해주세요')).toBeInTheDocument();
    });

    test('모든 동의 항목 체크 시 최종 단계로 진행', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={5} />);
      
      // 모든 체크박스 체크
      const privacyCheckbox = screen.getByLabelText('개인정보 처리방침 동의');
      const termsCheckbox = screen.getByLabelText('서비스 이용약관 동의');
      const laborCheckbox = screen.getByLabelText('근로관련 정보 수집 동의');
      
      await user.click(privacyCheckbox);
      await user.click(termsCheckbox);
      await user.click(laborCheckbox);
      
      const submitButton = screen.getByText('회원가입 완료');
      await user.click(submitButton);
      
      // Step 6로 이동했는지 확인
      expect(screen.getByText('가입 완료')).toBeInTheDocument();
    });
  });

  describe('Step 6: 가입 완료 및 라우팅 (새로 추가)', () => {
    test('가입 성공 시 완료 메시지와 대시보드 링크 표시', () => {
      renderWithProvider(<EnhancedSignupForm initialStep={6} />);
      
      expect(screen.getByText('회원가입이 완료되었습니다')).toBeInTheDocument();
      expect(screen.getByText('대시보드로 이동')).toBeInTheDocument();
    });

    test('역할에 따른 적절한 대시보드 링크 제공', () => {
      renderWithProvider(
        <EnhancedSignupForm 
          initialStep={6} 
          completedUserType="worker" 
        />
      );
      
      const dashboardLink = screen.getByText('워커 대시보드로 이동');
      expect(dashboardLink).toHaveAttribute('href', '/worker-dashboard');
    });

    test('사업자의 경우 조직 설정 링크도 제공', () => {
      renderWithProvider(
        <EnhancedSignupForm 
          initialStep={6} 
          completedUserType="business" 
        />
      );
      
      expect(screen.getByText('사업자 대시보드로 이동')).toBeInTheDocument();
      expect(screen.getByText('조직 설정하기')).toBeInTheDocument();
    });
  });

  describe('진행 상태 및 네비게이션', () => {
    test('현재 단계가 진행 표시줄에 정확히 표시되어야 함', () => {
      renderWithProvider(<EnhancedSignupForm initialStep={3} />);
      
      expect(screen.getByText('3 / 6')).toBeInTheDocument();
      
      // 진행률 표시
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '3');
      expect(progressBar).toHaveAttribute('aria-valuemax', '6');
    });

    test('이전 단계로 돌아가기 버튼이 작동해야 함', async () => {
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={3} />);
      
      const prevButton = screen.getByText('이전 단계');
      await user.click(prevButton);
      
      // Step 2로 이동했는지 확인
      expect(screen.getByText('나이 및 본인인증')).toBeInTheDocument();
    });

    test('첫 번째 단계에서는 이전 단계 버튼이 로그인 페이지로 링크', () => {
      renderWithProvider(<EnhancedSignupForm initialStep={1} />);
      
      const loginLink = screen.getByText('로그인으로');
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('에러 처리 및 사용자 경험', () => {
    test('네트워크 오류 시 적절한 에러 메시지 표시', async () => {
      // Mock network error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={4} selectedUserType="personal-business" />);
      
      const verifyButton = screen.getByText('사업자등록번호 검증');
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(screen.getByText('네트워크 오류가 발생했습니다. 다시 시도해주세요.')).toBeInTheDocument();
      });
    });

    test('중복 이메일 시 적절한 안내 메시지', async () => {
      // Mock duplicate email response
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email already exists' })
      } as Response);
      
      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={1} />);
      
      await user.type(screen.getByLabelText('이메일'), 'existing@example.com');
      // ... 다른 필수 정보 입력
      
      const nextButton = screen.getByText('다음 단계');
      await user.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('이미 존재하는 이메일입니다. 다른 이메일을 사용해주세요.')).toBeInTheDocument();
      });
    });
  });

});