export { ContextOrchestrator } from './ContextOrchestrator';
export { FileSystemWatcher } from './watchers/FileSystemWatcher';
export { ContextAnalyzer } from './analyzers/ContextAnalyzer';
export { DocumentationUpdater } from './updaters/DocumentationUpdater';
export { RefactoringEngine } from './refactoring/RefactoringEngine';

export type {
  FileChange,
  WatcherOptions
} from './watchers/FileSystemWatcher';

export type {
  ContextChange,
  AnalysisResult,
  RefactoringTask,
  DependencyChange
} from './analyzers/ContextAnalyzer';

export type {
  DocumentUpdate,
  UpdateSection,
  UpdatePlan,
  ValidationCheck
} from './updaters/DocumentationUpdater';

export type {
  RefactoringPlan,
  RefactoringResult,
  TestRequirement,
  RollbackStrategy
} from './refactoring/RefactoringEngine';

export type {
  OrchestratorConfig,
  OrchestratorStatus
} from './ContextOrchestrator';