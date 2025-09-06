# DOT 플랫폼 개발 가이드라인

이 문서는 DOT 플랫폼의 일관된 개발 표준과 모범 사례를 정의합니다.

## 🎯 개발 철학

### Core Principles
- **코드보다 동작하는 소프트웨어**: 실제 사용자 가치 우선
- **문서화**: 코드와 함께 진화하는 문서
- **테스트 주도**: 안정성을 위한 포괄적 테스트
- **성능 우선**: 사용자 경험을 고려한 최적화

## 📁 프로젝트 구조

### 모노레포 구조 규칙
```
DOT/
├── packages/          # 공유 패키지
│   ├── shared/        # 공통 유틸리티
│   ├── ui/           # UI 컴포넌트 라이브러리
│   ├── utils/        # 헬퍼 함수들
│   └── context-manager/ # 문서 동기화 시스템
│
├── services/         # 마이크로서비스
│   ├── attendance/   # 근태관리 서비스
│   ├── marketing/    # 마케팅 서비스  
│   └── scheduler/    # 스케줄링 서비스
│
├── infrastructure/   # AWS CDK 인프라
├── docs/            # 통합 문서
└── monitoring/      # 모니터링 설정
```

### 서비스 내부 구조 표준
```typescript
// 각 서비스는 일관된 구조를 따름
service/
├── src/
│   ├── handlers/     # API 핸들러 (웹/모바일)
│   ├── services/     # 비즈니스 로직
│   ├── models/       # 데이터 모델 및 타입
│   ├── utils/        # 서비스별 유틸리티
│   └── types/        # TypeScript 타입 정의
│
├── tests/
│   ├── unit/         # 단위 테스트
│   ├── integration/  # 통합 테스트
│   └── e2e/          # End-to-End 테스트
│
├── docs/             # 서비스별 문서
└── package.json      # 의존성 및 스크립트
```

## 💻 코딩 표준

### TypeScript 규칙

#### 타입 정의
```typescript
// ✅ Good: 명확하고 구체적인 타입
interface AttendanceRecord {
  id: string;
  employeeId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  location: GeoLocation;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// ❌ Bad: any 타입 사용
interface BadRecord {
  id: any;
  data: any;
  status: string;
}

// ✅ Good: Union 타입으로 명확한 상태 관리
type LoadingState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: any }
  | { status: 'error'; error: string };
```

#### 함수 작성 규칙
```typescript
// ✅ Good: 순수 함수, 단일 책임
export const calculateWorkHours = (
  checkIn: Date,
  checkOut: Date,
  breakMinutes: number = 60
): number => {
  const workMinutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
  return Math.max(0, workMinutes - breakMinutes) / 60;
};

// ✅ Good: 에러 처리 명시
export const fetchEmployeeData = async (
  employeeId: string
): Promise<Result<Employee, APIError>> => {
  try {
    const response = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();
    
    if (response.error) {
      return { success: false, error: response.error };
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: { 
        code: 'NETWORK_ERROR',
        message: 'Failed to fetch employee data'
      }
    };
  }
};
```

#### 컴포넌트 작성 (React)
```typescript
// ✅ Good: Props 인터페이스 명시
interface AttendanceCardProps {
  employee: Employee;
  record: AttendanceRecord;
  onApprove: (recordId: string) => void;
  onReject: (recordId: string, reason: string) => void;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  employee,
  record,
  onApprove,
  onReject
}) => {
  // 컴포넌트 로직...
};

// ✅ Good: 커스텀 훅 활용
export const useAttendanceData = (employeeId: string) => {
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await attendanceService.getRecords(employeeId);
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError('Unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeId]);

  return { data, loading, error };
};
```

### CSS/Tailwind 규칙

#### 컴포넌트 스타일링
```typescript
// ✅ Good: 시맨틱한 클래스명 + Tailwind
const Button: React.FC<ButtonProps> = ({ variant, size, children }) => {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base", 
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button className={cn(baseClasses, variants[variant], sizes[size])}>
      {children}
    </button>
  );
};

// ✅ Good: 반응형 디자인 고려
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 모바일: 1열, 태블릿: 2열, 데스크톱: 3열 */}
</div>
```

## 🧪 테스트 전략

### 테스트 피라미드
```
     /\     E2E Tests (10%)
    /  \    Integration Tests (20%)  
   /____\   Unit Tests (70%)
```

### 단위 테스트 작성법
```typescript
// ✅ Good: 비즈니스 로직 테스트
describe('calculateWorkHours', () => {
  it('should calculate work hours correctly', () => {
    const checkIn = new Date('2024-01-15T09:00:00Z');
    const checkOut = new Date('2024-01-15T18:00:00Z');
    const breakMinutes = 60;
    
    const result = calculateWorkHours(checkIn, checkOut, breakMinutes);
    
    expect(result).toBe(8); // 9시간 - 1시간 휴게 = 8시간
  });
  
  it('should handle negative work hours', () => {
    const checkIn = new Date('2024-01-15T18:00:00Z');
    const checkOut = new Date('2024-01-15T09:00:00Z'); // 잘못된 순서
    
    const result = calculateWorkHours(checkIn, checkOut, 60);
    
    expect(result).toBe(0);
  });
});

// ✅ Good: 컴포넌트 테스트
describe('AttendanceCard', () => {
  const mockEmployee: Employee = {
    id: 'emp-1',
    name: '홍길동',
    department: 'IT'
  };
  
  const mockRecord: AttendanceRecord = {
    id: 'rec-1',
    employeeId: 'emp-1',
    checkInTime: new Date('2024-01-15T09:00:00Z'),
    status: 'PENDING'
  };

  it('should render employee information', () => {
    render(
      <AttendanceCard 
        employee={mockEmployee}
        record={mockRecord}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />
    );
    
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });
});
```

### 통합 테스트
```typescript
// ✅ Good: API 엔드포인트 테스트  
describe('POST /api/attendance/checkin', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });
  
  it('should create attendance record with valid GPS', async () => {
    const response = await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        employeeId: 'emp-1',
        location: { lat: 37.5665, lng: 126.9780 }
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('APPROVED');
  });
  
  it('should require approval for invalid GPS', async () => {
    const response = await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        employeeId: 'emp-1',
        location: { lat: 0, lng: 0 } // 잘못된 위치
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('PENDING');
  });
});
```

## 🔄 Git 워크플로우

### 브랜치 전략 (GitFlow 변형)
```
main           ●————●————●————●————●  (프로덕션 릴리스)
               /    /    /    /    /
develop       ●————●————●————●————●   (개발 통합)
             /    /    /    /    /
feature/     ●————●   /    /    /     (기능 개발)
             /       /    /    /
hotfix/          ●————●   /    /      (긴급 수정)
                     /   /    /
release/               ●————●         (릴리스 준비)
```

### 커밋 메시지 컨벤션
```bash
# 형식: <type>(<scope>): <subject>
# 
# type: feat, fix, docs, style, refactor, test, chore
# scope: attendance, marketing, scheduler, shared
# subject: 50자 이내 현재형 동사

# ✅ Good examples:
feat(attendance): GPS 기반 출퇴근 체크 기능 추가
fix(marketing): 크리에이터 매칭 점수 계산 오류 수정  
docs(shared): API 문서 업데이트
test(scheduler): 스케줄 최적화 알고리즘 테스트 추가
refactor(attendance): 데이터베이스 쿼리 성능 최적화

# ❌ Bad examples:
Update code
Fixed bug
Added feature
```

### 코드 리뷰 체크리스트
```markdown
## 기능성 ✅
- [ ] 요구사항이 정확히 구현되었는가?
- [ ] 엣지 케이스가 적절히 처리되었는가?
- [ ] 에러 처리가 포함되었는가?

## 코드 품질 ✅  
- [ ] TypeScript 타입이 올바르게 정의되었는가?
- [ ] 함수/클래스가 단일 책임을 지는가?
- [ ] 네이밍이 명확하고 일관된가?

## 성능 ✅
- [ ] 불필요한 리렌더링이 없는가?
- [ ] 메모리 누수 가능성은 없는가?
- [ ] 데이터베이스 쿼리가 최적화되었는가?

## 보안 ✅
- [ ] 사용자 입력 검증이 포함되었는가?
- [ ] 민감한 데이터가 로그에 출력되지 않는가?
- [ ] 인증/권한 검사가 적절한가?

## 테스트 ✅
- [ ] 단위 테스트가 포함되었는가?
- [ ] 테스트 커버리지가 80% 이상인가?
- [ ] E2E 시나리오가 검증되었는가?
```

## 📦 패키지 관리

### 의존성 관리 규칙
```json
{
  "dependencies": {
    // ✅ 정확한 버전 고정 (보안 및 안정성)
    "react": "19.0.0",
    "next": "15.5.0",
    
    // ✅ 호환 범위 지정 (minor 업데이트 허용)
    "@supabase/supabase-js": "^2.0.0",
    
    // ❌ 넓은 범위 지정 피하기
    "lodash": "*"
  },
  
  "devDependencies": {
    // 개발 도구는 최신 버전 유지
    "typescript": "^5.9.2",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### 공유 패키지 사용
```typescript
// ✅ Good: 공유 패키지에서 유틸리티 가져오기
import { formatDate, calculateAge } from '@dot/utils';
import { Button, Card } from '@dot/ui';
import { ApiResponse } from '@dot/shared/types';

// ❌ Bad: 각 서비스에서 중복 구현
const formatDate = (date: Date) => { /* 중복 코드 */ };
```

## 🔧 도구 설정

### ESLint 설정 (.eslintrc.js)
```javascript
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    // TypeScript 규칙 강화
    '@typescript-eslint/no-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    
    // React 규칙
    'react/prop-types': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    
    // 일반 규칙  
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

### Prettier 설정 (.prettierrc)
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### VSCode 설정 (.vscode/settings.json)
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

## 🚀 성능 최적화

### 프론트엔드 성능
```typescript
// ✅ Good: React.memo로 불필요한 리렌더링 방지
export const AttendanceCard = React.memo<AttendanceCardProps>(({
  employee,
  record,
  onApprove
}) => {
  // 컴포넌트 로직
}, (prevProps, nextProps) => {
  // 커스텀 비교 함수
  return prevProps.record.id === nextProps.record.id &&
         prevProps.employee.id === nextProps.employee.id;
});

// ✅ Good: useMemo로 비싼 계산 메모이제이션
const Dashboard = () => {
  const expensiveData = useMemo(() => {
    return calculateComplexMetrics(rawData);
  }, [rawData]);
  
  return <MetricsChart data={expensiveData} />;
};

// ✅ Good: useCallback으로 함수 안정화
const AttendanceList = ({ records }: AttendanceListProps) => {
  const handleApprove = useCallback((recordId: string) => {
    approveAttendance(recordId);
  }, []);
  
  return (
    <div>
      {records.map(record => (
        <AttendanceCard 
          key={record.id}
          record={record}
          onApprove={handleApprove}
        />
      ))}
    </div>
  );
};
```

### 데이터베이스 최적화
```typescript
// ✅ Good: 인덱스 활용한 효율적 쿼리
const getAttendanceRecords = async (employeeId: string, date: Date) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      id,
      check_in_time,
      check_out_time,
      status,
      employee:employees(name, department)
    `)
    .eq('employee_id', employeeId)
    .gte('check_in_time', startOfDay(date))
    .lt('check_in_time', endOfDay(date))
    .order('check_in_time', { ascending: false });
    
  return { data, error };
};

// ❌ Bad: N+1 쿼리 문제
const getAttendanceWithEmployee = async (recordIds: string[]) => {
  const records = await Promise.all(
    recordIds.map(async (id) => {
      const record = await getAttendanceRecord(id);
      const employee = await getEmployee(record.employeeId); // N+1 문제
      return { ...record, employee };
    })
  );
};
```

## 🔐 보안 가이드라인

### 인증 및 권한
```typescript
// ✅ Good: JWT 토큰 검증 미들웨어
export const authenticateToken = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const { data: user } = await supabase.auth.getUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

// ✅ Good: 역할 기반 접근 제어
export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### 데이터 검증
```typescript
// ✅ Good: Zod를 사용한 입력 검증
import { z } from 'zod';

const CheckInSchema = z.object({
  employeeId: z.string().uuid(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  timestamp: z.date().default(new Date())
});

export const validateCheckIn = (data: unknown): CheckInRequest => {
  return CheckInSchema.parse(data);
};
```

## 📊 모니터링 및 로깅

### 구조화된 로깅
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// ✅ Good: 구조화된 로그
logger.info('Attendance check-in processed', {
  employeeId: 'emp-123',
  location: { lat: 37.5665, lng: 126.9780 },
  status: 'approved',
  processingTime: 150,
  requestId: 'req-456'
});

// ❌ Bad: 단순 문자열 로그
console.log('Employee emp-123 checked in at 37.5665, 126.9780');
```

### 성능 메트릭 수집
```typescript
// ✅ Good: 응답 시간 측정
export const performanceMiddleware = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
  });
  
  next();
};
```

## 🎯 Context Manager 통합

### 자동 문서 동기화 설정
Context Manager는 코드 변경사항을 감지하여 문서를 자동으로 업데이트합니다:

```json
// .vscode/context-manager.json
{
  "context-manager": {
    "enabled": true,
    "autoUpdate": true,
    "watchPatterns": [
      "src/**/*.{js,ts,jsx,tsx}",
      "docs/**/*.md",
      "*.md"
    ],
    "ignoredPaths": [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**"
    ],
    "refactoring": {
      "autoSuggest": true,
      "requireApproval": true,
      "complexityThreshold": 10
    },
    "documentation": {
      "autoGenerate": true,
      "updateOnSave": true,
      "protectedFiles": [
        "docs/platform/api-reference.md",
        "docs/services/*/api.md"
      ]
    }
  }
}
```

---

이 가이드라인을 따르면 DOT 플랫폼의 코드 품질과 일관성을 유지할 수 있습니다. 질문이 있다면 [GitHub Discussions](https://github.com/dot-platform/discussions)에서 논의해주세요.