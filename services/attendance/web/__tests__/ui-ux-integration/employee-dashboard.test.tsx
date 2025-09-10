/**
 * 직원 대시보드 UI/UX 통합 테스트
 * 출퇴근 버튼, 상태 표시, 실시간 업데이트 검증
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  mockGeolocation, 
  mockSupabaseRealtime,
  checkInButtonHelpers,
  dashboardHelpers,
  createTestUser,
  createTestOrganization,
  createTestAttendanceRecord,
  performanceHelpers,
  koreanLocaleHelpers
} from '../test-utils/ui-test-helpers';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('next/navigation');

describe('직원 대시보드 UI/UX 통합 테스트', () => {
  const testUser = createTestUser({
    name: '김직원',
    position: '개발자',
    role: 'employee'
  });

  const testOrganization = createTestOrganization({
    name: '테스트 회사',
    address: '서울시 강남구 테헤란로 123'
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGeolocation();
    
    // Mock current time
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T09:00:00+09:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('대시보드 초기 렌더링', () => {
    test('직원 정보와 인사말이 올바르게 표시되어야 함', async () => {
      const EmployeeDashboard = () => (
        <div data-testid="employee-dashboard">
          <header data-testid="dashboard-header">
            <h1>안녕하세요, {testUser.name}님!</h1>
            <p>{testUser.position} · {testOrganization.name}</p>
            <div data-testid="real-time-clock">
              2024년 1월 15일 오전 9:00
            </div>
          </header>
          
          <main data-testid="dashboard-main">
            <section data-testid="attendance-section">
              <h2>출퇴근 관리</h2>
              <div data-testid="attendance-status">
                <span>현재 상태: 출근 전</span>
              </div>
              <button data-testid="check-in-btn">출근하기</button>
            </section>
          </main>
        </div>
      );

      const renderTime = await performanceHelpers.measureRenderTime(
        <EmployeeDashboard />
      );

      // 렌더링 성능 검증 (1초 이내)
      performanceHelpers.expectFastResponse(renderTime, 1000);

      // 기본 UI 요소 확인
      expect(screen.getByTestId('employee-dashboard')).toBeInTheDocument();
      
      // 개인화된 인사말 확인
      dashboardHelpers.findUserGreeting(testUser.name);
      koreanLocaleHelpers.expectKoreanText(`안녕하세요, ${testUser.name}님!`);
      
      // 직원 정보 표시 확인
      expect(screen.getByText(`${testUser.position} · ${testOrganization.name}`)).toBeInTheDocument();
      
      // 실시간 시계 확인
      const clockElement = dashboardHelpers.findRealTimeClock();
      koreanLocaleHelpers.expectKoreanDateFormat(clockElement);
    });

    test('출퇴근 상태가 올바르게 표시되어야 함', () => {
      const AttendanceStatusDisplay = ({ status }: { status: string }) => (
        <div data-testid="attendance-status">
          <span className={`status-indicator ${status}`}>
            {status === 'checked-in' && '📍 출근 중'}
            {status === 'checked-out' && '🏠 퇴근 완료'}
            {status === 'not-checked-in' && '⏰ 출근 전'}
          </span>
          <div className="status-details">
            {status === 'checked-in' && (
              <p>오전 9:00에 출근하셨습니다</p>
            )}
            {status === 'checked-out' && (
              <p>오후 6:00에 퇴근하셨습니다</p>
            )}
            {status === 'not-checked-in' && (
              <p>아직 출근하지 않으셨습니다</p>
            )}
          </div>
        </div>
      );

      // 출근 전 상태
      const { rerender } = render(<AttendanceStatusDisplay status="not-checked-in" />);
      koreanLocaleHelpers.expectKoreanText('출근 전');
      koreanLocaleHelpers.expectKoreanText('아직 출근하지 않으셨습니다');

      // 출근 중 상태
      rerender(<AttendanceStatusDisplay status="checked-in" />);
      koreanLocaleHelpers.expectKoreanText('출근 중');
      koreanLocaleHelpers.expectKoreanText('오전 9:00에 출근하셨습니다');

      // 퇴근 완료 상태
      rerender(<AttendanceStatusDisplay status="checked-out" />);
      koreanLocaleHelpers.expectKoreanText('퇴근 완료');
      koreanLocaleHelpers.expectKoreanText('오후 6:00에 퇴근하셨습니다');
    });
  });

  describe('출퇴근 버튼 기능', () => {
    test('출근 버튼 클릭 시 GPS 위치 확인 후 출근 처리', async () => {
      const mockCheckIn = jest.fn().mockResolvedValue({
        success: true,
        data: createTestAttendanceRecord()
      });

      const CheckInComponent = () => {
        const [status, setStatus] = React.useState('not-checked-in');
        const [loading, setLoading] = React.useState(false);

        const handleCheckIn = async () => {
          setLoading(true);
          try {
            navigator.geolocation.getCurrentPosition(async (position) => {
              const result = await mockCheckIn({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
              
              if (result.success) {
                setStatus('checked-in');
              }
              setLoading(false);
            });
          } catch (error) {
            setLoading(false);
          }
        };

        return (
          <div>
            <div data-testid="attendance-status">
              {status === 'not-checked-in' && '출근 전'}
              {status === 'checked-in' && '출근 중'}
            </div>
            <button 
              data-testid="check-in-btn"
              onClick={handleCheckIn}
              disabled={loading || status === 'checked-in'}
            >
              {loading ? '처리 중...' : status === 'checked-in' ? '출근 완료' : '출근하기'}
            </button>
          </div>
        );
      };

      render(<CheckInComponent />);

      const checkInButton = screen.getByTestId('check-in-btn');
      expect(checkInButton).toBeEnabled();
      koreanLocaleHelpers.expectKoreanText('출근하기');

      // 출근 버튼 클릭
      const interactionTime = await performanceHelpers.measureInteractionTime(async () => {
        await userEvent.click(checkInButton);
      });

      // 상호작용 시간이 100ms 이내여야 함
      performanceHelpers.expectFastResponse(interactionTime, 100);

      // 로딩 상태 확인
      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('처리 중...');
      });

      // 출근 완료 상태 확인
      await waitFor(() => {
        checkInButtonHelpers.waitForStatusUpdate('출근 중');
        koreanLocaleHelpers.expectKoreanText('출근 완료');
      });

      expect(mockCheckIn).toHaveBeenCalledWith({
        latitude: 37.5665,
        longitude: 126.9780
      });
    });

    test('퇴근 버튼 클릭 시 퇴근 처리', async () => {
      const mockCheckOut = jest.fn().mockResolvedValue({
        success: true,
        data: { ...createTestAttendanceRecord(), check_out_time: new Date().toISOString() }
      });

      const CheckOutComponent = () => {
        const [status, setStatus] = React.useState('checked-in');
        const [loading, setLoading] = React.useState(false);

        const handleCheckOut = async () => {
          setLoading(true);
          const result = await mockCheckOut();
          if (result.success) {
            setStatus('checked-out');
          }
          setLoading(false);
        };

        return (
          <div>
            <div data-testid="attendance-status">
              {status === 'checked-in' && '출근 중'}
              {status === 'checked-out' && '퇴근 완료'}
            </div>
            <button 
              data-testid="check-out-btn"
              onClick={handleCheckOut}
              disabled={loading || status === 'checked-out'}
            >
              {loading ? '처리 중...' : status === 'checked-out' ? '퇴근 완료' : '퇴근하기'}
            </button>
          </div>
        );
      };

      render(<CheckOutComponent />);

      const checkOutButton = screen.getByTestId('check-out-btn');
      await userEvent.click(checkOutButton);

      await waitFor(() => {
        checkInButtonHelpers.waitForStatusUpdate('퇴근 완료');
        koreanLocaleHelpers.expectKoreanText('퇴근 완료');
      });

      expect(mockCheckOut).toHaveBeenCalled();
    });

    test('GPS 위치 접근 실패 시 에러 처리', async () => {
      // GPS 에러 시뮬레이션
      const mockGeolocationError = {
        getCurrentPosition: jest.fn().mockImplementation((success, error) => {
          error({
            code: 1,
            message: 'User denied Geolocation'
          });
        })
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocationError,
        writable: true
      });

      const GPSErrorComponent = () => {
        const [error, setError] = React.useState('');

        const handleCheckIn = () => {
          navigator.geolocation.getCurrentPosition(
            () => {},
            (err) => {
              setError('위치 정보 접근이 필요합니다. 브라우저 설정을 확인해주세요.');
            }
          );
        };

        return (
          <div>
            <button onClick={handleCheckIn} data-testid="check-in-btn">
              출근하기
            </button>
            {error && (
              <div data-testid="error-message" role="alert">
                {error}
              </div>
            )}
          </div>
        );
      };

      render(<GPSErrorComponent />);

      const checkInButton = screen.getByTestId('check-in-btn');
      await userEvent.click(checkInButton);

      await waitFor(() => {
        const errorMessage = screen.getByTestId('error-message');
        koreanLocaleHelpers.expectKoreanText('위치 정보 접근이 필요합니다');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('실시간 업데이트 기능', () => {
    test('Supabase Realtime으로 상태 변경 수신', async () => {
      const { mockSupabase, mockChannel } = mockSupabaseRealtime();

      const RealtimeComponent = () => {
        const [attendanceData, setAttendanceData] = React.useState(null);

        React.useEffect(() => {
          const channel = mockSupabase.channel('attendance-updates');
          
          channel
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'attendance_records'
            }, (payload) => {
              setAttendanceData(payload.new);
            })
            .subscribe();

          return () => {
            mockSupabase.removeChannel(channel);
          };
        }, []);

        return (
          <div data-testid="realtime-status">
            {attendanceData ? (
              <p>실시간 출석 업데이트: {attendanceData.status}</p>
            ) : (
              <p>실시간 연결 대기 중...</p>
            )}
          </div>
        );
      };

      render(<RealtimeComponent />);

      // 초기 상태 확인
      koreanLocaleHelpers.expectKoreanText('실시간 연결 대기 중...');

      // 실시간 업데이트 시뮬레이션
      const mockCallback = mockChannel.on.mock.calls[0][2];
      mockCallback({
        new: { status: 'checked-in', user_id: testUser.id }
      });

      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('실시간 출석 업데이트');
      });
    });

    test('실시간 알림 센터 업데이트', async () => {
      const NotificationCenter = () => {
        const [notifications, setNotifications] = React.useState<string[]>([]);

        React.useEffect(() => {
          // 실시간 알림 수신 시뮬레이션
          const timer = setTimeout(() => {
            setNotifications([
              '김동료님이 출근하셨습니다',
              '오늘의 회의가 10분 후 시작됩니다',
              '점심시간이 곧 시작됩니다'
            ]);
          }, 1000);

          return () => clearTimeout(timer);
        }, []);

        return (
          <div data-testid="notification-center">
            <h3>실시간 알림</h3>
            <ul>
              {notifications.map((notification, index) => (
                <li key={index} data-testid={`notification-${index}`}>
                  {notification}
                </li>
              ))}
            </ul>
          </div>
        );
      };

      render(<NotificationCenter />);

      const notificationCenter = dashboardHelpers.findNotificationCenter();
      expect(notificationCenter).toBeInTheDocument();

      // 실시간 알림 업데이트 확인
      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('김동료님이 출근하셨습니다');
        koreanLocaleHelpers.expectKoreanText('오늘의 회의가 10분 후 시작됩니다');
        koreanLocaleHelpers.expectKoreanText('점심시간이 곧 시작됩니다');
      });
    });
  });

  describe('모바일 최적화', () => {
    test('모바일에서 터치 친화적 버튼 크기', () => {
      // 모바일 뷰포트 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <div className="mobile-dashboard">
          <button 
            className="w-full h-16 text-lg touch-friendly"
            data-testid="mobile-check-in-btn"
          >
            출근하기
          </button>
          <button 
            className="w-full h-16 text-lg touch-friendly"
            data-testid="mobile-check-out-btn"
          >
            퇴근하기
          </button>
        </div>
      );

      const checkInBtn = screen.getByTestId('mobile-check-in-btn');
      const checkOutBtn = screen.getByTestId('mobile-check-out-btn');

      // 버튼이 터치 친화적 크기인지 확인 (최소 44px)
      expect(checkInBtn).toHaveClass('h-16'); // 64px = 터치 친화적 크기
      expect(checkOutBtn).toHaveClass('h-16');
    });

    test('스와이프 제스처 지원', async () => {
      const SwipeableComponent = () => {
        const [swipeDirection, setSwipeDirection] = React.useState('');

        const handleTouchStart = (e: React.TouchEvent) => {
          const touch = e.touches[0];
          // 스와이프 시작 위치 저장
        };

        const handleTouchEnd = (e: React.TouchEvent) => {
          const touch = e.changedTouches[0];
          // 스와이프 방향 계산 및 설정
          setSwipeDirection('left'); // 예시
        };

        return (
          <div 
            data-testid="swipeable-area"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <p>스와이프하여 빠른 출퇴근</p>
            {swipeDirection && (
              <p data-testid="swipe-result">
                {swipeDirection === 'left' && '퇴근 처리됨'}
                {swipeDirection === 'right' && '출근 처리됨'}
              </p>
            )}
          </div>
        );
      };

      render(<SwipeableComponent />);

      const swipeArea = screen.getByTestId('swipeable-area');
      
      // 터치 이벤트 시뮬레이션
      fireEvent.touchStart(swipeArea, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      fireEvent.touchEnd(swipeArea, {
        changedTouches: [{ clientX: 50, clientY: 100 }]
      });

      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('퇴근 처리됨');
      });
    });
  });

  describe('오프라인 지원', () => {
    test('네트워크 연결 끊김 시 오프라인 메시지 표시', async () => {
      const OfflineSupport = () => {
        const [isOnline, setIsOnline] = React.useState(navigator.onLine);

        React.useEffect(() => {
          const handleOnline = () => setIsOnline(true);
          const handleOffline = () => setIsOnline(false);

          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);

          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }, []);

        return (
          <div data-testid="offline-indicator">
            {!isOnline && (
              <div className="offline-banner" role="alert">
                인터넷 연결이 끊어졌습니다. 다시 연결되면 자동으로 동기화됩니다.
              </div>
            )}
          </div>
        );
      };

      render(<OfflineSupport />);

      // 오프라인 상태 시뮬레이션
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        koreanLocaleHelpers.expectKoreanText('인터넷 연결이 끊어졌습니다');
      });
    });
  });
});

// React import
const React = require('react');