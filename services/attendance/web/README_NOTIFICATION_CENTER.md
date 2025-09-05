# 알림 센터 드롭다운 컴포넌트

DOT 근태관리 시스템의 실시간 알림 관리를 위한 드롭다운 컴포넌트입니다.

## 구현 완료 기능

### ✅ 완료된 기능
1. **알림 벨 아이콘 및 배지**
   - 읽지 않은 알림 개수 표시
   - 동적 배지 업데이트
   - 접근성 지원 (ARIA 속성)

2. **드롭다운 인터페이스**
   - 클릭으로 열기/닫기
   - 외부 클릭으로 자동 닫기
   - ESC 키 지원

3. **알림 목록 관리**
   - 알림 타입별 아이콘 표시
   - 우선순위별 색상 구분
   - 읽음/안읽음 상태 시각적 표시
   - 상대 시간 포맷 (예: "5분 전")

4. **상호작용 기능**
   - 개별 알림 클릭 처리
   - 읽음 상태 자동 업데이트
   - 콜백 함수 지원

5. **무한 스크롤**
   - 스크롤 감지
   - 페이지네이션 지원
   - 로딩 상태 표시

6. **빈 상태 및 오류 처리**
   - 알림이 없을 때 빈 상태 표시
   - 네트워크 오류 시 재시도 버튼
   - 로딩 인디케이터

7. **접근성 (Accessibility)**
   - WCAG 2.1 AA 준수
   - 키보드 네비게이션 지원
   - 스크린 리더 지원
   - 적절한 ARIA 라벨

## 파일 구조

```
src/components/notifications/
├── NotificationCenter.tsx              # 메인 컴포넌트
├── NotificationCenter.stories.tsx      # Storybook 스토리
├── NotificationCenterExamples.tsx      # 사용 예제
├── EnhancedNotificationSystem.tsx      # 통합 시스템
└── ToastExamples.tsx                   # 통합 예제

tests/unit/components/notifications/
└── NotificationCenter.test.tsx         # 단위 테스트

src/app/examples/notification-center/
└── page.tsx                            # 데모 페이지
```

## 사용법

### 기본 사용법

```tsx
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

function App() {
  const handleNotificationClick = (notification) => {
    console.log('알림 클릭됨:', notification);
  };

  return (
    <div>
      <NotificationCenter
        userId="user-123"
        organizationId="org-456"
        onNotificationClick={handleNotificationClick}
      />
    </div>
  );
}
```

### 통합 시스템 사용법

```tsx
import { EnhancedNotificationSystem } from '@/components/notifications/EnhancedNotificationSystem';

function App() {
  return (
    <EnhancedNotificationSystem
      userId="user-123"
      organizationId="org-456"
      position="top-right"
      enableRealtimeIntegration={true}
      enableNotificationCenter={true}
      onNotificationCenterClick={(notification) => {
        // 알림 클릭 처리
      }}
    />
  );
}
```

## Props

### NotificationCenter Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | **필수** | 사용자 ID |
| `organizationId` | `string` | 선택사항 | 조직 ID |
| `maxNotifications` | `number` | `20` | 최대 알림 개수 |
| `onNotificationClick` | `(notification) => void` | 선택사항 | 알림 클릭 콜백 |
| `className` | `string` | `''` | 추가 CSS 클래스 |

## 알림 타입 및 우선순위

### 알림 타입
- `ATTENDANCE_CHECK_IN` / `ATTENDANCE_CHECK_OUT`: 출근/퇴근
- `ROLE_CHANGED` / `ROLE_ASSIGNED`: 역할 변경
- `ORGANIZATION_INVITED` / `ORGANIZATION_APPROVED`: 조직 관련
- `SYSTEM_ANNOUNCEMENT`: 시스템 공지

### 우선순위
- `LOW`: 파란색 (일반 알림)
- `MEDIUM`: 노란색 (보통 중요)
- `HIGH`: 주황색 (높은 중요도)
- `URGENT`: 빨간색 (긴급)

## 접근성 기능

1. **키보드 내비게이션**
   - `Tab`: 포커스 이동
   - `Enter` / `Space`: 벨 아이콘 활성화
   - `Escape`: 드롭다운 닫기
   - `Arrow Keys`: 알림 목록 탐색

2. **스크린 리더 지원**
   - 적절한 ARIA 라벨
   - 읽지 않은 알림 개수 음성 안내
   - 알림 내용 접근 가능

3. **시각적 접근성**
   - 충분한 색상 대비
   - 포커스 표시
   - 명확한 상태 표시

## 성능 최적화

1. **메모이제이션**
   - `useCallback`으로 함수 최적화
   - `React.memo`로 불필요한 리렌더링 방지

2. **효율적인 데이터 로딩**
   - 페이지네이션 지원
   - 무한 스크롤로 필요시에만 로드
   - 중복 요청 방지

3. **상태 관리**
   - 로컬 상태로 빠른 응답
   - 서버 동기화는 백그라운드에서 처리

## 예제 및 데모

1. **기본 예제**: `/src/components/notifications/ToastExamples.tsx`
2. **상세 데모**: `/src/app/examples/notification-center/page.tsx`
3. **Storybook**: `NotificationCenter.stories.tsx`

## TDD 구현 과정

1. **🔴 RED**: 실패하는 테스트 작성
   - 벨 아이콘 렌더링 테스트
   - 배지 표시 테스트
   - 드롭다운 기능 테스트
   - 접근성 테스트

2. **🟢 GREEN**: 테스트 통과하는 최소 구현
   - 기본 UI 컴포넌트 구현
   - 상태 관리 로직 추가
   - API 연동

3. **🔵 REFACTOR**: 코드 품질 향상
   - 성능 최적화
   - 코드 구조 정리
   - 재사용성 개선

## 기존 시스템과의 통합

- **Toast 시스템**: 즉시 알림용 (임시)
- **NotificationCenter**: 영구 알림 기록 (지속)
- **EnhancedNotificationSystem**: 두 시스템 통합

## 다음 단계

1. **WebSocket 실시간 연동**
2. **성능 최적화**
3. **모바일 반응형 개선**
4. **다국어 지원**
5. **테스트 커버리지 향상**

## 관련 파일

- **알림 매니저**: `/src/lib/notification-manager.ts`
- **토스트 시스템**: `/src/components/notifications/Toast.tsx`
- **실시간 훅**: `/src/hooks/useToastNotifications.ts`