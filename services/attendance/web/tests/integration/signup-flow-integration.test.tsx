import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { smartRouter } from '../../src/utils/smart-routing';
import { MultiRoleUser, RoleType } from '../../src/types/multi-role';
import EnhancedSignupForm from '../../src/components/auth/EnhancedSignupForm';
import RoleOnboardingFlow from '../../src/components/auth/RoleOnboardingFlow';
import DashboardRouter from '../../src/components/routing/DashboardRouter';
import { SignupStepProvider } from '../../src/contexts/SignupStepContext';

// Mock 의존성들
jest.mock('../../src/services/multi-role-auth.service');
jest.mock('../../src/services/business-verification.service');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <SignupStepProvider>
      {component}
    </SignupStepProvider>
  );
};

describe('회원가입 플로우 통합 테스트 - user-permission-diagram.md 시나리오', () => {
  
  describe('시나리오 1: 김철수 - 복잡한 멀티 역할 사용자', () => {
    test('회원가입부터 스마트 라우팅까지 전체 플로우', async () => {
      const user = userEvent.setup();

      // 1단계: 기본 정보 입력
      renderWithProvider(<EnhancedSignupForm />);
      
      await user.type(screen.getByLabelText('이메일'), 'kim.cheolsu@example.com');
      await user.type(screen.getByLabelText('비밀번호'), 'Password123!');
      await user.type(screen.getByLabelText('비밀번호 확인'), 'Password123!');
      
      const nextButton = screen.getByText('다음');
      await user.click(nextButton);

      // 2단계: 신원 확인
      await waitFor(() => {
        expect(screen.getByText('신원 확인')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('이름'), '김철수');
      await user.type(screen.getByLabelText('전화번호'), '010-1234-5678');
      await user.type(screen.getByLabelText('생년월일'), '1985-03-15');

      await user.click(screen.getByText('다음'));

      // 3단계: 사용자 유형 선택 - 근로자로 시작
      await waitFor(() => {
        expect(screen.getByText('사용자 유형 선택')).toBeInTheDocument();
      });

      const workerRadio = screen.getByLabelText('근로자');
      await user.click(workerRadio);
      await user.click(screen.getByText('다음'));

      // 4단계: 근로자 상세 정보
      await waitFor(() => {
        expect(screen.getByText('상세 정보 입력')).toBeInTheDocument();
      });

      const employeeIdInput = screen.getByLabelText('사원번호 (선택)');
      await user.type(employeeIdInput, 'EMP001');
      await user.click(screen.getByText('다음'));

      // 5단계: 정보 확인 및 동의
      await waitFor(() => {
        expect(screen.getByText('정보 확인 및 동의')).toBeInTheDocument();
      });

      // 입력한 정보 확인
      expect(screen.getByText('이메일: kim.cheolsu@example.com')).toBeInTheDocument();
      expect(screen.getByText('이름: 김철수')).toBeInTheDocument();
      expect(screen.getByText('사용자 유형: worker')).toBeInTheDocument();

      // 필수 동의 체크
      await user.click(screen.getByLabelText('이용약관에 동의합니다'));
      await user.click(screen.getByLabelText('개인정보처리방침에 동의합니다'));
      
      await user.click(screen.getByText('회원가입 완료'));

      // 6단계: 가입 완료
      await waitFor(() => {
        expect(screen.getByText('회원가입이 완료되었습니다!')).toBeInTheDocument();
        expect(screen.getByText('환영합니다, 김철수님!')).toBeInTheDocument();
      });
    });

    test('김철수의 8개 역할 시나리오 - 스마트 라우팅 검증', () => {
      // user-permission-diagram.md의 김철수 데이터 구조
      const kimCheolSu: MultiRoleUser = {
        id: 'kim-cheolsu',
        email: 'kim.cheolsu@example.com',
        name: '김철수',
        roles: [
          // 조직1 - 근로자이면서 관리자
          {
            id: 'role1',
            employeeId: 'emp1-org1',
            organizationId: 'org1',
            roleType: RoleType.WORKER,
            isActive: true,
            grantedAt: new Date('2024-01-01')
          },
          {
            id: 'role2',
            employeeId: 'emp1-org1',
            organizationId: 'org1',
            roleType: RoleType.ADMIN,
            isActive: true,
            grantedAt: new Date('2024-01-15')
          },
          // 조직2 - 매니저
          {
            id: 'role3',
            employeeId: 'emp2-org2',
            organizationId: 'org2',
            roleType: RoleType.MANAGER,
            isActive: true,
            grantedAt: new Date('2024-02-01')
          },
          // 조직3 - 프랜차이즈
          {
            id: 'role4',
            employeeId: 'emp3-org3',
            organizationId: 'org3',
            roleType: RoleType.FRANCHISE,
            isActive: true,
            grantedAt: new Date('2024-02-15')
          },
          // 조직4 - 근로자
          {
            id: 'role5',
            employeeId: 'emp4-org4',
            organizationId: 'org4',
            roleType: RoleType.WORKER,
            isActive: true,
            grantedAt: new Date('2024-03-01')
          },
          // 조직5 - 관리자
          {
            id: 'role6',
            employeeId: 'emp5-org5',
            organizationId: 'org5',
            roleType: RoleType.ADMIN,
            isActive: true,
            grantedAt: new Date('2024-03-15')
          },
          // 조직6 - 매니저
          {
            id: 'role7',
            employeeId: 'emp6-org6',
            organizationId: 'org6',
            roleType: RoleType.MANAGER,
            isActive: true,
            grantedAt: new Date('2024-04-01')
          },
          // 조직7 - 프랜차이즈
          {
            id: 'role8',
            employeeId: 'emp7-org7',
            organizationId: 'org7',
            roleType: RoleType.FRANCHISE,
            isActive: true,
            grantedAt: new Date('2024-04-15')
          }
        ]
      };

      const routingResult = smartRouter(kimCheolSu);

      // 김철수는 8개 역할을 가지므로 멀티 역할 사용자
      expect(routingResult.hasMultipleRoles).toBe(true);
      expect(routingResult.totalRoles).toBe(8);

      // 가장 높은 권한인 FRANCHISE 대시보드로 라우팅되어야 함
      expect(routingResult.defaultPath).toBe('/dashboard/franchise');

      // 4가지 서로 다른 역할 타입의 대시보드에 모두 접근 가능
      expect(routingResult.availablePaths).toHaveLength(4);
      
      const roleTypes = routingResult.availablePaths.map(path => path.roleType);
      expect(roleTypes).toContain(RoleType.WORKER);
      expect(roleTypes).toContain(RoleType.ADMIN);
      expect(roleTypes).toContain(RoleType.MANAGER);
      expect(roleTypes).toContain(RoleType.FRANCHISE);
    });

    test('조직별 컨텍스트 스위칭 - 조직1에서의 김철수', () => {
      const kimCheolSu: MultiRoleUser = {
        id: 'kim-cheolsu',
        email: 'kim.cheolsu@example.com',
        name: '김철수',
        roles: [
          {
            id: 'role1',
            employeeId: 'emp1-org1',
            organizationId: 'org1',
            roleType: RoleType.WORKER,
            isActive: true,
            grantedAt: new Date('2024-01-01')
          },
          {
            id: 'role2',
            employeeId: 'emp1-org1',
            organizationId: 'org1',
            roleType: RoleType.ADMIN,
            isActive: true,
            grantedAt: new Date('2024-01-15')
          }
        ]
      };

      // 조직1 컨텍스트에서의 라우팅
      const routingResult = smartRouter(kimCheolSu, 'org1');

      // 조직1에서는 ADMIN이 최고 권한
      expect(routingResult.defaultPath).toBe('/dashboard/admin');
      expect(routingResult.availablePaths).toHaveLength(2);
    });
  });

  describe('시나리오 2: 개인사업자 회원가입 및 온보딩', () => {
    test('개인사업자 전체 플로우', async () => {
      const user = userEvent.setup();

      // 회원가입 - 개인사업자 선택
      renderWithProvider(<EnhancedSignupForm initialStep={3} />);
      
      const personalBusinessRadio = screen.getByLabelText('개인사업자');
      await user.click(personalBusinessRadio);
      await user.click(screen.getByText('다음'));

      // 개인사업자 상세 정보
      await waitFor(() => {
        expect(screen.getByLabelText('사업자등록번호')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('사업자등록번호'), '123-45-67890');
      await user.type(screen.getByLabelText('사업체명'), '테스트 사업체');
      await user.type(screen.getByLabelText('대표자명'), '홍길동');
      
      await user.click(screen.getByText('다음'));

      // 회원가입 완료 후 온보딩으로 이동
      // 온보딩 플로우 테스트
      render(<RoleOnboardingFlow userType="personal-business" />);

      expect(screen.getByText('개인사업자 온보딩')).toBeInTheDocument();
      expect(screen.getByText('사업체 정보를 등록하세요')).toBeInTheDocument();

      // 온보딩에서 추가 정보 입력
      await user.type(screen.getByLabelText('사업장 주소'), '서울특별시 강남구 테헤란로 123');
      
      await user.click(screen.getByText('다음'));

      // 조직 설정 완료
      await waitFor(() => {
        expect(screen.getByText('조직 설정')).toBeInTheDocument();
      });

      await user.click(screen.getByText('조직 설정 완료'));

      await waitFor(() => {
        expect(screen.getByText('설정이 완료되었습니다!')).toBeInTheDocument();
      });
    });
  });

  describe('시나리오 3: 법인 회원가입', () => {
    test('법인 전체 플로우', async () => {
      const user = userEvent.setup();

      renderWithProvider(<EnhancedSignupForm initialStep={3} />);
      
      const corporationRadio = screen.getByLabelText('법인');
      await user.click(corporationRadio);
      await user.click(screen.getByText('다음'));

      // 법인 상세 정보
      await waitFor(() => {
        expect(screen.getByLabelText('법인등록번호')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('법인등록번호'), '1234567890123');
      await user.type(screen.getByLabelText('법인명'), '테스트 주식회사');
      await user.type(screen.getByLabelText('대표자명'), '김대표');
      
      // 온보딩 플로우
      render(<RoleOnboardingFlow userType="corporation" />);

      expect(screen.getByText('법인 온보딩')).toBeInTheDocument();
      expect(screen.getByText('법인 정보를 등록하세요')).toBeInTheDocument();

      // 추가 정보 입력
      await user.type(screen.getByLabelText('본사 주소'), '서울특별시 중구 을지로 100');
      await user.type(screen.getByLabelText('업종'), '소프트웨어 개발업');
      
      await user.click(screen.getByText('다음'));

      // 완료 확인
      await waitFor(() => {
        expect(screen.getByText('법인 설정 완료')).toBeInTheDocument();
      });
    });
  });

  describe('시나리오 4: 프랜차이즈 회원가입', () => {
    test('프랜차이즈 전체 플로우', async () => {
      const user = userEvent.setup();

      renderWithProvider(<EnhancedSignupForm initialStep={3} />);
      
      const franchiseRadio = screen.getByLabelText('프랜차이즈');
      await user.click(franchiseRadio);
      await user.click(screen.getByText('다음'));

      // 프랜차이즈 상세 정보
      await waitFor(() => {
        expect(screen.getByLabelText('프랜차이즈 코드')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('프랜차이즈 코드'), 'FRAN-001');
      await user.type(screen.getByLabelText('매장명'), '테스트 매장');
      
      // 온보딩 플로우
      render(<RoleOnboardingFlow userType="franchise" />);

      expect(screen.getByText('프랜차이즈 온보딩')).toBeInTheDocument();

      await user.type(screen.getByLabelText('매장 주소'), '부산광역시 해운대구 센텀로 123');
      await user.type(screen.getByLabelText('점주명'), '정점주');
      
      // 프랜차이즈 코드 검증
      await user.click(screen.getByText('코드 확인'));

      await waitFor(() => {
        expect(screen.getByText('프랜차이즈 본부: 테스트 브랜드')).toBeInTheDocument();
      });
    });
  });

  describe('시나리오 5: 미성년자 가입 제한', () => {
    test('만 15세 미만 가입 차단', async () => {
      const user = userEvent.setup();

      renderWithProvider(<EnhancedSignupForm initialStep={2} />);

      // 14세 생년월일 입력 (2010년생)
      const birthdateInput = screen.getByLabelText('생년월일');
      await user.type(birthdateInput, '2010-01-01');

      // 미성년자 안내 메시지 표시되어야 함
      expect(screen.getByText('미성년자 회원가입 안내')).toBeInTheDocument();

      // 다음 단계 진행이 제한되어야 함
      const nextButton = screen.getByText('다음');
      expect(nextButton).toBeDisabled();
    });

    test('만 15-17세 부모 동의 절차', async () => {
      const user = userEvent.setup();

      renderWithProvider(<EnhancedSignupForm initialStep={2} />);

      // 16세 생년월일 입력 (2008년생)
      const birthdateInput = screen.getByLabelText('생년월일');
      await user.type(birthdateInput, '2008-01-01');

      // 부모 동의 안내 메시지 표시
      expect(screen.getByText('부모님 동의가 필요합니다')).toBeInTheDocument();
      expect(screen.getByText('만 15-17세 사용자는 법정대리인의 동의가 필요합니다.')).toBeInTheDocument();
    });

    test('만 18세 이상 정상 진행', async () => {
      const user = userEvent.setup();

      renderWithProvider(<EnhancedSignupForm initialStep={2} />);

      // 성인 생년월일 입력 (1990년생)
      const birthdateInput = screen.getByLabelText('생년월일');
      await user.type(birthdateInput, '1990-01-01');

      // 부모 동의 메시지가 표시되지 않아야 함
      expect(screen.queryByText('부모님 동의가 필요합니다')).not.toBeInTheDocument();

      const nextButton = screen.getByText('다음');
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('시나리오 6: 에러 처리 및 복구', () => {
    test('사업자등록번호 검증 실패 처리', async () => {
      const user = userEvent.setup();

      renderWithProvider(<EnhancedSignupForm initialStep={4} />);

      // 잘못된 사업자등록번호 입력
      const businessNumInput = screen.getByLabelText('사업자등록번호');
      await user.type(businessNumInput, '111-11-11111');

      await waitFor(() => {
        expect(screen.getByText('유효하지 않은 사업자등록번호입니다')).toBeInTheDocument();
      });

      // 다음 단계 진행이 제한되어야 함
      const nextButton = screen.getByText('다음');
      expect(nextButton).toBeDisabled();
    });

    test('네트워크 오류 시 재시도 메커니즘', async () => {
      // Mock fetch to simulate network error
      const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('Network error')
      );

      const user = userEvent.setup();
      renderWithProvider(<EnhancedSignupForm initialStep={4} />);

      const businessNumInput = screen.getByLabelText('사업자등록번호');
      await user.type(businessNumInput, '123-45-67890');

      await waitFor(() => {
        expect(screen.getByText('네트워크 오류가 발생했습니다')).toBeInTheDocument();
      });

      // 재시도 버튼 확인
      expect(screen.getByText('다시 시도')).toBeInTheDocument();

      mockFetch.mockRestore();
    });
  });

  describe('시나리오 7: 성능 및 사용성', () => {
    test('대용량 역할 데이터 처리 성능', () => {
      // 100개의 역할을 가진 극단적인 사용자
      const userWithManyRoles: MultiRoleUser = {
        id: 'power-user',
        email: 'power@example.com',
        name: '파워유저',
        roles: Array.from({ length: 100 }, (_, i) => ({
          id: `role${i}`,
          employeeId: `emp${i}`,
          organizationId: `org${i % 10}`, // 10개 조직에 분산
          roleType: [RoleType.WORKER, RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE][i % 4],
          isActive: true,
          grantedAt: new Date(`2024-01-${(i % 28) + 1}`)
        }))
      };

      const startTime = performance.now();
      const routingResult = smartRouter(userWithManyRoles);
      const endTime = performance.now();

      // 100ms 이내에 처리되어야 함
      expect(endTime - startTime).toBeLessThan(100);

      // 결과는 정확해야 함
      expect(routingResult.hasMultipleRoles).toBe(true);
      expect(routingResult.totalRoles).toBe(100);
      expect(routingResult.availablePaths).toHaveLength(4); // 중복 제거된 4개 역할 타입
    });

    test('UI 응답성 - 대화형 요소들', async () => {
      const user = userEvent.setup();
      
      renderWithProvider(<EnhancedSignupForm />);

      // 폼 입력 응답성 테스트
      const emailInput = screen.getByLabelText('이메일');
      
      const startTime = performance.now();
      await user.type(emailInput, 'test@example.com');
      const endTime = performance.now();

      // 타이핑 응답성은 50ms 이내
      expect(endTime - startTime).toBeLessThan(50);

      // 실시간 검증 피드백
      await waitFor(() => {
        // 유효한 이메일이므로 에러 메시지 없어야 함
        expect(screen.queryByText(/이메일.*형식/)).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('시나리오 8: 접근성 및 국제화', () => {
    test('스크린 리더 호환성', () => {
      renderWithProvider(<EnhancedSignupForm />);

      // aria-label 및 semantic HTML 확인
      expect(screen.getByLabelText('이메일')).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText('비밀번호')).toHaveAttribute('type', 'password');
      
      // 단계 표시기에 aria-label
      const stepIndicator = screen.getByText('단계 1 / 6');
      expect(stepIndicator.closest('div')).toHaveClass('step-indicator');
    });

    test('키보드 내비게이션', async () => {
      const user = userEvent.setup();
      
      renderWithProvider(<EnhancedSignupForm />);

      const emailInput = screen.getByLabelText('이메일');
      emailInput.focus();

      // Tab 키로 다음 필드 이동
      await user.tab();
      expect(screen.getByLabelText('비밀번호')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('비밀번호 확인')).toHaveFocus();
    });
  });

  describe('시나리오 9: 데이터 무결성', () => {
    test('역할 데이터 일관성 검증', () => {
      const testUser: MultiRoleUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: '테스트사용자',
        roles: [
          {
            id: 'role1',
            employeeId: 'emp1',
            organizationId: 'org1',
            roleType: RoleType.ADMIN,
            isActive: true,
            grantedAt: new Date('2024-01-01')
          }
        ]
      };

      const routingResult = smartRouter(testUser);

      // 역할 수 일치
      expect(routingResult.totalRoles).toBe(testUser.roles.length);
      
      // 활성 역할만 고려
      expect(routingResult.availablePaths.length).toBeGreaterThan(0);
    });

    test('비활성 역할 필터링', () => {
      const testUser: MultiRoleUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: '테스트사용자',
        roles: [
          {
            id: 'role1',
            employeeId: 'emp1',
            organizationId: 'org1',
            roleType: RoleType.ADMIN,
            isActive: false, // 비활성
            grantedAt: new Date('2024-01-01')
          },
          {
            id: 'role2',
            employeeId: 'emp2',
            organizationId: 'org2',
            roleType: RoleType.WORKER,
            isActive: true,
            grantedAt: new Date('2024-01-01')
          }
        ]
      };

      const routingResult = smartRouter(testUser);

      // 활성 역할(WORKER)만 고려되어야 함
      expect(routingResult.defaultPath).toBe('/dashboard/worker');
      expect(routingResult.availablePaths).toHaveLength(1);
      expect(routingResult.totalRoles).toBe(1); // 활성 역할만 카운트
    });
  });
});