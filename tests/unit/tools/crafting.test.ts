import { describe, test, expect, mock } from 'bun:test';
import { craftItemDefinition, craftItemHandler } from '../../../src/tools/crafting';
import type { ToolContext } from '../../../src/tools/types';

describe('Craft Item Tool', () => {
  test('definition has correct structure', () => {
    const def = craftItemDefinition();
    
    expect(def.name).toBe('craft_item');
    expect(def.description).toBeTruthy();
    expect(def.parameters).toBeDefined();
    expect(def.parameters.itemName).toBeDefined();
    expect(def.parameters.itemName.required).toBe(true);
    expect(def.parameters.count).toBeDefined();
  });

  test('handler crafts item successfully', async () => {
    const mockRecipe = {
      requiresTable: false,
    };

    const mockBot = {
      version: '1.21.1',
      entity: { position: { x: 0, y: 64, z: 0 } },
      recipesFor: mock(() => [mockRecipe]),
      canCraft: mock(() => true),
      craft: mock(async () => {}),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await craftItemHandler(
      { itemName: 'wooden_pickaxe', count: 1 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.itemName).toBe('wooden_pickaxe');
    expect(result.data.count).toBe(1);
    expect(mockBot.craft).toHaveBeenCalled();
  });

  test('handler requires crafting table when needed', async () => {
    const mockRecipe = {
      requiresTable: true,
    };

    const mockBot = {
      version: '1.21.1',
      entity: { position: { x: 0, y: 64, z: 0 } },
      recipesFor: mock(() => [mockRecipe]),
      canCraft: mock(() => true),
      findBlock: mock(() => null), // No crafting table found
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await craftItemHandler(
      { itemName: 'stone_pickaxe', count: 1 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('crafting table');
  });

  test('handler finds and uses crafting table', async () => {
    const mockRecipe = {
      requiresTable: true,
    };

    const mockCraftingTable = {
      position: { x: 10, y: 64, z: 5 },
    };

    const mockBot = {
      version: '1.21.1',
      entity: { position: { x: 0, y: 64, z: 0 } },
      recipesFor: mock(() => [mockRecipe]),
      canCraft: mock(() => true),
      findBlock: mock(() => mockCraftingTable),
      craft: mock(async () => {}),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await craftItemHandler(
      { itemName: 'stone_pickaxe', count: 1 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.requiresTable).toBe(true);
  });

  test('handler returns error when no recipe found', async () => {
    const mockBot = {
      version: '1.21.1',
      entity: { position: { x: 0, y: 64, z: 0 } },
      recipesFor: mock(() => []), // No recipes
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await craftItemHandler(
      { itemName: 'unknown_item', count: 1 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('handler returns error when insufficient materials', async () => {
    const mockRecipe = {
      requiresTable: false,
    };

    const mockBot = {
      version: '1.21.1',
      entity: { position: { x: 0, y: 64, z: 0 } },
      recipesFor: mock(() => [mockRecipe]),
      canCraft: mock(() => false), // Not enough materials
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await craftItemHandler(
      { itemName: 'wooden_pickaxe', count: 1 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('materials');
  });

  test('handler validates count parameter', async () => {
    const mockBot = {
      version: '1.21.1',
      entity: { position: { x: 0, y: 64, z: 0 } },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await craftItemHandler(
      { itemName: 'wooden_pickaxe', count: 0 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('count');
  });

  test('handler requires itemName parameter', async () => {
    const mockBot = {
      version: '1.21.1',
      entity: { position: { x: 0, y: 64, z: 0 } },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await craftItemHandler(
      { count: 1 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('itemName');
  });

  test('handler crafts multiple items', async () => {
    const mockRecipe = {
      requiresTable: false,
    };

    const mockBot = {
      version: '1.21.1',
      entity: { position: { x: 0, y: 64, z: 0 } },
      recipesFor: mock(() => [mockRecipe]),
      canCraft: mock(() => true),
      craft: mock(async () => {}),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await craftItemHandler(
      { itemName: 'stick', count: 16 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.count).toBe(16);
  });
});
