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
- [x] 105 tests, 397 assertions - ALL PASSING ✅
  - [x] Unit tests (config, logger, database, memory, bot, tools)
  - [x] Integration tests (setup)
  - [x] TDD approach

---

## 🔄 Đang Làm / Tiếp Theo

### 1. Bot Initialization (Priority: HIGH)
- [x] `src/core/bot.ts` - Initialize mineflayer bot
  - [x] Connect to Minecraft server
  - [x] Load all plugins (pathfinder, collectblock, pvp, etc.)
  - [x] Event handlers (spawn, chat, error, kicked)
  - [x] Health/hunger monitoring
  - [x] Auto-eat integration
  - [x] Auto-armor integration
- [x] Unit tests cho bot initialization (7 tests)
- [ ] Integration test: bot connect to real server

### 2. Tool Definitions (Priority: HIGH) ✅ COMPLETED
- [x] `src/tools/` - Define tools cho LLM (8 tools created)
  - [x] Mining tools: `mine_block(blockType, count)`
  - [x] Crafting tools: `craft_item(itemName, count)`
  - [x] Navigation tools: `goto_location(x, y, z)`
  - [x] Survival tools: `eat_food()`
  - [x] Information tools: `get_inventory()`, `get_nearby_blocks()`, `get_position()`, `get_health()`
- [x] Tool handlers implemented (each tool in separate file)
  - [x] Map tool calls to mineflayer actions
  - [x] Error handling
  - [x] Result formatting
- [x] Tool registry system (`src/tools/index.ts`)
- [x] Unit tests cho tools (67 tests - ALL PASSING ✅)

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
- **Tools**: 100% ✅ (8 tools with 67 tests)
- **Tactical Layer**: 50% (MemoryManager done, need TaskDecomposer & ToolRouter)
- **Strategic Layer**: 0%
- **Execution Layer**: 0%
- **Perception Layer**: 0%

### By Feature
- **Infrastructure**: 100% ✅
- **Database**: 100% ✅
- **Memory Management**: 100% ✅
- **Bot Initialization**: 100% ✅
- **Tool System**: 100% ✅ (8 tools implemented)
- **AI Integration**: 0%
- **Actions**: 0%
- **Speedrun Logic**: 0%

### Overall Completion: ~50%

---

## 🎯 Next Session Goals

1. **AI Client** ✅ NEXT - Integrate aio-llm with tool calling
2. **Tool Router** - Route LLM tool calls to handlers
3. **Perception Layer** - World observer & inventory tracker
4. **Main Entry Point** - Complete application integration

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
