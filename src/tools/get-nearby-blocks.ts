import type { ToolDefinition, ToolResult, ToolContext } from './types';

export function getNearbyBlocksDefinition(): ToolDefinition {
  return {
    name: 'get_nearby_blocks',
    description: 'Find nearby blocks of a specific type within a given distance. Returns positions and distances.',
    parameters: {
      type: 'object',
      properties: {
        blockType: {
          type: 'string',
          description: 'The type of block to search for (e.g., "stone", "iron_ore", "oak_log")',
        },
        maxDistance: {
          type: 'number',
          description: 'Maximum search distance in blocks (default: 16, max: 128)',
          minimum: 1,
          maximum: 128,
        },
      },
      required: ['blockType'],
    },
  };
}

export async function getNearbyBlocksHandler(
  params: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { bot, logger } = context;
    const { blockType, maxDistance = 16 } = params;

    // Validate parameters
    if (!blockType) {
      return {
        success: false,
        message: 'blockType parameter is required',
        error: 'Missing required parameter: blockType',
      };
    }

    if (maxDistance > 128) {
      return {
        success: false,
        message: 'maxDistance cannot exceed 128 blocks',
        error: 'maxDistance must be <= 128',
      };
    }

    if (!bot.entity || !bot.entity.position) {
      return {
        success: false,
        message: 'Bot not spawned',
        error: 'Bot entity not available',
      };
    }

    const botPos = bot.entity.position;

    // Find blocks using mineflayer's findBlocks
    const mcData = require('minecraft-data')(bot.version);
    const blockId = mcData.blocksByName[blockType]?.id;

    if (!blockId) {
      return {
        success: false,
        message: `Unknown block type: ${blockType}`,
        error: `Block type "${blockType}" not found`,
      };
    }

    const positions = bot.findBlocks({
      matching: blockId,
      maxDistance: maxDistance,
      count: 100, // Limit results
    });

    if (positions.length === 0) {
      logger.debug(`No ${blockType} blocks found within ${maxDistance} blocks`);
      return {
        success: true,
        message: `No ${blockType} blocks found within ${maxDistance} blocks`,
        data: {
          blockType,
          blocks: [],
          count: 0,
        },
      };
    }

    // Calculate distances and sort by nearest
    interface BlockWithDistance {
      name: string;
      position: { x: number; y: number; z: number };
      distance: number;
    }

    const blocks: BlockWithDistance[] = positions.map((pos: any) => {
      const block = bot.blockAt(pos);
      const distance = Math.sqrt(
        Math.pow(pos.x - botPos.x, 2) +
        Math.pow(pos.y - botPos.y, 2) +
        Math.pow(pos.z - botPos.z, 2)
      );

      return {
        name: block?.name || blockType,
        position: { x: pos.x, y: pos.y, z: pos.z },
        distance: Math.round(distance * 10) / 10,
      };
    }).sort((a: BlockWithDistance, b: BlockWithDistance) => a.distance - b.distance);

    logger.debug(`Found ${blocks.length} ${blockType} blocks`, {
      nearest: blocks.length > 0 && blocks[0] ? blocks[0].distance : undefined,
    });

    const nearestBlock = blocks.length > 0 ? blocks[0] : undefined;

    return {
      success: true,
      message: `Found ${blocks.length} ${blockType} blocks${nearestBlock ? ` (nearest: ${nearestBlock.distance}m)` : ''}`,
      data: {
        blockType,
        blocks,
        count: blocks.length,
        nearest: nearestBlock,
      },
    };
  } catch (error) {
    context.logger.error('Error finding nearby blocks', error);
    return {
      success: false,
      message: 'Failed to find nearby blocks',
      error: String(error),
    };
  }
}
