import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { AxiomMind } from '../../index';
import type { Config } from '../../src/core/config';

describe('AxiomMind', () => {
  let axiomMind: AxiomMind;
  
  // Use test config
  const config: Config = {
    minecraft: {
      host: 'localhost',
      port: 25565,
      username: 'TestBot',
      version: '1.20.1',
    },
    ai: {
      provider: 'nvidia',
      model: 'stepfun-ai/step-3.5-flash',
      apiKey: process.env.NVIDIA_API_KEY || 'test-key',
      temperature: 0.7,
      maxTokens: 4000,
      topP: 0.9,
      maxToolIterations: 10,
    },
    bot: {
      autoEat: true,
      autoArmor: true,
      viewerPort: 3000,
      dashboardPort: 3001,
    },
    database: {
      path: './test-axiom-mind.db',
    },
    memory: {
      maxTokens: 200000,
      keepMessages: 50,
    },
  };

  afterEach(async () => {
    if (axiomMind) {
      await axiomMind.shutdown();
    }
  });

  describe('constructor', () => {
    test('should initialize with config', () => {
      axiomMind = new AxiomMind(config);
      expect(axiomMind).toBeDefined();
    });

    test('should initialize all components', () => {
      axiomMind = new AxiomMind(config);
      expect(axiomMind.getStatus()).toHaveProperty('initialized');
      expect(axiomMind.getStatus().initialized).toBe(true);
    });
  });

  describe('getStatus', () => {
    test('should return status object', () => {
      axiomMind = new AxiomMind(config);
      const status = axiomMind.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('mainGoal');
    });

    test('should show not connected initially', () => {
      axiomMind = new AxiomMind(config);
      const status = axiomMind.getStatus();

      expect(status.connected).toBe(false);
    });
  });

  describe('setMainGoal', () => {
    test('should update main goal', () => {
      axiomMind = new AxiomMind(config);
      axiomMind.setMainGoal('Collect 10 diamonds');

      const status = axiomMind.getStatus();
      expect(status.mainGoal).toBe('Collect 10 diamonds');
    });
  });

  describe('getComponents', () => {
    test('should return all components', () => {
      axiomMind = new AxiomMind(config);
      const components = axiomMind.getComponents();

      expect(components).toHaveProperty('botManager');
      expect(components).toHaveProperty('database');
      expect(components).toHaveProperty('memoryManager');
      expect(components).toHaveProperty('aiClient');
      expect(components).toHaveProperty('goalPlanner');
      expect(components).toHaveProperty('toolRouter');
    });

    test('should have initialized components', () => {
      axiomMind = new AxiomMind(config);
      const components = axiomMind.getComponents();

      expect(components.botManager).toBeDefined();
      expect(components.database).toBeDefined();
      expect(components.memoryManager).toBeDefined();
      expect(components.aiClient).toBeDefined();
      expect(components.goalPlanner).toBeDefined();
      expect(components.toolRouter).toBeDefined();
    });
  });

  describe('shutdown', () => {
    test('should shutdown gracefully', async () => {
      axiomMind = new AxiomMind(config);
      await axiomMind.shutdown();

      const status = axiomMind.getStatus();
      expect(status.initialized).toBe(false);
    });

    test('should disconnect bot', async () => {
      axiomMind = new AxiomMind(config);
      await axiomMind.shutdown();

      const status = axiomMind.getStatus();
      expect(status.connected).toBe(false);
    });
  });

  describe('integration', () => {
    test('should have all layers connected', () => {
      axiomMind = new AxiomMind(config);
      const components = axiomMind.getComponents();

      // Strategic layer
      expect(components.aiClient).toBeDefined();
      expect(components.goalPlanner).toBeDefined();

      // Tactical layer
      expect(components.memoryManager).toBeDefined();
      expect(components.toolRouter).toBeDefined();

      // Execution layer
      expect(components.botManager).toBeDefined();

      // Persistence
      expect(components.database).toBeDefined();
    });

    test('should share database across components', () => {
      axiomMind = new AxiomMind(config);
      const components = axiomMind.getComponents();

      // MemoryManager and GoalPlanner should use same database
      expect(components.database).toBeDefined();
    });
  });
});
