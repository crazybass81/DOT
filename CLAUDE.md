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

This is a JavaScript/TypeScript project optimized for modern web development. The project uses industry-standard tools and follows best practices for scalable application development.

## Development Commands

### Package Management
- `npm install` or `yarn install` - Install dependencies
- `npm ci` or `yarn install --frozen-lockfile` - Install dependencies for CI/CD
- `npm update` or `yarn upgrade` - Update dependencies

### Build Commands
- `npm run build` - Build the project for production
- `npm run dev` or `npm start` - Start development server
- `npm run preview` - Preview production build locally

### Testing Commands
- `npm test` or `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:e2e` - Run end-to-end tests

### Code Quality Commands
- `npm run lint` - Run ESLint for code linting
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking

### Development Tools
- `npm run storybook` - Start Storybook (if available)
- `npm run analyze` - Analyze bundle size
- `npm run clean` - Clean build artifacts

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