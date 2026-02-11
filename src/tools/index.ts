// Tool registry - exports all tools
import type { ToolDefinition, ToolContext, ToolResult, ToolHandler } from './types';

// Import all tool definitions and handlers
import { getPositionDefinition, getPositionHandler } from './get-position';
import { getHealthDefinition, getHealthHandler } from './get-health';
import { getInventoryDefinition, getInventoryHandler } from './get-inventory';
import { getNearbyBlocksDefinition, getNearbyBlocksHandler } from './get-nearby-blocks';
import { gotoLocationDefinition, gotoLocationHandler } from './goto-location';
import { mineBlockDefinition, mineBlockHandler } from './mining';
import { craftItemDefinition, craftItemHandler } from './crafting';
import { eatFoodDefinition, eatFoodHandler } from './eat-food';

// Tool registry
export interface ToolRegistryEntry {
  definition: ToolDefinition;
  handler: ToolHandler;
}

// All available tools
export const TOOLS: Record<string, ToolRegistryEntry> = {
  get_position: {
    definition: getPositionDefinition(),
    handler: getPositionHandler,
  },
  get_health: {
    definition: getHealthDefinition(),
    handler: getHealthHandler,
  },
  get_inventory: {
    definition: getInventoryDefinition(),
    handler: getInventoryHandler,
  },
  get_nearby_blocks: {
    definition: getNearbyBlocksDefinition(),
    handler: getNearbyBlocksHandler,
  },
  goto_location: {
    definition: gotoLocationDefinition(),
    handler: gotoLocationHandler,
  },
  mine_block: {
    definition: mineBlockDefinition(),
    handler: mineBlockHandler,
  },
  craft_item: {
    definition: craftItemDefinition(),
    handler: craftItemHandler,
  },
  eat_food: {
    definition: eatFoodDefinition(),
    handler: eatFoodHandler,
  },
};

// Get all tool definitions (for LLM)
export function getAllToolDefinitions(): ToolDefinition[] {
  return Object.values(TOOLS).map(tool => tool.definition);
}

// Get tool handler by name
export function getToolHandler(toolName: string): ToolHandler | null {
  return TOOLS[toolName]?.handler || null;
}

// Execute a tool
export async function executeTool(
  toolName: string,
  params: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  const handler = getToolHandler(toolName);
  
  if (!handler) {
    return {
      success: false,
      message: `Unknown tool: ${toolName}`,
      error: `Tool "${toolName}" not found`,
    };
  }

  try {
    return await handler(params, context);
  } catch (error) {
    context.logger.error(`Error executing tool ${toolName}`, error);
    return {
      success: false,
      message: `Failed to execute tool: ${toolName}`,
      error: String(error),
    };
  }
}

// Export types
export type { ToolDefinition, ToolContext, ToolResult } from './types';
export type { ToolHandler };
