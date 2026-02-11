import type { ToolDefinition, ToolResult, ToolContext } from './types';

export function gotoLocationDefinition(): ToolDefinition {
  return {
    name: 'goto_location',
    description: 'Navigate the bot to a specific coordinate (x, y, z) using pathfinding',
    parameters: {
      x: {
        type: 'number',
        description: 'X coordinate',
        required: true,
      },
      y: {
        type: 'number',
        description: 'Y coordinate (height)',
        required: true,
      },
      z: {
        type: 'number',
        description: 'Z coordinate',
        required: true,
      },
    },
  };
}

export async function gotoLocationHandler(
  params: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { bot, logger } = context;
    const { x, y, z } = params;

    // Validate parameters
    if (x === undefined || y === undefined || z === undefined) {
      return {
        success: false,
        message: 'Missing required coordinates (x, y, z)',
        error: 'x, y, and z coordinates are required',
      };
    }

    if (!bot.pathfinder) {
      return {
        success: false,
        message: 'Pathfinder plugin not loaded',
        error: 'Pathfinder plugin is required for navigation',
      };
    }

    if (!bot.entity || !bot.entity.position) {
      return {
        success: false,
        message: 'Bot not spawned',
        error: 'Bot entity not available',
      };
    }

    const currentPos = bot.entity.position;
    const targetPos = { x, y, z };

    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(x - currentPos.x, 2) +
      Math.pow(y - currentPos.y, 2) +
      Math.pow(z - currentPos.z, 2)
    );

    // Check if already at location
    if (distance < 1) {
      logger.debug('Already at target location');
      return {
        success: true,
        message: `Already at location (${x}, ${y}, ${z})`,
        data: {
          target: targetPos,
          distance: 0,
          alreadyThere: true,
        },
      };
    }

    // Import goals from pathfinder
    const { goals } = await import('mineflayer-pathfinder');
    const goal = new goals.GoalBlock(x, y, z);

    // Set pathfinding goal
    bot.pathfinder.setGoal(goal);

    logger.info(`Navigating to (${x}, ${y}, ${z})`, {
      distance: Math.round(distance * 10) / 10,
    });

    return {
      success: true,
      message: `Navigating to (${x}, ${y}, ${z}) - ${Math.round(distance)} blocks away`,
      data: {
        target: targetPos,
        current: {
          x: currentPos.x,
          y: currentPos.y,
          z: currentPos.z,
        },
        distance: Math.round(distance),
      },
    };
  } catch (error) {
    context.logger.error('Error navigating to location', error);
    return {
      success: false,
      message: 'Failed to navigate to location',
      error: String(error),
    };
  }
}
