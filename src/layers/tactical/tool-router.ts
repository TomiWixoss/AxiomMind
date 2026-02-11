import type { ToolContext, ToolResult, ToolDefinition } from '../../tools/types';
import { getAllToolDefinitions, getToolHandler, executeTool } from '../../tools/index';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * ToolRouter - Routes LLM tool calls to appropriate handlers
 * Part of Tactical Layer
 */
export class ToolRouter {
  private context: ToolContext;

  constructor(bot: any, logger: any) {
    this.context = {
      bot,
      logger,
    };

    this.context.logger.info('ToolRouter initialized');
  }

  /**
   * Get tool context
   */
  getContext(): ToolContext {
    return this.context;
  }

  /**
   * Validate a tool call
   */
  validateToolCall(toolCall: ToolCall): ValidationResult {
    // Check required fields
    if (!toolCall.id || toolCall.id.trim() === '') {
      return {
        valid: false,
        error: 'Tool call ID is required',
      };
    }

    if (!toolCall.name || toolCall.name.trim() === '') {
      return {
        valid: false,
        error: 'Tool name is required',
      };
    }

    // Check if tool exists
    const handler = getToolHandler(toolCall.name);
    if (!handler) {
      return {
        valid: false,
        error: `Unknown tool: ${toolCall.name}`,
      };
    }

    return { valid: true };
  }

  /**
   * Execute a single tool call
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    // Validate tool call
    const validation = this.validateToolCall(toolCall);
    if (!validation.valid) {
      this.context.logger.warn('Invalid tool call', {
        toolCall,
        error: validation.error,
      });

      return {
        success: false,
        message: 'Invalid tool call',
        error: validation.error,
      };
    }

    // Execute tool
    this.context.logger.debug('Executing tool', {
      id: toolCall.id,
      name: toolCall.name,
      arguments: toolCall.arguments,
    });

    try {
      const result = await executeTool(
        toolCall.name,
        toolCall.arguments,
        this.context
      );

      this.context.logger.debug('Tool execution completed', {
        id: toolCall.id,
        name: toolCall.name,
        success: result.success,
      });

      return result;
    } catch (error) {
      this.context.logger.error('Tool execution failed', {
        id: toolCall.id,
        name: toolCall.name,
        error,
      });

      return {
        success: false,
        message: `Tool execution failed: ${toolCall.name}`,
        error: String(error),
      };
    }
  }

  /**
   * Execute multiple tool calls in sequence
   */
  async executeToolBatch(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    this.context.logger.info('Executing tool batch', {
      count: toolCalls.length,
    });

    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeTool(toolCall);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    this.context.logger.info('Tool batch completed', {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
    });

    return results;
  }

  /**
   * Get list of available tool names
   */
  getAvailableTools(): string[] {
    const definitions = getAllToolDefinitions();
    return definitions.map(def => def.name);
  }

  /**
   * Get tool definition by name
   */
  getToolDefinition(toolName: string): ToolDefinition | null {
    const definitions = getAllToolDefinitions();
    return definitions.find(def => def.name === toolName) || null;
  }

  /**
   * Get all tool definitions
   */
  getAllToolDefinitions(): ToolDefinition[] {
    return getAllToolDefinitions();
  }
}

export default ToolRouter;
