import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { DatabaseManager } from '../../src/utils/database.js';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB_PATH = './test-bot-memory.db';

describe('DatabaseManager', () => {
  let db: DatabaseManager;

  beforeEach(() => {
    // Clean up test database if exists
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    db = new DatabaseManager(TEST_DB_PATH);
  });

  afterEach(() => {
    db.close();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Initialization', () => {
    test('should create database file', () => {
      expect(existsSync(TEST_DB_PATH)).toBe(true);
    });

    test('should create tables', () => {
      const tables = db.getTables();
      expect(tables).toContain('goals');
      expect(tables).toContain('messages');
      expect(tables).toContain('world_states');
    });
  });

  describe('Goals', () => {
    test('should insert a goal', () => {
      const goal = {
        id: 'goal-1',
        type: 'main' as const,
        description: 'Beat Ender Dragon',
        priority: 1,
        status: 'pending' as const,
      };

      db.insertGoal(goal);
      const retrieved = db.getGoal('goal-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.description).toBe('Beat Ender Dragon');
    });

    test('should update goal status', () => {
      const goal = {
        id: 'goal-2',
        type: 'sub' as const,
        description: 'Get wood',
        priority: 2,
        status: 'pending' as const,
      };

      db.insertGoal(goal);
      db.updateGoalStatus('goal-2', 'completed');

      const retrieved = db.getGoal('goal-2');
      expect(retrieved).toBeDefined();
      expect(retrieved!.status).toBe('completed');
    });

    test('should get all pending goals', () => {
      db.insertGoal({
        id: 'goal-3',
        type: 'task' as const,
        description: 'Mine stone',
        priority: 3,
        status: 'pending' as const,
      });

      db.insertGoal({
        id: 'goal-4',
        type: 'task' as const,
        description: 'Craft pickaxe',
        priority: 4,
        status: 'completed' as const,
      });

      const pending = db.getPendingGoals();
      expect(pending.length).toBe(1);
      expect(pending[0]!.id).toBe('goal-3');
    });
  });

  describe('Messages', () => {
    test('should insert a message', () => {
      const message = {
        role: 'user' as const,
        content: 'What should I do?',
      };

      const id = db.insertMessage(message);
      expect(id).toBeGreaterThan(0);
    });

    test('should get recent messages', () => {
      db.insertMessage({ role: 'user' as const, content: 'Message 1' });
      db.insertMessage({ role: 'assistant' as const, content: 'Message 2' });
      db.insertMessage({ role: 'user' as const, content: 'Message 3' });

      const recent = db.getRecentMessages(2);
      expect(recent.length).toBe(2);
      expect(recent[0]!.content).toBe('Message 3');
      expect(recent[1]!.content).toBe('Message 2');
    });

    test('should clear old messages', () => {
      for (let i = 0; i < 100; i++) {
        db.insertMessage({ role: 'user' as const, content: `Message ${i}` });
      }

      db.clearOldMessages(10);
      const remaining = db.getRecentMessages(100);
      expect(remaining.length).toBe(10);
    });
  });

  describe('World States', () => {
    test('should insert world state', () => {
      const state = {
        position: { x: 0, y: 64, z: 0 },
        health: 20,
        food: 20,
        dimension: 'overworld',
      };

      const id = db.insertWorldState(state);
      expect(id).toBeGreaterThan(0);
    });

    test('should get latest world state', () => {
      db.insertWorldState({
        position: { x: 0, y: 64, z: 0 },
        health: 20,
        food: 20,
        dimension: 'overworld',
      });

      db.insertWorldState({
        position: { x: 10, y: 64, z: 10 },
        health: 18,
        food: 19,
        dimension: 'overworld',
      });

      const latest = db.getLatestWorldState();
      expect(latest).toBeDefined();
      expect(latest!.position.x).toBe(10);
      expect(latest!.health).toBe(18);
    });
  });
});
