import type { Bot } from 'mineflayer';
import type { Vec3 } from 'vec3';

export interface MiningResult {
  success: boolean;
  blocksMined: number;
  itemsCollected: string[];
  error?: string;
}

export interface MiningOptions {
  blockType: string;
  count: number;
  maxDistance?: number;
  equipTool?: boolean;
  collectDrops?: boolean;
}

/**
 * MiningAction - Advanced mining workflow
 * Part of Execution Layer
 */
export class MiningAction {
  private bot: Bot;
  private logger: any;

  constructor(bot: Bot, logger: any) {
    this.bot = bot;
    this.logger = logger;
  }

  /**
   * Execute mining action
   */
  async execute(options: MiningOptions): Promise<MiningResult> {
    const {
      blockType,
      count,
      maxDistance = 64,
      equipTool = true,
      collectDrops = true,
    } = options;

    this.logger.info('Starting mining action', { blockType, count, maxDistance });

    let blocksMined = 0;
    const itemsCollected: string[] = [];
    const errors: string[] = [];

    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const blockId = mcData.blocksByName[blockType]?.id;

      if (!blockId) {
        return {
          success: false,
          blocksMined: 0,
          itemsCollected: [],
          error: `Unknown block type: ${blockType}`,
        };
      }

      // Mine blocks one by one
      for (let i = 0; i < count; i++) {
        try {
          // Find nearest block
          const block = this.bot.findBlock({
            matching: blockId,
            maxDistance,
          });

          if (!block) {
            this.logger.debug(`No more ${blockType} blocks found`, { mined: blocksMined });
            break;
          }

          // Navigate to block if too far
          const distance = this.bot.entity.position.distanceTo(block.position);
          if (distance > 4.5) {
            await this.navigateToBlock(block.position);
          }

          // Equip appropriate tool
          if (equipTool && this.bot.tool) {
            await this.bot.tool.equipForBlock(block);
          }

          // Mine the block
          await this.bot.dig(block);
          blocksMined++;

          // Collect drops
          if (collectDrops && this.bot.collectBlock) {
            try {
              await this.bot.collectBlock.collect(block);
              // Track that we attempted collection
              itemsCollected.push(blockType);
            } catch (err) {
              this.logger.debug('Could not collect drops', err);
            }
          }

          this.logger.debug(`Mined ${blockType}`, { progress: `${blocksMined}/${count}` });
        } catch (err) {
          this.logger.error(`Error mining block ${i + 1}`, err);
          errors.push(String(err));
        }
      }

      const success = blocksMined > 0;
      this.logger.info('Mining action completed', {
        blockType,
        blocksMined,
        itemsCollected: itemsCollected.length,
        success,
      });

      return {
        success,
        blocksMined,
        itemsCollected,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    } catch (error) {
      this.logger.error('Mining action failed', error);
      return {
        success: false,
        blocksMined,
        itemsCollected,
        error: String(error),
      };
    }
  }

  /**
   * Navigate to block position
   */
  private async navigateToBlock(position: Vec3): Promise<void> {
    if (!this.bot.pathfinder) {
      throw new Error('Pathfinder not available');
    }

    const { goals } = await import('mineflayer-pathfinder');
    const goal = new goals.GoalNear(position.x, position.y, position.z, 3);
    
    this.bot.pathfinder.setGoal(goal);
    
    // Wait a bit for pathfinding to start
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Find nearest block of type
   */
  findNearestBlock(blockType: string, maxDistance: number = 64): Vec3 | null {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const blockId = mcData.blocksByName[blockType]?.id;

      if (!blockId) {
        return null;
      }

      const block = this.bot.findBlock({
        matching: blockId,
        maxDistance,
      });

      return block ? block.position : null;
    } catch (error) {
      this.logger.error('Error finding block', error);
      return null;
    }
  }

  /**
   * Check if bot has appropriate tool for block
   */
  hasAppropriateToolFor(blockType: string): boolean {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const block = mcData.blocksByName[blockType];

      if (!block) {
        return false;
      }

      // Check if bot has any tool that can mine this block
      const tools = this.bot.inventory.items().filter(item => {
        return item.name.includes('pickaxe') || 
               item.name.includes('axe') || 
               item.name.includes('shovel');
      });

      return tools.length > 0;
    } catch (error) {
      return false;
    }
  }
}

export default MiningAction;
