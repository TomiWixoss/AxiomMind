import type { ToolDefinition, ToolResult, ToolContext } from './types';

export function getPositionDefinition(): ToolDefinition {
  return {
    name: 'get_position',
    description: 'Get the bot\'s current position in the world (x, y, z coordinates) and dimension',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  };
}

export async function getPositionHandler(
  params: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { bot, logger } = context;

    if (!bot.entity || !bot.entity.position) {
      logger.error('Bot entity or position not available');
      return {
        success: false,
        message: 'Cannot get position: bot not spawned',
        error: 'Bot entity not available',
      };
    }

    const position = bot.entity.position;
    const dimension = bot.game?.dimension || 'unknown';

    logger.debug('Got bot position', { position, dimension });

    return {
      success: true,
      message: `Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}) in ${dimension}`,
      data: {
        x: position.x,
        y: position.y,
        z: position.z,
        dimension,
      },
    };
  } catch (error) {
    context.logger.error('Error getting position', error);
    return {
      success: false,
      message: 'Failed to get position',
      error: String(error),
    };
  }
}
