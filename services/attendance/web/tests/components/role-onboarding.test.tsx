import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RoleOnboardingFlow from '../../src/components/auth/RoleOnboardingFlow';
import { SignupStepProvider } from '../../src/contexts/SignupStepContext';

// Mock 외부 의존성
jest.mock('../../src/services/multiRoleAuthService');
jest.mock('../../src/services/businessVerificationService');
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

describe('역할별 온보딩 플로우', () => {
  describe('Worker 온보딩', () => {
    test('근로자 온보딩 단계가 올바르게 렌더링되어야 함', () => {
      renderWithProvider(<RoleOnboardingFlow userType="worker" />);
      
      expect(screen.getByText('근로자 온보딩')).toBeInTheDocument();
      expect(screen.getByText('조직 코드를 입력하세요')).toBeInTheDocument();
    });

    test('조직 코드 입력 시 조직 정보 조회', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RoleOnboardingFlow userType="worker" />);
      
      const orgCodeInput = screen.getByLabelText('조직 코드');
      await user.type(orgCodeInput, 'ORG-123');
      
      const searchButton = screen.getByText('조직 찾기');
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('조직명: 테스트 회사')).toBeInTheDocument();
      });
    });

    test('조직 가입 요청 버튼 동작', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RoleOnboardingFlow userType="worker" />);
      
      // 조직 정보 표시 후
      const orgCodeInput = screen.getByLabelText('조직 코드');
      await user.type(orgCodeInput, 'ORG-123');
      
      const searchButton = screen.getByText('조직 찾기');
      await user.click(searchButton);
      
      await waitFor(() => {
        const joinButton = screen.getByText('가입 요청');
        expect(joinButton).toBeInTheDocument();
      });
    });
  });

  describe('Personal Business 온보딩', () => {
    test('개인사업자 온보딩이 올바르게 시작되어야 함', () => {
      renderWithProvider(<RoleOnboardingFlow userType="personal-business" />);
      
      expect(screen.getByText('개인사업자 온보딩')).toBeInTheDocument();
      expect(screen.getByText('사업체 정보를 등록하세요')).toBeInTheDocument();
    });

    test('사업자등록번호 자동 검증', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RoleOnboardingFlow userType="personal-business" />);
      
      const businessNumInput = screen.getByLabelText('사업자등록번호');
      await user.type(businessNumInput, '123-45-67890');
      
      // 입력 완료 시 자동 검증
      await waitFor(() => {
        expect(screen.getByText('검증 중...')).toBeInTheDocument();
      });
    });

    test('사업체 정보 입력 폼 표시', async () => {
      renderWithProvider(<RoleOnboardingFlow userType="personal-business" />);
      
      expect(screen.getByLabelText('사업체명')).toBeInTheDocument();
      expect(screen.getByLabelText('대표자명')).toBeInTheDocument();
      expect(screen.getByLabelText('사업장 주소')).toBeInTheDocument();
    });

    test('조직 설정 완료 후 대시보드로 이동', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RoleOnboardingFlow userType="personal-business" />);
      
      // 모든 필수 정보 입력
      await user.type(screen.getByLabelText('사업자등록번호'), '123-45-67890');
      await user.type(screen.getByLabelText('사업체명'), '테스트 사업체');
      await user.type(screen.getByLabelText('대표자명'), '홍길동');
      
      const completeButton = screen.getByText('조직 설정 완료');
      await user.click(completeButton);
      
      await waitFor(() => {
        expect(screen.getByText('설정이 완료되었습니다!')).toBeInTheDocument();
      });
    });
  });

  describe('Corporation 온보딩', () => {
    test('법인 온보딩 단계 표시', () => {
      renderWithProvider(<RoleOnboardingFlow userType="corporation" />);
      
      expect(screen.getByText('법인 온보딩')).toBeInTheDocument();
      expect(screen.getByText('법인 정보를 등록하세요')).toBeInTheDocument();
    });

    test('법인등록번호 입력 및 검증', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RoleOnboardingFlow userType="corporation" />);
      
      const corpNumInput = screen.getByLabelText('법인등록번호');
      await user.type(corpNumInput, '1234567890123');
      
      await waitFor(() => {
        expect(screen.getByText('법인 정보 검증 중...')).toBeInTheDocument();
      });
    });

    test('법인 상세 정보 입력 폼', () => {
      renderWithProvider(<RoleOnboardingFlow userType="corporation" />);
      
      expect(screen.getByLabelText('법인명')).toBeInTheDocument();
      expect(screen.getByLabelText('대표자명')).toBeInTheDocument();
      expect(screen.getByLabelText('본사 주소')).toBeInTheDocument();
      expect(screen.getByLabelText('업종')).toBeInTheDocument();
    });
  });

  describe('Franchise 온보딩', () => {
    test('프랜차이즈 온보딩 화면 표시', () => {
      renderWithProvider(<RoleOnboardingFlow userType="franchise" />);
      
      expect(screen.getByText('프랜차이즈 온보딩')).toBeInTheDocument();
      expect(screen.getByText('프랜차이즈 정보를 등록하세요')).toBeInTheDocument();
    });

    test('프랜차이즈 코드 검증', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RoleOnboardingFlow userType="franchise" />);
      
      const franchiseCodeInput = screen.getByLabelText('프랜차이즈 코드');
      await user.type(franchiseCodeInput, 'FRAN-001');
      
      const verifyButton = screen.getByText('코드 확인');
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(screen.getByText('프랜차이즈 본부: 테스트 브랜드')).toBeInTheDocument();
      });
    });

    test('매장 정보 입력', async () => {
      renderWithProvider(<RoleOnboardingFlow userType="franchise" />);
      
      expect(screen.getByLabelText('매장명')).toBeInTheDocument();
      expect(screen.getByLabelText('매장 주소')).toBeInTheDocument();
      expect(screen.getByLabelText('점주명')).toBeInTheDocument();
    });
  });

  describe('공통 기능', () => {
    test('진행률 표시', () => {
      renderWithProvider(<RoleOnboardingFlow userType="worker" />);
      
      expect(screen.getByText('1 / 3 단계')).toBeInTheDocument();
    });

    test('이전 단계로 돌아가기', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RoleOnboardingFlow userType="worker" initialStep={2} />);
      
      const backButton = screen.getByText('이전');
      await user.click(backButton);
      
      expect(screen.getByText('1 / 3 단계')).toBeInTheDocument();
    });

    test('건너뛰기 옵션 (선택적 단계)', () => {
      renderWithProvider(<RoleOnboardingFlow userType="worker" />);
      
      const skipButton = screen.queryByText('건너뛰기');
      if (skipButton) {
        expect(skipButton).toBeInTheDocument();
      }
    });

    test('도움말 및 안내 메시지', () => {
      renderWithProvider(<RoleOnboardingFlow userType="personal-business" />);
      
      expect(screen.getByText(/개인사업자로 등록하시면/)).toBeInTheDocument();
    });
  });

  describe('에러 처리', () => {
    test('네트워크 오류 시 에러 메시지', async () => {
      // Mock network error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      
      const user = userEvent.setup();
      renderWithProvider(<RoleOnboardingFlow userType="personal-business" />);
      
      const businessNumInput = screen.getByLabelText('사업자등록번호');
      await user.type(businessNumInput, '123-45-67890');
      
      await waitFor(() => {
        expect(screen.getByText('네트워크 오류가 발생했습니다')).toBeInTheDocument();
      });
    });

    test('잘못된 정보 입력 시 에러 표시', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RoleOnboardingFlow userType="personal-business" />);
      
      const businessNumInput = screen.getByLabelText('사업자등록번호');
      await user.type(businessNumInput, '111-11-11111'); // 잘못된 형식
      
      await waitFor(() => {
        expect(screen.getByText('유효하지 않은 사업자등록번호입니다')).toBeInTheDocument();
      });
    });
  });

  describe('다국어 지원', () => {
    test('한국어 라벨 및 메시지 표시', () => {
      renderWithProvider(<RoleOnboardingFlow userType="worker" />);
      
      expect(screen.getByText('근로자 온보딩')).toBeInTheDocument();
      expect(screen.getByText('조직 코드를 입력하세요')).toBeInTheDocument();
    });
  });
});