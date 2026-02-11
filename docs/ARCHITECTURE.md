# Architecture Design

## Overview
Bot Minecraft AI Speedrun sử dụng kiến trúc Multi-Layer dựa trên Clean Architecture và Domain-Driven Design.

## Layers

```
┌─────────────────────────────────────────────────────────┐
│                    STRATEGIC LAYER                      │
│  - LLM Goal Planner (aio-llm)                          │
│  - Main Goal: "Beat Ender Dragon"                      │
│  - Sub-goals decomposition                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   TACTICAL LAYER                        │
│  - Task Decomposer                                      │
│  - Memory Manager (SQLite + Context Summarization)      │
│  - Tool Call Router                                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  EXECUTION LAYER                        │
│  - Mineflayer Plugins (pathfinder, collectblock, etc)  │
│  - State Machine (idle → mining → crafting → combat)   │
│  - Action Queue                                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 PERCEPTION LAYER                        │
│  - World State Observer                                 │
│  - Inventory Tracker                                    │
│  - Health/Hunger Monitor                                │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── core/               # Core configuration và initialization
│   ├── bot.ts         # Bot initialization
│   └── config.ts      # Configuration management
│
├── layers/            # Business logic layers
│   ├── strategic/     # High-level planning
│   │   ├── goal-planner.ts
│   │   └── speedrun-strategy.ts
│   │
│   ├── tactical/      # Mid-level coordination
│   │   ├── task-decomposer.ts
│   │   ├── memory-manager.ts
│   │   └── tool-router.ts
│   │
│   ├── execution/     # Low-level actions
│   │   ├── actions/
│   │   │   ├── mining.ts
│   │   │   ├── crafting.ts
│   │   │   ├── combat.ts
│   │   │   └── navigation.ts
│   │   └── state-machine.ts
│   │
│   └── perception/    # World observation
│       ├── world-observer.ts
│       └── inventory-tracker.ts
│
├── tools/             # LLM tool definitions
│   ├── tool-definitions.ts
│   └── tool-handlers.ts
│
├── utils/             # Utilities
│   ├── logger.ts
│   └── database.ts
│
└── types/             # TypeScript types
    └── index.ts

tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/              # End-to-end tests

docs/
├── ARCHITECTURE.md    # This file
├── API.md            # API documentation
└── DEVELOPMENT.md    # Development guide
```

## Design Patterns

### 1. Layered Architecture
- Separation of concerns
- Each layer has specific responsibility
- Dependencies flow downward

### 2. Strategy Pattern
- Different speedrun strategies
- Pluggable goal planning algorithms

### 3. State Machine Pattern
- Bot state management
- Clear state transitions

### 4. Observer Pattern
- World state monitoring
- Event-driven updates

### 5. Command Pattern
- Tool calls as commands
- Undo/redo capability

### 6. Repository Pattern
- Database abstraction
- Memory management

## Key Principles

1. **Single Responsibility**: Each module has one reason to change
2. **Open/Closed**: Open for extension, closed for modification
3. **Dependency Inversion**: Depend on abstractions, not concretions
4. **Interface Segregation**: Small, focused interfaces
5. **DRY**: Don't Repeat Yourself

## Data Flow

```
User/Environment → Perception Layer → Tactical Layer → Strategic Layer
                                                            ↓
                                                    Decision Making
                                                            ↓
Strategic Layer → Tactical Layer → Execution Layer → Minecraft World
```

## Testing Strategy

- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test layer interactions
- **E2E Tests**: Test complete workflows
- **Property-Based Tests**: Test invariants

## Scalability Considerations

1. **Modular Design**: Easy to add new features
2. **Plugin System**: Extend functionality without core changes
3. **Database**: Persistent memory across sessions
4. **Logging**: Comprehensive debugging information
5. **Configuration**: Environment-based settings
