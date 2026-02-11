import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { GoalPlanner } from '../../../src/layers/strategic/goal-planner';
import type { Config } from '../../../src/core/config';

describe('GoalPlanner', () => {
  let goalPlanner: GoalPlanner;
  let mockConfig: Config;
  let mockLogger: any;
  let mockDatabase: any;
  let mockAIClient: any;

  beforeEach(() => {
    mockConfig = {
      minecraft: {
        host: 'localhost',
        port: 25565,
        username: 'TestBot',
        version: '1.20.1',
      },
      ai: {
        provider: 'nvidia',
        model: 'test-model',
        apiKey: 'test-key',
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.9,
        maxToolIterations: 10,
      },
      bot: {
        autoEat: true,
        autoArmor: true,
        viewerPort: 3000,
        dashboardPort: 3001,
      },
      database: {
        path: './test-memory.db',
      },
      memory: {
        maxTokens: 200000,
        keepMessages: 50,
      },
    };

    mockLogger = {
      info: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
      warn: mock(() => {}),
    };

    mockDatabase = {
      insertGoal: mock(() => {}),
      updateGoalStatus: mock(() => {}),
      getPendingGoals: mock(() => []),
    };

    mockAIClient = {
      chat: mock(async () => ({
        content: 'Test response',
        usage: { total_tokens: 100 },
      })),
      chatWithTools: mock(async () => ({
        content: 'Test response with tools',
        usage: { total_tokens: 150 },
      })),
    };

    goalPlanner = new GoalPlanner(mockConfig, mockLogger, mockDatabase, mockAIClient);
  });

  describe('constructor', () => {
    test('should initialize with dependencies', () => {
      expect(goalPlanner).toBeDefined();
    });

    test('should set main goal', () => {
      const mainGoal = goalPlanner.getMainGoal();
      expect(mainGoal).toBe('Beat the Ender Dragon');
    });
  });

  describe('getMainGoal', () => {
    test('should return main goal', () => {
      const goal = goalPlanner.getMainGoal();
      expect(goal).toBe('Beat the Ender Dragon');
    });
  });

  describe('setMainGoal', () => {
    test('should update main goal', () => {
      goalPlanner.setMainGoal('Collect 10 diamonds');
      expect(goalPlanner.getMainGoal()).toBe('Collect 10 diamonds');
    });

    test('should log goal change', () => {
      goalPlanner.setMainGoal('New goal');
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('decomposeGoal', () => {
    test('should decompose main goal into sub-goals', async () => {
      mockAIClient.chat = mock(async () => ({
        content: JSON.stringify({
          subGoals: [
            { id: 1, description: 'Gather wood', priority: 1 },
            { id: 2, description: 'Build crafting table', priority: 2 },
          ],
        }),
        usage: { total_tokens: 200 },
      }));

      const subGoals = await goalPlanner.decomposeGoal('Gather resources');

      expect(subGoals).toBeArray();
      expect(subGoals.length).toBe(2);
      expect(subGoals[0]).toHaveProperty('description');
      expect(subGoals[0]).toHaveProperty('priority');
    });

    test('should handle AI errors gracefully', async () => {
      mockAIClient.chat = mock(async () => {
        throw new Error('AI error');
      });

      const subGoals = await goalPlanner.decomposeGoal('Test goal');
      expect(subGoals).toBeArray();
      expect(subGoals.length).toBe(0);
    });

    test('should handle invalid JSON response', async () => {
      mockAIClient.chat = mock(async () => ({
        content: 'Invalid JSON',
        usage: { total_tokens: 50 },
      }));

      const subGoals = await goalPlanner.decomposeGoal('Test goal');
      expect(subGoals).toBeArray();
      expect(subGoals.length).toBe(0);
    });
  });

  describe('planNextAction', () => {
    test('should plan next action based on current state', async () => {
      const worldState = {
        position: { x: 0, y: 64, z: 0 },
        health: 20,
        food: 20,
        inventory: [],
      };

      mockAIClient.chat = mock(async () => ({
        content: JSON.stringify({
          action: 'gather_wood',
          reasoning: 'Need wood for crafting',
        }),
        usage: { total_tokens: 150 },
      }));

      const action = await goalPlanner.planNextAction(worldState);

      expect(action).toHaveProperty('action');
      expect(action).toHaveProperty('reasoning');
      expect(mockAIClient.chat).toHaveBeenCalled();
    });

    test('should include current goal in planning', async () => {
      const worldState = { position: { x: 0, y: 64, z: 0 } };
      
      await goalPlanner.planNextAction(worldState);

      const callArgs = mockAIClient.chat.mock.calls[0];
      const messages = callArgs[0];
      const prompt = messages[messages.length - 1].content;

      expect(prompt).toContain('Beat the Ender Dragon');
    });
  });

  describe('evaluateProgress', () => {
    test('should evaluate progress towards goal', async () => {
      const worldState = {
        position: { x: 0, y: 64, z: 0 },
        inventory: [{ name: 'diamond', count: 5 }],
      };

      mockAIClient.chat = mock(async () => ({
        content: JSON.stringify({
          progress: 0.3,
          assessment: 'Making good progress',
          nextSteps: ['Find more diamonds'],
        }),
        usage: { total_tokens: 100 },
      }));

      const evaluation = await goalPlanner.evaluateProgress(worldState);

      expect(evaluation).toHaveProperty('progress');
      expect(evaluation).toHaveProperty('assessment');
      expect(evaluation.progress).toBeGreaterThanOrEqual(0);
      expect(evaluation.progress).toBeLessThanOrEqual(1);
    });

    test('should handle evaluation errors', async () => {
      mockAIClient.chat = mock(async () => {
        throw new Error('Evaluation failed');
      });

      const evaluation = await goalPlanner.evaluateProgress({});

      expect(evaluation.progress).toBe(0);
      expect(evaluation.assessment).toContain('Unable to evaluate');
    });
  });

  describe('saveGoal', () => {
    test('should save goal to database', async () => {
      const goalId = await goalPlanner.saveGoal('main', 'Beat Ender Dragon', 1);

      expect(goalId).toBeString();
      expect(mockDatabase.insertGoal).toHaveBeenCalled();
    });

    test('should log save operation', async () => {
      await goalPlanner.saveGoal('sub', 'Gather wood', 2);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('updateGoalStatus', () => {
    test('should update goal status in database', async () => {
      await goalPlanner.updateGoalStatus('goal_123', 'completed');

      expect(mockDatabase.updateGoalStatus).toHaveBeenCalledWith('goal_123', 'completed');
    });

    test('should log status update', async () => {
      await goalPlanner.updateGoalStatus('goal_123', 'in_progress');
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('getActiveGoals', () => {
    test('should retrieve active goals from database', async () => {
      mockDatabase.getPendingGoals = mock(() => [
        { id: 'goal_1', type: 'main', description: 'Main goal', status: 'pending', priority: 1, createdAt: new Date() },
        { id: 'goal_2', type: 'sub', description: 'Sub goal', status: 'pending', priority: 2, createdAt: new Date() },
      ]);

      const goals = await goalPlanner.getActiveGoals();

      expect(goals).toBeArray();
      expect(goals.length).toBe(2);
      expect(mockDatabase.getPendingGoals).toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      mockDatabase.getPendingGoals = mock(() => {
        throw new Error('Database error');
      });

      const goals = await goalPlanner.getActiveGoals();
      expect(goals).toBeArray();
      expect(goals.length).toBe(0);
    });
  });

  describe('prioritizeGoals', () => {
    test('should sort goals by priority', () => {
      const goals = [
        { id: 1, priority: 3, description: 'Low priority' },
        { id: 2, priority: 1, description: 'High priority' },
        { id: 3, priority: 2, description: 'Medium priority' },
      ];

      const sorted = goalPlanner.prioritizeGoals(goals);

      expect(sorted[0].priority).toBe(1);
      expect(sorted[1].priority).toBe(2);
      expect(sorted[2].priority).toBe(3);
    });

    test('should handle empty goal list', () => {
      const sorted = goalPlanner.prioritizeGoals([]);
      expect(sorted).toBeArray();
      expect(sorted.length).toBe(0);
    });
  });
});
