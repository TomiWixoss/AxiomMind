import { loadConfig, type Config } from './src/core/config';
import { BotManager } from './src/core/bot';
import { DatabaseManager } from './src/utils/database';
import logger from './src/utils/logger';
import { MemoryManager } from './src/layers/tactical/memory-manager';
import { ToolRouter } from './src/layers/tactical/tool-router';
import { AIClient } from './src/layers/strategic/ai-client';
import { GoalPlanner } from './src/layers/strategic/goal-planner';

export interface AxiomMindStatus {
  initialized: boolean;
  connected: boolean;
  mainGoal: string;
  uptime: number;
}

export interface AxiomMindComponents {
  botManager: BotManager;
  database: DatabaseManager;
  memoryManager: MemoryManager;
  aiClient: AIClient;
  goalPlanner: GoalPlanner;
  toolRouter: ToolRouter;
}

/**
 * AxiomMind - Main application class
 * Integrates all layers: Strategic, Tactical, Execution, Perception
 */
export class AxiomMind {
  private config: Config;
  private botManager: BotManager;
  private database: DatabaseManager;
  private memoryManager: MemoryManager;
  private aiClient: AIClient;
  private goalPlanner: GoalPlanner;
  private toolRouter: ToolRouter;
  private initialized: boolean;
  private startTime: number;

  constructor(config: Config) {
    this.config = config;
    this.initialized = false;
    this.startTime = Date.now();

    logger.info('=== Initializing AxiomMind ===');

    // Initialize database
    this.database = new DatabaseManager(this.config.database.path);
    logger.info('Database initialized');

    // Initialize bot manager
    this.botManager = new BotManager(this.config);
    logger.info('Bot manager initialized');

    // Initialize memory manager
    this.memoryManager = new MemoryManager(
      this.database,
      {
        maxTokens: this.config.memory.maxTokens,
        keepMessages: this.config.memory.keepMessages,
      }
    );
    logger.info('Memory manager initialized');

    // Initialize AI client
    this.aiClient = new AIClient(this.config, logger);
    logger.info('AI client initialized');

    // Initialize goal planner
    this.goalPlanner = new GoalPlanner(
      this.config,
      logger,
      this.database,
      this.aiClient
    );
    logger.info('Goal planner initialized');

    // Initialize tool router
    const bot = this.botManager.getBot();
    this.toolRouter = new ToolRouter(bot, logger);
    logger.info('Tool router initialized');

    this.initialized = true;
    logger.info('=== AxiomMind initialized successfully ===');
  }

  /**
   * Get current status
   */
  getStatus(): AxiomMindStatus {
    return {
      initialized: this.initialized,
      connected: this.botManager.isConnected(),
      mainGoal: this.goalPlanner.getMainGoal(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Set main goal
   */
  setMainGoal(goal: string): void {
    this.goalPlanner.setMainGoal(goal);
    logger.info('Main goal updated', { goal });
  }

  /**
   * Get all components (for testing and debugging)
   */
  getComponents(): AxiomMindComponents {
    return {
      botManager: this.botManager,
      database: this.database,
      memoryManager: this.memoryManager,
      aiClient: this.aiClient,
      goalPlanner: this.goalPlanner,
      toolRouter: this.toolRouter,
    };
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('=== Shutting down AxiomMind ===');

    // Disconnect bot
    if (this.botManager.isConnected()) {
      this.botManager.disconnect();
      logger.info('Bot disconnected');
    }

    // Close database
    this.database.close();
    logger.info('Database closed');

    this.initialized = false;
    logger.info('=== AxiomMind shutdown complete ===');
  }
}

/**
 * Main entry point
 */
export async function main() {
  try {
    // Load configuration
    const config = loadConfig();
    logger.info('Configuration loaded');

    // Create AxiomMind instance
    const axiomMind = new AxiomMind(config);

    // Log status
    const status = axiomMind.getStatus();
    logger.info('AxiomMind status', status);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      await axiomMind.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      await axiomMind.shutdown();
      process.exit(0);
    });

    logger.info('AxiomMind is running. Press Ctrl+C to stop.');

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    logger.error('Fatal error in main', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export default AxiomMind;
