import type { ToolDefinition, ToolResult, ToolContext } from './types';

export function craftItemDefinition(): ToolDefinition {
  return {
    name: 'craft_item',
    description: 'Craft an item using available materials. Bot will find crafting table if needed.',
    parameters: {
      itemName: {
        type: 'string',
        description: 'The item to craft (e.g., "wooden_pickaxe", "stone_sword", "crafting_table")',
        required: true,
      },
      count: {
        type: 'number',
        description: 'Number of items to craft (default: 1)',
        required: false,
        minimum: 1,
        maximum: 64,
        default: 1,
      },
    },
  };
}

export async function craftItemHandler(
  params: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { bot, logger } = context;
    const { itemName, count = 1 } = params;

    // Validate parameters
    if (!itemName) {
      return {
        success: false,
        message: 'itemName parameter is required',
        error: 'Missing required parameter: itemName',
      };
    }

    if (count < 1 || count > 64) {
      return {
        success: false,
        message: 'count must be between 1 and 64',
        error: 'Invalid count parameter',
      };
    }

    if (!bot.entity) {
      return {
        success: false,
        message: 'Bot not spawned',
        error: 'Bot entity not available',
      };
    }

    const mcData = require('minecraft-data')(bot.version);
    const item = mcData.itemsByName[itemName];

    if (!item) {
      return {
        success: false,
        message: `Unknown item: ${itemName}`,
        error: `Item "${itemName}" not found`,
      };
    }

    // Get recipe
    const recipes = bot.recipesFor(item.id, null, 1, null);
    
    if (!recipes || recipes.length === 0) {
      return {
        success: false,
        message: `No recipe found for ${itemName}`,
        error: `Cannot craft ${itemName}: no recipe available`,
      };
    }

    const recipe = recipes[0];

    // Check if we have materials
    if (!bot.canCraft(recipe, count)) {
      return {
        success: false,
        message: `Not enough materials to craft ${count}x ${itemName}`,
        error: 'Insufficient materials',
      };
    }

    // Find crafting table if needed
    if (recipe.requiresTable) {
      const craftingTable = bot.findBlock({
        matching: mcData.blocksByName.crafting_table.id,
        maxDistance: 32,
      });

      if (!craftingTable) {
        return {
          success: false,
          message: 'Crafting table required but not found nearby',
          error: 'No crafting table within 32 blocks',
        };
      }

      logger.info(`Using crafting table at (${craftingTable.position.x}, ${craftingTable.position.y}, ${craftingTable.position.z})`);
    }

    // Craft the item
    logger.info(`Crafting ${count}x ${itemName}`);
    await bot.craft(recipe, count, null);

    return {
      success: true,
      message: `Successfully crafted ${count}x ${itemName}`,
      data: {
        itemName,
        count,
        requiresTable: recipe.requiresTable,
      },
    };
  } catch (error) {
    context.logger.error('Error crafting item', error);
    return {
      success: false,
      message: 'Failed to craft item',
      error: String(error),
    };
  }
}
