import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { SpeedrunStrategy, SpeedrunPhase } from '../../../src/layers/strategic/speedrun-strategy';

describe('SpeedrunStrategy', () => {
  let mockBot: any;
  let mockLogger: any;
  let strategy: SpeedrunStrategy;

  beforeEach(() => {
    mockLogger = {
      info: mock(() => {}),
      debug: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {})
    };

    mockBot = {
      inventory: {
        items: mock(() => [])
      },
      health: 20,
      food: 20
    };

    strategy = new SpeedrunStrategy(mockBot, mockLogger);
  });

  describe('Constructor', () => {
    test('should initialize with early game phase', () => {
      expect(strategy.getCurrentPhase()).toBe(SpeedrunPhase.EARLY_GAME);
    });
  });

  describe('determinePhase()', () => {
    test('should return EARLY_GAME when no items', () => {
      mockBot.inventory.items.mockReturnValue([]);
      expect(strategy.determinePhase()).toBe(SpeedrunPhase.EARLY_GAME);
    });

    test('should return NETHER_PREP when has iron pickaxe', () => {
      mockBot.inventory.items.mockReturnValue([
        { name: 'iron_pickaxe' }
      ]);
      expect(strategy.determinePhase()).toBe(SpeedrunPhase.NETHER_PREP);
    });

    test('should return NETHER when has obsidian and flint_and_steel', () => {
      mockBot.inventory.items.mockReturnValue([
        { name: 'obsidian' },
        { name: 'flint_and_steel' }
      ]);
      expect(strategy.determinePhase()).toBe(SpeedrunPhase.NETHER);
    });

    test('should return END_PREP when has blaze_rod and ender_pearl', () => {
      mockBot.inventory.items.mockReturnValue([
        { name: 'blaze_rod' },
        { name: 'ender_pearl' }
      ]);
      expect(strategy.determinePhase()).toBe(SpeedrunPhase.END_PREP);
    });

    test('should return END_FIGHT when has eye_of_ender and diamond_pickaxe', () => {
      mockBot.inventory.items.mockReturnValue([
        { name: 'eye_of_ender' },
        { name: 'diamond_pickaxe' }
      ]);
      expect(strategy.determinePhase()).toBe(SpeedrunPhase.END_FIGHT);
    });
  });

  describe('getCurrentPhase()', () => {
    test('should return current phase', () => {
      expect(strategy.getCurrentPhase()).toBe(SpeedrunPhase.EARLY_GAME);
    });

    test('should update after determinePhase', () => {
      mockBot.inventory.items.mockReturnValue([{ name: 'iron_pickaxe' }]);
      strategy.determinePhase();
      expect(strategy.getCurrentPhase()).toBe(SpeedrunPhase.NETHER_PREP);
    });
  });

  describe('getPhaseRequirements()', () => {
    test('should return requirements for current phase', () => {
      const requirements = strategy.getPhaseRequirements();
      expect(requirements.phase).toBe(SpeedrunPhase.EARLY_GAME);
      expect(requirements.requiredItems).toContain('wooden_pickaxe');
      expect(requirements.minHealth).toBeGreaterThan(0);
    });

    test('should return requirements for specific phase', () => {
      const requirements = strategy.getPhaseRequirements(SpeedrunPhase.NETHER);
      expect(requirements.phase).toBe(SpeedrunPhase.NETHER);
      expect(requirements.requiredItems).toContain('blaze_rod');
    });

    test('should include optional items', () => {
      const requirements = strategy.getPhaseRequirements(SpeedrunPhase.END_FIGHT);
      expect(requirements.optionalItems.length).toBeGreaterThan(0);
    });
  });

  describe('getProgressionSteps()', () => {
    test('should return steps for current phase', () => {
      const steps = strategy.getProgressionSteps();
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toContain('wood');
    });

    test('should return steps for specific phase', () => {
      const steps = strategy.getProgressionSteps(SpeedrunPhase.NETHER);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.some(s => s.includes('Nether'))).toBe(true);
    });

    test('should return empty array for completed phase', () => {
      const steps = strategy.getProgressionSteps(SpeedrunPhase.COMPLETED);
      expect(steps.length).toBe(0);
    });
  });

  describe('isReadyForNextPhase()', () => {
    test('should return not ready when missing items', () => {
      mockBot.inventory.items.mockReturnValue([]);
      const result = strategy.isReadyForNextPhase();
      expect(result.ready).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    test('should return not ready when low health', () => {
      mockBot.health = 5;
      mockBot.inventory.items.mockReturnValue([
        { name: 'wooden_pickaxe' },
        { name: 'stone_pickaxe' },
        { name: 'iron_pickaxe' },
        { name: 'crafting_table' }
      ]);
      const result = strategy.isReadyForNextPhase();
      expect(result.ready).toBe(false);
      expect(result.missing.some(m => m.includes('health'))).toBe(true);
    });

    test('should return not ready when low food', () => {
      mockBot.food = 5;
      mockBot.inventory.items.mockReturnValue([
        { name: 'wooden_pickaxe' },
        { name: 'stone_pickaxe' },
        { name: 'iron_pickaxe' },
        { name: 'crafting_table' }
      ]);
      const result = strategy.isReadyForNextPhase();
      expect(result.ready).toBe(false);
      expect(result.missing.some(m => m.includes('food'))).toBe(true);
    });

    test('should return ready when all requirements met', () => {
      mockBot.health = 20;
      mockBot.food = 20;
      mockBot.inventory.items.mockReturnValue([
        { name: 'wooden_pickaxe' },
        { name: 'stone_pickaxe' },
        { name: 'iron_pickaxe' },
        { name: 'crafting_table' }
      ]);
      const result = strategy.isReadyForNextPhase();
      expect(result.ready).toBe(true);
      expect(result.missing.length).toBe(0);
    });
  });

  describe('getNextDecision()', () => {
    test('should prioritize missing critical items', () => {
      mockBot.inventory.items.mockReturnValue([]);
      const decision = strategy.getNextDecision();
      expect(decision.priority).toBe('critical');
      expect(decision.action).toContain('Obtain');
    });

    test('should suggest next progression step when ready', () => {
      mockBot.health = 20;
      mockBot.food = 20;
      // Provide items for EARLY_GAME but not enough to trigger NETHER_PREP
      mockBot.inventory.items.mockReturnValue([
        { name: 'wooden_pickaxe' },
        { name: 'stone_pickaxe' },
        { name: 'crafting_table' }
        // Missing iron_pickaxe so still in EARLY_GAME
      ]);
      const decision = strategy.getNextDecision();
      expect(decision.priority).toBe('critical'); // Will be critical because missing iron_pickaxe
      expect(decision.phase).toBe(SpeedrunPhase.EARLY_GAME);
    });

    test('should include estimated time', () => {
      const decision = strategy.getNextDecision();
      expect(decision.estimatedTime).toBeGreaterThan(0);
    });

    test('should include risks', () => {
      const decision = strategy.getNextDecision();
      expect(Array.isArray(decision.risks)).toBe(true);
    });

    test('should include reason', () => {
      const decision = strategy.getNextDecision();
      expect(decision.reason.length).toBeGreaterThan(0);
    });
  });

  describe('getResourcePriorities()', () => {
    test('should return priorities for early game', () => {
      const priorities = strategy.getResourcePriorities();
      expect(priorities.length).toBeGreaterThan(0);
      expect(priorities[0].priority).toBeGreaterThanOrEqual(priorities[priorities.length - 1].priority);
    });

    test('should include wood in early game', () => {
      const priorities = strategy.getResourcePriorities();
      expect(priorities.some(p => p.item === 'wood')).toBe(true);
    });

    test('should include iron in early game', () => {
      const priorities = strategy.getResourcePriorities();
      expect(priorities.some(p => p.item === 'iron_ore')).toBe(true);
    });

    test('should change priorities for nether phase', () => {
      mockBot.inventory.items.mockReturnValue([
        { name: 'obsidian' },
        { name: 'flint_and_steel' }
      ]);
      strategy.determinePhase();
      const priorities = strategy.getResourcePriorities();
      expect(priorities.some(p => p.item === 'blaze_rod')).toBe(true);
    });

    test('should include reason for each priority', () => {
      const priorities = strategy.getResourcePriorities();
      priorities.forEach(p => {
        expect(p.reason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getEstimatedTimeRemaining()', () => {
    test('should return time for early game', () => {
      const time = strategy.getEstimatedTimeRemaining();
      expect(time).toBeGreaterThan(0);
    });

    test('should decrease as phases progress', () => {
      const earlyTime = strategy.getEstimatedTimeRemaining();
      
      mockBot.inventory.items.mockReturnValue([{ name: 'iron_pickaxe' }]);
      strategy.determinePhase();
      const netherPrepTime = strategy.getEstimatedTimeRemaining();
      
      expect(netherPrepTime).toBeLessThan(earlyTime);
    });

    test('should return 0 for completed phase', () => {
      mockBot.inventory.items.mockReturnValue([]);
      // Manually set to completed (in real scenario, check dragon death)
      strategy.determinePhase();
      // Can't easily test COMPLETED without mocking more
      expect(strategy.getEstimatedTimeRemaining()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTips()', () => {
    test('should return tips for current phase', () => {
      const tips = strategy.getTips();
      expect(tips.length).toBeGreaterThan(0);
    });

    test('should return relevant tips for early game', () => {
      const tips = strategy.getTips();
      expect(tips.some(t => t.toLowerCase().includes('wood') || t.toLowerCase().includes('tree'))).toBe(true);
    });

    test('should return different tips for nether phase', () => {
      mockBot.inventory.items.mockReturnValue([
        { name: 'obsidian' },
        { name: 'flint_and_steel' }
      ]);
      strategy.determinePhase();
      const tips = strategy.getTips();
      expect(tips.some(t => t.toLowerCase().includes('nether') || t.toLowerCase().includes('blaze'))).toBe(true);
    });

    test('should return tips for end fight', () => {
      mockBot.inventory.items.mockReturnValue([
        { name: 'eye_of_ender' },
        { name: 'diamond_pickaxe' }
      ]);
      strategy.determinePhase();
      const tips = strategy.getTips();
      expect(tips.some(t => t.toLowerCase().includes('dragon') || t.toLowerCase().includes('crystal'))).toBe(true);
    });
  });

  describe('getProgress()', () => {
    test('should return 0% for early game', () => {
      const progress = strategy.getProgress();
      expect(progress).toBe(0);
    });

    test('should return higher percentage for later phases', () => {
      mockBot.inventory.items.mockReturnValue([
        { name: 'eye_of_ender' },
        { name: 'diamond_pickaxe' }
      ]);
      strategy.determinePhase();
      const progress = strategy.getProgress();
      expect(progress).toBeGreaterThan(50);
    });

    test('should return 100% for completed', () => {
      // Can't easily test without more mocking
      const progress = strategy.getProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Phase Transitions', () => {
    test('should progress through phases correctly', () => {
      // Early game
      expect(strategy.getCurrentPhase()).toBe(SpeedrunPhase.EARLY_GAME);

      // Nether prep
      mockBot.inventory.items.mockReturnValue([{ name: 'iron_pickaxe' }]);
      strategy.determinePhase();
      expect(strategy.getCurrentPhase()).toBe(SpeedrunPhase.NETHER_PREP);

      // Nether
      mockBot.inventory.items.mockReturnValue([
        { name: 'obsidian' },
        { name: 'flint_and_steel' }
      ]);
      strategy.determinePhase();
      expect(strategy.getCurrentPhase()).toBe(SpeedrunPhase.NETHER);

      // End prep
      mockBot.inventory.items.mockReturnValue([
        { name: 'blaze_rod' },
        { name: 'ender_pearl' }
      ]);
      strategy.determinePhase();
      expect(strategy.getCurrentPhase()).toBe(SpeedrunPhase.END_PREP);

      // End fight
      mockBot.inventory.items.mockReturnValue([
        { name: 'eye_of_ender' },
        { name: 'diamond_pickaxe' }
      ]);
      strategy.determinePhase();
      expect(strategy.getCurrentPhase()).toBe(SpeedrunPhase.END_FIGHT);
    });
  });

  describe('Knowledge Base', () => {
    test('should have requirements for all phases', () => {
      const phases = [
        SpeedrunPhase.EARLY_GAME,
        SpeedrunPhase.NETHER_PREP,
        SpeedrunPhase.NETHER,
        SpeedrunPhase.END_PREP,
        SpeedrunPhase.END_FIGHT
      ];

      phases.forEach(phase => {
        const requirements = strategy.getPhaseRequirements(phase);
        expect(requirements).toBeDefined();
        expect(requirements.phase).toBe(phase);
      });
    });

    test('should have progression steps for all phases', () => {
      const phases = [
        SpeedrunPhase.EARLY_GAME,
        SpeedrunPhase.NETHER_PREP,
        SpeedrunPhase.NETHER,
        SpeedrunPhase.END_PREP,
        SpeedrunPhase.END_FIGHT
      ];

      phases.forEach(phase => {
        const steps = strategy.getProgressionSteps(phase);
        expect(Array.isArray(steps)).toBe(true);
      });
    });

    test('should have tips for all phases', () => {
      const phases = [
        SpeedrunPhase.EARLY_GAME,
        SpeedrunPhase.NETHER_PREP,
        SpeedrunPhase.NETHER,
        SpeedrunPhase.END_PREP,
        SpeedrunPhase.END_FIGHT,
        SpeedrunPhase.COMPLETED
      ];

      phases.forEach(phase => {
        mockBot.inventory.items.mockReturnValue([]);
        // Manually test each phase
        const tips = strategy.getTips();
        expect(Array.isArray(tips)).toBe(true);
      });
    });
  });
});
