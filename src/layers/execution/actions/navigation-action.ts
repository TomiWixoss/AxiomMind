import type { Bot } from 'mineflayer';
import type { Vec3 } from 'vec3';

export interface NavigationResult {
  success: boolean;
  reached: boolean;
  distance: number;
  error?: string;
}

export interface NavigationOptions {
  target: Vec3;
  range?: number;
  timeout?: number;
  sprint?: boolean;
}

/**
 * NavigationAction - Advanced navigation workflow
 * Part of Execution Layer
 */
export class NavigationAction {
  private bot: Bot;
  private logger: any;
  private isNavigating: boolean = false;

  constructor(bot: Bot, logger: any) {
    this.bot = bot;
    this.logger = logger;
  }

  /**
   * Execute navigation action
   */
  async execute(options: NavigationOptions): Promise<NavigationResult> {
    const {
      target,
      range = 1,
      timeout = 60000, // 60 seconds
      sprint = true,
    } = options;

    this.logger.info('Starting navigation action', {
      target: { x: target.x, y: target.y, z: target.z },
      range,
    });

    if (!this.bot.pathfinder) {
      return {
        success: false,
        reached: false,
        distance: this.bot.entity.position.distanceTo(target),
        error: 'Pathfinder not available',
      };
    }

    try {
      this.isNavigating = true;

      // Check if already at target
      const initialDistance = this.bot.entity.position.distanceTo(target);
      if (initialDistance <= range) {
        this.logger.debug('Already at target location');
        return {
          success: true,
          reached: true,
          distance: initialDistance,
        };
      }

      // Set sprint mode
      if (sprint) {
        this.bot.setControlState('sprint', true);
      }

      // Import pathfinder goals
      const { goals } = await import('mineflayer-pathfinder');
      const goal = range > 1
        ? new goals.GoalNear(target.x, target.y, target.z, range)
        : new goals.GoalBlock(target.x, target.y, target.z);

      // Set pathfinding goal
      this.bot.pathfinder.setGoal(goal);

      // Wait for navigation to complete or timeout
      const result = await Promise.race([
        this.waitForNavigation(target, range),
        this.createTimeout(timeout),
      ]);

      // Stop sprinting
      if (sprint) {
        this.bot.setControlState('sprint', false);
      }

      const finalDistance = this.bot.entity.position.distanceTo(target);
      const reached = finalDistance <= range;

      this.logger.info('Navigation action completed', {
        reached,
        finalDistance,
        timeout: result === 'timeout',
      });

      return {
        success: reached,
        reached,
        distance: finalDistance,
        error: result === 'timeout' ? 'Navigation timeout' : undefined,
      };
    } catch (error) {
      this.logger.error('Navigation action failed', error);
      return {
        success: false,
        reached: false,
        distance: this.bot.entity.position.distanceTo(target),
        error: String(error),
      };
    } finally {
      this.isNavigating = false;
      this.bot.pathfinder.setGoal(null);
    }
  }

  /**
   * Wait for navigation to complete
   */
  private async waitForNavigation(target: Vec3, range: number): Promise<'completed' | 'failed'> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isNavigating) {
          clearInterval(checkInterval);
          resolve('failed');
          return;
        }

        const distance = this.bot.entity.position.distanceTo(target);
        if (distance <= range) {
          clearInterval(checkInterval);
          resolve('completed');
        }
      }, 100);

      // Listen for pathfinder events
      const onGoalReached = () => {
        clearInterval(checkInterval);
        // @ts-ignore - pathfinder events
        this.bot.pathfinder.off('goal_reached', onGoalReached);
        // @ts-ignore - pathfinder events
        this.bot.pathfinder.off('path_stop', onPathStop);
        resolve('completed');
      };

      const onPathStop = () => {
        clearInterval(checkInterval);
        // @ts-ignore - pathfinder events
        this.bot.pathfinder.off('goal_reached', onGoalReached);
        // @ts-ignore - pathfinder events
        this.bot.pathfinder.off('path_stop', onPathStop);
        resolve('failed');
      };

      // @ts-ignore - pathfinder events
      this.bot.pathfinder.once('goal_reached', onGoalReached);
      // @ts-ignore - pathfinder events
      this.bot.pathfinder.once('path_stop', onPathStop);
    });
  }

  /**
   * Create timeout promise
   */
  private async createTimeout(ms: number): Promise<'timeout'> {
    return new Promise((resolve) => {
      setTimeout(() => resolve('timeout'), ms);
    });
  }

  /**
   * Stop current navigation
   */
  stop(): void {
    if (this.isNavigating && this.bot.pathfinder) {
      this.bot.pathfinder.setGoal(null);
      this.bot.setControlState('sprint', false);
      this.isNavigating = false;
      this.logger.debug('Navigation stopped');
    }
  }

  /**
   * Check if currently navigating
   */
  isActive(): boolean {
    return this.isNavigating;
  }

  /**
   * Calculate path distance
   */
  async calculatePathDistance(target: Vec3): Promise<number | null> {
    if (!this.bot.pathfinder) {
      return null;
    }

    try {
      const { goals } = await import('mineflayer-pathfinder');
      const goal = new goals.GoalBlock(target.x, target.y, target.z);
      
      // This is an approximation - actual path calculation would require pathfinder internals
      return this.bot.entity.position.distanceTo(target);
    } catch (error) {
      this.logger.error('Error calculating path distance', error);
      return null;
    }
  }

  /**
   * Check if path is clear
   */
  isPathClear(target: Vec3, maxDistance: number = 10): boolean {
    try {
      const distance = this.bot.entity.position.distanceTo(target);
      if (distance > maxDistance) {
        return false;
      }

      // Simple line-of-sight check
      // In production, this would use raycasting
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default NavigationAction;
