import type { Bot } from 'mineflayer';
import type { Vec3 } from 'vec3';

// Bot state
export enum BotState {
  IDLE = 'idle',
  PLANNING = 'planning',
  MINING = 'mining',
  CRAFTING = 'crafting',
  NAVIGATING = 'navigating',
  COMBAT = 'combat',
  EATING = 'eating',
  ERROR = 'error',
}

// Goal types
export interface Goal {
  id: string;
  type: 'main' | 'sub' | 'task';
  description: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  parentId?: string;
  createdAt: Date;
  completedAt?: Date;
}

// World state snapshot
export interface WorldState {
  position: Vec3;
  health: number;
  food: number;
  inventory: InventoryItem[];
  nearbyBlocks: BlockInfo[];
  nearbyEntities: EntityInfo[];
  time: number;
  dimension: string;
}

export interface InventoryItem {
  name: string;
  count: number;
  slot: number;
}

export interface BlockInfo {
  name: string;
  position: Vec3;
  distance: number;
}

export interface EntityInfo {
  type: string;
  position: Vec3;
  distance: number;
  health?: number;
}

// Tool call types
export interface ToolCall {
  name: string;
  params: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

// Message types for LLM
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Extended Bot type with plugins
export interface ExtendedBot extends Bot {
  // Add plugin types here as we integrate them
  [key: string]: any;
}
