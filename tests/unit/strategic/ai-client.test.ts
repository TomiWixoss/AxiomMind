import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { AIClient } from '../../../src/layers/strategic/ai-client';
import type { Config } from '../../../src/core/config';
import logger from '../../../src/utils/logger';

describe('AIClient', () => {
  let mockConfig: Config;

  beforeEach(() => {
    mockConfig = {
      minecraft: {
        host: 'localhost',
        port: 25565,
        username: 'TestBot',
      },
      ai: {
        provider: 'nvidia',
        model: 'stepfun-ai/step-3.5-flash',
        apiKey: 'test-api-key',
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 16384,
        maxToolIterations: 9999,
      },
      bot: {
        autoEat: true,
        autoArmor: true,
        viewerPort: 3000,
        dashboardPort: 3001,
      },
      database: {
        path: './test-db.db',
      },
      memory: {
        maxTokens: 200000,
        keepMessages: 100,
      },
    };
  });

  test('should initialize with config', () => {
    const client = new AIClient(mockConfig, logger);
    
    expect(client).toBeDefined();
  });

  test('should have chat method', () => {
    const client = new AIClient(mockConfig, logger);
    
    expect(typeof client.chat).toBe('function');
  });

  test('should have chatWithTools method', () => {
    const client = new AIClient(mockConfig, logger);
    
    expect(typeof client.chatWithTools).toBe('function');
  });

  test('should validate config on initialization', () => {
    const invalidConfig = { ...mockConfig };
    invalidConfig.ai.apiKey = '';

    expect(() => new AIClient(invalidConfig, logger)).toThrow();
  });

  test('should store config', () => {
    const client = new AIClient(mockConfig, logger);
    
    expect(client.getConfig()).toEqual(mockConfig.ai);
  });

  test('should format messages correctly', () => {
    const client = new AIClient(mockConfig, logger);
    const messages = [
      { role: 'system' as const, content: 'You are a bot' },
      { role: 'user' as const, content: 'Hello' },
    ];

    const formatted = client.formatMessages(messages);
    
    expect(formatted).toHaveLength(2);
    expect(formatted[0].role).toBe('system');
    expect(formatted[1].role).toBe('user');
  });

  test('should handle empty messages array', () => {
    const client = new AIClient(mockConfig, logger);
    const messages: any[] = [];

    const formatted = client.formatMessages(messages);
    
    expect(formatted).toHaveLength(0);
  });
});
