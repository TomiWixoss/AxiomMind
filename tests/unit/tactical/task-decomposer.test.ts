import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { TaskDecomposer } from '../../../src/layers/tactical/task-decomposer';
import type { Goal } from '../../../src/types/index';

// Mock logger
const mockLogger = {
  info: mock(() => {}),
  debug: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

// Mock database
const mockDatabase = {
  insertGoal: mock(() => {}),
  getGoal: mock(() => null),
  updateGoalStatus: mock(() => {}),
  getPendingGoals: mock(() => []),
  close: mock(() => {}),
} as any;

// Mock AI client
const createMockAIClient = () => ({
  chat: mock(async () => ({
    content: JSON.stringify({
      tasks: [
        {
          id: 1,
          description: 'Find oak trees',
          action: 'get_nearby_blocks',
          parameters: { blockType: 'oak_log', maxDistance: 32 },
          priority: 1,
          dependencies: [],
          estimatedDuration: 10,
        },
        {
          id: 2,
          description: 'Mine 10 oak logs',
          action: 'mine_block',
          parameters: { blockType: 'oak_log', count: 10 },
          priority: 2,
          dependencies: [1],
          estimatedDuration: 30,
        },
        {
          id: 3,
          description: 'Craft wooden planks',
          action: 'craft_item',
          parameters: { itemName: 'oak_planks', count: 40 },
          priority: 3,
          dependencies: [2],
          estimatedDuration: 5,
        },
      ],
    }),
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  })),
  chatWithTools: mock(async () => ({ content: '', usage: {} })),
  getConfig: mock(() => ({})),
});

// Create mock goal
const createMockGoal = (overrides?: Partial<Goal>): Goal => ({
  id: 'goal_1',
  type: 'sub',
  description: 'Gather wood',
  priority: 1,
  status: 'pending',
  createdAt: new Date(),
  ...overrides,
});

describe('TaskDecomposer', () => {
  let decomposer: TaskDecomposer;
  let mockAIClient: any;

  beforeEach(() => {
    mockAIClient = createMockAIClient();
    decomposer = new TaskDecomposer(mockLogger, mockDatabase, mockAIClient);
  });

  describe('Constructor', () => {
    test('should initialize task decomposer', () => {
      expect(decomposer).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('TaskDecomposer initialized');
    });
  });

  describe('decomposeGoal()', () => {
    test('should decompose goal into tasks', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      expect(result.tasks).toHaveLength(3);
      expect(result.totalTasks).toBe(3);
      expect(result.estimatedTime).toBe(45); // 10 + 30 + 5
    });

    test('should create tasks with correct structure', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const task = result.tasks[0];
      expect(task.id).toContain('goal_1_task_');
      expect(task.goalId).toBe('goal_1');
      expect(task.description).toBeDefined();
      expect(task.action).toBeDefined();
      expect(task.parameters).toBeDefined();
      expect(task.priority).toBeGreaterThan(0);
      expect(task.status).toBe('pending');
      expect(task.dependencies).toBeArray();
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    test('should handle dependencies correctly', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const task1 = result.tasks[0];
      const task2 = result.tasks[1];
      const task3 = result.tasks[2];

      expect(task1.dependencies).toHaveLength(0);
      expect(task2.dependencies).toHaveLength(1);
      expect(task2.dependencies[0]).toContain('task_1');
      expect(task3.dependencies).toHaveLength(1);
      expect(task3.dependencies[0]).toContain('task_2');
    });

    test('should store tasks internally', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      for (const task of result.tasks) {
        const stored = decomposer.getTask(task.id);
        expect(stored).toBeDefined();
        expect(stored?.id).toBe(task.id);
      }
    });

    test('should handle AI errors gracefully', async () => {
      mockAIClient.chat = mock(async () => {
        throw new Error('AI error');
      });

      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      expect(result.tasks).toHaveLength(0);
      expect(result.totalTasks).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should handle invalid JSON response', async () => {
      mockAIClient.chat = mock(async () => ({
        content: 'invalid json',
        usage: {},
      }));

      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      expect(result.tasks).toHaveLength(0);
      expect(result.totalTasks).toBe(0);
    });
  });

  describe('getTask()', () => {
    test('should return task by ID', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);
      const taskId = result.tasks[0].id;

      const task = decomposer.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
    });

    test('should return undefined for non-existent task', () => {
      const task = decomposer.getTask('non_existent_task');
      expect(task).toBeUndefined();
    });
  });

  describe('getTasksForGoal()', () => {
    test('should return all tasks for a goal', async () => {
      const goal = createMockGoal();
      await decomposer.decomposeGoal(goal);

      const tasks = decomposer.getTasksForGoal('goal_1');
      expect(tasks).toHaveLength(3);
      expect(tasks.every(t => t.goalId === 'goal_1')).toBe(true);
    });

    test('should return empty array for goal with no tasks', () => {
      const tasks = decomposer.getTasksForGoal('non_existent_goal');
      expect(tasks).toHaveLength(0);
    });
  });

  describe('getPendingTasks()', () => {
    test('should return pending tasks sorted by priority', async () => {
      const goal = createMockGoal();
      await decomposer.decomposeGoal(goal);

      const pending = decomposer.getPendingTasks();
      expect(pending).toHaveLength(3);
      expect(pending.every(t => t.status === 'pending')).toBe(true);

      // Check sorted by priority
      for (let i = 1; i < pending.length; i++) {
        expect(pending[i].priority).toBeGreaterThanOrEqual(pending[i - 1].priority);
      }
    });

    test('should not return completed tasks', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      decomposer.completeTask(result.tasks[0].id);

      const pending = decomposer.getPendingTasks();
      expect(pending).toHaveLength(2);
    });
  });

  describe('canExecuteTask()', () => {
    test('should return true for task with no dependencies', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const canExecute = decomposer.canExecuteTask(result.tasks[0]);
      expect(canExecute).toBe(true);
    });

    test('should return false for task with pending dependencies', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const canExecute = decomposer.canExecuteTask(result.tasks[1]);
      expect(canExecute).toBe(false);
    });

    test('should return true when all dependencies completed', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      decomposer.completeTask(result.tasks[0].id);

      const canExecute = decomposer.canExecuteTask(result.tasks[1]);
      expect(canExecute).toBe(true);
    });

    test('should return false for non-pending tasks', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      decomposer.completeTask(result.tasks[0].id);

      const canExecute = decomposer.canExecuteTask(result.tasks[0]);
      expect(canExecute).toBe(false);
    });
  });

  describe('getNextExecutableTask()', () => {
    test('should return first executable task', async () => {
      const goal = createMockGoal();
      await decomposer.decomposeGoal(goal);

      const next = decomposer.getNextExecutableTask();
      expect(next).toBeDefined();
      expect(next?.dependencies).toHaveLength(0);
    });

    test('should return null when no executable tasks', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      // Complete first task and start second
      decomposer.completeTask(result.tasks[0].id);
      decomposer.startTask(result.tasks[1].id);

      const next = decomposer.getNextExecutableTask();
      expect(next).toBeNull();
    });

    test('should skip tasks with pending dependencies', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const next = decomposer.getNextExecutableTask();
      expect(next?.id).toBe(result.tasks[0].id);
    });
  });

  describe('validateTask()', () => {
    test('should validate task with no action', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);
      const task = result.tasks[0];
      task.action = '';

      const validation = decomposer.validateTask(task);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('no action');
    });

    test('should validate task with pending dependencies', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const validation = decomposer.validateTask(result.tasks[1]);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('pending dependencies');
    });

    test('should validate task with invalid parameters', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);
      const task = result.tasks[0];
      task.parameters = null as any;

      const validation = decomposer.validateTask(task);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('invalid parameters');
    });

    test('should validate executable task', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const validation = decomposer.validateTask(result.tasks[0]);
      expect(validation.valid).toBe(true);
    });
  });

  describe('updateTaskStatus()', () => {
    test('should update task status', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);
      const taskId = result.tasks[0].id;

      decomposer.updateTaskStatus(taskId, 'in_progress');

      const task = decomposer.getTask(taskId);
      expect(task?.status).toBe('in_progress');
    });

    test('should set completedAt when completed', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);
      const taskId = result.tasks[0].id;

      decomposer.updateTaskStatus(taskId, 'completed');

      const task = decomposer.getTask(taskId);
      expect(task?.completedAt).toBeInstanceOf(Date);
    });

    test('should set error message', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);
      const taskId = result.tasks[0].id;

      decomposer.updateTaskStatus(taskId, 'failed', 'Test error');

      const task = decomposer.getTask(taskId);
      expect(task?.error).toBe('Test error');
    });

    test('should warn for non-existent task', () => {
      decomposer.updateTaskStatus('non_existent', 'completed');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('startTask()', () => {
    test('should start executable task', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const started = decomposer.startTask(result.tasks[0].id);
      expect(started).toBe(true);

      const task = decomposer.getTask(result.tasks[0].id);
      expect(task?.status).toBe('in_progress');
    });

    test('should not start task with pending dependencies', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const started = decomposer.startTask(result.tasks[1].id);
      expect(started).toBe(false);
    });

    test('should return false for non-existent task', () => {
      const started = decomposer.startTask('non_existent');
      expect(started).toBe(false);
    });
  });

  describe('completeTask()', () => {
    test('should mark task as completed', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      decomposer.completeTask(result.tasks[0].id);

      const task = decomposer.getTask(result.tasks[0].id);
      expect(task?.status).toBe('completed');
      expect(task?.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('failTask()', () => {
    test('should mark task as failed with error', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      decomposer.failTask(result.tasks[0].id, 'Test error');

      const task = decomposer.getTask(result.tasks[0].id);
      expect(task?.status).toBe('failed');
      expect(task?.error).toBe('Test error');
    });
  });

  describe('createExecutionPlan()', () => {
    test('should create execution plan with correct order', async () => {
      const goal = createMockGoal();
      await decomposer.decomposeGoal(goal);

      const plan = decomposer.createExecutionPlan('goal_1');

      expect(plan.tasks).toHaveLength(3);
      expect(plan.executionOrder).toHaveLength(3);
      expect(plan.parallelGroups).toHaveLength(3);
    });

    test('should respect dependencies in execution order', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      const plan = decomposer.createExecutionPlan('goal_1');

      const task1Index = plan.executionOrder.indexOf(result.tasks[0].id);
      const task2Index = plan.executionOrder.indexOf(result.tasks[1].id);
      const task3Index = plan.executionOrder.indexOf(result.tasks[2].id);

      expect(task1Index).toBeLessThan(task2Index);
      expect(task2Index).toBeLessThan(task3Index);
    });

    test('should identify parallel execution groups', async () => {
      const goal = createMockGoal();
      await decomposer.decomposeGoal(goal);

      const plan = decomposer.createExecutionPlan('goal_1');

      // First group should have task with no dependencies
      expect(plan.parallelGroups[0]).toHaveLength(1);
    });
  });

  describe('getTaskStatistics()', () => {
    test('should return statistics for all tasks', async () => {
      const goal = createMockGoal();
      await decomposer.decomposeGoal(goal);

      const stats = decomposer.getTaskStatistics();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(3);
      expect(stats.inProgress).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.blocked).toBe(0);
    });

    test('should return statistics for specific goal', async () => {
      const goal = createMockGoal();
      await decomposer.decomposeGoal(goal);

      const stats = decomposer.getTaskStatistics('goal_1');

      expect(stats.total).toBe(3);
    });

    test('should update statistics when tasks change', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      decomposer.completeTask(result.tasks[0].id);
      decomposer.startTask(result.tasks[1].id);

      const stats = decomposer.getTaskStatistics();

      expect(stats.completed).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });

  describe('getProgress()', () => {
    test('should return 0 for no tasks', () => {
      const progress = decomposer.getProgress();
      expect(progress).toBe(0);
    });

    test('should calculate progress percentage', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      decomposer.completeTask(result.tasks[0].id);

      const progress = decomposer.getProgress('goal_1');
      expect(progress).toBe(33); // 1/3 = 33%
    });

    test('should return 100 when all tasks completed', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      for (const task of result.tasks) {
        decomposer.completeTask(task.id);
      }

      const progress = decomposer.getProgress('goal_1');
      expect(progress).toBe(100);
    });
  });

  describe('estimateRemainingTime()', () => {
    test('should return 0 for no tasks', () => {
      const time = decomposer.estimateRemainingTime();
      expect(time).toBe(0);
    });

    test('should calculate remaining time', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      decomposer.completeTask(result.tasks[0].id);

      const time = decomposer.estimateRemainingTime('goal_1');
      expect(time).toBe(35); // 30 + 5 (task 2 and 3)
    });

    test('should return 0 when all tasks completed', async () => {
      const goal = createMockGoal();
      const result = await decomposer.decomposeGoal(goal);

      for (const task of result.tasks) {
        decomposer.completeTask(task.id);
      }

      const time = decomposer.estimateRemainingTime('goal_1');
      expect(time).toBe(0);
    });
  });

  describe('clearTasks()', () => {
    test('should clear all tasks', async () => {
      const goal = createMockGoal();
      await decomposer.decomposeGoal(goal);

      decomposer.clearTasks();

      const tasks = decomposer.getPendingTasks();
      expect(tasks).toHaveLength(0);
    });
  });

  describe('clearTasksForGoal()', () => {
    test('should clear tasks for specific goal', async () => {
      const goal = createMockGoal();
      await decomposer.decomposeGoal(goal);

      decomposer.clearTasksForGoal('goal_1');

      const tasks = decomposer.getTasksForGoal('goal_1');
      expect(tasks).toHaveLength(0);
    });

    test('should not affect other goals', async () => {
      const goal1 = createMockGoal({ id: 'goal_1' });
      const goal2 = createMockGoal({ id: 'goal_2' });

      await decomposer.decomposeGoal(goal1);
      await decomposer.decomposeGoal(goal2);

      decomposer.clearTasksForGoal('goal_1');

      const tasks1 = decomposer.getTasksForGoal('goal_1');
      const tasks2 = decomposer.getTasksForGoal('goal_2');

      expect(tasks1).toHaveLength(0);
      expect(tasks2).toHaveLength(3);
    });
  });
});
