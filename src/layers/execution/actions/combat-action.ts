import type { Bot } from 'mineflayer';
import type { Entity } from 'prismarine-entity';

export interface CombatResult {
  success: boolean;
  enemiesDefeated: number;
  damageTaken: number;
  error?: string;
}

export interface CombatOptions {
  target?: Entity;
  targetType?: string;
  maxDistance?: number;
  equipWeapon?: boolean;
  equipArmor?: boolean;
  retreat?: boolean;
  retreatHealth?: number;
}

/**
 * CombatAction - Advanced combat workflow
 * Part of Execution Layer
 */
export class CombatAction {
  private bot: Bot;
  private logger: any;
  private inCombat: boolean = false;
  private initialHealth: number = 20;

  private readonly HOSTILE_MOBS = [
    'zombie', 'skeleton', 'creeper', 'spider', 'enderman',
    'witch', 'blaze', 'ghast', 'piglin', 'hoglin',
    'wither_skeleton', 'phantom', 'drowned', 'husk', 'stray',
  ];

  constructor(bot: Bot, logger: any) {
    this.bot = bot;
    this.logger = logger;
  }

  /**
   * Execute combat action
   */
  async execute(options: CombatOptions = {}): Promise<CombatResult> {
    const {
      target,
      targetType,
      maxDistance = 16,
      equipWeapon = true,
      equipArmor = true,
      retreat = true,
      retreatHealth = 5,
    } = options;

    this.logger.info('Starting combat action', {
      hasTarget: !!target,
      targetType,
      maxDistance,
    });

    this.inCombat = true;
    this.initialHealth = this.bot.health ?? 20;
    let enemiesDefeated = 0;

    try {
      // Equip armor if needed
      if (equipArmor && this.bot.armorManager) {
        await this.bot.armorManager.equipAll();
      }

      // Equip weapon if needed
      if (equipWeapon) {
        await this.equipBestWeapon();
      }

      // Find target if not provided
      let combatTarget = target;
      if (!combatTarget && targetType) {
        combatTarget = this.findNearestHostile(targetType, maxDistance) || undefined;
      } else if (!combatTarget) {
        combatTarget = this.findNearestHostile(undefined, maxDistance) || undefined;
      }

      if (!combatTarget) {
        this.logger.debug('No combat target found');
        return {
          success: true,
          enemiesDefeated: 0,
          damageTaken: 0,
        };
      }

      // Engage in combat
      if (this.bot.pvp) {
        this.bot.pvp.attack(combatTarget);

        // Monitor combat
        await this.monitorCombat(combatTarget, retreat, retreatHealth);

        // Check if enemy defeated
        if (!combatTarget.isValid || (combatTarget as any).health <= 0) {
          enemiesDefeated++;
        }

        // Stop attacking
        this.bot.pvp.stop();
      }

      const damageTaken = this.initialHealth - (this.bot.health ?? 20);

      this.logger.info('Combat action completed', {
        enemiesDefeated,
        damageTaken,
      });

      return {
        success: true,
        enemiesDefeated,
        damageTaken,
      };
    } catch (error) {
      this.logger.error('Combat action failed', error);
      return {
        success: false,
        enemiesDefeated,
        damageTaken: this.initialHealth - (this.bot.health ?? 20),
        error: String(error),
      };
    } finally {
      this.inCombat = false;
      if (this.bot.pvp) {
        this.bot.pvp.stop();
      }
    }
  }

  /**
   * Monitor combat and handle retreat
   */
  private async monitorCombat(
    target: Entity,
    retreat: boolean,
    retreatHealth: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Check if should retreat
        if (retreat && (this.bot.health ?? 20) <= retreatHealth) {
          this.logger.warn('Health critical, retreating from combat');
          if (this.bot.pvp) {
            this.bot.pvp.stop();
          }
          clearInterval(checkInterval);
          resolve();
          return;
        }

        // Check if target is defeated or invalid
        if (!target.isValid || (target as any).health <= 0) {
          clearInterval(checkInterval);
          resolve();
          return;
        }

        // Check if target is too far
        const distance = this.bot.entity.position.distanceTo(target.position);
        if (distance > 32) {
          this.logger.debug('Target too far, ending combat');
          clearInterval(checkInterval);
          resolve();
          return;
        }
      }, 500);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });
  }

  /**
   * Find nearest hostile mob
   */
  private findNearestHostile(type?: string, maxDistance: number = 16): Entity | null {
    let nearestEntity: Entity | null = null;
    let nearestDistance = maxDistance;

    for (const entity of Object.values(this.bot.entities)) {
      if (!entity || !entity.position) continue;
      if (entity === this.bot.entity) continue;

      const entityType = entity.name || entity.type || '';
      
      // Check if hostile
      const isHostile = this.HOSTILE_MOBS.some(mob => 
        entityType.toLowerCase().includes(mob)
      );

      if (!isHostile) continue;

      // Check type filter
      if (type && !entityType.toLowerCase().includes(type.toLowerCase())) {
        continue;
      }

      const distance = this.bot.entity.position.distanceTo(entity.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEntity = entity;
      }
    }

    return nearestEntity;
  }

  /**
   * Equip best available weapon
   */
  private async equipBestWeapon(): Promise<void> {
    try {
      const weapons = this.bot.inventory.items().filter(item => 
        item.name?.includes('sword') || 
        item.name?.includes('axe') ||
        item.name === 'bow' ||
        item.name === 'crossbow'
      );

      if (weapons.length === 0) {
        this.logger.debug('No weapons available');
        return;
      }

      // Prioritize: diamond > iron > stone > wood
      const weaponPriority = ['diamond', 'iron', 'stone', 'wooden', 'golden'];
      
      let bestWeapon = weapons[0];
      let bestPriority = 999;

      for (const weapon of weapons) {
        for (let i = 0; i < weaponPriority.length; i++) {
          // @ts-expect-error - weapon.name exists because we filtered above
          if (weapon.name.includes(weaponPriority[i]) && i < bestPriority) {
            bestWeapon = weapon;
            bestPriority = i;
            break;
          }
        }
      }

      if (bestWeapon) {
        await this.bot.equip(bestWeapon, 'hand');
        this.logger.debug('Equipped weapon', { weapon: bestWeapon.name || 'unknown' });
      }
    } catch (error) {
      this.logger.error('Error equipping weapon', error);
    }
  }

  /**
   * Check if in combat
   */
  isActive(): boolean {
    return this.inCombat;
  }

  /**
   * Stop combat
   */
  stop(): void {
    if (this.inCombat && this.bot.pvp) {
      this.bot.pvp.stop();
      this.inCombat = false;
      this.logger.debug('Combat stopped');
    }
  }

  /**
   * Check if entity is hostile
   */
  isHostile(entity: Entity): boolean {
    const entityType = entity.name || entity.type || '';
    return this.HOSTILE_MOBS.some(mob => 
      entityType.toLowerCase().includes(mob)
    );
  }

  /**
   * Get nearby hostile mobs
   */
  getNearbyHostiles(maxDistance: number = 16): Entity[] {
    const hostiles: Entity[] = [];

    for (const entity of Object.values(this.bot.entities)) {
      if (!entity || !entity.position) continue;
      if (entity === this.bot.entity) continue;

      if (this.isHostile(entity)) {
        const distance = this.bot.entity.position.distanceTo(entity.position);
        if (distance <= maxDistance) {
          hostiles.push(entity);
        }
      }
    }

    return hostiles.sort((a, b) => {
      const distA = this.bot.entity.position.distanceTo(a.position);
      const distB = this.bot.entity.position.distanceTo(b.position);
      return distA - distB;
    });
  }
}

export default CombatAction;
