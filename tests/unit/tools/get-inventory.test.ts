import { describe, test, expect, mock } from 'bun:test';
import { getInventoryDefinition, getInventoryHandler } from '../../../src/tools/get-inventory';
import type { ToolContext } from '../../../src/tools/types';

describe('Get Inventory Tool', () => {
  test('definition has correct structure', () => {
    const def = getInventoryDefinition();
    
    expect(def.name).toBe('get_inventory');
    expect(def.description).toBeTruthy();
    expect(def.parameters.type).toBe('object');
    expect(def.parameters.required).toEqual([]);
  });

  test('handler returns inventory items', async () => {
    const mockBot = {
      inventory: {
        items: () => [
          { name: 'stone', count: 32, slot: 0 },
          { name: 'iron_pickaxe', count: 1, slot: 1 },
          { name: 'bread', count: 5, slot: 2 },
        ],
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getInventoryHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(3);
    expect(result.data.items[0].name).toBe('stone');
    expect(result.data.items[0].count).toBe(32);
    expect(result.data.totalItems).toBe(3);
  });

  test('handler returns empty inventory', async () => {
    const mockBot = {
      inventory: {
        items: () => [],
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getInventoryHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(0);
    expect(result.data.totalItems).toBe(0);
    expect(result.message).toContain('empty');
  });

  test('handler calculates total count correctly', async () => {
    const mockBot = {
      inventory: {
        items: () => [
          { name: 'dirt', count: 64, slot: 0 },
          { name: 'dirt', count: 32, slot: 1 },
          { name: 'stone', count: 10, slot: 2 },
        ],
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getInventoryHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.totalCount).toBe(106); // 64 + 32 + 10
  });

  test('handler returns error when inventory not available', async () => {
    const mockBot = {};

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), error: mock(() => {}) },
    };

    const result = await getInventoryHandler({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
