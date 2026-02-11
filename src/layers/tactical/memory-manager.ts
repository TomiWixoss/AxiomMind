import type { DatabaseManager } from '../../utils/database';
import type { Message, Goal } from '../../types/index';
import type { WorldStateRecord } from '../../utils/database';
import logger from '../../utils/logger';

export interface MemoryConfig {
  maxTokens: number;
  keepMessages: number;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ContextOptions {
  includeWorldState?: boolean;
  includeGoals?: boolean;
}

export interface ConversationStats {
  messageCount: number;
  estimatedTokens: number;
  userMessages: number;
  assistantMessages: number;
  systemMessages: number;
}

export class MemoryManager {
  private messages: Message[] = [];
  private systemMessage?: Message;
  private worldState?: WorldStateRecord;
  private goals: Goal[] = [];
  private tokenUsage: TokenUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };

  constructor(
    private db: DatabaseManager,
    private config: MemoryConfig
  ) {
    logger.info('MemoryManager initialized', {
      maxTokens: config.maxTokens,
      keepMessages: config.keepMessages,
    });
  }

  // === Message Management ===
  
  addMessage(message: Message) {
    this.messages.push(message);
    logger.debug(`Added ${message.role} message`, {
      contentLength: message.content.length,
    });

    // Auto-trim if exceeding token limit
    this.autoTrim();
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  setSystemMessage(content: string) {
    this.systemMessage = {
      role: 'system',
      content,
    };
    logger.debug('System message set');
  }

  // === Token Management ===

  /**
   * Get total tokens from actual API usage
   * Returns prompt_tokens which represents the input context size
   */
  getTotalTokens(): number {
    return this.tokenUsage.prompt_tokens;
  }

  updateTokenUsage(usage: TokenUsage) {
    this.tokenUsage = usage;
    logger.debug('Token usage updated', usage);
  }

  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  // === History Trimming ===

  private autoTrim() {
    const totalTokens = this.getTotalTokens();
    
    if (totalTokens > this.config.maxTokens) {
      const keepCount = this.config.keepMessages; // Just keep N messages, not pairs
      this.trimToCount(keepCount);
      logger.info('Auto-trimmed conversation history', {
        totalTokens,
        maxTokens: this.config.maxTokens,
        keptMessages: this.messages.length,
      });
    }
  }

  trimToCount(count: number) {
    if (this.messages.length > count) {
      const removed = this.messages.length - count;
      this.messages = this.messages.slice(-count);
      logger.debug(`Trimmed ${removed} messages, kept ${count}`);
    }
  }

  // === Context Building ===

  buildContext(options: ContextOptions = {}): Message[] {
    const context: Message[] = [];

    // Build system message with context
    let systemContent = this.systemMessage?.content || 'You are a Minecraft speedrun bot.';

    if (options.includeWorldState && this.worldState) {
      systemContent += `\n\nCurrent State:
- Position: (${this.worldState.position.x}, ${this.worldState.position.y}, ${this.worldState.position.z})
- Health: ${this.worldState.health}/20
- Food: ${this.worldState.food}/20
- Dimension: ${this.worldState.dimension}`;
    }

    if (options.includeGoals && this.goals.length > 0) {
      const pendingGoals = this.goals.filter(g => g.status === 'pending' || g.status === 'in_progress');
      if (pendingGoals.length > 0) {
        systemContent += `\n\nActive Goals:`;
        for (const goal of pendingGoals) {
          systemContent += `\n- [${goal.type}] ${goal.description} (priority: ${goal.priority}, status: ${goal.status})`;
        }
      }
    }

    context.push({
      role: 'system',
      content: systemContent,
    });

    // Add conversation history
    context.push(...this.messages);

    return context;
  }

  // === World State ===

  addWorldState(state: WorldStateRecord) {
    this.worldState = state;
    logger.debug('World state updated', {
      position: state.position,
      health: state.health,
      food: state.food,
    });
  }

  // === Goals ===

  addGoal(goal: Omit<Goal, 'createdAt' | 'completedAt'>) {
    const fullGoal: Goal = {
      ...goal,
      createdAt: new Date(),
    };
    this.goals.push(fullGoal);
    logger.debug(`Added goal: ${goal.description}`);
  }

  updateGoalStatus(goalId: string, status: Goal['status']) {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal) {
      goal.status = status;
      if (status === 'completed') {
        goal.completedAt = new Date();
      }
      logger.debug(`Updated goal ${goalId} to ${status}`);
    }
  }

  // === Persistence ===

  async saveToDatabase() {
    for (const message of this.messages) {
      this.db.insertMessage(message);
    }
    logger.info(`Saved ${this.messages.length} messages to database`);
  }

  async loadFromDatabase(limit: number = 10) {
    const messages = this.db.getRecentMessages(limit);
    // DB returns newest first, so already in correct order for recent messages
    this.messages = messages;
    logger.info(`Loaded ${this.messages.length} messages from database`);
  }

  clear() {
    this.messages = [];
    this.tokenUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    logger.debug('Memory cleared');
  }

  // === Statistics ===

  getStats(): ConversationStats {
    const stats: ConversationStats = {
      messageCount: this.messages.length,
      estimatedTokens: this.tokenUsage.prompt_tokens, // Use actual tokens from API
      userMessages: 0,
      assistantMessages: 0,
      systemMessages: this.systemMessage ? 1 : 0,
    };

    for (const msg of this.messages) {
      if (msg.role === 'user') stats.userMessages++;
      if (msg.role === 'assistant') stats.assistantMessages++;
    }

    return stats;
  }
}

export default MemoryManager;
