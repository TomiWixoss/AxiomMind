import { describe, test, expect } from 'bun:test';
import logger from '../../src/utils/logger.js';
import { loadConfig } from '../../src/core/config.js';

describe('Integration: Setup', () => {
  test('should initialize logger and config together', () => {
    logger.info('=== Testing Bot Setup ===');
    
    const config = loadConfig();
    
    expect(config).toBeDefined();
    expect(config.minecraft).toBeDefined();
    expect(config.ai).toBeDefined();
    expect(config.bot).toBeDefined();
    expect(config.database).toBeDefined();
    
    logger.info('Config loaded successfully');
    logger.info(`Minecraft server: ${config.minecraft.host}:${config.minecraft.port}`);
    logger.info(`Bot username: ${config.minecraft.username}`);
    logger.info(`AI provider: ${config.ai.provider}`);
    logger.info(`AI model: ${config.ai.model}`);
    logger.info(`Max tool iterations: ${config.ai.maxToolIterations}`);
    
    logger.info('=== Setup Test Completed ===');
  });
});
