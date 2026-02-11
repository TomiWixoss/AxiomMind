import type { ToolDefinition, ToolResult, ToolContext } from './types';

export function getHealthDefinition(): ToolDefinition {
  return {
    name: 'get_health',
    description: 'Get the bot\'s current health, food level, and saturation status',
    parameters: {},
  };
}

export async function getHealthHandler(
  params: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { bot, logger } = context;

    const health = bot.health ?? 20;
    const food = bot.food ?? 20;
    const foodSaturation = bot.foodSaturation ?? 5.0;

    // Determine status
    let status = 'healthy';
    if (health <= 5 || food <= 5) {
      status = 'critical';
    } else if (health <= 10) {
      status = 'low health';
    } else if (food <= 10) {
      status = 'low food';
    }

    logger.debug('Got health status', { health, food, foodSaturation, status });

    return {
      success: true,
      message: `Health: ${health}/20, Food: ${food}/20, Status: ${status}`,
      data: {
        health,
        maxHealth: 20,
        food,
        maxFood: 20,
        foodSaturation,
        status,
      },
    };
  } catch (error) {
    context.logger.error('Error getting health', error);
    return {
      success: false,
      message: 'Failed to get health status',
      error: String(error),
    };
  }
}
