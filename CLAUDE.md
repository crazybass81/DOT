# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Claude Enhancement Rules

### MANDATORY: Maximize Claude Capabilities
When executing ANY task or command, Claude MUST:

1. **Leverage ALL Available Claude Ecosystem Tools**:
   - **claude-code-templates**: Use for project setup, analytics, health checks
   - **CMAX (Claude Max)**: Multi-instance Claude coordination for parallel AI collaboration
   - **SuperClaude**: Activate specialized personas and behavioral modes
   - **Sub-agents & Global Agents**: Delegate to specialized agents (code-reviewer, test-engineer, performance-engineer)
   - **MCP Servers**: Utilize all 10 configured MCP servers for enhanced capabilities
   - **Task Tool**: Use for complex multi-step operations requiring coordination

2. **Automatic Feature Activation**:
   - **For Code Review**: Automatically invoke `code-reviewer` agent
   - **For Testing**: Automatically invoke `test-engineer` agent  
   - **For Performance**: Automatically invoke `performance-engineer` agent
   - **For UI Components**: Automatically use Magic MCP with /ui or /21
   - **For Documentation**: Automatically use Context7 MCP for framework docs
   - **For Complex Analysis**: Automatically use Sequential MCP for multi-step reasoning

3. **Parallel Processing & Optimization**:
   - ALWAYS execute independent operations in parallel
   - Use TodoWrite for task tracking and coordination
   - Batch similar operations for efficiency
   - Leverage MultiEdit over sequential edits

4. **Intelligence Amplification**:
   - Activate appropriate SuperClaude modes:
     - `--brainstorm` for requirements discovery
     - `--introspect` for self-analysis and optimization
     - `--task-manage` for complex multi-step operations
     - `--orchestrate` for multi-tool coordination
     - `--token-efficient` for resource optimization
   - Use Sequential thinking for problems with 3+ components
   - Apply evidence-based reasoning with validation gates

5. **Continuous Enhancement**:
   - Monitor performance via Analytics Dashboard (http://localhost:3333)
   - Run health checks periodically with `claude-code-templates --health-check`
   - Track command usage with `--command-stats`
   - Optimize based on analytics feedback

### Implementation Pattern with CMAX
```bash
# Example: When asked to "review this code"
# Claude automatically:
1. CMAX coordinates multiple Claude instances
2. Instance 1: Activates code-reviewer agent
3. Instance 2: Uses Sequential MCP for analysis  
4. Instance 3: Leverages Context7 for best practices
5. All instances work in parallel without conflicts
6. Results are synchronized and comprehensive feedback provided
```

### CMAX Commands for Multi-Instance Coordination
- `cmax status` - View active Claude instances and coordination status
- `cmax test-ai` - Test real AI coordination capabilities
- `cmax ui` - Interactive dashboard for monitoring
- `cmax daemon start` - Run background coordination service

### Zero-Tolerance for Manual Work
- NEVER perform tasks manually that can be delegated to agents
- NEVER skip available tools that enhance capabilities
- NEVER execute sequentially what can be parallelized
- ALWAYS use the most powerful tool available for each task

## Project Overview

DOT is a comprehensive business platform for restaurant digital transformation, built as a microservices-based monorepo. The platform provides integrated solutions for attendance management, marketing automation, and scheduling.

## Architecture

### Monorepo Structure
- **services/**: Independent microservices (attendance, marketing, scheduler)
- **packages/**: Shared libraries (shared, ui, utils, context-manager)
- **infrastructure/**: AWS CDK deployment configurations
- **docker/**: Local development environment setup
- **monitoring/**: Prometheus/Grafana monitoring stack

### Services Overview
- **Attendance Service** (Port 3002): GPS-based attendance with web dashboard + Flutter mobile app
- **Marketing Service** (Port 3003): YouTube creator marketing automation platform
- **Scheduler Service**: Employee scheduling and shift management (in planning)

## Development Commands

### Workspace Management
- `npm install` - Install root dependencies and setup workspaces
- `npm run install:all` - Install all workspace dependencies
- `npm run clean` - Clean all build artifacts and node_modules

### Service Development
- `npm run dev` - Start all services in development mode
- `npm run dev:attendance:web` - Start attendance web service (port 3002)
- `npm run dev:attendance:mobile` - Start Flutter mobile app development
- `npm run dev:marketing` - Start marketing service (port 3003)

### Build & Test
- `npm run build` - Build all services for production
- `npm run build:attendance` - Build attendance service only
- `npm run build:marketing` - Build marketing service only
- `npm run test` - Run all tests across services
- `npm run lint` - Run linting across all services

### Service-Specific Commands

#### Attendance Service
```bash
cd services/attendance/web
npm run dev              # Web dashboard (port 3002)
npm run test:unit        # Unit tests
npm run test:integration # Integration tests with Supabase
npm run test:rls         # Row Level Security tests
npm run test:workflow    # Full workflow tests
npm run deploy           # Deploy to production

cd services/attendance/mobile
flutter pub get          # Install Flutter dependencies
flutter run              # Run mobile app
flutter test             # Run Flutter tests
flutter build web       # Build for web deployment
```

#### Marketing Service
```bash
cd services/marketing
npm run dev              # Development server (port 3003)
npm run setup:aws        # Setup AWS Parameter Store
npm run load:env         # Load environment from AWS
npm run test:coverage    # Run tests with coverage
```

### Infrastructure & DevOps
- `docker-compose up -d --profile dev` - Start local development environment
- `docker-compose up -d --profile monitoring` - Start monitoring stack
- `./scripts/setup-hybrid-database.sh` - Setup hybrid database architecture

## Technology Stack

### Core Technologies
- **JavaScript/TypeScript** - Primary programming languages
- **Node.js** - Runtime environment
- **npm/yarn** - Package management

### Common Frameworks
- **React** - UI library with hooks and functional components
- **Vue.js** - Progressive framework for building user interfaces
- **Angular** - Full-featured framework for web applications
- **Express.js** - Web application framework for Node.js
- **Next.js** - React framework with SSR/SSG capabilities

### Build Tools
- **Vite** - Fast build tool and development server
- **Webpack** - Module bundler
- **Rollup** - Module bundler for libraries
- **esbuild** - Extremely fast JavaScript bundler

### Testing Framework
- **Jest** - JavaScript testing framework
- **Vitest** - Fast unit test framework
- **Testing Library** - Simple and complete testing utilities
- **Cypress** - End-to-end testing framework
- **Playwright** - Cross-browser testing

### Code Quality Tools
- **ESLint** - JavaScript/TypeScript linter
- **Prettier** - Code formatter
- **TypeScript** - Static type checking
- **Husky** - Git hooks

## Project Structure Guidelines

### File Organization
```
src/
├── components/     # Reusable UI components
├── pages/         # Page components or routes
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── services/      # API calls and external services
├── types/         # TypeScript type definitions
├── constants/     # Application constants
├── styles/        # Global styles and themes
└── tests/         # Test files
```

### Naming Conventions
- **Files**: Use kebab-case for file names (`user-profile.component.ts`)
- **Components**: Use PascalCase for component names (`UserProfile`)
- **Functions**: Use camelCase for function names (`getUserData`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (`API_BASE_URL`)
- **Types/Interfaces**: Use PascalCase with descriptive names (`UserData`, `ApiResponse`)

## TypeScript Guidelines

### Type Safety
- Enable strict mode in `tsconfig.json`
- Use explicit types for function parameters and return values
- Prefer interfaces over types for object shapes
- Use union types for multiple possible values
- Avoid `any` type - use `unknown` when type is truly unknown

### Best Practices
- Use type guards for runtime type checking
- Leverage utility types (`Partial`, `Pick`, `Omit`, etc.)
- Create custom types for domain-specific data
- Use enums for finite sets of values
- Document complex types with JSDoc comments

## Code Quality Standards

### ESLint Configuration
- Use recommended ESLint rules for JavaScript/TypeScript
- Enable React-specific rules if using React
- Configure import/export rules for consistent module usage
- Set up accessibility rules for inclusive development

### Prettier Configuration
- Use consistent indentation (2 spaces recommended)
- Set maximum line length (80-100 characters)
- Use single quotes for strings
- Add trailing commas for better git diffs

### Testing Standards
- Aim for 80%+ test coverage
- Write unit tests for utilities and business logic
- Use integration tests for component interactions
- Implement e2e tests for critical user flows
- Follow AAA pattern (Arrange, Act, Assert)

## Performance Optimization

### Bundle Optimization
- Use code splitting for large applications
- Implement lazy loading for routes and components
- Optimize images and assets
- Use tree shaking to eliminate dead code
- Analyze bundle size regularly

### Runtime Performance
- Implement proper memoization (React.memo, useMemo, useCallback)
- Use virtualization for large lists
- Optimize re-renders in React applications
- Implement proper error boundaries
- Use web workers for heavy computations

## Security Guidelines

### Dependencies
- Regularly audit dependencies with `npm audit`
- Keep dependencies updated
- Use lock files (`package-lock.json`, `yarn.lock`)
- Avoid dependencies with known vulnerabilities

### Code Security
- Sanitize user inputs
- Use HTTPS for API calls
- Implement proper authentication and authorization
- Store sensitive data securely (environment variables)
- Use Content Security Policy (CSP) headers

## Development Workflow

### Before Starting
1. Check Node.js version compatibility
2. Install dependencies with `npm install`
3. Copy environment variables from `.env.example`
4. Run type checking with `npm run typecheck`

### During Development
1. Use TypeScript for type safety
2. Run linter frequently to catch issues early
3. Write tests for new features
4. Use meaningful commit messages
5. Review code changes before committing

### Before Committing
1. Run full test suite: `npm test`
2. Check linting: `npm run lint`
3. Verify formatting: `npm run format:check`
4. Run type checking: `npm run typecheck`
5. Test production build: `npm run build`

## AI-Driven Development Principles
AI에 전적으로 의존하는 개발 방식에 최적화된 원칙들

### 핵심 철학
- 개발 지식 불필요: 모든 기술적 결정은 AI가 수행
- 단순성 최우선: AI가 이해하고 수정하기 쉬운 구조
- 예시 중심: 코드보다 예시와 설명이 중요

### 1. Single File Principle
- 관련 로직은 모두 한 파일에 작성
- AI가 전체 컨텍스트를 한번에 파악 가능
- 파일 간 의존성 최소화

### 2. Explicit Intent Comments
```python
def function_name():
    """
    이 함수가 해야 할 일:
    1. [구체적인 동작 1]
    2. [구체적인 동작 2]
    TODO: [나중에 추가할 기능]
    WARNING: [주의사항]
    """
    pass  # AI가 구현
```

### 3. Example-Driven Development
```javascript
const EXAMPLES = {
  input: { /* 입력 예시 */ },
  output: { /* 원하는 출력 예시 */ }
};
// "AI, make function that transforms input to output"
```

### 4. Natural Language Contracts
```python
REQUIREMENTS = """
- 유저는 이메일로 로그인할 수 있다
- 로그인하면 토큰을 받는다
- 토큰은 24시간 유효하다
"""
# "AI, implement all requirements"
```

### 5. Error Message Driven Development
```javascript
function todoFunction() {
  throw new Error("TODO: Connect to database");
  throw new Error("TODO: Add validation");
  throw new Error("TODO: Return formatted response");
}
// AI가 각 TODO를 순차적으로 해결
```

### 6. Working Code Collection
- proven-patterns/ 폴더에 작동하는 코드 보관
- AI가 필요시 복사해서 사용
- 새로운 패턴은 검증 후 추가

### 7. State-First Design
```javascript
const AppState = {
  currentUser: null,
  isLoggedIn: false,
  actions: {
    login: "Set currentUser and isLoggedIn=true",
    logout: "Clear currentUser and isLoggedIn=false"
  }
};
// AI가 액션 설명을 보고 구현
```

### AI 협업 워크플로우
1. **Describe**: 원하는 기능을 자연어로 설명
2. **Generate**: AI가 초기 구현 생성
3. **Test**: 실행하고 에러 메시지 복사
4. **Fix**: AI에게 에러 메시지 전달하여 수정
5. **Iterate**: 작동할 때까지 반복

### 금지 사항 (AI가 알아서 처리)
- 복잡한 디자인 패턴 고민 ❌
- 성능 최적화 고민 ❌
- 보안 구현 고민 ❌
- 코드 구조 고민 ❌

### 권장 사항
- 명확한 예시 제공 ✅
- 에러 메시지 그대로 복사 ✅
- 원하는 결과 설명 ✅
- 작동하는 코드 재사용 ✅