# AxiomMind - Minecraft AI Speedrun Bot - TODO

## ✅ Đã Hoàn Thành (Completion: ~35%)

### Infrastructure & Foundation
- [x] Project setup với Bun + TypeScript
- [x] Clean Architecture structure
- [x] Config management với Zod validation
- [x] Logger system với Winston (file rotation 1000 lines)
- [x] Environment variables (.env)
- [x] TypeScript configuration
- [x] Test infrastructure (Bun test)
- [x] Documentation (README.md, ARCHITECTURE.md)

### Database & Persistence
- [x] DatabaseManager với Bun SQLite
  - [x] Goals table (main/sub/task goals)
  - [x] Messages table (conversation history)
  - [x] World states table (position, health, food)
  - [x] CRUD operations
  - [x] 10 unit tests

### Memory Management
- [x] MemoryManager (Tactical Layer)
  - [x] Message management với auto-trim
  - [x] Token estimation (~1.3 tokens/word)
  - [x] Token tracking từ API response
  - [x] Context building (system + world state + goals)
  - [x] Database persistence (save/load)
  - [x] Conversation statistics
  - [x] Support 256K context (stepfun-ai)
  - [x] 17 unit tests

### Dependencies
- [x] 25+ packages installed
  - [x] mineflayer + 15 plugins
  - [x] aio-llm (AI framework)
  - [x] zod (validation)
  - [x] winston (logging)
  - [x] dotenv (env vars)

### Testing
- [x] 33 tests, 68 assertions - ALL PASSING ✅
  - [x] Unit tests (config, logger, database, memory)
  - [x] Integration tests (setup)
  - [x] TDD approach

---

## 🔄 Đang Làm / Tiếp Theo

### 1. Bot Initialization (Priority: HIGH)
- [ ] `src/core/bot.ts` - Initialize mineflayer bot
  - [ ] Connect to Minecraft server
  - [ ] Load all plugins (pathfinder, collectblock, pvp, etc.)
  - [ ] Event handlers (spawn, chat, error, kicked)
  - [ ] Health/hunger monitoring
  - [ ] Auto-eat integration
  - [ ] Auto-armor integration
- [ ] Unit tests cho bot initialization
- [ ] Integration test: bot connect to server

### 2. Tool Definitions (Priority: HIGH)
- [ ] `src/tools/tool-definitions.ts` - Define tools cho LLM
  - [ ] Mining tools: `mine_block(blockType, count)`
  - [ ] Crafting tools: `craft_item(itemName, count)`
  - [ ] Navigation tools: `goto_location(x, y, z)`, `goto_block(blockType)`
  - [ ] Combat tools: `attack_mob(mobType)`, `defend()`
  - [ ] Inventory tools: `equip_armor()`, `equip_tool(toolType)`
  - [ ] Survival tools: `eat_food()`, `find_shelter()`
  - [ ] Information tools: `get_inventory()`, `get_nearby_blocks()`, `get_position()`
- [ ] `src/tools/tool-handlers.ts` - Implement tool handlers
  - [ ] Map tool calls to mineflayer actions
  - [ ] Error handling
  - [ ] Result formatting
- [ ] Unit tests cho tools (10-15 tests)

### 3. AI Integration (Priority: HIGH)
- [ ] `src/layers/strategic/ai-client.ts` - Wrapper cho aio-llm
  - [ ] Initialize AIO với config
  - [ ] Chat completion với streaming
  - [ ] Tool calling integration
  - [ ] Token usage tracking
  - [ ] Error handling & retries
- [ ] `src/layers/strategic/goal-planner.ts` - AI goal planning
  - [ ] Main goal: "Beat Ender Dragon"
  - [ ] Sub-goal decomposition
  - [ ] Priority management
  - [ ] Goal status tracking
- [ ] Unit tests cho AI integration

### 4. Perception Layer (Priority: MEDIUM)
- [ ] `src/layers/perception/world-observer.ts`
  - [ ] Observe nearby blocks (ores, trees, mobs)
  - [ ] Track position changes
  - [ ] Detect dangers (lava, cliffs, mobs)
  - [ ] Update world state in database
- [ ] `src/layers/perception/inventory-tracker.ts`
  - [ ] Track inventory changes
  - [ ] Calculate available resources
  - [ ] Detect missing items for goals
- [ ] Unit tests cho perception layer

### 5. Execution Layer (Priority: MEDIUM)
- [ ] `src/layers/execution/actions/mining.ts`
  - [ ] Find nearest block of type
  - [ ] Pathfind to block
  - [ ] Select correct tool
  - [ ] Mine block
  - [ ] Collect drops
- [ ] `src/layers/execution/actions/crafting.ts`
  - [ ] Check recipe requirements
  - [ ] Gather materials
  - [ ] Find crafting table if needed
  - [ ] Craft item
- [ ] `src/layers/execution/actions/combat.ts`
  - [ ] Detect hostile mobs
  - [ ] Equip weapon
  - [ ] Attack mob
  - [ ] Dodge/defend
- [ ] `src/layers/execution/actions/navigation.ts`
  - [ ] Pathfind to coordinates
  - [ ] Avoid obstacles
  - [ ] Handle different terrains
  - [ ] Sprint/jump optimization
- [ ] `src/layers/execution/state-machine.ts`
  - [ ] Define states (idle, mining, crafting, combat, etc.)
  - [ ] State transitions
  - [ ] State persistence
- [ ] Unit tests cho execution layer (20+ tests)

### 6. Tactical Layer (Priority: MEDIUM)
- [ ] `src/layers/tactical/task-decomposer.ts`
  - [ ] Break goals into tasks
  - [ ] Task prioritization
  - [ ] Task dependencies
  - [ ] Task validation
- [ ] `src/layers/tactical/tool-router.ts`
  - [ ] Route LLM tool calls to handlers
  - [ ] Validate tool parameters
  - [ ] Handle tool errors
  - [ ] Return formatted results
- [ ] Unit tests cho tactical layer

### 7. Speedrun Strategy (Priority: MEDIUM)
- [ ] `src/layers/strategic/speedrun-strategy.ts`
  - [ ] Optimal progression path
  - [ ] Resource gathering priorities
  - [ ] Nether portal strategy
  - [ ] End portal strategy
  - [ ] Dragon fight strategy
- [ ] Knowledge base về speedrun techniques
- [ ] Decision tree cho different scenarios

### 8. Monitoring & Debugging (Priority: LOW)
- [ ] Dashboard integration (mineflayer-dashboard)
  - [ ] Real-time bot status
  - [ ] Goal progress
  - [ ] Token usage
  - [ ] Performance metrics
- [ ] Viewer integration (prismarine-viewer)
  - [ ] 3D world view
  - [ ] Bot position tracking
- [ ] Web inventory (mineflayer-web-inventory)
  - [ ] View inventory via browser

### 9. Main Entry Point (Priority: HIGH)
- [ ] `src/index.ts` - Main application
  - [ ] Initialize all components
  - [ ] Start bot
  - [ ] Main loop
  - [ ] Graceful shutdown
  - [ ] Error recovery
- [ ] CLI arguments support
- [ ] Multiple bot instances support

### 10. Integration & E2E Tests (Priority: MEDIUM)
- [ ] E2E test: Complete mining workflow
- [ ] E2E test: Crafting workflow
- [ ] E2E test: Combat scenario
- [ ] E2E test: Navigation test
- [ ] Integration test: AI + Tools + Bot
- [ ] Integration test: Memory + Database + AI

### 11. Documentation (Priority: LOW)
- [ ] API documentation
- [ ] Tool definitions documentation
- [ ] Development guide
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Contributing guide

### 12. Optimization (Priority: LOW)
- [ ] Performance profiling
- [ ] Token usage optimization
- [ ] Memory optimization
- [ ] Pathfinding optimization
- [ ] Database query optimization

### 13. Advanced Features (Priority: LOW)
- [ ] Multi-bot coordination
- [ ] Learning from failures
- [ ] Strategy adaptation
- [ ] Voice commands
- [ ] Web UI for control

---

## 📊 Progress Tracking

### By Layer
- **Core**: 100% ✅
- **Utils**: 100% ✅
- **Types**: 100% ✅
- **Tactical Layer**: 50% (MemoryManager done, need TaskDecomposer & ToolRouter)
- **Strategic Layer**: 0%
- **Execution Layer**: 0%
- **Perception Layer**: 0%
- **Tools**: 0%

### By Feature
- **Infrastructure**: 100% ✅
- **Database**: 100% ✅
- **Memory Management**: 100% ✅
- **Bot Initialization**: 0%
- **AI Integration**: 0%
- **Tool System**: 0%
- **Actions**: 0%
- **Speedrun Logic**: 0%

### Overall Completion: ~35%

---

## 🎯 Next Session Goals

1. **Bot Initialization** - Get bot connecting to server
2. **Tool Definitions** - Define 10-15 basic tools
3. **AI Client** - Integrate aio-llm with tool calling
4. **Basic Actions** - Implement mining & navigation

---

## 📝 Notes

### Important Decisions Made
- Using Bun SQLite (built-in) instead of better-sqlite3
- Memory limit: 200K tokens (buffer for 256K context)
- TDD approach for all new features
- Clean Architecture with 4 layers
- Tool calling via aio-llm framework

### Known Issues
- None currently

### Performance Targets
- Bot response time: < 2s
- Token usage per decision: < 5K tokens
- Memory usage: < 500MB
- Pathfinding: < 1s for 100 blocks

### Testing Goals
- Unit test coverage: > 80%
- Integration tests: All major workflows
- E2E tests: Complete speedrun simulation
- Target: 100+ tests total

---

## 🚀 Quick Start for Next Session

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/bot.test.ts

# Start development
bun dev

# Check types
bun run tsc --noEmit
```

---

Last Updated: 2025-02-11
