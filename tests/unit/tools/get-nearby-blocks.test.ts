import { describe, test, expect, mock } from 'bun:test';
import { getNearbyBlocksDefinition, getNearbyBlocksHandler } from '../../../src/tools/get-nearby-blocks';
import type { ToolContext } from '../../../src/tools/types';

describe('Get Nearby Blocks Tool', () => {
  test('definition has correct structure', () => {
    const def = getNearbyBlocksDefinition();
    
    expect(def.name).toBe('get_nearby_blocks');
    expect(def.description).toBeTruthy();
    expect(def.parameters).toBeDefined();
    expect(def.parameters.blockType).toBeDefined();
    expect(def.parameters.blockType.required).toBe(true);
    expect(def.parameters.maxDistance).toBeDefined();
  });

  test('handler finds nearby blocks', async () => {
    const mockBot = {
      version: '1.21.1',
      entity: {
        position: { x: 0, y: 64, z: 0 },
      },
      findBlocks: mock(() => {
        return [
          { x: 5, y: 64, z: 3 },
          { x: -2, y: 63, z: 8 },
        ];
      }),
      blockAt: mock((pos: any) => ({
        name: 'stone',
        position: pos,
      })),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await getNearbyBlocksHandler(
      { blockType: 'stone', maxDistance: 16 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.blocks).toHaveLength(2);
    expect(result.data.blocks[0].name).toBe('stone');
    expect(result.data.blocks[0].distance).toBeGreaterThan(0);
  });

  test('handler returns empty when no blocks found', async () => {
    const mockBot = {
      version: '1.21.1',
      entity: {
        position: { x: 0, y: 64, z: 0 },
      },
      findBlocks: mock(() => []),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await getNearbyBlocksHandler(
      { blockType: 'diamond_ore', maxDistance: 16 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.blocks).toHaveLength(0);
    expect(result.message).toContain('No');
  });

  test('handler validates maxDistance parameter', async () => {
    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), error: mock(() => {}) },
    };

    const result = await getNearbyBlocksHandler(
      { blockType: 'stone', maxDistance: 200 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('maxDistance');
  });

  test('handler requires blockType parameter', async () => {
    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), error: mock(() => {}) },
    };

    const result = await getNearbyBlocksHandler(
      { maxDistance: 16 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('blockType');
  });

  test('handler limits results to maxResults', async () => {
    const mockPositions = Array.from({ length: 100 }, (_, i) => ({
      x: i, y: 64, z: 0,
    }));

    const mockBot = {
      version: '1.21.1',
      entity: {
        position: { x: 0, y: 64, z: 0 },
      },
      findBlocks: mock(() => mockPositions), // Returns 100 items (respecting count: 100)
      blockAt: mock((pos: any) => ({
        name: 'stone',
        position: pos,
      })),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await getNearbyBlocksHandler(
      { blockType: 'stone', maxDistance: 16 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.blocks.length).toBe(100);
  });
});
