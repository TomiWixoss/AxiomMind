import type { Bot } from 'mineflayer';

/**
 * Speedrun phases for beating Ender Dragon
 */
export enum SpeedrunPhase {
  EARLY_GAME = 'early_game',           // Spawn to iron tools
  NETHER_PREP = 'nether_prep',         // Prepare for Nether
  NETHER = 'nether',                   // Blaze rods + fortress
  END_PREP = 'end_prep',               // Eyes of Ender + stronghold
  END_FIGHT = 'end_fight',             // Dragon fight
  COMPLETED = 'completed'
}

/**
 * Resource requirements for each phase
 */
export interface PhaseRequirements {
  phase: SpeedrunPhase;
  requiredItems: string[];
  optionalItems: string[];
  minHealth: number;
  minFood: number;
  estimatedTime: number; // minutes
}

/**
 * Strategic decision for next action
 */
export interface StrategyDecision {
  phase: SpeedrunPhase;
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  estimatedTime: number; // seconds
  risks: string[];
}

/**
 * SpeedrunStrategy - Optimal progression path for beating Ender Dragon
 * Provides strategic guidance based on current game state
 */
export class SpeedrunStrategy {
  private bot: Bot;
  private logger: any;
  private currentPhase: SpeedrunPhase = SpeedrunPhase.EARLY_GAME;

  // Speedrun knowledge base
  private readonly PHASE_REQUIREMENTS: Record<SpeedrunPhase, PhaseRequirements> = {
    [SpeedrunPhase.EARLY_GAME]: {
      phase: SpeedrunPhase.EARLY_GAME,
      requiredItems: ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'crafting_table'],
      optionalItems: ['wooden_sword', 'stone_sword', 'food'],
      minHealth: 10,
      minFood: 10,
      estimatedTime: 5
    },
    [SpeedrunPhase.NETHER_PREP]: {
      phase: SpeedrunPhase.NETHER_PREP,
      requiredItems: ['iron_pickaxe', 'flint_and_steel', 'obsidian'],
      optionalItems: ['iron_sword', 'iron_armor', 'food', 'water_bucket'],
      minHealth: 15,
      minFood: 15,
      estimatedTime: 10
    },
    [SpeedrunPhase.NETHER]: {
      phase: SpeedrunPhase.NETHER,
      requiredItems: ['blaze_rod', 'ender_pearl'],
      optionalItems: ['fire_resistance_potion', 'golden_apple', 'shield'],
      minHealth: 18,
      minFood: 18,
      estimatedTime: 15
    },
    [SpeedrunPhase.END_PREP]: {
      phase: SpeedrunPhase.END_PREP,
      requiredItems: ['eye_of_ender', 'diamond_pickaxe'],
      optionalItems: ['diamond_sword', 'diamond_armor', 'bow', 'arrow'],
      minHealth: 20,
      minFood: 20,
      estimatedTime: 10
    },
    [SpeedrunPhase.END_FIGHT]: {
      phase: SpeedrunPhase.END_FIGHT,
      requiredItems: ['bow', 'arrow', 'diamond_sword', 'eye_of_ender'],
      optionalItems: ['diamond_armor', 'golden_apple', 'water_bucket', 'bed'],
      minHealth: 20,
      minFood: 20,
      estimatedTime: 10
    },
    [SpeedrunPhase.COMPLETED]: {
      phase: SpeedrunPhase.COMPLETED,
      requiredItems: [],
      optionalItems: [],
      minHealth: 0,
      minFood: 0,
      estimatedTime: 0
    }
  };

  // Optimal progression order
  private readonly PROGRESSION_STEPS: Record<SpeedrunPhase, string[]> = {
    [SpeedrunPhase.EARLY_GAME]: [
      'Punch trees for wood (3-4 logs)',
      'Craft wooden planks and sticks',
      'Craft crafting table',
      'Craft wooden pickaxe',
      'Mine stone (cobblestone)',
      'Craft stone pickaxe and stone sword',
      'Find iron ore (need 11+ iron)',
      'Craft furnace',
      'Smelt iron ore',
      'Craft iron pickaxe, iron sword, iron armor'
    ],
    [SpeedrunPhase.NETHER_PREP]: [
      'Find lava pool (for obsidian)',
      'Create obsidian with water bucket (need 10 blocks)',
      'Craft flint and steel',
      'Build nether portal (4x5 frame)',
      'Light portal',
      'Prepare food and equipment'
    ],
    [SpeedrunPhase.NETHER]: [
      'Enter Nether',
      'Find Nether fortress',
      'Kill blazes for blaze rods (need 6-7)',
      'Kill endermen for ender pearls (need 12+)',
      'Avoid ghasts and piglins',
      'Return to Overworld'
    ],
    [SpeedrunPhase.END_PREP]: [
      'Craft blaze powder from blaze rods',
      'Craft eyes of ender (blaze powder + ender pearl)',
      'Use eyes of ender to find stronghold',
      'Mine diamonds (need 5+ for pickaxe, sword, armor)',
      'Craft diamond gear',
      'Prepare for End fight (bow, arrows, food)'
    ],
    [SpeedrunPhase.END_FIGHT]: [
      'Enter stronghold',
      'Find End portal room',
      'Place eyes of ender in portal frame',
      'Enter End dimension',
      'Destroy End crystals (shoot with bow)',
      'Fight Ender Dragon',
      'Collect dragon egg (optional)'
    ],
    [SpeedrunPhase.COMPLETED]: []
  };

  // Critical items for speedrun
  private readonly CRITICAL_ITEMS = {
    tools: ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe'],
    weapons: ['stone_sword', 'iron_sword', 'diamond_sword', 'bow'],
    nether: ['obsidian', 'flint_and_steel', 'blaze_rod', 'ender_pearl'],
    end: ['eye_of_ender', 'arrow'],
    survival: ['food', 'water_bucket', 'bed']
  };

  constructor(bot: Bot, logger: any) {
    this.bot = bot;
    this.logger = logger;
  }

  /**
   * Determine current speedrun phase based on inventory and progress
   */
  determinePhase(): SpeedrunPhase {
    const inventory = this.bot.inventory.items();
    const itemNames = inventory.map(item => item.name);

    // Check if completed
    // (In real scenario, check if dragon is dead)
    
    // Check End fight phase
    if (itemNames.includes('eye_of_ender') && itemNames.includes('diamond_pickaxe')) {
      this.currentPhase = SpeedrunPhase.END_FIGHT;
      return this.currentPhase;
    }

    // Check End prep phase
    if (itemNames.includes('blaze_rod') && itemNames.includes('ender_pearl')) {
      this.currentPhase = SpeedrunPhase.END_PREP;
      return this.currentPhase;
    }

    // Check Nether phase
    if (itemNames.includes('obsidian') && itemNames.includes('flint_and_steel')) {
      this.currentPhase = SpeedrunPhase.NETHER;
      return this.currentPhase;
    }

    // Check Nether prep phase
    if (itemNames.includes('iron_pickaxe')) {
      this.currentPhase = SpeedrunPhase.NETHER_PREP;
      return this.currentPhase;
    }

    // Default to early game
    this.currentPhase = SpeedrunPhase.EARLY_GAME;
    return this.currentPhase;
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): SpeedrunPhase {
    return this.currentPhase;
  }

  /**
   * Get requirements for current phase
   */
  getPhaseRequirements(phase?: SpeedrunPhase): PhaseRequirements {
    const targetPhase = phase || this.currentPhase;
    return this.PHASE_REQUIREMENTS[targetPhase];
  }

  /**
   * Get progression steps for current phase
   */
  getProgressionSteps(phase?: SpeedrunPhase): string[] {
    const targetPhase = phase || this.currentPhase;
    return this.PROGRESSION_STEPS[targetPhase] || [];
  }

  /**
   * Check if ready to advance to next phase
   */
  isReadyForNextPhase(): { ready: boolean; missing: string[] } {
    const requirements = this.getPhaseRequirements();
    const inventory = this.bot.inventory.items();
    const itemNames = inventory.map(item => item.name);

    const missing: string[] = [];

    // Check required items
    for (const item of requirements.requiredItems) {
      if (!itemNames.includes(item)) {
        missing.push(item);
      }
    }

    // Check health and food
    if (this.bot.health < requirements.minHealth) {
      missing.push(`health (need ${requirements.minHealth}, have ${this.bot.health})`);
    }

    if (this.bot.food < requirements.minFood) {
      missing.push(`food (need ${requirements.minFood}, have ${this.bot.food})`);
    }

    return {
      ready: missing.length === 0,
      missing
    };
  }

  /**
   * Get next strategic decision based on current state
   */
  getNextDecision(): StrategyDecision {
    const phase = this.determinePhase();
    const readiness = this.isReadyForNextPhase();

    // If not ready, prioritize missing items
    if (!readiness.ready) {
      const firstMissing = readiness.missing[0];
      return {
        phase,
        priority: 'critical',
        action: `Obtain ${firstMissing}`,
        reason: `Required for ${phase} phase`,
        estimatedTime: 60,
        risks: ['May encounter mobs', 'Resource might be far away']
      };
    }

    // Get next step in progression
    const steps = this.getProgressionSteps();
    if (steps.length > 0) {
      return {
        phase,
        priority: 'high',
        action: steps[0]!,
        reason: `Next step in ${phase} progression`,
        estimatedTime: 120,
        risks: this.getRisksForPhase(phase)
      };
    }

    // Ready to advance to next phase
    const nextPhase = this.getNextPhase(phase);
    return {
      phase: nextPhase,
      priority: 'high',
      action: `Advance to ${nextPhase} phase`,
      reason: `Completed ${phase} requirements`,
      estimatedTime: 180,
      risks: this.getRisksForPhase(nextPhase)
    };
  }

  /**
   * Get next phase in progression
   */
  private getNextPhase(current: SpeedrunPhase): SpeedrunPhase {
    const phases = [
      SpeedrunPhase.EARLY_GAME,
      SpeedrunPhase.NETHER_PREP,
      SpeedrunPhase.NETHER,
      SpeedrunPhase.END_PREP,
      SpeedrunPhase.END_FIGHT,
      SpeedrunPhase.COMPLETED
    ];

    const currentIndex = phases.indexOf(current);
    if (currentIndex === -1 || currentIndex === phases.length - 1) {
      return SpeedrunPhase.COMPLETED;
    }

    return phases[currentIndex + 1]!;
  }

  /**
   * Get risks for specific phase
   */
  private getRisksForPhase(phase: SpeedrunPhase): string[] {
    const risks: Record<SpeedrunPhase, string[]> = {
      [SpeedrunPhase.EARLY_GAME]: [
        'Hostile mobs at night',
        'Fall damage',
        'Hunger'
      ],
      [SpeedrunPhase.NETHER_PREP]: [
        'Lava pools',
        'Mining accidents',
        'Mob attacks'
      ],
      [SpeedrunPhase.NETHER]: [
        'Ghast fireballs',
        'Lava everywhere',
        'Piglin aggression',
        'Getting lost'
      ],
      [SpeedrunPhase.END_PREP]: [
        'Cave systems',
        'Stronghold mobs',
        'Resource scarcity'
      ],
      [SpeedrunPhase.END_FIGHT]: [
        'Dragon attacks',
        'End crystal explosions',
        'Void fall',
        'Endermen aggression'
      ],
      [SpeedrunPhase.COMPLETED]: []
    };

    return risks[phase] ?? [];
  }

  /**
   * Get optimal resource gathering priorities
   */
  getResourcePriorities(): { item: string; priority: number; reason: string }[] {
    const phase = this.currentPhase;
    const priorities: { item: string; priority: number; reason: string }[] = [];

    switch (phase) {
      case SpeedrunPhase.EARLY_GAME:
        priorities.push(
          { item: 'wood', priority: 10, reason: 'Essential for all tools' },
          { item: 'cobblestone', priority: 9, reason: 'Stone tools and furnace' },
          { item: 'iron_ore', priority: 10, reason: 'Critical for iron tools' },
          { item: 'coal', priority: 7, reason: 'Smelting fuel' },
          { item: 'food', priority: 8, reason: 'Survival' }
        );
        break;

      case SpeedrunPhase.NETHER_PREP:
        priorities.push(
          { item: 'obsidian', priority: 10, reason: 'Nether portal' },
          { item: 'iron', priority: 8, reason: 'Better equipment' },
          { item: 'flint', priority: 9, reason: 'Flint and steel' },
          { item: 'food', priority: 7, reason: 'Nether preparation' }
        );
        break;

      case SpeedrunPhase.NETHER:
        priorities.push(
          { item: 'blaze_rod', priority: 10, reason: 'Eyes of Ender' },
          { item: 'ender_pearl', priority: 10, reason: 'Eyes of Ender' },
          { item: 'gold', priority: 6, reason: 'Piglin trading' }
        );
        break;

      case SpeedrunPhase.END_PREP:
        priorities.push(
          { item: 'diamond', priority: 10, reason: 'Best equipment' },
          { item: 'eye_of_ender', priority: 10, reason: 'Find stronghold' },
          { item: 'arrow', priority: 8, reason: 'Dragon fight' },
          { item: 'food', priority: 7, reason: 'End preparation' }
        );
        break;

      case SpeedrunPhase.END_FIGHT:
        priorities.push(
          { item: 'arrow', priority: 10, reason: 'Destroy crystals' },
          { item: 'food', priority: 9, reason: 'Sustain health' },
          { item: 'bed', priority: 7, reason: 'Bed bombing strategy' }
        );
        break;
    }

    return priorities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get estimated time to complete speedrun
   */
  getEstimatedTimeRemaining(): number {
    let totalTime = 0;
    const phases = [
      SpeedrunPhase.EARLY_GAME,
      SpeedrunPhase.NETHER_PREP,
      SpeedrunPhase.NETHER,
      SpeedrunPhase.END_PREP,
      SpeedrunPhase.END_FIGHT
    ];

    const currentIndex = phases.indexOf(this.currentPhase);
    if (currentIndex === -1) return 0;

    // Sum remaining phases
    for (let i = currentIndex; i < phases.length; i++) {
      const phase = phases[i];
      if (phase) {
        totalTime += this.PHASE_REQUIREMENTS[phase].estimatedTime;
      }
    }

    return totalTime;
  }

  /**
   * Get speedrun tips for current phase
   */
  getTips(): string[] {
    const tips: Record<SpeedrunPhase, string[]> = {
      [SpeedrunPhase.EARLY_GAME]: [
        'Punch trees while looking for village',
        'Skip wooden tools if possible (except pickaxe)',
        'Look for surface iron in caves',
        'Craft stone tools ASAP',
        'Avoid unnecessary combat'
      ],
      [SpeedrunPhase.NETHER_PREP]: [
        'Find lava pool near water for easy obsidian',
        'Use water bucket method for obsidian',
        'Only need 10 obsidian blocks for portal',
        'Craft flint and steel before entering Nether',
        'Bring food and basic armor'
      ],
      [SpeedrunPhase.NETHER]: [
        'Find fortress quickly using F3 coordinates',
        'Kill blazes from safe distance',
        'Collect 6-7 blaze rods minimum',
        'Hunt endermen in warped forest (safer)',
        'Avoid unnecessary fights with piglins'
      ],
      [SpeedrunPhase.END_PREP]: [
        'Use eyes of ender to triangulate stronghold',
        'Mine diamonds at Y=11 or Y=-59 (1.18+)',
        'Craft diamond pickaxe, sword, and armor',
        'Bring lots of arrows (64+)',
        'Prepare golden apples if possible'
      ],
      [SpeedrunPhase.END_FIGHT]: [
        'Destroy End crystals first (shoot with bow)',
        'Use beds for massive damage (bed bombing)',
        'Bring water bucket for safe descent',
        'Attack dragon when perched on portal',
        'Avoid dragon breath and endermen'
      ],
      [SpeedrunPhase.COMPLETED]: [
        'Congratulations! Speedrun completed!'
      ]
    };

    return tips[this.currentPhase] || [];
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    const phases = [
      SpeedrunPhase.EARLY_GAME,
      SpeedrunPhase.NETHER_PREP,
      SpeedrunPhase.NETHER,
      SpeedrunPhase.END_PREP,
      SpeedrunPhase.END_FIGHT,
      SpeedrunPhase.COMPLETED
    ];

    const currentIndex = phases.indexOf(this.currentPhase);
    if (currentIndex === -1) return 0;

    return Math.round((currentIndex / (phases.length - 1)) * 100);
  }
}
