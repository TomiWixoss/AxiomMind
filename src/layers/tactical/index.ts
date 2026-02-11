// Tactical Layer - Task management, memory, and tool routing
export { MemoryManager } from './memory-manager';
export { ToolRouter } from './tool-router';
export { TaskDecomposer } from './task-decomposer';

export type {
  MemoryConfig,
  TokenUsage,
  ContextOptions,
  ConversationStats,
} from './memory-manager';

export type {
  ToolCall,
  ValidationResult,
} from './tool-router';

export type {
  Task,
  TaskDecompositionResult,
  TaskValidation,
  TaskExecutionPlan,
} from './task-decomposer';
