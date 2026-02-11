import type { Bot } from 'mineflayer';
import type { Item } from 'prismarine-item';

export interface InventoryItem {
  name: string;
  displayName: string;
  count: number;
  slot: number;
  stackSize: number;
}

export interface InventoryChange {
  timestamp: Date;
  type: 'added' | 'removed' | 'changed';
  item: string;
  countBefore: number;
  countAfter: number;
  delta: number;
}

export interface InventorySummary {
  totalItems: number;
  totalSlots: number;
  usedSlots: number;
  freeSlots: number;
  items: InventoryItem[];
  categories: {
    tools: InventoryItem[];
    weapons: InventoryItem[];
    armor: InventoryItem[];
    food: InventoryItem[];
    blocks: InventoryItem[];
    ores: InventoryItem[];
    other: InventoryItem[];
  };
}

export interface ResourceCheck {
  hasWoodPickaxe: boolean;
  hasStonePickaxe: boolean;
  hasIronPickaxe: boolean;
  hasDiamondPickaxe: boolean;
  hasSword: boolean;
  hasFood: boolean;
  hasTorch: boolean;
  hasCraftingTable: boolean;
  woodCount: number;
  stoneCount: number;
  ironCount: number;
  diamondCount: number;
  foodCount: number;
}

/**
 * InventoryTracker - Tracks inventory changes and resource availability
 * Part of Perception Layer
 */
export class InventoryTracker {
  private bot: Bot;
  private logger: any;
  private previousInventory: Map<string, number> = new Map();
  private changeHistory: InventoryChange[] = [];
  private maxHistorySize: number = 100;

  // Item categories
  private readonly TOOLS = ['pickaxe', 'axe', 'shovel', 'hoe'];
  private readonly WEAPONS = ['sword', 'bow', 'crossbow', 'trident'];
  private readonly ARMOR = ['helmet', 'chestplate', 'leggings', 'boots', 'shield'];
  private readonly FOOD_ITEMS = [
    'bread', 'apple', 'carrot', 'potato', 'beef', 'porkchop',
    'chicken', 'mutton', 'fish', 'salmon', 'cod', 'steak',
    'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'cooked_mutton',
    'golden_apple', 'melon', 'cookie', 'cake',
  ];
  private readonly ORES = [
    'coal', 'iron_ingot', 'gold_ingot', 'diamond', 'emerald',
    'lapis_lazuli', 'redstone', 'copper_ingot', 'netherite_ingot',
  ];

  constructor(bot: Bot, logger: any) {
    this.bot = bot;
    this.logger = logger;

    this.logger.info('InventoryTracker initialized');
    this.setupEventListeners();
    this.updateInventorySnapshot();
  }

  /**
   * Setup event listeners for inventory changes
   */
  private setupEventListeners() {
    // Track inventory updates
    this.bot.on('playerCollect', (collector, collected) => {
      if (collector !== this.bot.entity) return;
      this.onInventoryChange();
    });

    // Track when items are used/consumed
    this.bot.on('itemDrop', () => {
      this.onInventoryChange();
    });
  }

  /**
   * Handle inventory change event
   */
  private onInventoryChange() {
    const currentInventory = this.getInventoryMap();
    const changes: InventoryChange[] = [];

    // Detect changes
    for (const [itemName, currentCount] of currentInventory.entries()) {
      const previousCount = this.previousInventory.get(itemName) || 0;
      
      if (currentCount !== previousCount) {
        const delta = currentCount - previousCount;
        changes.push({
          timestamp: new Date(),
          type: delta > 0 ? 'added' : delta < 0 ? 'removed' : 'changed',
          item: itemName,
          countBefore: previousCount,
          countAfter: currentCount,
          delta,
        });
      }
    }

    // Check for removed items
    for (const [itemName, previousCount] of this.previousInventory.entries()) {
      if (!currentInventory.has(itemName)) {
        changes.push({
          timestamp: new Date(),
          type: 'removed',
          item: itemName,
          countBefore: previousCount,
          countAfter: 0,
          delta: -previousCount,
        });
      }
    }

    // Log changes
    if (changes.length > 0) {
      this.logger.debug('Inventory changed', {
        changes: changes.length,
      });

      // Add to history
      this.changeHistory.push(...changes);
      
      // Trim history if too large
      if (this.changeHistory.length > this.maxHistorySize) {
        this.changeHistory = this.changeHistory.slice(-this.maxHistorySize);
      }
    }

    // Update snapshot
    this.previousInventory = currentInventory;
  }

  /**
   * Get current inventory as map
   */
  private getInventoryMap(): Map<string, number> {
    const map = new Map<string, number>();
    
    if (!this.bot.inventory) return map;

    for (const item of this.bot.inventory.items()) {
      const current = map.get(item.name) || 0;
      map.set(item.name, current + item.count);
    }

    return map;
  }

  /**
   * Update inventory snapshot
   */
  updateInventorySnapshot() {
    this.previousInventory = this.getInventoryMap();
  }

  /**
   * Get inventory summary
   */
  getInventorySummary(): InventorySummary {
    if (!this.bot.inventory) {
      return this.getEmptySummary();
    }

    const items = this.bot.inventory.items();
    const inventoryItems: InventoryItem[] = items.map(item => ({
      name: item.name,
      displayName: item.displayName,
      count: item.count,
      slot: item.slot,
      stackSize: item.stackSize,
    }));

    // Categorize items
    const categories = {
      tools: inventoryItems.filter(i => this.isTool(i.name)),
      weapons: inventoryItems.filter(i => this.isWeapon(i.name)),
      armor: inventoryItems.filter(i => this.isArmor(i.name)),
      food: inventoryItems.filter(i => this.isFood(i.name)),
      blocks: inventoryItems.filter(i => this.isBlock(i.name)),
      ores: inventoryItems.filter(i => this.isOre(i.name)),
      other: inventoryItems.filter(i => 
        !this.isTool(i.name) && 
        !this.isWeapon(i.name) && 
        !this.isArmor(i.name) && 
        !this.isFood(i.name) && 
        !this.isBlock(i.name) && 
        !this.isOre(i.name)
      ),
    };

    const totalCount = inventoryItems.reduce((sum, item) => sum + item.count, 0);

    return {
      totalItems: totalCount,
      totalSlots: 36, // Player inventory size
      usedSlots: inventoryItems.length,
      freeSlots: 36 - inventoryItems.length,
      items: inventoryItems,
      categories,
    };
  }

  /**
   * Get recent inventory changes
   */
  getRecentChanges(limit: number = 10): InventoryChange[] {
    return this.changeHistory.slice(-limit);
  }

  /**
   * Get all changes for specific item
   */
  getItemHistory(itemName: string): InventoryChange[] {
    return this.changeHistory.filter(change => change.item === itemName);
  }

  /**
   * Check if has specific item
   */
  hasItem(itemName: string, minCount: number = 1): boolean {
    const count = this.getItemCount(itemName);
    return count >= minCount;
  }

  /**
   * Get count of specific item
   */
  getItemCount(itemName: string): number {
    if (!this.bot.inventory) return 0;

    return this.bot.inventory.items()
      .filter(item => item.name === itemName)
      .reduce((sum, item) => sum + item.count, 0);
  }

  /**
   * Find item in inventory
   */
  findItem(itemName: string): Item | null {
    if (!this.bot.inventory) return null;

    return this.bot.inventory.items().find(item => item.name === itemName) || null;
  }

  /**
   * Check resource availability for speedrun
   */
  checkResources(): ResourceCheck {
    return {
      hasWoodPickaxe: this.hasItem('wooden_pickaxe'),
      hasStonePickaxe: this.hasItem('stone_pickaxe'),
      hasIronPickaxe: this.hasItem('iron_pickaxe'),
      hasDiamondPickaxe: this.hasItem('diamond_pickaxe'),
      hasSword: this.hasItem('wooden_sword') || this.hasItem('stone_sword') || 
                this.hasItem('iron_sword') || this.hasItem('diamond_sword'),
      hasFood: this.FOOD_ITEMS.some(food => this.hasItem(food)),
      hasTorch: this.hasItem('torch'),
      hasCraftingTable: this.hasItem('crafting_table'),
      woodCount: this.getItemCount('oak_log') + this.getItemCount('birch_log') + 
                 this.getItemCount('spruce_log') + this.getItemCount('jungle_log'),
      stoneCount: this.getItemCount('cobblestone'),
      ironCount: this.getItemCount('iron_ingot'),
      diamondCount: this.getItemCount('diamond'),
      foodCount: this.FOOD_ITEMS.reduce((sum, food) => sum + this.getItemCount(food), 0),
    };
  }

  /**
   * Check if can craft item
   */
  canCraft(itemName: string): boolean {
    if (!this.bot.inventory) return false;

    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const item = mcData.itemsByName[itemName];
      if (!item) return false;

      const recipes = this.bot.recipesFor(item.id, null, 1, null);
      if (!recipes || recipes.length === 0) return false;

      // Check if bot has materials for any recipe
      return recipes.some(recipe => {
        // @ts-ignore - canCraft exists on bot but not in types
        return this.bot.canCraft && this.bot.canCraft(recipe, 1);
      });
    } catch (err) {
      return false;
    }
  }

  /**
   * Get missing materials for crafting
   */
  getMissingMaterials(itemName: string): string[] {
    if (!this.bot.inventory) return [];

    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const item = mcData.itemsByName[itemName];
      if (!item) return [];

      const recipes = this.bot.recipesFor(item.id, null, 1, null);
      if (!recipes || recipes.length === 0) return [];

      const recipe = recipes[0];
      if (!recipe) return [];

      const missing: string[] = [];

      // Check each ingredient
      for (const ingredient of recipe.delta) {
        if (ingredient.count < 0) {
          const needed = Math.abs(ingredient.count);
          const itemName = mcData.items[ingredient.id]?.name;
          if (itemName) {
            const have = this.getItemCount(itemName);
            if (have < needed) {
              missing.push(`${itemName} (need ${needed}, have ${have})`);
            }
          }
        }
      }

      return missing;
    } catch (err) {
      return [];
    }
  }

  /**
   * Get inventory space info
   */
  getSpaceInfo(): { used: number; free: number; percentage: number } {
    const summary = this.getInventorySummary();
    return {
      used: summary.usedSlots,
      free: summary.freeSlots,
      percentage: Math.round((summary.usedSlots / summary.totalSlots) * 100),
    };
  }

  /**
   * Check if inventory is full
   */
  isFull(): boolean {
    const space = this.getSpaceInfo();
    return space.free === 0;
  }

  /**
   * Check if inventory is nearly full
   */
  isNearlyFull(threshold: number = 0.8): boolean {
    const space = this.getSpaceInfo();
    return space.percentage >= threshold * 100;
  }

  // === Category Checkers ===

  private isTool(itemName: string): boolean {
    return this.TOOLS.some(tool => itemName.includes(tool));
  }

  private isWeapon(itemName: string): boolean {
    return this.WEAPONS.some(weapon => itemName.includes(weapon));
  }

  private isArmor(itemName: string): boolean {
    return this.ARMOR.some(armor => itemName.includes(armor));
  }

  private isFood(itemName: string): boolean {
    return this.FOOD_ITEMS.some(food => itemName.includes(food));
  }

  private isBlock(itemName: string): boolean {
    return itemName.includes('_block') || 
           itemName.includes('stone') || 
           itemName.includes('dirt') ||
           itemName.includes('planks') ||
           itemName.includes('log');
  }

  private isOre(itemName: string): boolean {
    return this.ORES.some(ore => itemName.includes(ore));
  }

  private getEmptySummary(): InventorySummary {
    return {
      totalItems: 0,
      totalSlots: 36,
      usedSlots: 0,
      freeSlots: 36,
      items: [],
      categories: {
        tools: [],
        weapons: [],
        armor: [],
        food: [],
        blocks: [],
        ores: [],
        other: [],
      },
    };
  }

  /**
   * Clear change history
   */
  clearHistory() {
    this.changeHistory = [];
    this.logger.debug('Inventory change history cleared');
  }
}

export default InventoryTracker;
