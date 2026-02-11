import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryManager } from '../../src/layers/tactical/memory-manager.js';
import { DatabaseManager } from '../../src/utils/database.js';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB_PATH = './test-memory.db';

describe('MemoryManager', () => {
  let memory: MemoryManager;
  let db: DatabaseManager;

  beforeEach(() => {
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    db = new DatabaseManager(TEST_DB_PATH);
    memory = new MemoryManager(db, { maxTokens: 1000, keepMessages: 10 });
  });

  afterEach(() => {
    db.close();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Message Management', () => {
    test('should add user message', () => {
      memory.addMessage({ role: 'user', content: 'Hello bot' });
      
      const messages = memory.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello bot');
    });

    test('should add assistant message', () => {
      memory.addMessage({ role: 'user', content: 'Hello' });
      memory.addMessage({ role: 'assistant', content: 'Hi there!' });
      
      const messages = memory.getMessages();
      expect(messages.length).toBe(2);
      expect(messages[1].role).toBe('assistant');
    });

    test('should maintain message order', () => {
      memory.addMessage({ role: 'user', content: 'Message 1' });
      memory.addMessage({ role: 'assistant', content: 'Response 1' });
      memory.addMessage({ role: 'user', content: 'Message 2' });
      
      const messages = memory.getMessages();
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Response 1');
      expect(messages[2].content).toBe('Message 2');
    });
  });

  describe('Token Tracking', () => {
    test('should estimate tokens for message', () => {
      const tokens = memory.estimateTokens('Hello world');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10); // Short message
    });

    test('should estimate tokens for long message', () => {
      const longText = 'This is a much longer message that contains many words and should result in more tokens being counted by the estimation function.';
      const tokens = memory.estimateTokens(longText);
      expect(tokens).toBeGreaterThan(20);
    });

    test('should track total tokens', () => {
      memory.addMessage({ role: 'user', content: 'Hello' });
      memory.addMessage({ role: 'assistant', content: 'Hi there!' });
      
      const totalTokens = memory.getTotalTokens();
      expect(totalTokens).toBeGreaterThan(0);
    });

    test('should update token usage from API response', () => {
      memory.updateTokenUsage({
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      });

      const usage = memory.getTokenUsage();
      expect(usage.prompt_tokens).toBe(100);
      expect(usage.completion_tokens).toBe(50);
      expect(usage.total_tokens).toBe(150);
    });
  });

  describe('History Trimming', () => {
    test('should trim old messages when exceeding max tokens', () => {
      // Create memory with lower token limit
      const lowTokenMemory = new MemoryManager(db, { maxTokens: 100, keepMessages: 10 });
      
      // Add many messages to exceed token limit
      for (let i = 0; i < 50; i++) {
        lowTokenMemory.addMessage({ 
          role: 'user', 
          content: `This is a longer message number ${i} that will add up tokens` 
        });
        lowTokenMemory.addMessage({ 
          role: 'assistant', 
          content: `Response to message ${i} with some additional content` 
        });
      }

      // Should auto-trim to keepMessages (10)
      const messages = lowTokenMemory.getMessages();
      expect(messages.length).toBeLessThanOrEqual(10);
    });

    test('should keep system message when trimming', () => {
      // Create memory with lower token limit
      const lowTokenMemory = new MemoryManager(db, { maxTokens: 50, keepMessages: 5 });
      lowTokenMemory.setSystemMessage('You are a Minecraft speedrun bot.');
      
      // Add many messages
      for (let i = 0; i < 30; i++) {
        lowTokenMemory.addMessage({ role: 'user', content: `Msg ${i}` });
        lowTokenMemory.addMessage({ role: 'assistant', content: `Resp ${i}` });
      }

      // System message is separate, not in messages array
      const messages = lowTokenMemory.getMessages();
      const context = lowTokenMemory.buildContext();
      
      // Verify system message is preserved in context
      expect(context[0].role).toBe('system');
      expect(context[0].content).toContain('speedrun bot');
      // Auto-trim keeps messages under limit
      expect(messages.length).toBeLessThan(60); // Much less than 60 added
    });

    test('should manually trim to specific count', () => {
      for (let i = 0; i < 20; i++) {
        memory.addMessage({ role: 'user', content: `Message ${i}` });
      }

      memory.trimToCount(5);
      const messages = memory.getMessages();
      expect(messages.length).toBe(5);
    });
  });

  describe('Context Building', () => {
    test('should build context with system message', () => {
      memory.setSystemMessage('You are a helpful bot.');
      memory.addMessage({ role: 'user', content: 'Hello' });
      
      const context = memory.buildContext();
      expect(context[0].role).toBe('system');
      expect(context[1].role).toBe('user');
    });

    test('should include world state in context', () => {
      memory.addWorldState({
        position: { x: 0, y: 64, z: 0 },
        health: 20,
        food: 20,
        dimension: 'overworld',
      });

      const context = memory.buildContext({ includeWorldState: true });
      const systemMsg = context.find(m => m.role === 'system');
      expect(systemMsg?.content).toContain('Position');
      expect(systemMsg?.content).toContain('Health');
    });

    test('should include goals in context', () => {
      memory.addGoal({
        id: 'goal-1',
        type: 'main',
        description: 'Beat Ender Dragon',
        priority: 1,
        status: 'in_progress',
      });

      const context = memory.buildContext({ includeGoals: true });
      const systemMsg = context.find(m => m.role === 'system');
      expect(systemMsg?.content).toContain('Beat Ender Dragon');
    });
  });

  describe('Persistence', () => {
    test('should save messages to database', async () => {
      memory.addMessage({ role: 'user', content: 'Test message' });
      await memory.saveToDatabase();

      const messages = db.getRecentMessages(10);
      expect(messages.length).toBeGreaterThan(0);
    });

    test('should load messages from database', async () => {
      db.insertMessage({ role: 'user', content: 'Saved message' });
      db.insertMessage({ role: 'assistant', content: 'Saved response' });

      await memory.loadFromDatabase(2);
      const messages = memory.getMessages();
      
      expect(messages.length).toBe(2);
      // DB returns newest first
      expect(messages[0].content).toBe('Saved response');
      expect(messages[1].content).toBe('Saved message');
    });

    test('should clear in-memory messages', () => {
      memory.addMessage({ role: 'user', content: 'Message 1' });
      memory.addMessage({ role: 'user', content: 'Message 2' });
      
      memory.clear();
      const messages = memory.getMessages();
      expect(messages.length).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('should get conversation statistics', () => {
      memory.addMessage({ role: 'user', content: 'Hello' });
      memory.addMessage({ role: 'assistant', content: 'Hi there!' });
      memory.addMessage({ role: 'user', content: 'How are you?' });

      const stats = memory.getStats();
      expect(stats.messageCount).toBe(3);
      expect(stats.estimatedTokens).toBeGreaterThan(0);
      expect(stats.userMessages).toBe(2);
      expect(stats.assistantMessages).toBe(1);
    });
  });
});
