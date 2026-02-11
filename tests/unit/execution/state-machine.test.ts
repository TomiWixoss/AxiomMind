import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { StateMachine, BotState } from '../../../src/layers/execution/state-machine';
import type { Bot } from 'mineflayer';

// Mock logger
const mockLogger = {
  info: mock(() => {}),
  debug: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

// Mock bot
const createMockBot = (): Partial<Bot> => ({
  entity: {
    position: { x: 0, y: 64, z: 0 },
  } as any,
  version: '1.21.1',
});

describe('StateMachine', () => {
  let stateMachine: StateMachine;
  let mockBot: Partial<Bot>;

  beforeEach(() => {
    mockBot = createMockBot();
    stateMachine = new StateMachine(mockBot as Bot, mockLogger);
  });

  describe('Constructor', () => {
    test('should initialize with IDLE state', () => {
      expect(stateMachine.getCurrentState()).toBe(BotState.IDLE);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should accept custom config', () => {
      const customTransitions = new Map([[BotState.IDLE, [BotState.PLANNING]]]);
      const customMachine = new StateMachine(mockBot as Bot, mockLogger, {
        allowedTransitions: customTransitions,
      });
      expect(customMachine.getCurrentState()).toBe(BotState.IDLE);
    });
  });

  describe('getCurrentState()', () => {
    test('should return current state', () => {
      expect(stateMachine.getCurrentState()).toBe(BotState.IDLE);
    });
  });

  describe('getPreviousState()', () => {
    test('should return undefined initially', () => {
      expect(stateMachine.getPreviousState()).toBeUndefined();
    });

    test('should return previous state after transition', async () => {
      await stateMachine.transition(BotState.PLANNING);
      expect(stateMachine.getPreviousState()).toBe(BotState.IDLE);
    });
  });

  describe('canTransition()', () => {
    test('should allow valid transitions', () => {
      expect(stateMachine.canTransition(BotState.PLANNING)).toBe(true);
    });

    test('should reject invalid transitions', () => {
      expect(stateMachine.canTransition(BotState.MINING)).toBe(false);
    });

    test('should allow transition to ERROR from any state', () => {
      expect(stateMachine.canTransition(BotState.ERROR)).toBe(true);
    });
  });

  describe('transition()', () => {
    test('should transition to valid state', async () => {
      const result = await stateMachine.transition(BotState.PLANNING);
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(BotState.PLANNING);
    });

    test('should reject invalid transition', async () => {
      const result = await stateMachine.transition(BotState.MINING);
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe(BotState.IDLE);
    });

    test('should return true if already in target state', async () => {
      const result = await stateMachine.transition(BotState.IDLE);
      expect(result).toBe(true);
    });

    test('should record transition in history', async () => {
      await stateMachine.transition(BotState.PLANNING);
      const history = stateMachine.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].from).toBe(BotState.IDLE);
      expect(history[0].to).toBe(BotState.PLANNING);
    });

    test('should include reason in transition', async () => {
      await stateMachine.transition(BotState.PLANNING, 'Starting task');
      const history = stateMachine.getHistory();
      expect(history[0].reason).toBe('Starting task');
    });

    test('should call onEnter callback', async () => {
      const onEnter = mock(() => {});
      const machine = new StateMachine(mockBot as Bot, mockLogger, { onEnter });
      
      await machine.transition(BotState.PLANNING);
      expect(onEnter).toHaveBeenCalledWith(BotState.PLANNING);
    });

    test('should call onExit callback', async () => {
      const onExit = mock(() => {});
      const machine = new StateMachine(mockBot as Bot, mockLogger, { onExit });
      
      await machine.transition(BotState.PLANNING);
      expect(onExit).toHaveBeenCalledWith(BotState.IDLE);
    });
  });

  describe('transitionToError()', () => {
    test('should transition to ERROR state', async () => {
      await stateMachine.transitionToError('Test error');
      expect(stateMachine.getCurrentState()).toBe(BotState.ERROR);
    });

    test('should include error reason', async () => {
      await stateMachine.transitionToError('Test error');
      const history = stateMachine.getHistory();
      expect(history[0].reason).toBe('Test error');
    });
  });

  describe('returnToIdle()', () => {
    test('should return to IDLE from PLANNING', async () => {
      await stateMachine.transition(BotState.PLANNING);
      const result = await stateMachine.returnToIdle();
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(BotState.IDLE);
    });

    test('should return to IDLE from ERROR', async () => {
      await stateMachine.transitionToError('Test');
      const result = await stateMachine.returnToIdle();
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(BotState.IDLE);
    });
  });

  describe('isInState()', () => {
    test('should return true for current state', () => {
      expect(stateMachine.isInState(BotState.IDLE)).toBe(true);
    });

    test('should return false for other states', () => {
      expect(stateMachine.isInState(BotState.PLANNING)).toBe(false);
    });
  });

  describe('isIdle()', () => {
    test('should return true when idle', () => {
      expect(stateMachine.isIdle()).toBe(true);
    });

    test('should return false when not idle', async () => {
      await stateMachine.transition(BotState.PLANNING);
      expect(stateMachine.isIdle()).toBe(false);
    });
  });

  describe('isBusy()', () => {
    test('should return false when idle', () => {
      expect(stateMachine.isBusy()).toBe(false);
    });

    test('should return false when planning', async () => {
      await stateMachine.transition(BotState.PLANNING);
      expect(stateMachine.isBusy()).toBe(false);
    });

    test('should return true when mining', async () => {
      await stateMachine.transition(BotState.PLANNING);
      await stateMachine.transition(BotState.MINING);
      expect(stateMachine.isBusy()).toBe(true);
    });
  });

  describe('isError()', () => {
    test('should return false when not in error', () => {
      expect(stateMachine.isError()).toBe(false);
    });

    test('should return true when in error state', async () => {
      await stateMachine.transitionToError('Test');
      expect(stateMachine.isError()).toBe(true);
    });
  });

  describe('getHistory()', () => {
    test('should return empty array initially', () => {
      expect(stateMachine.getHistory()).toHaveLength(0);
    });

    test('should return all transitions', async () => {
      await stateMachine.transition(BotState.PLANNING);
      await stateMachine.transition(BotState.MINING);
      expect(stateMachine.getHistory()).toHaveLength(2);
    });

    test('should limit history when specified', async () => {
      await stateMachine.transition(BotState.PLANNING);
      await stateMachine.transition(BotState.MINING);
      await stateMachine.transition(BotState.IDLE);
      
      const limited = stateMachine.getHistory(2);
      expect(limited).toHaveLength(2);
    });
  });

  describe('getTimeInCurrentState()', () => {
    test('should return 0 initially', () => {
      expect(stateMachine.getTimeInCurrentState()).toBe(0);
    });

    test('should return time after transition', async () => {
      await stateMachine.transition(BotState.PLANNING);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(stateMachine.getTimeInCurrentState()).toBeGreaterThan(0);
    });
  });

  describe('getStatistics()', () => {
    test('should return statistics', async () => {
      await stateMachine.transition(BotState.PLANNING);
      await stateMachine.transition(BotState.MINING);
      
      const stats = stateMachine.getStatistics();
      expect(stats.currentState).toBe(BotState.MINING);
      expect(stats.previousState).toBe(BotState.PLANNING);
      expect(stats.totalTransitions).toBe(2);
      expect(stats.stateFrequency.get(BotState.PLANNING)).toBe(1);
      expect(stats.stateFrequency.get(BotState.MINING)).toBe(1);
    });
  });

  describe('clearHistory()', () => {
    test('should clear transition history', async () => {
      await stateMachine.transition(BotState.PLANNING);
      await stateMachine.transition(BotState.MINING);
      
      stateMachine.clearHistory();
      expect(stateMachine.getHistory()).toHaveLength(0);
    });
  });

  describe('reset()', () => {
    test('should reset to idle state', async () => {
      await stateMachine.transition(BotState.PLANNING);
      await stateMachine.transition(BotState.MINING);
      
      await stateMachine.reset();
      expect(stateMachine.getCurrentState()).toBe(BotState.IDLE);
      expect(stateMachine.getHistory()).toHaveLength(0);
    });
  });

  describe('Complex transitions', () => {
    test('should handle multiple transitions', async () => {
      await stateMachine.transition(BotState.PLANNING);
      await stateMachine.transition(BotState.MINING);
      await stateMachine.transition(BotState.NAVIGATING);
      await stateMachine.transition(BotState.IDLE);
      
      expect(stateMachine.getCurrentState()).toBe(BotState.IDLE);
      expect(stateMachine.getHistory()).toHaveLength(4);
    });

    test('should maintain state on failed transition', async () => {
      await stateMachine.transition(BotState.PLANNING);
      const result = await stateMachine.transition(BotState.EATING);
      
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe(BotState.PLANNING);
    });
  });
});
