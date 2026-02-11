import type { Config } from '../../core/config';
import type { DatabaseManager } from '../../utils/database';
import type { AIClient } from './ai-client';
import type { Goal } from '../../types/index';

export interface SubGoal {
  id?: number;
  description: string;
  priority: number;
  status?: string;
}

export interface WorldState {
  position?: { x: number; y: number; z: number };
  health?: number;
  food?: number;
  inventory?: any[];
  [key: string]: any;
}

export interface NextAction {
  action: string;
  reasoning: string;
  parameters?: Record<string, any>;
}

export interface ProgressEvaluation {
  progress: number;
  assessment: string;
  nextSteps?: string[];
}

/**
 * GoalPlanner - AI-powered goal planning and decomposition
 * Part of Strategic Layer
 */
export class GoalPlanner {
  private config: Config;
  private logger: any;
  private database: DatabaseManager;
  private aiClient: AIClient;
  private mainGoal: string;

  constructor(
    config: Config,
    logger: any,
    database: DatabaseManager,
    aiClient: AIClient
  ) {
    this.config = config;
    this.logger = logger;
    this.database = database;
    this.aiClient = aiClient;
    this.mainGoal = 'Beat the Ender Dragon';

    this.logger.info('GoalPlanner initialized', {
      mainGoal: this.mainGoal,
    });
  }

  /**
   * Get main goal
   */
  getMainGoal(): string {
    return this.mainGoal;
  }

  /**
   * Set main goal
   */
  setMainGoal(goal: string): void {
    this.logger.info('Main goal updated', {
      oldGoal: this.mainGoal,
      newGoal: goal,
    });
    this.mainGoal = goal;
  }

  /**
   * Decompose a goal into sub-goals using AI
   */
  async decomposeGoal(goal: string): Promise<SubGoal[]> {
    try {
      this.logger.debug('Decomposing goal', { goal });

      const prompt = `You are a Minecraft speedrun expert. Decompose this goal into specific, actionable sub-goals:

Goal: ${goal}

Return ONLY a valid JSON object with this exact structure:
{
  "subGoals": [
    { "id": 1, "description": "...", "priority": 1 },
    { "id": 2, "description": "...", "priority": 2 }
  ]
}

Priority: 1 = highest, higher numbers = lower priority.
Focus on speedrun efficiency. Be specific and actionable.`;

      const response = await this.aiClient.chat([
        { role: 'system', content: 'You are a Minecraft speedrun planning assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ], {
        temperature: 0.7,
        responseFormat: { type: 'json_object' },
      });

      // Parse AI response
      const parsed = JSON.parse(response.content);
      const subGoals = parsed.subGoals || [];

      this.logger.info('Goal decomposed', {
        goal,
        subGoalCount: subGoals.length,
      });

      return subGoals;
    } catch (error) {
      this.logger.error('Failed to decompose goal', { goal, error });
      return [];
    }
  }

  /**
   * Plan next action based on current world state
   */
  async planNextAction(worldState: WorldState): Promise<NextAction> {
    try {
      this.logger.debug('Planning next action', { worldState });

      const prompt = `You are a Minecraft speedrun bot. Based on the current state, what should be the next action?

Main Goal: ${this.mainGoal}

Current State:
${JSON.stringify(worldState, null, 2)}

Return ONLY a valid JSON object:
{
  "action": "action_name",
  "reasoning": "why this action",
  "parameters": { "param1": "value1" }
}

Be specific and focus on speedrun efficiency.`;

      const response = await this.aiClient.chat([
        { role: 'system', content: 'You are a Minecraft speedrun action planner. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ], {
        temperature: 0.7,
        responseFormat: { type: 'json_object' },
      });

      const action = JSON.parse(response.content);

      this.logger.info('Next action planned', {
        action: action.action,
        reasoning: action.reasoning,
      });

      return action;
    } catch (error) {
      this.logger.error('Failed to plan next action', { error });
      return {
        action: 'idle',
        reasoning: 'Unable to plan action due to error',
      };
    }
  }

  /**
   * Evaluate progress towards goal
   */
  async evaluateProgress(worldState: WorldState): Promise<ProgressEvaluation> {
    try {
      this.logger.debug('Evaluating progress', { worldState });

      const prompt = `Evaluate progress towards this goal:

Goal: ${this.mainGoal}

Current State:
${JSON.stringify(worldState, null, 2)}

Return ONLY a valid JSON object:
{
  "progress": 0.5,
  "assessment": "description of progress",
  "nextSteps": ["step1", "step2"]
}

Progress: 0.0 to 1.0 (0 = not started, 1 = completed)`;

      const response = await this.aiClient.chat([
        { role: 'system', content: 'You are a Minecraft speedrun progress evaluator. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ], {
        temperature: 0.7,
        responseFormat: { type: 'json_object' },
      });

      const evaluation = JSON.parse(response.content);

      this.logger.info('Progress evaluated', {
        progress: evaluation.progress,
        assessment: evaluation.assessment,
      });

      return evaluation;
    } catch (error) {
      this.logger.error('Failed to evaluate progress', { error });
      return {
        progress: 0,
        assessment: 'Unable to evaluate progress',
        nextSteps: [],
      };
    }
  }

  /**
   * Save goal to database
   */
  async saveGoal(type: 'main' | 'sub' | 'task', description: string, priority: number): Promise<string> {
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.logger.debug('Saving goal', { goalId, type, description, priority });
    
    this.database.insertGoal({
      id: goalId,
      type,
      description,
      priority,
      status: 'pending',
      parentId: undefined,
    });
    
    return goalId;
  }

  /**
   * Update goal status
   */
  async updateGoalStatus(goalId: string, status: 'pending' | 'in_progress' | 'completed' | 'failed'): Promise<void> {
    this.logger.debug('Updating goal status', { goalId, status });
    this.database.updateGoalStatus(goalId, status);
  }

  /**
   * Get active goals (pending)
   */
  async getActiveGoals(): Promise<Goal[]> {
    try {
      return this.database.getPendingGoals();
    } catch (error) {
      this.logger.error('Failed to get active goals', { error });
      return [];
    }
  }

  /**
   * Prioritize goals by priority value
   */
  prioritizeGoals(goals: SubGoal[] | Goal[]): (SubGoal | Goal)[] {
    return [...goals].sort((a, b) => a.priority - b.priority);
  }
}

export default GoalPlanner;
