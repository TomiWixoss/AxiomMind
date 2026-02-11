import { describe, test, expect, mock } from 'bun:test';
import { getPositionDefinition, getPositionHandler } from '../../../src/tools/get-position';
import type { ToolContext } from '../../../src/tools/types';

describe('Get Position Tool', () => {
  test('definition has correct structure', () => {
    const def = getPositionDefinition();
    
    expect(def.name).toBe('get_position');
    expect(def.description).toBeTruthy();
    expect(def.parameters.type).toBe('object');
    expect(def.parameters.required).toEqual([]);
  });

  test('handler returns current position', async () => {
    const mockBot = {
      entity: {
        position: { x: 100, y: 64, z: -200 },
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getPositionHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.x).toBe(100);
    expect(result.data.y).toBe(64);
    expect(result.data.z).toBe(-200);
  });

  test('handler returns error when bot entity is missing', async () => {
    const mockBot = {};

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), error: mock(() => {}) },
    };

    const result = await getPositionHandler({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('handler includes dimension info', async () => {
    const mockBot = {
      entity: {
        position: { x: 0, y: 70, z: 0 },
      },
      game: {
        dimension: 'minecraft:overworld',
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await getPositionHandler({}, context);

    expect(result.success).toBe(true);
    expect(result.data.dimension).toBe('minecraft:overworld');
  });
});
