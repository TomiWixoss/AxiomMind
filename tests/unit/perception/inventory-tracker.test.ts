import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { InventoryTracker } from '../../../src/layers/perception/inventory-tracker';
import type { Bot } from 'mineflayer';

// Mock logger
const mockLogger = {
  info: mock(() => {}),
  debug: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

// Mock item
const createMockItem = (name: string, count: number, slot: number) => ({
  name,
  displayName: name.replace(/_/g, ' '),
  count,
  slot,
  stackSize: 64,
});

// Mock bot
const createMockBot = (): Partial<Bot> => ({
  version: '1.21.1',
  inventory: {
    items: mock(() => []),
  } as any,
  on: mock(() => {}),
  recipesFor: mock(() => []),
});

describe('InventoryTracker', () => {
  let tracker: InventoryTracker;
  let mockBot: Partial<Bot>;

  beforeEach(() => {
    mockBot = createMockBot();
    tracker = new InventoryTracker(mockBot as Bot, mockLogger);
  });

  describe('Constructor', () => {
    test('should initialize tracker', () => {
      expect(tracker).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should setup event listeners', () => {
      expect(mockBot.on).toHaveBeenCalled();
    });
  });

  describe('getInventorySummary()', () => {
    test('should return empty summary when no inventory', () => {
      mockBot.inventory = undefined;
      const summary = tracker.getInventorySummary();

      expect(summary.totalItems).toBe(0);
      expect(summary.totalSlots).toBe(36);
      expect(summary.usedSlots).toBe(0);
      expect(summary.freeSlots).toBe(36);
      expect(summary.items).toEqual([]);
    });

    test('should return summary with items', () => {
      const mockItems = [
        createMockItem('stone', 64, 0),
        createMockItem('iron_ingot', 10, 1),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      const summary = tracker.getInventorySummary();

      expect(summary.totalItems).toBe(74);
      expect(summary.usedSlots).toBe(2);
      expect(summary.freeSlots).toBe(34);
      expect(summary.items).toHaveLength(2);
    });

    test('should categorize tools', () => {
      const mockItems = [
        createMockItem('wooden_pickaxe', 1, 0),
        createMockItem('stone_axe', 1, 1),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      const summary = tracker.getInventorySummary();

      expect(summary.categories.tools).toHaveLength(2);
    });

    test('should categorize weapons', () => {
      const mockItems = [
        createMockItem('wooden_sword', 1, 0),
        createMockItem('bow', 1, 1),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      const summary = tracker.getInventorySummary();

      expect(summary.categories.weapons).toHaveLength(2);
    });

    test('should categorize armor', () => {
      const mockItems = [
        createMockItem('iron_helmet', 1, 0),
        createMockItem('iron_chestplate', 1, 1),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      const summary = tracker.getInventorySummary();

      expect(summary.categories.armor).toHaveLength(2);
    });

    test('should categorize food', () => {
      const mockItems = [
        createMockItem('bread', 5, 0),
        createMockItem('cooked_beef', 3, 1),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      const summary = tracker.getInventorySummary();

      expect(summary.categories.food).toHaveLength(2);
    });

    test('should categorize ores', () => {
      const mockItems = [
        createMockItem('iron_ingot', 10, 0),
        createMockItem('diamond', 3, 1),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      const summary = tracker.getInventorySummary();

      expect(summary.categories.ores).toHaveLength(2);
    });

    test('should categorize blocks', () => {
      const mockItems = [
        createMockItem('cobblestone', 64, 0),
        createMockItem('oak_planks', 32, 1),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      const summary = tracker.getInventorySummary();

      expect(summary.categories.blocks).toHaveLength(2);
    });
  });

  describe('hasItem()', () => {
    test('should return false when item not in inventory', () => {
      mockBot.inventory!.items = mock(() => []);
      expect(tracker.hasItem('diamond')).toBe(false);
    });

    test('should return true when item exists', () => {
      const mockItems = [createMockItem('diamond', 3, 0)];
      mockBot.inventory!.items = mock(() => mockItems);

      expect(tracker.hasItem('diamond')).toBe(true);
    });

    test('should check minimum count', () => {
      const mockItems = [createMockItem('diamond', 3, 0)];
      mockBot.inventory!.items = mock(() => mockItems);

      expect(tracker.hasItem('diamond', 5)).toBe(false);
      expect(tracker.hasItem('diamond', 3)).toBe(true);
      expect(tracker.hasItem('diamond', 2)).toBe(true);
    });
  });

  describe('getItemCount()', () => {
    test('should return 0 when no inventory', () => {
      mockBot.inventory = undefined;
      expect(tracker.getItemCount('stone')).toBe(0);
    });

    test('should return 0 when item not found', () => {
      mockBot.inventory!.items = mock(() => []);
      expect(tracker.getItemCount('diamond')).toBe(0);
    });

    test('should return correct count', () => {
      const mockItems = [createMockItem('stone', 64, 0)];
      mockBot.inventory!.items = mock(() => mockItems);

      expect(tracker.getItemCount('stone')).toBe(64);
    });

    test('should sum multiple stacks', () => {
      const mockItems = [
        createMockItem('stone', 64, 0),
        createMockItem('stone', 32, 1),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      expect(tracker.getItemCount('stone')).toBe(96);
    });
  });

  describe('findItem()', () => {
    test('should return null when no inventory', () => {
      mockBot.inventory = undefined;
      expect(tracker.findItem('stone')).toBeNull();
    });

    test('should return null when item not found', () => {
      mockBot.inventory!.items = mock(() => []);
      expect(tracker.findItem('diamond')).toBeNull();
    });

    test('should return item when found', () => {
      const mockItem = createMockItem('diamond', 3, 0);
      mockBot.inventory!.items = mock(() => [mockItem]);

      const found = tracker.findItem('diamond');
      expect(found).toBeDefined();
      expect(found?.name).toBe('diamond');
    });
  });

  describe('checkResources()', () => {
    test('should check all resource types', () => {
      const mockItems = [
        createMockItem('wooden_pickaxe', 1, 0),
        createMockItem('stone_pickaxe', 1, 1),
        createMockItem('iron_pickaxe', 1, 2),
        createMockItem('diamond_pickaxe', 1, 3),
        createMockItem('iron_sword', 1, 4),
        createMockItem('bread', 5, 5),
        createMockItem('torch', 10, 6),
        createMockItem('crafting_table', 1, 7),
        createMockItem('oak_log', 20, 8),
        createMockItem('cobblestone', 64, 9),
        createMockItem('iron_ingot', 15, 10),
        createMockItem('diamond', 3, 11),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      const resources = tracker.checkResources();

      expect(resources.hasWoodPickaxe).toBe(true);
      expect(resources.hasStonePickaxe).toBe(true);
      expect(resources.hasIronPickaxe).toBe(true);
      expect(resources.hasDiamondPickaxe).toBe(true);
      expect(resources.hasSword).toBe(true);
      expect(resources.hasFood).toBe(true);
      expect(resources.hasTorch).toBe(true);
      expect(resources.hasCraftingTable).toBe(true);
      expect(resources.woodCount).toBe(20);
      expect(resources.stoneCount).toBe(64);
      expect(resources.ironCount).toBe(15);
      expect(resources.diamondCount).toBe(3);
      expect(resources.foodCount).toBe(5);
    });

    test('should return false for missing resources', () => {
      mockBot.inventory!.items = mock(() => []);

      const resources = tracker.checkResources();

      expect(resources.hasWoodPickaxe).toBe(false);
      expect(resources.hasStonePickaxe).toBe(false);
      expect(resources.hasIronPickaxe).toBe(false);
      expect(resources.hasDiamondPickaxe).toBe(false);
      expect(resources.hasSword).toBe(false);
      expect(resources.hasFood).toBe(false);
      expect(resources.hasTorch).toBe(false);
      expect(resources.hasCraftingTable).toBe(false);
    });
  });

  describe('canCraft()', () => {
    test('should return false when no inventory', () => {
      mockBot.inventory = undefined;
      expect(tracker.canCraft('wooden_pickaxe')).toBe(false);
    });

    test('should return false for unknown item', () => {
      expect(tracker.canCraft('unknown_item_xyz')).toBe(false);
    });

    test('should return false when no recipes', () => {
      mockBot.recipesFor = mock(() => []);
      expect(tracker.canCraft('wooden_pickaxe')).toBe(false);
    });

    test('should check if can craft', () => {
      const mockRecipe = { id: 1, delta: [] };
      mockBot.recipesFor = mock(() => [mockRecipe]);
      // @ts-ignore
      mockBot.canCraft = mock(() => true);

      expect(tracker.canCraft('wooden_pickaxe')).toBe(true);
    });
  });

  describe('getMissingMaterials()', () => {
    test('should return empty array when no inventory', () => {
      mockBot.inventory = undefined;
      expect(tracker.getMissingMaterials('wooden_pickaxe')).toEqual([]);
    });

    test('should return empty array for unknown item', () => {
      expect(tracker.getMissingMaterials('unknown_item')).toEqual([]);
    });

    test('should return empty array when no recipes', () => {
      mockBot.recipesFor = mock(() => []);
      expect(tracker.getMissingMaterials('wooden_pickaxe')).toEqual([]);
    });
  });

  describe('getSpaceInfo()', () => {
    test('should return space information', () => {
      const mockItems = [
        createMockItem('stone', 64, 0),
        createMockItem('iron_ingot', 10, 1),
      ];
      mockBot.inventory!.items = mock(() => mockItems);

      const space = tracker.getSpaceInfo();

      expect(space.used).toBe(2);
      expect(space.free).toBe(34);
      expect(space.percentage).toBeGreaterThan(0);
      expect(space.percentage).toBeLessThan(100);
    });

    test('should calculate percentage correctly', () => {
      const mockItems = Array.from({ length: 18 }, (_, i) =>
        createMockItem('stone', 1, i)
      );
      mockBot.inventory!.items = mock(() => mockItems);

      const space = tracker.getSpaceInfo();

      expect(space.percentage).toBe(50); // 18/36 = 50%
    });
  });

  describe('isFull()', () => {
    test('should return false when inventory not full', () => {
      const mockItems = [createMockItem('stone', 64, 0)];
      mockBot.inventory!.items = mock(() => mockItems);

      expect(tracker.isFull()).toBe(false);
    });

    test('should return true when inventory full', () => {
      const mockItems = Array.from({ length: 36 }, (_, i) =>
        createMockItem('stone', 1, i)
      );
      mockBot.inventory!.items = mock(() => mockItems);

      expect(tracker.isFull()).toBe(true);
    });
  });

  describe('isNearlyFull()', () => {
    test('should return false when inventory not nearly full', () => {
      const mockItems = [createMockItem('stone', 64, 0)];
      mockBot.inventory!.items = mock(() => mockItems);

      expect(tracker.isNearlyFull()).toBe(false);
    });

    test('should return true when inventory nearly full', () => {
      const mockItems = Array.from({ length: 30 }, (_, i) =>
        createMockItem('stone', 1, i)
      );
      mockBot.inventory!.items = mock(() => mockItems);

      expect(tracker.isNearlyFull(0.8)).toBe(true); // 30/36 = 83%
    });

    test('should use custom threshold', () => {
      const mockItems = Array.from({ length: 20 }, (_, i) =>
        createMockItem('stone', 1, i)
      );
      mockBot.inventory!.items = mock(() => mockItems);

      expect(tracker.isNearlyFull(0.5)).toBe(true); // 20/36 = 55%
      expect(tracker.isNearlyFull(0.7)).toBe(false); // 20/36 = 55%
    });
  });

  describe('getRecentChanges()', () => {
    test('should return empty array initially', () => {
      expect(tracker.getRecentChanges()).toEqual([]);
    });

    test('should limit results', () => {
      // Simulate changes by updating snapshot
      tracker.updateInventorySnapshot();
      const changes = tracker.getRecentChanges(5);
      expect(changes.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getItemHistory()', () => {
    test('should return empty array for item with no history', () => {
      expect(tracker.getItemHistory('diamond')).toEqual([]);
    });
  });

  describe('clearHistory()', () => {
    test('should clear change history', () => {
      tracker.clearHistory();
      expect(mockLogger.debug).toHaveBeenCalledWith('Inventory change history cleared');
    });
  });

  describe('updateInventorySnapshot()', () => {
    test('should update snapshot', () => {
      const mockItems = [createMockItem('stone', 64, 0)];
      mockBot.inventory!.items = mock(() => mockItems);

      tracker.updateInventorySnapshot();
      expect(tracker.getItemCount('stone')).toBe(64);
    });
  });
});
