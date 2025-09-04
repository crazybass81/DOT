# Context Manager - Enterprise Context Consistency System

## 🎯 Overview

Context Manager is an enterprise-grade system for maintaining consistency across your entire codebase. It automatically detects changes, analyzes their impact, updates documentation, and suggests refactorings - all while maintaining perfect synchronization between code, documentation, and architecture.

## ✨ Features

- **🔍 Real-time File Monitoring**: Watches your project for changes with intelligent debouncing
- **🧠 AI-Powered Analysis**: Analyzes impact of changes using MCP integration
- **📝 Automatic Documentation Updates**: Keeps docs in sync with code changes
- **🔧 Smart Refactoring Engine**: Suggests and executes refactoring based on complexity analysis
- **🎭 Breaking Change Detection**: Identifies and handles breaking changes proactively
- **✅ Consistency Validation**: Validates project-wide consistency continuously
- **🔄 Rollback Capability**: Safe refactoring with automatic rollback on test failure

## 🚀 Quick Start

### Installation

```bash
# Install in your project
npm install @dot/context-manager

# Or globally
npm install -g @dot/context-manager
```

### Initialize Configuration

```bash
context-manager init
```

This creates `.vscode/context-manager.json` with default settings.

### Start Monitoring

```bash
# Start with default settings
context-manager start

# With options
context-manager start --auto-update --no-approval
```

### CLI Commands

```bash
# Analyze specific files
context-manager analyze src/api.ts src/auth.ts

# Validate project consistency
context-manager validate

# Watch mode with real-time updates
context-manager watch --patterns "**/*.ts,**/*.md"

# Initialize configuration
context-manager init
```

## 🔧 Configuration

### `.vscode/context-manager.json`

```json
{
  "context-manager": {
    "enabled": true,
    "autoUpdate": true,
    "watchPatterns": [
      "src/**/*.{js,ts,jsx,tsx}",
      "docs/**/*.md"
    ],
    "ignoredPaths": [
      "**/node_modules/**",
      "**/.git/**"
    ],
    "refactoring": {
      "autoSuggest": true,
      "requireApproval": true,
      "complexityThreshold": 10
    },
    "documentation": {
      "autoGenerate": true,
      "updateOnSave": true
    },
    "mcp": {
      "enabled": true,
      "servers": ["serena", "morphllm", "sequential-thinking"]
    }
  }
}
```

## 📚 API Usage

### TypeScript/JavaScript

```typescript
import { ContextOrchestrator } from '@dot/context-manager';

const orchestrator = new ContextOrchestrator({
  projectPath: './my-project',
  autoUpdate: true,
  requireApproval: false
});

// Event handlers
orchestrator.on('breaking:changes', (data) => {
  console.log('Breaking changes detected:', data);
});

orchestrator.on('refactoring:complete', (result) => {
  console.log('Refactoring completed:', result);
});

// Start monitoring
await orchestrator.start();

// Manual analysis
const analysis = await orchestrator.forceAnalysis(['src/api.ts']);
console.log('Analysis:', analysis);

// Stop monitoring
await orchestrator.stop();
```

## 🏗️ Architecture

```
context-manager/
├── watchers/          # File system monitoring
│   └── FileSystemWatcher.ts
├── analyzers/         # Change impact analysis
│   └── ContextAnalyzer.ts
├── updaters/          # Documentation updates
│   └── DocumentationUpdater.ts
├── refactoring/       # Refactoring engine
│   └── RefactoringEngine.ts
└── ContextOrchestrator.ts  # Main orchestrator
```

## 🔄 How It Works

1. **File Monitoring**: Watches specified patterns for changes
2. **Change Analysis**: Analyzes impact (minor/major/breaking)
3. **Documentation Update**: Updates relevant documentation
4. **Refactoring Suggestion**: Identifies refactoring opportunities
5. **Validation**: Ensures consistency across the project
6. **Execution**: Applies changes with rollback capability

## 🎯 Use Cases

### Automatic Documentation Sync

When you change an API endpoint, Context Manager automatically:
- Updates API documentation
- Modifies changelog
- Updates affected component docs
- Notifies about breaking changes

### Refactoring Assistance

Detects and helps with:
- High complexity functions (cyclomatic complexity > 10)
- Code duplication across files
- Circular dependencies
- Unused imports and dead code

### Breaking Change Management

- Creates feature branches automatically
- Generates migration guides
- Updates all affected documentation
- Notifies team members

## 🔌 MCP Integration

Context Manager integrates with MCP servers for enhanced capabilities:

- **Serena**: Semantic code understanding
- **Morphllm**: Pattern-based refactoring
- **Sequential-thinking**: Complex analysis
- **Context7**: Documentation patterns

## 📊 Performance

- **Debounced Processing**: Groups changes for efficiency
- **Parallel Analysis**: Processes multiple files concurrently
- **Incremental Updates**: Only processes changed sections
- **Smart Caching**: Caches dependency graphs and analysis results

## 🛡️ Safety Features

- **Snapshot Creation**: Before any refactoring
- **Test Validation**: Runs tests before committing changes
- **Rollback Strategy**: Automatic rollback on failure
- **Approval Queue**: Optional manual approval for changes

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- **Documentation**: [Full Docs](https://docs.context-manager.dev)
- **Issues**: [GitHub Issues](https://github.com/dot/context-manager/issues)
- **Discord**: [Join our community](https://discord.gg/context-manager)

## 🚦 Status

- ✅ File System Watcher
- ✅ Context Analyzer
- ✅ Documentation Updater
- ✅ Refactoring Engine
- ✅ Orchestrator
- ✅ CLI Interface
- ✅ VSCode Integration
- 🚧 Web Dashboard (coming soon)
- 🚧 GitHub Actions Integration (coming soon)