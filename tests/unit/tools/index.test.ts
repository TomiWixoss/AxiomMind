import { describe, test, expect, mock } from 'bun:test';
import {
  TOOLS,
  getAllToolDefinitions,
  getToolHandler,
  executeTool,
} from '../../../src/tools/index';
import type { ToolContext } from '../../../src/tools/types';

describe('Tool Registry', () => {
  test('TOOLS registry contains all tools', () => {
    expect(TOOLS).toBeDefined();
    expect(Object.keys(TOOLS).length).toBeGreaterThan(0);
    
    // Check specific tools exist
    expect(TOOLS.get_position).toBeDefined();
    expect(TOOLS.get_health).toBeDefined();
    expect(TOOLS.get_inventory).toBeDefined();
    expect(TOOLS.get_nearby_blocks).toBeDefined();
    expect(TOOLS.goto_location).toBeDefined();
    expect(TOOLS.mine_block).toBeDefined();
    expect(TOOLS.craft_item).toBeDefined();
    expect(TOOLS.eat_food).toBeDefined();
  });

  test('each tool has definition and handler', () => {
    for (const [name, tool] of Object.entries(TOOLS)) {
      expect(tool.definition).toBeDefined();
      expect(tool.handler).toBeDefined();
      expect(typeof tool.handler).toBe('function');
      expect(tool.definition.name).toBe(name);
    }
  });

  test('getAllToolDefinitions returns all definitions', () => {
    const definitions = getAllToolDefinitions();
    
    expect(Array.isArray(definitions)).toBe(true);
    expect(definitions.length).toBe(Object.keys(TOOLS).length);
    
    // Check each definition has required fields
    for (const def of definitions) {
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.parameters).toBeDefined();
    }
  });

  test('getToolHandler returns correct handler', () => {
    const handler = getToolHandler('get_position');
    
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });

  test('getToolHandler returns null for unknown tool', () => {
    const handler = getToolHandler('unknown_tool');
    
    expect(handler).toBeNull();
  });

  test('executeTool executes tool successfully', async () => {
    const mockBot = {
      entity: {
        position: { x: 100, y: 64, z: -200 },
      },
      game: {
        dimension: 'minecraft:overworld',
      },
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await executeTool('get_position', {}, context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.x).toBe(100);
  });

  test('executeTool returns error for unknown tool', async () => {
    const context: ToolContext = {
      bot: {},
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await executeTool('unknown_tool', {}, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('executeTool handles handler errors', async () => {
    const mockBot = {
      // Missing entity - will cause error in get_position
    };

    const context: ToolContext = {
      bot: mockBot,
      logger: { debug: mock(() => {}), info: mock(() => {}), error: mock(() => {}) },
    };

    const result = await executeTool('get_position', {}, context);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('tool definitions have valid parameter schemas', () => {
    const definitions = getAllToolDefinitions();
    
    for (const def of definitions) {
      expect(def.parameters).toBeDefined();
      
      // Check each parameter has type and description
      for (const [propName, prop] of Object.entries(def.parameters)) {
        expect(prop).toBeDefined();
        expect((prop as any).type).toBeTruthy();
        expect((prop as any).description).toBeTruthy();
        expect((prop as any).required).toBeDefined();
      }
    }
  });

  test('all tool names match their registry keys', () => {
    for (const [key, tool] of Object.entries(TOOLS)) {
      expect(tool.definition.name).toBe(key);
    }
  });

  test('tool registry has expected count', () => {
    // We created 8 tools
    expect(Object.keys(TOOLS).length).toBe(8);
  });
});
