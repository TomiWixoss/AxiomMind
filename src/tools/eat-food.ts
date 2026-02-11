import type { ToolDefinition, ToolResult, ToolContext } from './types';

export function eatFoodDefinition(): ToolDefinition {
  return {
    name: 'eat_food',
    description: 'Eat food from inventory to restore hunger. Bot will automatically select best available food.',
    parameters: {},
  };
}

export async function eatFoodHandler(
  params: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { bot, logger } = context;

    if (!bot.entity) {
      return {
        success: false,
        message: 'Bot not spawned',
        error: 'Bot entity not available',
      };
    }

    const currentFood = bot.food ?? 20;

    // Check if already full
    if (currentFood >= 20) {
      return {
        success: true,
        message: 'Food level is already full (20/20)',
        data: {
          foodBefore: currentFood,
          foodAfter: currentFood,
          ate: false,
        },
      };
    }

    // Find food in inventory
    const foodItems = bot.inventory.items().filter((item: any) => {
      return item.name.includes('bread') ||
             item.name.includes('apple') ||
             item.name.includes('carrot') ||
             item.name.includes('potato') ||
             item.name.includes('beef') ||
             item.name.includes('porkchop') ||
             item.name.includes('chicken') ||
             item.name.includes('mutton') ||
             item.name.includes('fish') ||
             item.name.includes('salmon') ||
             item.name.includes('steak');
    });

    if (foodItems.length === 0) {
      return {
        success: false,
        message: 'No food available in inventory',
        error: 'No food items found',
      };
    }

    // Eat the first available food
    const foodItem = foodItems[0];
    logger.info(`Eating ${foodItem.name}`);

    await bot.equip(foodItem, 'hand');
    await bot.consume();

    const newFood = bot.food ?? 20;

    return {
      success: true,
      message: `Ate ${foodItem.name}, food: ${currentFood} → ${newFood}`,
      data: {
        foodBefore: currentFood,
        foodAfter: newFood,
        itemEaten: foodItem.name,
        ate: true,
      },
    };
  } catch (error) {
    context.logger.error('Error eating food', error);
    return {
      success: false,
      message: 'Failed to eat food',
      error: String(error),
    };
  }
}
