import { loadConfig, type Config } from './src/core/config';
import { BotManager } from './src/core/bot';
import { DatabaseManager } from './src/utils/database';
import logger from './src/utils/logger';
import { MemoryManager } from './src/layers/tactical/memory-manager';
import { ToolRouter } from './src/layers/tactical/tool-router';
import { TaskDecomposer } from './src/layers/tactical/task-decomposer';
import { AIClient } from './src/layers/strategic/ai-client';
import { GoalPlanner } from './src/layers/strategic/goal-planner';
import { SpeedrunStrategy } from './src/layers/strategic/speedrun-strategy';
import { StateMachine, BotState } from './src/layers/execution/state-machine';
import { WorldObserver } from './src/layers/perception/world-observer';
import { InventoryTracker } from './src/layers/perception/inventory-tracker';
import { getAllToolDefinitions } from './src/tools/index';

export interface AxiomMindStatus {
  initialized: boolean;
  connected: boolean;
  mainGoal: string;
  currentPhase: string;
  currentState: string;
  uptime: number;
  isRunning: boolean;
}

export interface AxiomMindComponents {
  botManager: BotManager;
  database: DatabaseManager;
  memoryManager: MemoryManager;
  aiClient: AIClient;
  goalPlanner: GoalPlanner;
  toolRouter: ToolRouter;
  taskDecomposer: TaskDecomposer;
  speedrunStrategy: SpeedrunStrategy;
  stateMachine: StateMachine;
  worldObserver: WorldObserver;
  inventoryTracker: InventoryTracker;
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
  private taskDecomposer: TaskDecomposer;
  private speedrunStrategy: SpeedrunStrategy;
  private stateMachine: StateMachine;
  private worldObserver: WorldObserver;
  private inventoryTracker: InventoryTracker;
  private initialized: boolean;
  private startTime: number;
  private running: boolean = false;
  private isProcessing: boolean = false;

  constructor(config: Config) {
    this.config = config;
    this.initialized = false;
    this.startTime = Date.now();

    logger.info('=== Initializing AxiomMind ===');

    // Initialize database
    this.database = new DatabaseManager(this.config.database.path);
    logger.info('✓ Database initialized');

    // Initialize bot manager
    this.botManager = new BotManager(this.config);
    const bot = this.botManager.getBot();
    logger.info('✓ Bot manager initialized');

    // Initialize memory manager
    this.memoryManager = new MemoryManager(
      this.database,
      {
        maxTokens: this.config.memory.maxTokens,
        keepMessages: this.config.memory.keepMessages,
      }
    );
    logger.info('✓ Memory manager initialized');

    // Initialize tool router (needed by AI client)
    this.toolRouter = new ToolRouter(bot, logger);
    logger.info('✓ Tool router initialized');

    // Initialize AI client with ToolRouter
    this.aiClient = new AIClient(this.config, logger, this.toolRouter);
    logger.info('✓ AI client initialized');

    // Initialize goal planner
    this.goalPlanner = new GoalPlanner(
      this.config,
      logger,
      this.database,
      this.aiClient
    );
    logger.info('✓ Goal planner initialized');

    // Initialize task decomposer
    this.taskDecomposer = new TaskDecomposer(
      logger,
      this.database,
      this.aiClient
    );
    logger.info('✓ Task decomposer initialized');

    // Initialize speedrun strategy
    this.speedrunStrategy = new SpeedrunStrategy(bot, logger);
    logger.info('✓ Speedrun strategy initialized');

    // Initialize state machine
    this.stateMachine = new StateMachine(bot, logger);
    logger.info('✓ State machine initialized');

    // Initialize perception layer
    this.worldObserver = new WorldObserver(bot, logger, this.database);
    logger.info('✓ World observer initialized');

    this.inventoryTracker = new InventoryTracker(bot, logger);
    logger.info('✓ Inventory tracker initialized');

    // Setup system message
    this.setupSystemMessage();

    this.initialized = true;
    logger.info('=== AxiomMind initialized successfully ===');
  }

  /**
   * Setup system message for AI
   */
  private setupSystemMessage(): void {
    const systemMessage = `You are AxiomMind, an AI controlling a Minecraft bot.

GOAL: ${this.goalPlanner.getMainGoal()}

Use available tools to control the bot and complete the goal efficiently.`;

    this.memoryManager.setSystemMessage(systemMessage);
    logger.debug('System message configured');
  }

  /**
   * Start the AI decision-making
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('AxiomMind is already running');
      return;
    }

    logger.info('=== Starting AxiomMind ===');

    // Wait for bot to spawn
    await this.botManager.waitForSpawn();
    logger.info('✓ Bot spawned in world');

    // Start perception layer
    this.worldObserver.startObserving();
    logger.info('✓ World observation started');

    // Initial observation
    await this.observe();

    // Start running
    this.running = true;

    logger.info('=== AxiomMind is now running ===');
    logger.info('Main goal: ' + this.goalPlanner.getMainGoal());

    // Trigger first decision cycle
    this.triggerDecisionCycle();
  }

  /**
   * Stop the AI decision-making
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info('=== Stopping AxiomMind ===');

    this.running = false;
    this.isProcessing = false;

    // Stop perception
    this.worldObserver.stopObserving();

    // Return to idle state
    await this.stateMachine.returnToIdle('AxiomMind stopped');

    logger.info('=== AxiomMind stopped ===');
  }

  /**
   * Trigger a new decision cycle (called when AI finishes processing)
   */
  private triggerDecisionCycle(): void {
    if (!this.running) {
      return;
    }

    if (this.isProcessing) {
      logger.debug('Already processing, skipping trigger');
      return;
    }

    // Run decision cycle asynchronously
    this.decisionCycle().catch(error => {
      logger.error('Error in decision cycle', error);
      this.isProcessing = false;
      // Retry after error
      setTimeout(() => this.triggerDecisionCycle(), 5000);
    });
  }

  /**
   * Main AI decision-making cycle
   */
  private async decisionCycle(): Promise<void> {
    try {
      this.isProcessing = true;

      logger.info('--- Decision Cycle Start ---');

      // 1. PERCEPTION: Observe current state
      await this.observe();

      // 2. STRATEGIC: Determine phase and get strategic decision
      const phase = this.speedrunStrategy.determinePhase();
      const decision = this.speedrunStrategy.getNextDecision();
      const readiness = this.speedrunStrategy.isReadyForNextPhase();

      logger.info('Strategic Analysis', {
        phase,
        priority: decision.priority,
        action: decision.action,
        ready: readiness.ready,
        missing: readiness.missing,
      });

      // 3. TACTICAL: Build context and get AI decision
      await this.stateMachine.transition(BotState.PLANNING, 'Planning next action');

      // Add current situation to context
      const situationPrompt = `Current Situation:
- Phase: ${phase} (${this.speedrunStrategy.getProgress()}% complete)
- Priority: ${decision.priority}
- Recommended: ${decision.action}
- Reason: ${decision.reason}
- Ready for next phase: ${readiness.ready ? 'Yes' : 'No'}
${!readiness.ready ? `- Missing: ${readiness.missing.join(', ')}` : ''}
- Time remaining: ~${this.speedrunStrategy.getEstimatedTimeRemaining()} min

Execute the recommended action using available tools.`;

      this.memoryManager.addMessage({
        role: 'user',
        content: situationPrompt,
      });

      // Get AI response with tools
      const tools = getAllToolDefinitions();
      const messages = this.memoryManager.getMessages();
      
      // DEBUG: Log FULL request to AI
      logger.info('=== SENDING TO AI ===');
      logger.info('Message count: ' + messages.length);
      messages.forEach((msg, i) => {
        logger.info(`Message ${i} [${msg.role}]: ${msg.content.substring(0, 500)}${msg.content.length > 500 ? '...' : ''}`);
      });
      logger.info('Tool count: ' + tools.length);
      tools.forEach((tool, i) => {
        logger.info(`Tool ${i}: ${tool.name} - ${tool.description}`);
        logger.info(`  Parameters: ${JSON.stringify(Object.keys(tool.parameters))}`);
      });
      logger.info('=====================');
      
      const response = await this.aiClient.chatWithTools(
        messages,
        tools,
        { 
          temperature: 0.7,
          maxTokens: this.config.ai.maxTokens,
        }
      );
      
      // DEBUG: Log AI response
      logger.info('=== AI RESPONSE ===');
      logger.info('Content length: ' + (response.content?.length || 0));
      if (response.content) {
        logger.info('Content preview: ' + response.content.substring(0, 200));
      }
      logger.info('Tool calls executed: ' + (response.toolCalls?.length || 0));
      if (response.toolCalls && response.toolCalls.length > 0) {
        response.toolCalls.forEach((tc, i) => {
          logger.info(`  [${i}] ${tc.name}: ${JSON.stringify(tc.arguments)}`);
        });
      }
      logger.info('===================');

      // Update token usage
      if (response.usage) {
        this.memoryManager.updateTokenUsage(response.usage);
      }

      // Add AI response to memory
      if (response.content) {
        this.memoryManager.addMessage({
          role: 'assistant',
          content: response.content,
        });
        logger.info('AI Response:', response.content.substring(0, 200) + (response.content.length > 200 ? '...' : ''));
      }

      // Tools are already executed by aio-llm via onToolCall handler
      // Just update state machine based on what was executed
      if (response.toolCalls && response.toolCalls.length > 0) {
        logger.info(`${response.toolCalls.length} tools were executed by AI`);

        // Update state based on last tool executed
        const lastTool = response.toolCalls[response.toolCalls.length - 1];
        if (lastTool.name.includes('mine')) {
          await this.stateMachine.transition(BotState.MINING, 'Mining blocks');
        } else if (lastTool.name.includes('craft')) {
          await this.stateMachine.transition(BotState.CRAFTING, 'Crafting items');
        } else if (lastTool.name.includes('goto')) {
          await this.stateMachine.transition(BotState.NAVIGATING, 'Navigating');
        } else if (lastTool.name.includes('eat')) {
          await this.stateMachine.transition(BotState.EATING, 'Eating food');
        }

        // Return to idle after execution
        await this.stateMachine.returnToIdle('Actions completed');
      } else {
        logger.info('No tools were executed');
        await this.stateMachine.returnToIdle('No actions needed');
      }

      // 5. Save memory to database
      await this.memoryManager.saveToDatabase();

      logger.info('--- Decision Cycle Complete ---');

      // Mark as done processing
      this.isProcessing = false;

      // Trigger next cycle after a short delay
      setTimeout(() => this.triggerDecisionCycle(), 2000);
    } catch (error) {
      logger.error('Error in decision cycle', error);
      await this.stateMachine.transitionToError('Decision cycle error');
      this.isProcessing = false;
      // Retry after error
      setTimeout(() => this.triggerDecisionCycle(), 5000);
    }
  }

  /**
   * Observe world state (Perception Layer)
   */
  private async observe(): Promise<void> {
    try {
      // Observe world
      const snapshot = this.worldObserver.observe();

      // Update inventory
      this.inventoryTracker.updateInventorySnapshot();
      const inventory = this.inventoryTracker.getInventorySummary();
      const resources = this.inventoryTracker.checkResources();

      // Save world state to memory
      this.memoryManager.addWorldState({
        position: {
          x: snapshot.position.x,
          y: snapshot.position.y,
          z: snapshot.position.z,
        },
        health: snapshot.health,
        food: snapshot.food,
        dimension: snapshot.dimension,
      });

      logger.debug('Observation complete', {
        position: snapshot.position,
        health: snapshot.health,
        food: snapshot.food,
        inventoryItems: inventory.totalItems,
        nearbyBlocks: snapshot.nearbyBlocks.length,
        dangers: snapshot.dangers.length,
      });

      // Log important resources
      if (resources.hasIronPickaxe) {
        logger.debug('✓ Has iron pickaxe');
      }
      if (resources.hasDiamondPickaxe) {
        logger.debug('✓ Has diamond pickaxe');
      }
    } catch (error) {
      logger.error('Error during observation', error);
    }
  }

  /**
   * Get current status
   */
  getStatus(): AxiomMindStatus {
    return {
      initialized: this.initialized,
      connected: this.botManager.isConnected(),
      mainGoal: this.goalPlanner.getMainGoal(),
      currentPhase: this.speedrunStrategy.getCurrentPhase(),
      currentState: this.stateMachine.getCurrentState(),
      uptime: Date.now() - this.startTime,
      isRunning: this.running,
    };
  }

  /**
   * Set main goal
   */
  setMainGoal(goal: string): void {
    this.goalPlanner.setMainGoal(goal);
    this.setupSystemMessage(); // Update system message with new goal
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
      taskDecomposer: this.taskDecomposer,
      speedrunStrategy: this.speedrunStrategy,
      stateMachine: this.stateMachine,
      worldObserver: this.worldObserver,
      inventoryTracker: this.inventoryTracker,
    };
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('=== Shutting down AxiomMind ===');

    // Stop decision loop
    await this.stop();

    // Disconnect bot
    if (this.botManager.isConnected()) {
      this.botManager.disconnect();
      logger.info('✓ Bot disconnected');
    }

    // Close database
    this.database.close();
    logger.info('✓ Database closed');

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

    // Start the AI loop
    await axiomMind.start();

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
