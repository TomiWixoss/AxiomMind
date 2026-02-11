import { describe, test, expect, mock } from 'bun:test';
import { mineBlockDefinition, mineBlockHandler } from '../../../src/tools/mining';
import type { ToolContext } from '../../../src/tools/types';

describe('Mine Block Tool', () => {
  test('definition has correct structure', () => {
    const def = mineBlockDefinition();
    
    expect(def.name).toBe('mine_block');
    expect(def.description).toBeTruthy();
    expect(def.parameters.type).toBe('object');
    expect(def.parameters.properties.blockType).toBeDefined();
    expect(def.parameters.properties.count).toBeDefined();
    expect(def.parameters.required).toContain('blockType');
  });

  test('handler mines single block successfully', async () => {
    const mockBlock = {
      name: 'stone',
      position: { x: 5, y: 64, z: 3 },
    };

    const mockBot = {
      version: '1.21.1',
      entity: {
        position: { x: 0, y: 64, z: 0, distanceTo: (pos: any) => 5 },
      },
      findBlock: mock(() => mockBlock),
      pathfinder: {
        setGoal: mock(() => {}),
      },
      tool: {
        equipForBlock: mock(async () => true),
      },
      dig: mock(async () => {}),
      collectBlock: {
        collect: mock(async () => {}),
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await mineBlockHandler(
      { blockType: 'stone', count: 1 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.mined).toBe(1);
    expect(mockBot.dig).toHaveBeenCalled();
  });

  test('handler mines multiple blocks', async () => {
    let callCount = 0;
    const mockBlocks = [
      { name: 'stone', position: { x: 5, y: 64, z: 3 } },
      { name: 'stone', position: { x: 6, y: 64, z: 3 } },
      { name: 'stone', position: { x: 7, y: 64, z: 3 } },
    ];

    const mockBot = {
      version: '1.21.1',
      entity: {
        position: { x: 0, y: 64, z: 0, distanceTo: (pos: any) => 5 },
      },
      findBlock: mock(() => {
        if (callCount < mockBlocks.length) {
          return mockBlocks[callCount++];
        }
        return null;
      }),
      pathfinder: {
        setGoal: mock(() => {}),
      },
      tool: {
        equipForBlock: mock(async () => true),
      },
      dig: mock(async () => {}),
      collectBlock: {
        collect: mock(async () => {}),
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await mineBlockHandler(
      { blockType: 'stone', count: 3 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.mined).toBe(3);
  });

  test('handler returns error when block not found', async () => {
    const mockBot = {
      version: '1.21.1',
      entity: {
        position: { x: 0, y: 64, z: 0 },
      },
      findBlock: mock(() => null),
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await mineBlockHandler(
      { blockType: 'diamond_ore', count: 1 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('handler validates count parameter', async () => {
    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), error: mock(() => {}) },
    };

    const result = await mineBlockHandler(
      { blockType: 'stone', count: 0 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('count');
  });

  test('handler requires blockType parameter', async () => {
    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), error: mock(() => {}) },
    };

    const result = await mineBlockHandler(
      { count: 1 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('blockType');
  });

  test('handler stops when no more blocks found', async () => {
    let callCount = 0;
    const mockBot = {
      version: '1.21.1',
      entity: {
        position: { x: 0, y: 64, z: 0, distanceTo: (pos: any) => 5 },
      },
      findBlock: mock(() => {
        if (callCount === 0) {
          callCount++;
          return { name: 'stone', position: { x: 5, y: 64, z: 3 } };
        }
        return null;
      }),
      pathfinder: {
        setGoal: mock(() => {}),
      },
      tool: {
        equipForBlock: mock(async () => true),
      },
      dig: mock(async () => {}),
      collectBlock: {
        collect: mock(async () => {}),
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await mineBlockHandler(
      { blockType: 'stone', count: 5 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.mined).toBe(1);
    expect(result.message).toContain('1 of 5');
  });
});
