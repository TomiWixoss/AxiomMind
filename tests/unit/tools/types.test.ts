import { describe, test, expect } from 'bun:test';
import type { ToolDefinition, ToolResult, ParameterDefinition } from '../../../src/tools/types';

describe('Tool Types', () => {
  test('ToolDefinition structure is valid', () => {
    const toolDef: ToolDefinition = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'Test parameter',
          },
        },
        required: ['param1'],
      },
    };

    expect(toolDef.name).toBe('test_tool');
    expect(toolDef.parameters.type).toBe('object');
    expect(toolDef.parameters.required).toContain('param1');
  });

  test('ToolResult success structure', () => {
    const result: ToolResult = {
      success: true,
      message: 'Operation completed',
      data: { value: 42 },
    };

    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();
    expect(result.data).toBeDefined();
  });

  test('ToolResult error structure', () => {
    const result: ToolResult = {
      success: false,
      message: 'Operation failed',
      error: 'Invalid parameters',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('ParameterDefinition with enum', () => {
    const param: ParameterDefinition = {
      type: 'string',
      description: 'Block type',
      enum: ['stone', 'dirt', 'wood'],
    };

    expect(param.enum).toHaveLength(3);
    expect(param.enum).toContain('stone');
  });

  test('ParameterDefinition with number constraints', () => {
    const param: ParameterDefinition = {
      type: 'number',
      description: 'Count',
      minimum: 1,
      maximum: 64,
    };

    expect(param.minimum).toBe(1);
    expect(param.maximum).toBe(64);
  });
});
