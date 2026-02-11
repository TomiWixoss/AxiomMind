import type { Goal } from '../../types/index';
import type { AIClient } from '../strategic/ai-client';
import type { DatabaseManager } from '../../utils/database';

export interface Task {
  id: string;
  goalId: string;
  description: string;
  action: string;
  parameters: Record<string, any>;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  dependencies: string[]; // Task IDs that must complete first
  estimatedDuration?: number; // seconds
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface TaskDecompositionResult {
  tasks: Task[];
  totalTasks: number;
  estimatedTime?: number;
}

export interface TaskValidation {
  valid: boolean;
  reason?: string;
  missingResources?: string[];
}

export interface TaskExecutionPlan {
  tasks: Task[];
  executionOrder: string[]; // Task IDs in execution order
  parallelGroups: string[][]; // Groups of tasks that can run in parallel
}

/**
 * TaskDecomposer - Breaks goals into executable tasks
 * Part of Tactical Layer
 */
export class TaskDecomposer {
  private logger: any;
  private database: DatabaseManager;
  private aiClient: AIClient;
  private tasks: Map<string, Task> = new Map();

  constructor(
    logger: any,
    database: DatabaseManager,
    aiClient: AIClient
  ) {
    this.logger = logger;
    this.database = database;
    this.aiClient = aiClient;

    this.logger.info('TaskDecomposer initialized');
  }

  /**
   * Decompose a goal into executable tasks using AI
   */
  async decomposeGoal(goal: Goal): Promise<TaskDecompositionResult> {
    try {
      this.logger.debug('Decomposing goal', { goalId: goal.id, description: goal.description });

      const prompt = `You are a Minecraft speedrun task planner. Break down this goal into specific, executable tasks.

Goal: ${goal.description}
Goal Type: ${goal.type}
Priority: ${goal.priority}

Return ONLY a valid JSON object with this exact structure:
{
  "tasks": [
    {
      "id": 1,
      "description": "Task description",
      "action": "tool_name",
      "parameters": { "param1": "value1" },
      "priority": 1,
      "dependencies": [],
      "estimatedDuration": 30
    }
  ]
}

Rules:
- Each task must have a specific action (tool name like: mine_block, craft_item, goto_location, etc.)
- Include parameters needed for the action
- Set dependencies as array of task IDs that must complete first
- Priority: 1 = highest, higher numbers = lower priority
- estimatedDuration in seconds
- Tasks should be atomic and executable
- Order tasks logically based on dependencies

Available tools: mine_block, craft_item, goto_location, eat_food, get_position, get_health, get_inventory, get_nearby_blocks`;

      const response = await this.aiClient.chat([
        { role: 'system', content: 'You are a Minecraft speedrun task decomposition expert.' },
        { role: 'user', content: prompt },
      ], {
        temperature: 0.7,
        responseFormat: {
          type: 'json_schema',
          json_schema: {
            name: 'task_decomposition',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      description: { type: 'string' },
                      action: { type: 'string' },
                      parameters: {
                        type: 'object',
                        additionalProperties: true,
                      },
                      priority: { type: 'number' },
                      dependencies: {
                        type: 'array',
                        items: { type: 'number' },
                      },
                      estimatedDuration: { type: 'number' },
                    },
                    required: ['id', 'description', 'action', 'parameters', 'priority', 'dependencies', 'estimatedDuration'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['tasks'],
              additionalProperties: false,
            },
          },
        },
      });

      const parsed = JSON.parse(response.content);
      const taskData = parsed.tasks || [];

      // Convert to Task objects
      const tasks: Task[] = taskData.map((t: any) => ({
        id: `${goal.id}_task_${t.id}`,
        goalId: goal.id,
        description: t.description,
        action: t.action,
        parameters: t.parameters,
        priority: t.priority,
        status: 'pending' as const,
        dependencies: t.dependencies.map((depId: number) => `${goal.id}_task_${depId}`),
        estimatedDuration: t.estimatedDuration,
        createdAt: new Date(),
      }));

      // Store tasks
      for (const task of tasks) {
        this.tasks.set(task.id, task);
      }

      const totalTime = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);

      this.logger.info('Goal decomposed into tasks', {
        goalId: goal.id,
        taskCount: tasks.length,
        estimatedTime: totalTime,
      });

      return {
        tasks,
        totalTasks: tasks.length,
        estimatedTime: totalTime,
      };
    } catch (error) {
      this.logger.error('Failed to decompose goal', { goalId: goal.id, error });
      return {
        tasks: [],
        totalTasks: 0,
      };
    }
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks for a goal
   */
  getTasksForGoal(goalId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter(task => task.goalId === goalId);
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get next executable task (no pending dependencies)
   */
  getNextExecutableTask(): Task | null {
    const pendingTasks = this.getPendingTasks();

    for (const task of pendingTasks) {
      if (this.canExecuteTask(task)) {
        return task;
      }
    }

    return null;
  }

  /**
   * Check if task can be executed (all dependencies completed)
   */
  canExecuteTask(task: Task): boolean {
    if (task.status !== 'pending') {
      return false;
    }

    // Check all dependencies are completed
    for (const depId of task.dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate task can be executed with current resources
   */
  validateTask(task: Task, worldState?: any): TaskValidation {
    // Basic validation
    if (!task.action) {
      return {
        valid: false,
        reason: 'Task has no action defined',
      };
    }

    // Check dependencies
    if (!this.canExecuteTask(task)) {
      const pendingDeps = task.dependencies.filter(depId => {
        const dep = this.tasks.get(depId);
        return !dep || dep.status !== 'completed';
      });

      return {
        valid: false,
        reason: 'Task has pending dependencies',
        missingResources: pendingDeps,
      };
    }

    // Validate parameters
    if (!task.parameters || typeof task.parameters !== 'object') {
      return {
        valid: false,
        reason: 'Task has invalid parameters',
      };
    }

    return { valid: true };
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    taskId: string,
    status: Task['status'],
    error?: string
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn('Task not found', { taskId });
      return;
    }

    task.status = status;
    if (error) {
      task.error = error;
    }
    if (status === 'completed') {
      task.completedAt = new Date();
    }

    this.logger.debug('Task status updated', {
      taskId,
      status,
      error,
    });
  }

  /**
   * Mark task as in progress
   */
  startTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn('Task not found', { taskId });
      return false;
    }

    if (!this.canExecuteTask(task)) {
      this.logger.warn('Task cannot be executed', { taskId });
      return false;
    }

    task.status = 'in_progress';
    this.logger.info('Task started', { taskId, description: task.description });
    return true;
  }

  /**
   * Mark task as completed
   */
  completeTask(taskId: string): void {
    this.updateTaskStatus(taskId, 'completed');
    this.logger.info('Task completed', { taskId });
  }

  /**
   * Mark task as failed
   */
  failTask(taskId: string, error: string): void {
    this.updateTaskStatus(taskId, 'failed', error);
    this.logger.warn('Task failed', { taskId, error });
  }

  /**
   * Create execution plan with dependency resolution
   */
  createExecutionPlan(goalId: string): TaskExecutionPlan {
    const tasks = this.getTasksForGoal(goalId);
    const executionOrder: string[] = [];
    const parallelGroups: string[][] = [];
    const completed = new Set<string>();

    // Build dependency graph
    const dependencyMap = new Map<string, Set<string>>();
    for (const task of tasks) {
      dependencyMap.set(task.id, new Set(task.dependencies));
    }

    // Topological sort with parallel group detection
    while (completed.size < tasks.length) {
      const currentGroup: string[] = [];

      // Find all tasks that can execute now
      for (const task of tasks) {
        if (completed.has(task.id)) continue;

        const deps = dependencyMap.get(task.id) || new Set();
        const allDepsMet = Array.from(deps).every(depId => completed.has(depId));

        if (allDepsMet) {
          currentGroup.push(task.id);
        }
      }

      if (currentGroup.length === 0) {
        // Circular dependency or blocked tasks
        this.logger.warn('Circular dependency detected or blocked tasks', {
          goalId,
          remaining: tasks.length - completed.size,
        });
        break;
      }

      // Add to execution order and parallel groups
      executionOrder.push(...currentGroup);
      parallelGroups.push(currentGroup);

      // Mark as completed
      for (const taskId of currentGroup) {
        completed.add(taskId);
      }
    }

    this.logger.debug('Execution plan created', {
      goalId,
      totalTasks: tasks.length,
      executionSteps: parallelGroups.length,
    });

    return {
      tasks,
      executionOrder,
      parallelGroups,
    };
  }

  /**
   * Get task statistics
   */
  getTaskStatistics(goalId?: string): {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    blocked: number;
  } {
    let tasks = Array.from(this.tasks.values());
    if (goalId) {
      tasks = tasks.filter(t => t.goalId === goalId);
    }

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
    };
  }

  /**
   * Clear all tasks
   */
  clearTasks(): void {
    this.tasks.clear();
    this.logger.debug('All tasks cleared');
  }

  /**
   * Clear tasks for specific goal
   */
  clearTasksForGoal(goalId: string): void {
    const tasksToRemove = Array.from(this.tasks.keys())
      .filter(taskId => {
        const task = this.tasks.get(taskId);
        return task?.goalId === goalId;
      });

    for (const taskId of tasksToRemove) {
      this.tasks.delete(taskId);
    }

    this.logger.debug('Tasks cleared for goal', { goalId, count: tasksToRemove.length });
  }

  /**
   * Get task progress percentage
   */
  getProgress(goalId?: string): number {
    const stats = this.getTaskStatistics(goalId);
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  }

  /**
   * Estimate remaining time
   */
  estimateRemainingTime(goalId?: string): number {
    let tasks = Array.from(this.tasks.values());
    if (goalId) {
      tasks = tasks.filter(t => t.goalId === goalId);
    }

    const pendingTasks = tasks.filter(t => 
      t.status === 'pending' || t.status === 'in_progress'
    );

    return pendingTasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
  }
}

export default TaskDecomposer;
