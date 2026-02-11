import { describe, test, expect, mock } from 'bun:test';
import { eatFoodDefinition, eatFoodHandler } from '../../../src/tools/eat-food';
import type { ToolContext } from '../../../src/tools/types';

describe('Eat Food Tool', () => {
  test('definition has correct structure', () => {
    const def = eatFoodDefinition();
    
    expect(def.name).toBe('eat_food');
    expect(def.description).toBeTruthy();
    expect(def.parameters.type).toBe('object');
    expect(def.parameters.required).toEqual([]);
  });

  test('handler eats food successfully', async () => {
    const mockFoodItem = {
      name: 'bread',
      count: 5,
    };

    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
      food: 10,
      inventory: {
        items: mock(() => [mockFoodItem]),
      },
      equip: mock(async () => {}),
      consume: mock(async () => {
        mockBot.food = 15; // Simulate food increase
      }),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await eatFoodHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.ate).toBe(true);
    expect(result.data.itemEaten).toBe('bread');
    expect(result.data.foodBefore).toBe(10);
    expect(mockBot.equip).toHaveBeenCalled();
    expect(mockBot.consume).toHaveBeenCalled();
  });

  test('handler returns success when food is already full', async () => {
    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
      food: 20,
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await eatFoodHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.ate).toBe(false);
    expect(result.message).toContain('full');
  });

  test('handler returns error when no food available', async () => {
    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
      food: 10,
      inventory: {
        items: mock(() => []), // No food items
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await eatFoodHandler({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No food');
  });

  test('handler selects first available food', async () => {
    const mockFoodItems = [
      { name: 'apple', count: 2 },
      { name: 'bread', count: 5 },
      { name: 'cooked_beef', count: 3 },
    ];

    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
      food: 12,
      inventory: {
        items: mock(() => mockFoodItems),
      },
      equip: mock(async () => {}),
      consume: mock(async () => {
        mockBot.food = 16;
      }),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await eatFoodHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.itemEaten).toBe('apple'); // First item
  });

  test('handler filters non-food items', async () => {
    const mockItems = [
      { name: 'stone', count: 64 },
      { name: 'iron_ore', count: 10 },
      { name: 'bread', count: 3 },
    ];

    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
      food: 8,
      inventory: {
        items: mock(() => mockItems),
      },
      equip: mock(async () => {}),
      consume: mock(async () => {
        mockBot.food = 13;
      }),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await eatFoodHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.itemEaten).toBe('bread');
  });

  test('handler returns error when bot not spawned', async () => {
    const mockBot = {};

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await eatFoodHandler({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not available');
  });

  test('handler recognizes various food types', async () => {
    const foodTypes = [
      'bread', 'apple', 'carrot', 'potato', 'cooked_beef',
      'cooked_porkchop', 'cooked_chicken', 'cooked_mutton',
      'cooked_fish', 'cooked_salmon', 'steak'
    ];

    for (const foodName of foodTypes) {
      const mockBot = {
        entity: { position: { x: 0, y: 64, z: 0 } },
        food: 10,
        inventory: {
          items: mock(() => [{ name: foodName, count: 1 }]),
        },
        equip: mock(async () => {}),
        consume: mock(async () => {}),
      };

      const context: ToolContext = {
        bot: mockBot,
        logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
      };

      const result = await eatFoodHandler({}, context);
      expect(result.success).toBe(true);
    }
  });
});
