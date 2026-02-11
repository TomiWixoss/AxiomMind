import type { Bot } from 'mineflayer';

export enum BotState {
  IDLE = 'idle',
  PLANNING = 'planning',
  MINING = 'mining',
  CRAFTING = 'crafting',
  NAVIGATING = 'navigating',
  COMBAT = 'combat',
  EATING = 'eating',
  GATHERING = 'gathering',
  BUILDING = 'building',
  ERROR = 'error',
}

export interface StateTransition {
  from: BotState;
  to: BotState;
  timestamp: Date;
  reason?: string;
}

export interface StateConfig {
  allowedTransitions: Map<BotState, BotState[]>;
  onEnter?: (state: BotState) => void | Promise<void>;
  onExit?: (state: BotState) => void | Promise<void>;
}

/**
 * StateMachine - Manages bot state transitions
 * Part of Execution Layer
 */
export class StateMachine {
  private currentState: BotState;
  private previousState?: BotState;
  private history: StateTransition[] = [];
  private maxHistorySize: number = 100;
  private logger: any;
  private bot: Bot;
  private config: StateConfig;

  // Default allowed transitions
  private readonly DEFAULT_TRANSITIONS = new Map<BotState, BotState[]>([
    [BotState.IDLE, [BotState.PLANNING, BotState.EATING, BotState.ERROR]],
    [BotState.PLANNING, [BotState.MINING, BotState.CRAFTING, BotState.NAVIGATING, BotState.GATHERING, BotState.COMBAT, BotState.IDLE, BotState.ERROR]],
    [BotState.MINING, [BotState.IDLE, BotState.NAVIGATING, BotState.EATING, BotState.COMBAT, BotState.ERROR]],
    [BotState.CRAFTING, [BotState.IDLE, BotState.NAVIGATING, BotState.ERROR]],
    [BotState.NAVIGATING, [BotState.IDLE, BotState.MINING, BotState.CRAFTING, BotState.GATHERING, BotState.BUILDING, BotState.COMBAT, BotState.ERROR]],
    [BotState.COMBAT, [BotState.IDLE, BotState.NAVIGATING, BotState.EATING, BotState.ERROR]],
    [BotState.EATING, [BotState.IDLE, BotState.MINING, BotState.NAVIGATING, BotState.COMBAT, BotState.ERROR]],
    [BotState.GATHERING, [BotState.IDLE, BotState.NAVIGATING, BotState.MINING, BotState.ERROR]],
    [BotState.BUILDING, [BotState.IDLE, BotState.NAVIGATING, BotState.ERROR]],
    [BotState.ERROR, [BotState.IDLE, BotState.PLANNING]],
  ]);

  constructor(bot: Bot, logger: any, config?: Partial<StateConfig>) {
    this.bot = bot;
    this.logger = logger;
    this.currentState = BotState.IDLE;
    this.config = {
      allowedTransitions: config?.allowedTransitions || this.DEFAULT_TRANSITIONS,
      onEnter: config?.onEnter,
      onExit: config?.onExit,
    };

    this.logger.info('StateMachine initialized', { initialState: this.currentState });
  }

  /**
   * Get current state
   */
  getCurrentState(): BotState {
    return this.currentState;
  }

  /**
   * Get previous state
   */
  getPreviousState(): BotState | undefined {
    return this.previousState;
  }

  /**
   * Check if transition is allowed
   */
  canTransition(to: BotState): boolean {
    const allowedStates = this.config.allowedTransitions.get(this.currentState);
    if (!allowedStates) {
      return false;
    }
    return allowedStates.includes(to);
  }

  /**
   * Transition to new state
   */
  async transition(to: BotState, reason?: string): Promise<boolean> {
    if (this.currentState === to) {
      this.logger.debug('Already in target state', { state: to });
      return true;
    }

    if (!this.canTransition(to)) {
      this.logger.warn('Invalid state transition', {
        from: this.currentState,
        to,
        reason: 'Transition not allowed',
      });
      return false;
    }

    const from = this.currentState;

    try {
      // Call onExit callback
      if (this.config.onExit) {
        await this.config.onExit(from);
      }

      // Update state
      this.previousState = from;
      this.currentState = to;

      // Record transition
      const transition: StateTransition = {
        from,
        to,
        timestamp: new Date(),
        reason,
      };
      this.history.push(transition);

      // Trim history if needed
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(-this.maxHistorySize);
      }

      // Call onEnter callback
      if (this.config.onEnter) {
        await this.config.onEnter(to);
      }

      this.logger.info('State transition', {
        from,
        to,
        reason,
      });

      return true;
    } catch (error) {
      this.logger.error('Error during state transition', {
        from,
        to,
        error,
      });

      // Revert state on error
      this.currentState = from;
      return false;
    }
  }

  /**
   * Force transition to error state
   */
  async transitionToError(reason: string): Promise<void> {
    await this.transition(BotState.ERROR, reason);
  }

  /**
   * Return to idle state
   */
  async returnToIdle(reason?: string): Promise<boolean> {
    return await this.transition(BotState.IDLE, reason || 'Returning to idle');
  }

  /**
   * Check if in specific state
   */
  isInState(state: BotState): boolean {
    return this.currentState === state;
  }

  /**
   * Check if idle
   */
  isIdle(): boolean {
    return this.currentState === BotState.IDLE;
  }

  /**
   * Check if busy (not idle or planning)
   */
  isBusy(): boolean {
    return this.currentState !== BotState.IDLE && this.currentState !== BotState.PLANNING;
  }

  /**
   * Check if in error state
   */
  isError(): boolean {
    return this.currentState === BotState.ERROR;
  }

  /**
   * Get state history
   */
  getHistory(limit?: number): StateTransition[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Get time in current state
   */
  getTimeInCurrentState(): number {
    const lastTransition = this.history[this.history.length - 1];
    if (!lastTransition) {
      return 0;
    }
    return Date.now() - lastTransition.timestamp.getTime();
  }

  /**
   * Get state statistics
   */
  getStatistics(): {
    currentState: BotState;
    previousState?: BotState;
    timeInCurrentState: number;
    totalTransitions: number;
    stateFrequency: Map<BotState, number>;
  } {
    const stateFrequency = new Map<BotState, number>();

    for (const transition of this.history) {
      const count = stateFrequency.get(transition.to) || 0;
      stateFrequency.set(transition.to, count + 1);
    }

    return {
      currentState: this.currentState,
      previousState: this.previousState,
      timeInCurrentState: this.getTimeInCurrentState(),
      totalTransitions: this.history.length,
      stateFrequency,
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    this.logger.debug('State history cleared');
  }

  /**
   * Reset to idle state
   */
  async reset(): Promise<void> {
    this.previousState = this.currentState;
    this.currentState = BotState.IDLE;
    this.history = [];
    this.logger.info('StateMachine reset to idle');
  }
}

export default StateMachine;
