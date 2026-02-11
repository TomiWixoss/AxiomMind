import { describe, test, expect, mock } from 'bun:test';
import { gotoLocationDefinition, gotoLocationHandler } from '../../../src/tools/goto-location';
import type { ToolContext } from '../../../src/tools/types';

describe('Goto Location Tool', () => {
  test('definition has correct structure', () => {
    const def = gotoLocationDefinition();
    
    expect(def.name).toBe('goto_location');
    expect(def.description).toBeTruthy();
    expect(def.parameters).toBeDefined();
    expect(def.parameters.x).toBeDefined();
    expect(def.parameters.y).toBeDefined();
    expect(def.parameters.z).toBeDefined();
    expect(def.parameters.x.required).toBe(true);
    expect(def.parameters.y.required).toBe(true);
    expect(def.parameters.z.required).toBe(true);
  });

  test('handler navigates to location successfully', async () => {
    const mockGoal = {
      isFinished: false,
    };

    const mockBot = {
      entity: {
        position: { x: 0, y: 64, z: 0 },
      },
      pathfinder: {
        setGoal: mock((goal: any) => {
          mockGoal.isFinished = true;
        }),
        isMoving: mock(() => false),
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await gotoLocationHandler(
      { x: 100, y: 64, z: 200 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.target).toEqual({ x: 100, y: 64, z: 200 });
    expect(mockBot.pathfinder.setGoal).toHaveBeenCalled();
  });

  test('handler validates coordinate parameters', async () => {
    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), error: mock(() => {}) },
    };

    const result = await gotoLocationHandler(
      { x: 100, z: 200 }, // Missing y
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('handler requires pathfinder plugin', async () => {
    const mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
      // No pathfinder
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), error: mock(() => {}) },
    };

    const result = await gotoLocationHandler(
      { x: 100, y: 64, z: 200 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('handler calculates distance to target', async () => {
    const mockBot = {
      entity: {
        position: { x: 0, y: 64, z: 0 },
      },
      pathfinder: {
        setGoal: mock(() => {}),
        isMoving: mock(() => false),
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await gotoLocationHandler(
      { x: 3, y: 64, z: 4 }, // Distance = 5 blocks
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.distance).toBe(5);
  });

  test('handler handles already at location', async () => {
    const mockBot = {
      entity: {
        position: { x: 100, y: 64, z: 200 },
      },
      pathfinder: {
        setGoal: mock(() => {}),
        isMoving: mock(() => false),
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}) },
    };

    const result = await gotoLocationHandler(
      { x: 100, y: 64, z: 200 },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.alreadyThere).toBe(true);
  });
});
