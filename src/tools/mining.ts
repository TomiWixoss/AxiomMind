import type { ToolDefinition, ToolResult, ToolContext } from './types';

export function mineBlockDefinition(): ToolDefinition {
  return {
    name: 'mine_block',
    description: 'Mine blocks of a specific type. Bot will find, navigate to, and mine the blocks automatically.',
    parameters: {
      blockType: {
        type: 'string',
        description: 'The type of block to mine (e.g., "stone", "iron_ore", "oak_log")',
        required: true,
      },
      count: {
        type: 'number',
        description: 'Number of blocks to mine (default: 1)',
        required: false,
        minimum: 1,
        maximum: 64,
        default: 1,
      },
    },
  };
}

export async function mineBlockHandler(
  params: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { bot, logger } = context;
    const { blockType, count = 1 } = params;

    // Validate parameters
    if (!blockType) {
      return {
        success: false,
        message: 'blockType parameter is required',
        error: 'Missing required parameter: blockType',
      };
    }

    if (count < 1 || count > 64) {
      return {
        success: false,
        message: 'count must be between 1 and 64',
        error: 'Invalid count parameter',
      };
    }

    if (!bot.entity || !bot.entity.position) {
      return {
        success: false,
        message: 'Bot not spawned',
        error: 'Bot entity not available',
      };
    }

    const mcData = require('minecraft-data')(bot.version);
    const blockId = mcData.blocksByName[blockType]?.id;

    if (!blockId) {
      return {
        success: false,
        message: `Unknown block type: ${blockType}`,
        error: `Block type "${blockType}" not found`,
      };
    }

    let mined = 0;
    const errors: string[] = [];

    // Mine blocks one by one
    for (let i = 0; i < count; i++) {
      try {
        // Find nearest block
        const block = bot.findBlock({
          matching: blockId,
          maxDistance: 64,
        });

        if (!block) {
          logger.debug(`No more ${blockType} blocks found nearby`);
          break;
        }

        logger.info(`Mining ${blockType} at (${block.position.x}, ${block.position.y}, ${block.position.z})`);

        // Navigate to block if needed
        const distance = bot.entity.position.distanceTo(block.position);
        if (distance > 4.5) {
          const { goals } = await import('mineflayer-pathfinder');
          const goal = new goals.GoalNear(block.position.x, block.position.y, block.position.z, 3);
          bot.pathfinder.setGoal(goal);
          
          // Wait for pathfinding (simplified - in production use events)
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Equip correct tool
        if (bot.tool) {
          await bot.tool.equipForBlock(block);
        }

        // Mine the block
        await bot.dig(block);
        mined++;

        // Collect drops if collectblock plugin available
        if (bot.collectBlock) {
          try {
            await bot.collectBlock.collect(block);
          } catch (err) {
            logger.debug('Could not collect drops', err);
          }
        }

        logger.debug(`Mined ${blockType} (${mined}/${count})`);
      } catch (err) {
        logger.error(`Error mining block ${i + 1}`, err);
        errors.push(String(err));
      }
    }

    if (mined === 0) {
      return {
        success: false,
        message: `Could not find any ${blockType} blocks nearby`,
        error: `No ${blockType} blocks found within 64 blocks`,
      };
    }

    const message = mined === count
      ? `Successfully mined ${mined} ${blockType} blocks`
      : `Mined ${mined} of ${count} ${blockType} blocks (no more found nearby)`;

    return {
      success: true,
      message,
      data: {
        blockType,
        requested: count,
        mined,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    context.logger.error('Error in mine_block handler', error);
    return {
      success: false,
      message: 'Failed to mine blocks',
      error: String(error),
    };
  }
}
