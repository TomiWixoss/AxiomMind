import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { ToolRouter } from '../../../src/layers/tactical/tool-router';
import type { ToolContext } from '../../../src/tools/types';

describe('ToolRouter', () => {
  let toolRouter: ToolRouter;
  let mockBot: any;
  let mockLogger: any;

  beforeEach(() => {
    mockBot = {
      entity: { position: { x: 0, y: 64, z: 0 } },
      health: 20,
      food: 20,
    };

    mockLogger = {
      info: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
      warn: mock(() => {}),
    };

    toolRouter = new ToolRouter(mockBot, mockLogger);
  });

  describe('constructor', () => {
    test('should initialize with bot and logger', () => {
      expect(toolRouter).toBeDefined();
      expect(toolRouter.getContext()).toEqual({
        bot: mockBot,
        logger: mockLogger,
      });
    });
  });

  describe('getContext', () => {
    test('should return tool context', () => {
      const context = toolRouter.getContext();
      expect(context.bot).toBe(mockBot);
      expect(context.logger).toBe(mockLogger);
    });
  });

  describe('validateToolCall', () => {
    test('should validate valid tool call', () => {
      const result = toolRouter.validateToolCall({
        id: 'call_123',
        name: 'get_position',
        arguments: {},
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject tool call without id', () => {
      const result = toolRouter.validateToolCall({
        id: '',
        name: 'get_position',
        arguments: {},
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tool call ID is required');
    });

    test('should reject tool call without name', () => {
      const result = toolRouter.validateToolCall({
        id: 'call_123',
        name: '',
        arguments: {},
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tool name is required');
    });

    test('should reject unknown tool', () => {
      const result = toolRouter.validateToolCall({
        id: 'call_123',
        name: 'unknown_tool',
        arguments: {},
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });

    test('should validate tool with parameters', () => {
      const result = toolRouter.validateToolCall({
        id: 'call_123',
        name: 'goto_location',
        arguments: { x: 100, y: 64, z: 200 },
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('executeTool', () => {
    test('should execute get_position tool', async () => {
      const result = await toolRouter.executeTool({
        id: 'call_123',
        name: 'get_position',
        arguments: {},
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('x');
      expect(result.data).toHaveProperty('y');
      expect(result.data).toHaveProperty('z');
    });

    test('should execute get_health tool', async () => {
      const result = await toolRouter.executeTool({
        id: 'call_123',
        name: 'get_health',
        arguments: {},
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('health');
      expect(result.data).toHaveProperty('food');
    });

    test('should return error for invalid tool call', async () => {
      const result = await toolRouter.executeTool({
        id: '',
        name: 'get_position',
        arguments: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool call ID is required');
    });

    test('should return error for unknown tool', async () => {
      const result = await toolRouter.executeTool({
        id: 'call_123',
        name: 'unknown_tool',
        arguments: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });

    test('should handle tool execution errors', async () => {
      // Create a bot that will cause an error
      const errorBot = { ...mockBot, entity: null };
      const errorRouter = new ToolRouter(errorBot, mockLogger);

      const result = await errorRouter.executeTool({
        id: 'call_123',
        name: 'get_position',
        arguments: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('executeToolBatch', () => {
    test('should execute multiple tools in sequence', async () => {
      const toolCalls = [
        { id: 'call_1', name: 'get_position', arguments: {} },
        { id: 'call_2', name: 'get_health', arguments: {} },
      ];

      const results = await toolRouter.executeToolBatch(toolCalls);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    test('should continue execution even if one tool fails', async () => {
      const toolCalls = [
        { id: 'call_1', name: 'get_position', arguments: {} },
        { id: 'call_2', name: 'unknown_tool', arguments: {} },
        { id: 'call_3', name: 'get_health', arguments: {} },
      ];

      const results = await toolRouter.executeToolBatch(toolCalls);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    test('should handle empty tool call array', async () => {
      const results = await toolRouter.executeToolBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('getAvailableTools', () => {
    test('should return list of available tools', () => {
      const tools = toolRouter.getAvailableTools();

      expect(tools).toBeArray();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools).toContain('get_position');
      expect(tools).toContain('get_health');
      expect(tools).toContain('get_inventory');
      expect(tools).toContain('get_nearby_blocks');
      expect(tools).toContain('goto_location');
      expect(tools).toContain('mine_block');
      expect(tools).toContain('craft_item');
      expect(tools).toContain('eat_food');
    });
  });

  describe('getToolDefinition', () => {
    test('should return tool definition for valid tool', () => {
      const definition = toolRouter.getToolDefinition('get_position');

      expect(definition).toBeDefined();
      expect(definition?.name).toBe('get_position');
      expect(definition?.description).toBeDefined();
      expect(definition?.parameters).toBeDefined();
    });

    test('should return null for unknown tool', () => {
      const definition = toolRouter.getToolDefinition('unknown_tool');
      expect(definition).toBeNull();
    });
  });

  describe('getAllToolDefinitions', () => {
    test('should return all tool definitions', () => {
      const definitions = toolRouter.getAllToolDefinitions();

      expect(definitions).toBeArray();
      expect(definitions.length).toBe(8);
      expect(definitions[0]).toHaveProperty('name');
      expect(definitions[0]).toHaveProperty('description');
      expect(definitions[0]).toHaveProperty('parameters');
    });
  });
});
