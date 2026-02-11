import mineflayer from 'mineflayer';
import type { Bot } from 'mineflayer';
import { pathfinder, Movements } from 'mineflayer-pathfinder';
import { loader as autoEat } from 'mineflayer-auto-eat';
import pvpPlugin from 'mineflayer-pvp';
import armorManagerPlugin from 'mineflayer-armor-manager';
import { plugin as collectBlockPlugin } from 'mineflayer-collectblock';
import toolPluginModule from 'mineflayer-tool';
import minecraftData from 'minecraft-data';
import type { Config } from './config.js';
import logger from '../utils/logger.js';
import type { Vec3 } from 'vec3';

export class BotManager {
  private bot: Bot;
  private connected: boolean = false;

  constructor(private config: Config) {
    logger.info('Creating bot instance', {
      host: config.minecraft.host,
      port: config.minecraft.port,
      username: config.minecraft.username,
      version: config.minecraft.version || '1.21.1',
    });

    // Create bot
    this.bot = mineflayer.createBot({
      host: config.minecraft.host,
      port: config.minecraft.port,
      username: config.minecraft.username,
      version: config.minecraft.version || '1.21.1',
      auth: 'offline', // Offline mode for local servers
    });

    this.setupPlugins();
    this.setupEventHandlers();
  }

  private setupPlugins() {
    logger.info('Loading plugins...');

    // Load pathfinder (ESM)
    this.bot.loadPlugin(pathfinder);
    logger.debug('Loaded: pathfinder');

    // Load auto-eat (ESM)
    this.bot.loadPlugin(autoEat);
    logger.debug('Loaded: auto-eat');

    // Load CommonJS plugins
    try {
      if (pvpPlugin) {
        this.bot.loadPlugin(pvpPlugin as any);
        logger.debug('Loaded: pvp');
      }
    } catch (err) {
      logger.warn('Failed to load pvp plugin', err);
    }

    try {
      if (armorManagerPlugin) {
        this.bot.loadPlugin(armorManagerPlugin);
        logger.debug('Loaded: armor-manager');
      }
    } catch (err) {
      logger.warn('Failed to load armor-manager plugin', err);
    }

    try {
      if (collectBlockPlugin) {
        this.bot.loadPlugin(collectBlockPlugin);
        logger.debug('Loaded: collectblock');
      }
    } catch (err) {
      logger.warn('Failed to load collectblock plugin', err);
    }

    try {
      if (toolPluginModule) {
        this.bot.loadPlugin(toolPluginModule as any);
        logger.debug('Loaded: tool');
      }
    } catch (err) {
      logger.warn('Failed to load tool plugin', err);
    }

    logger.info('All plugins loaded successfully');
  }

  private setupEventHandlers() {
    // Spawn event
    this.bot.once('spawn', () => {
      this.connected = true;
      logger.info('Bot spawned in world', {
        username: this.bot.username,
        position: this.bot.entity.position,
      });

      // Setup pathfinder movements
      const mcData = minecraftData(this.bot.version);
      const defaultMove = new Movements(this.bot);
      this.bot.pathfinder.setMovements(defaultMove);

      // Configure auto-eat
      if (this.config.bot.autoEat && this.bot.autoEat) {
        this.bot.autoEat.setOpts({
          priority: 'foodPoints',
          minHunger: 14,
          bannedFood: [],
        });
        this.bot.autoEat.enableAuto();
        logger.debug('Auto-eat configured and enabled');
      }
    });

    // Chat event
    this.bot.on('chat', (username, message) => {
      if (username === this.bot.username) return;
      logger.info(`[Chat] ${username}: ${message}`);
    });

    // Health event
    this.bot.on('health', () => {
      logger.debug('Health updated', {
        health: this.bot.health,
        food: this.bot.food,
      });
    });

    // Error event
    this.bot.on('error', (err) => {
      logger.error('Bot error', err);
    });

    // Kicked event
    this.bot.on('kicked', (reason) => {
      this.connected = false;
      logger.warn('Bot was kicked', { reason });
    });

    // End event
    this.bot.on('end', () => {
      this.connected = false;
      logger.info('Bot disconnected');
    });

    // Death event
    this.bot.on('death', () => {
      logger.warn('Bot died', {
        position: this.bot.entity.position,
      });
    });
  }

  // === Public API ===

  getBot(): Bot {
    return this.bot;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getPosition(): Vec3 {
    return this.bot.entity?.position || { x: 0, y: 0, z: 0 } as Vec3;
  }

  getHealth(): number {
    return this.bot.health || 20;
  }

  getFood(): number {
    return this.bot.food || 20;
  }

  getDimension(): string {
    // @ts-ignore - dimension property exists
    return this.bot.game?.dimension || 'overworld';
  }

  async waitForSpawn(): Promise<void> {
    if (this.connected) return;
    
    return new Promise((resolve) => {
      this.bot.once('spawn', () => {
        resolve();
      });
    });
  }

  disconnect() {
    if (this.bot) {
      try {
        this.bot.end();
        this.connected = false;
        logger.info('Bot disconnected manually');
      } catch (err) {
        logger.warn('Error disconnecting bot', err);
      }
    }
  }
}

export default BotManager;
