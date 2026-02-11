import { describe, test, expect } from 'bun:test';
import { loadConfig } from '../../src/core/config.js';

describe('Config', () => {
  test('should load config successfully', () => {
    const config = loadConfig();
    
    expect(config.minecraft.host).toBeDefined();
    expect(config.minecraft.port).toBeGreaterThan(0);
    expect(config.ai.provider).toBe('nvidia');
    expect(config.ai.maxToolIterations).toBe(9999);
  });
  
  test('should have valid AI settings', () => {
    const config = loadConfig();
    
    expect(config.ai.temperature).toBeGreaterThanOrEqual(0);
    expect(config.ai.temperature).toBeLessThanOrEqual(2);
    expect(config.ai.maxTokens).toBeGreaterThan(0);
  });
});
