import type { ToolDefinition, ToolResult, ToolContext } from './types';

export function getInventoryDefinition(): ToolDefinition {
  return {
    name: 'get_inventory',
    description: 'Get all items currently in the bot\'s inventory with their counts and slots',
    parameters: {},
  };
}

export async function getInventoryHandler(
  params: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { bot, logger } = context;

    if (!bot.inventory) {
      logger.error('Bot inventory not available');
      return {
        success: false,
        message: 'Cannot get inventory: bot not ready',
        error: 'Bot inventory not available',
      };
    }

    const items = bot.inventory.items();
    const itemList = items.map((item: any) => ({
      name: item.name,
      count: item.count,
      slot: item.slot,
    }));

    const totalCount = items.reduce((sum: number, item: any) => sum + item.count, 0);

    logger.debug('Got inventory', { totalItems: items.length, totalCount });

    if (items.length === 0) {
      return {
        success: true,
        message: 'Inventory is empty',
        data: {
          items: [],
          totalItems: 0,
          totalCount: 0,
        },
      };
    }

    return {
      success: true,
      message: `Inventory has ${items.length} item types (${totalCount} total items)`,
      data: {
        items: itemList,
        totalItems: items.length,
        totalCount,
      },
    };
  } catch (error) {
    context.logger.error('Error getting inventory', error);
    return {
      success: false,
      message: 'Failed to get inventory',
      error: String(error),
    };
  }
}
