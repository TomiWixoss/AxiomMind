import type { Bot } from 'mineflayer';

export interface CraftingResult {
  success: boolean;
  itemsCrafted: number;
  itemName: string;
  error?: string;
}

export interface CraftingOptions {
  itemName: string;
  count: number;
  findCraftingTable?: boolean;
  maxTableDistance?: number;
}

/**
 * CraftingAction - Advanced crafting workflow
 * Part of Execution Layer
 */
export class CraftingAction {
  private bot: Bot;
  private logger: any;

  constructor(bot: Bot, logger: any) {
    this.bot = bot;
    this.logger = logger;
  }

  /**
   * Execute crafting action
   */
  async execute(options: CraftingOptions): Promise<CraftingResult> {
    const {
      itemName,
      count,
      findCraftingTable = true,
      maxTableDistance = 32,
    } = options;

    this.logger.info('Starting crafting action', { itemName, count });

    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const item = mcData.itemsByName[itemName];

      if (!item) {
        return {
          success: false,
          itemsCrafted: 0,
          itemName,
          error: `Unknown item: ${itemName}`,
        };
      }

      // Get recipes
      const recipes = this.bot.recipesFor(item.id, null, 1, null);

      if (!recipes || recipes.length === 0) {
        return {
          success: false,
          itemsCrafted: 0,
          itemName,
          error: `No recipe found for ${itemName}`,
        };
      }

      const recipe = recipes[0];
      if (!recipe) {
        return {
          success: false,
          itemsCrafted: 0,
          itemName,
          error: 'No valid recipe found',
        };
      }

      // Check if we have materials
      // @ts-ignore
      if (!this.bot.canCraft || !this.bot.canCraft(recipe, count)) {
        return {
          success: false,
          itemsCrafted: 0,
          itemName,
          error: 'Insufficient materials',
        };
      }

      // Find crafting table if needed
      if (recipe.requiresTable && findCraftingTable) {
        const tableFound = await this.findAndNavigateToCraftingTable(maxTableDistance);
        if (!tableFound) {
          return {
            success: false,
            itemsCrafted: 0,
            itemName,
            error: 'Crafting table required but not found',
          };
        }
      }

      // Craft the item
      await this.bot.craft(recipe, count, null as any);

      this.logger.info('Crafting action completed', {
        itemName,
        count,
        success: true,
      });

      return {
        success: true,
        itemsCrafted: count,
        itemName,
      };
    } catch (error) {
      this.logger.error('Crafting action failed', error);
      return {
        success: false,
        itemsCrafted: 0,
        itemName,
        error: String(error),
      };
    }
  }

  /**
   * Find and navigate to crafting table
   */
  private async findAndNavigateToCraftingTable(maxDistance: number): Promise<boolean> {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const craftingTableId = mcData.blocksByName.crafting_table?.id;

      if (!craftingTableId) {
        return false;
      }

      const table = this.bot.findBlock({
        matching: craftingTableId,
        maxDistance,
      });

      if (!table) {
        this.logger.debug('No crafting table found nearby');
        return false;
      }

      // Navigate to table if needed
      const distance = this.bot.entity.position.distanceTo(table.position);
      if (distance > 3) {
        if (!this.bot.pathfinder) {
          return false;
        }

        const { goals } = await import('mineflayer-pathfinder');
        const goal = new goals.GoalNear(table.position.x, table.position.y, table.position.z, 2);
        
        this.bot.pathfinder.setGoal(goal);
        
        // Wait for pathfinding
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.logger.debug('Found and navigated to crafting table');
      return true;
    } catch (error) {
      this.logger.error('Error finding crafting table', error);
      return false;
    }
  }

  /**
   * Check if can craft item
   */
  canCraft(itemName: string, count: number = 1): boolean {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const item = mcData.itemsByName[itemName];

      if (!item) {
        return false;
      }

      const recipes = this.bot.recipesFor(item.id, null, 1, null);
      if (!recipes || recipes.length === 0) {
        return false;
      }

      const recipe = recipes[0];
      // @ts-ignore
      return this.bot.canCraft && this.bot.canCraft(recipe, count);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get missing materials for crafting
   */
  getMissingMaterials(itemName: string): string[] {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const item = mcData.itemsByName[itemName];

      if (!item) {
        return [];
      }

      const recipes = this.bot.recipesFor(item.id, null, 1, null);
      if (!recipes || recipes.length === 0) {
        return [];
      }

      const recipe = recipes[0];
      if (!recipe) {
        return [];
      }

      const missing: string[] = [];

      // Check each ingredient
      for (const ingredient of recipe.delta) {
        if (ingredient.count < 0) {
          const needed = Math.abs(ingredient.count);
          const materialItem = mcData.items[ingredient.id];
          
          if (materialItem) {
            const have = this.bot.inventory.items()
              .filter(i => i.type === ingredient.id)
              .reduce((sum, i) => sum + i.count, 0);

            if (have < needed) {
              missing.push(`${materialItem.name} (need ${needed}, have ${have})`);
            }
          }
        }
      }

      return missing;
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if crafting table is nearby
   */
  hasCraftingTableNearby(maxDistance: number = 32): boolean {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const craftingTableId = mcData.blocksByName.crafting_table?.id;

      if (!craftingTableId) {
        return false;
      }

      const table = this.bot.findBlock({
        matching: craftingTableId,
        maxDistance,
      });

      return table !== null;
    } catch (error) {
      return false;
    }
  }
}

export default CraftingAction;
