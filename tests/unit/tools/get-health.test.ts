import { describe, test, expect, mock } from 'bun:test';
import { getHealthDefinition, getHealthHandler } from '../../../src/tools/get-health';
import type { ToolContext } from '../../../src/tools/types';

describe('Get Health Tool', () => {
  test('definition has correct structure', () => {
    const def = getHealthDefinition();
    
    expect(def.name).toBe('get_health');
    expect(def.description).toBeTruthy();
    expect(def.parameters.type).toBe('object');
    expect(def.parameters.required).toEqual([]);
  });

  test('handler returns health and food status', async () => {
    const mockBot = {
      health: 18,
      food: 15,
      foodSaturation: 5.0,
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getHealthHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.health).toBe(18);
    expect(result.data.food).toBe(15);
    expect(result.data.foodSaturation).toBe(5.0);
  });

  test('handler detects low health', async () => {
    const mockBot = {
      health: 8,
      food: 20,
      foodSaturation: 5.0,
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getHealthHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('low health');
  });

  test('handler detects low food', async () => {
    const mockBot = {
      health: 20,
      food: 8,
      foodSaturation: 0,
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getHealthHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('low food');
  });

  test('handler detects critical state', async () => {
    const mockBot = {
      health: 3,
      food: 2,
      foodSaturation: 0,
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getHealthHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.status).toContain('critical');
  });

  test('handler detects healthy state', async () => {
    const mockBot = {
      health: 20,
      food: 20,
      foodSaturation: 5.0,
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getHealthHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('healthy');
  });
});
