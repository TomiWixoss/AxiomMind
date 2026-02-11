import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { BotManager } from '../../src/core/bot.js';
import { loadConfig } from '../../src/core/config.js';

describe('BotManager', () => {
  let botManager: BotManager;
  let config: ReturnType<typeof loadConfig>;

  beforeEach(() => {
    config = loadConfig();
  });

  afterEach(() => {
    if (botManager) {
      botManager.disconnect();
    }
  });

  describe('Initialization', () => {
    test('should create bot manager instance', () => {
      botManager = new BotManager(config);
      expect(botManager).toBeDefined();
    });

    test('should have bot instance after creation', () => {
      botManager = new BotManager(config);
      const bot = botManager.getBot();
      expect(bot).toBeDefined();
    });

    test('should load pathfinder plugin', async () => {
      botManager = new BotManager(config);
      // Wait for plugins to load
      await new Promise(resolve => setTimeout(resolve, 100));
      const bot = botManager.getBot();
      expect(bot.pathfinder).toBeDefined();
    });
  });

  describe('Connection', () => {
    test('should not be connected initially', () => {
      botManager = new BotManager(config);
      expect(botManager.isConnected()).toBe(false);
    });
  });

  describe('State', () => {
    test('should get bot position', () => {
      botManager = new BotManager(config);
      const position = botManager.getPosition();
      expect(position).toBeDefined();
      expect(position).toHaveProperty('x');
      expect(position).toHaveProperty('y');
      expect(position).toHaveProperty('z');
    });

    test('should get bot health', () => {
      botManager = new BotManager(config);
      const health = botManager.getHealth();
      expect(typeof health).toBe('number');
      expect(health).toBeGreaterThanOrEqual(0);
      expect(health).toBeLessThanOrEqual(20);
    });

    test('should get bot food level', () => {
      botManager = new BotManager(config);
      const food = botManager.getFood();
      expect(typeof food).toBe('number');
      expect(food).toBeGreaterThanOrEqual(0);
      expect(food).toBeLessThanOrEqual(20);
    });
  });
});
