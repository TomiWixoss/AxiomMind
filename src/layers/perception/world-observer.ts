import type { Bot } from 'mineflayer';
import type { Vec3 } from 'vec3';
import type { DatabaseManager } from '../../utils/database';

export interface BlockObservation {
  name: string;
  position: Vec3;
  distance: number;
  type: 'ore' | 'wood' | 'stone' | 'dirt' | 'other';
}

export interface EntityObservation {
  type: string;
  name: string;
  position: Vec3;
  distance: number;
  isHostile: boolean;
  health?: number;
}

export interface DangerObservation {
  type: 'lava' | 'cliff' | 'hostile_mob' | 'low_health' | 'low_food';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  position?: Vec3;
}

export interface WorldSnapshot {
  timestamp: Date;
  position: Vec3;
  dimension: string;
  health: number;
  food: number;
  nearbyBlocks: BlockObservation[];
  nearbyEntities: EntityObservation[];
  dangers: DangerObservation[];
  timeOfDay: number;
  weather: string;
}

export interface ObserverConfig {
  blockScanRadius: number;
  entityScanRadius: number;
  updateInterval: number;
  trackOres: boolean;
  trackMobs: boolean;
  trackDangers: boolean;
}

/**
 * WorldObserver - Observes and tracks world state
 * Part of Perception Layer
 */
export class WorldObserver {
  private bot: Bot;
  private logger: any;
  private database: DatabaseManager;
  private config: ObserverConfig;
  private lastSnapshot?: WorldSnapshot;
  private updateTimer?: Timer;

  // Hostile mob types
  private readonly HOSTILE_MOBS = [
    'zombie', 'skeleton', 'creeper', 'spider', 'enderman',
    'witch', 'blaze', 'ghast', 'piglin', 'hoglin',
    'wither_skeleton', 'phantom', 'drowned', 'husk', 'stray',
  ];

  // Ore types
  private readonly ORE_BLOCKS = [
    'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'emerald_ore',
    'lapis_ore', 'redstone_ore', 'copper_ore',
    'deepslate_coal_ore', 'deepslate_iron_ore', 'deepslate_gold_ore',
    'deepslate_diamond_ore', 'deepslate_emerald_ore', 'deepslate_lapis_ore',
    'deepslate_redstone_ore', 'deepslate_copper_ore',
    'nether_gold_ore', 'nether_quartz_ore', 'ancient_debris',
  ];

  // Wood types
  private readonly WOOD_BLOCKS = [
    'oak_log', 'birch_log', 'spruce_log', 'jungle_log',
    'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log',
  ];

  constructor(
    bot: Bot,
    logger: any,
    database: DatabaseManager,
    config: Partial<ObserverConfig> = {}
  ) {
    this.bot = bot;
    this.logger = logger;
    this.database = database;
    this.config = {
      blockScanRadius: config.blockScanRadius ?? 32,
      entityScanRadius: config.entityScanRadius ?? 32,
      updateInterval: config.updateInterval ?? 5000, // 5 seconds
      trackOres: config.trackOres ?? true,
      trackMobs: config.trackMobs ?? true,
      trackDangers: config.trackDangers ?? true,
    };

    this.logger.info('WorldObserver initialized', this.config);
  }

  /**
   * Start automatic world observation
   */
  startObserving() {
    if (this.updateTimer) {
      this.logger.warn('WorldObserver already observing');
      return;
    }

    this.logger.info('Starting world observation', {
      interval: this.config.updateInterval,
    });

    this.updateTimer = setInterval(() => {
      this.observe();
    }, this.config.updateInterval);

    // Initial observation
    this.observe();
  }

  /**
   * Stop automatic observation
   */
  stopObserving() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
      this.logger.info('Stopped world observation');
    }
  }

  /**
   * Perform a single observation
   */
  observe(): WorldSnapshot {
    if (!this.bot.entity || !this.bot.entity.position) {
      throw new Error('Bot not spawned');
    }

    const snapshot: WorldSnapshot = {
      timestamp: new Date(),
      position: this.bot.entity.position.clone(),
      dimension: this.getDimension(),
      health: this.bot.health ?? 20,
      food: this.bot.food ?? 20,
      nearbyBlocks: this.observeBlocks(),
      nearbyEntities: this.observeEntities(),
      dangers: this.detectDangers(),
      timeOfDay: this.bot.time.timeOfDay,
      weather: this.getWeather(),
    };

    this.lastSnapshot = snapshot;

    // Save to database
    this.saveWorldState(snapshot);

    this.logger.debug('World observation completed', {
      blocks: snapshot.nearbyBlocks.length,
      entities: snapshot.nearbyEntities.length,
      dangers: snapshot.dangers.length,
    });

    return snapshot;
  }

  /**
   * Get last snapshot
   */
  getLastSnapshot(): WorldSnapshot | undefined {
    return this.lastSnapshot;
  }

  /**
   * Observe nearby blocks
   */
  private observeBlocks(): BlockObservation[] {
    if (!this.bot.entity) return [];

    const blocks: BlockObservation[] = [];
    const botPos = this.bot.entity.position;
    const radius = this.config.blockScanRadius;

    // Scan for interesting blocks
    const interestingBlocks = [
      ...this.ORE_BLOCKS,
      ...this.WOOD_BLOCKS,
      'crafting_table',
      'furnace',
      'chest',
      'lava',
      'water',
    ];

    for (const blockName of interestingBlocks) {
      try {
        const mcData = require('minecraft-data')(this.bot.version);
        const blockType = mcData.blocksByName[blockName];
        if (!blockType) continue;

        const positions = this.bot.findBlocks({
          matching: blockType.id,
          maxDistance: radius,
          count: 10, // Limit per block type
        });

        for (const pos of positions) {
          const block = this.bot.blockAt(pos);
          if (!block) continue;

          const distance = botPos.distanceTo(pos);
          blocks.push({
            name: block.name,
            position: pos.clone(),
            distance: Math.round(distance * 10) / 10,
            type: this.categorizeBlock(block.name),
          });
        }
      } catch (err) {
        // Skip blocks that cause errors
      }
    }

    // Sort by distance
    blocks.sort((a, b) => a.distance - b.distance);

    return blocks;
  }

  /**
   * Observe nearby entities
   */
  private observeEntities(): EntityObservation[] {
    if (!this.bot.entity) return [];

    const entities: EntityObservation[] = [];
    const botPos = this.bot.entity.position;
    const radius = this.config.entityScanRadius;

    for (const entity of Object.values(this.bot.entities)) {
      if (!entity || !entity.position) continue;
      if (entity === this.bot.entity) continue; // Skip self

      const distance = botPos.distanceTo(entity.position);
      if (distance > radius) continue;

      const entityType = entity.name || entity.type || 'unknown';
      const isHostile = this.isHostileMob(entityType);

      entities.push({
        type: entity.type || 'unknown',
        name: entityType,
        position: entity.position.clone(),
        distance: Math.round(distance * 10) / 10,
        isHostile,
        health: (entity as any).health,
      });
    }

    // Sort by distance
    entities.sort((a, b) => a.distance - b.distance);

    return entities;
  }

  /**
   * Detect dangers in the environment
   */
  private detectDangers(): DangerObservation[] {
    const dangers: DangerObservation[] = [];

    // Check health
    const health = this.bot.health ?? 20;
    if (health <= 5) {
      dangers.push({
        type: 'low_health',
        severity: 'critical',
        description: `Critical health: ${health}/20`,
      });
    } else if (health <= 10) {
      dangers.push({
        type: 'low_health',
        severity: 'high',
        description: `Low health: ${health}/20`,
      });
    }

    // Check food
    const food = this.bot.food ?? 20;
    if (food <= 5) {
      dangers.push({
        type: 'low_food',
        severity: 'high',
        description: `Critical food: ${food}/20`,
      });
    } else if (food <= 10) {
      dangers.push({
        type: 'low_food',
        severity: 'medium',
        description: `Low food: ${food}/20`,
      });
    }

    if (!this.bot.entity) return dangers;

    // Check for nearby lava
    const lavaBlocks = this.findNearbyBlockType('lava', 8);
    if (lavaBlocks.length > 0) {
      const nearest = lavaBlocks[0];
      if (nearest) {
        dangers.push({
          type: 'lava',
          severity: nearest.distance < 3 ? 'critical' : 'medium',
          description: `Lava ${nearest.distance}m away`,
          position: nearest.position,
        });
      }
    }

    // Check for hostile mobs
    const hostileMobs = this.lastSnapshot?.nearbyEntities.filter(e => e.isHostile) || [];
    if (hostileMobs.length > 0) {
      const nearest = hostileMobs[0];
      if (nearest) {
        dangers.push({
          type: 'hostile_mob',
          severity: nearest.distance < 5 ? 'critical' : nearest.distance < 10 ? 'high' : 'medium',
          description: `${nearest.name} ${nearest.distance}m away`,
          position: nearest.position,
        });
      }
    }

    // Check for cliffs (dangerous drops)
    const cliffDanger = this.detectCliff();
    if (cliffDanger) {
      dangers.push(cliffDanger);
    }

    return dangers;
  }

  /**
   * Detect cliff/dangerous drop
   */
  private detectCliff(): DangerObservation | null {
    if (!this.bot.entity) return null;

    const botPos = this.bot.entity.position;
    const checkRadius = 3;

    // Check blocks around bot for dangerous drops
    for (let x = -checkRadius; x <= checkRadius; x++) {
      for (let z = -checkRadius; z <= checkRadius; z++) {
        if (x === 0 && z === 0) continue;

        const checkPos = botPos.offset(x, 0, z);
        let dropDistance = 0;

        // Check how far down until solid block
        for (let y = 0; y > -10; y--) {
          const block = this.bot.blockAt(checkPos.offset(0, y, 0));
          if (block && block.boundingBox === 'block') {
            dropDistance = Math.abs(y);
            break;
          }
        }

        // Dangerous if drop > 4 blocks (fall damage)
        if (dropDistance > 4) {
          return {
            type: 'cliff',
            severity: dropDistance > 10 ? 'high' : 'medium',
            description: `Dangerous drop ${dropDistance} blocks nearby`,
            position: checkPos,
          };
        }
      }
    }

    return null;
  }

  /**
   * Find nearby blocks of specific type
   */
  findNearbyBlockType(blockName: string, maxDistance: number = 32): BlockObservation[] {
    if (!this.bot.entity) return [];

    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const blockType = mcData.blocksByName[blockName];
      if (!blockType) return [];

      const positions = this.bot.findBlocks({
        matching: blockType.id,
        maxDistance,
        count: 50,
      });

      const botPos = this.bot.entity.position;
      return positions.map(pos => {
        const block = this.bot.blockAt(pos);
        return {
          name: block?.name || blockName,
          position: pos.clone(),
          distance: Math.round(botPos.distanceTo(pos) * 10) / 10,
          type: this.categorizeBlock(blockName),
        };
      }).sort((a, b) => a.distance - b.distance);
    } catch (err) {
      return [];
    }
  }

  /**
   * Find nearest ore
   */
  findNearestOre(): BlockObservation | null {
    const ores = this.lastSnapshot?.nearbyBlocks.filter(b => b.type === 'ore') || [];
    return ores.length > 0 ? (ores[0] || null) : null;
  }

  /**
   * Find nearest wood
   */
  findNearestWood(): BlockObservation | null {
    const wood = this.lastSnapshot?.nearbyBlocks.filter(b => b.type === 'wood') || [];
    return wood.length > 0 ? (wood[0] || null) : null;
  }

  /**
   * Check if position is safe
   */
  isSafePosition(position: Vec3): boolean {
    const dangers = this.detectDangers();
    
    for (const danger of dangers) {
      if (danger.position && position.distanceTo(danger.position) < 5) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get current dimension
   */
  private getDimension(): string {
    // @ts-ignore
    return this.bot.game?.dimension || 'overworld';
  }

  /**
   * Get weather
   */
  private getWeather(): string {
    if (this.bot.isRaining) return 'rain';
    if ((this.bot as any).thunderState > 0) return 'thunder';
    return 'clear';
  }

  /**
   * Categorize block type
   */
  private categorizeBlock(blockName: string): BlockObservation['type'] {
    if (this.ORE_BLOCKS.includes(blockName)) return 'ore';
    if (this.WOOD_BLOCKS.includes(blockName)) return 'wood';
    if (blockName.includes('stone')) return 'stone';
    if (blockName.includes('dirt') || blockName.includes('grass')) return 'dirt';
    return 'other';
  }

  /**
   * Check if entity is hostile mob
   */
  private isHostileMob(entityType: string): boolean {
    return this.HOSTILE_MOBS.some(mob => entityType.toLowerCase().includes(mob));
  }

  /**
   * Save world state to database
   */
  private saveWorldState(snapshot: WorldSnapshot) {
    try {
      this.database.insertWorldState({
        position: {
          x: snapshot.position.x,
          y: snapshot.position.y,
          z: snapshot.position.z,
        },
        health: snapshot.health,
        food: snapshot.food,
        dimension: snapshot.dimension,
      });
    } catch (err) {
      this.logger.error('Failed to save world state', err);
    }
  }
}

export default WorldObserver;
