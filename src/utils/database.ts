import { Database } from 'bun:sqlite';
import logger from './logger.js';
import type { Goal, Message } from '../types/index.js';

export interface WorldStateRecord {
  position: { x: number; y: number; z: number };
  health: number;
  food: number;
  dimension: string;
  timestamp?: string;
}

export class DatabaseManager {
  private db: Database;

  constructor(dbPath: string) {
    logger.info(`Initializing database at: ${dbPath}`);
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    // Goals table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        priority INTEGER NOT NULL,
        status TEXT NOT NULL,
        parent_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT
      )
    `);

    // Messages table (conversation history)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // World states table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS world_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        position_z REAL NOT NULL,
        health REAL NOT NULL,
        food REAL NOT NULL,
        dimension TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.info('Database tables initialized');
  }

  // Utility: Get all table names
  getTables(): string[] {
    const query = this.db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    const tables = query.all() as Array<{ name: string }>;
    return tables.map(t => t.name);
  }

  // === Goals ===
  insertGoal(goal: Omit<Goal, 'createdAt' | 'completedAt'>) {
    const query = this.db.query(`
      INSERT INTO goals (id, type, description, priority, status, parent_id)
      VALUES ($id, $type, $description, $priority, $status, $parentId)
    `);

    query.run({
      $id: goal.id,
      $type: goal.type,
      $description: goal.description,
      $priority: goal.priority,
      $status: goal.status,
      $parentId: goal.parentId || null,
    });

    logger.debug(`Inserted goal: ${goal.id}`);
  }

  getGoal(id: string): Goal | null {
    const query = this.db.query(`
      SELECT * FROM goals WHERE id = $id
    `);

    const row = query.get({ $id: id }) as any;
    if (!row) return null;

    return {
      id: row.id,
      type: row.type,
      description: row.description,
      priority: row.priority,
      status: row.status,
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }

  updateGoalStatus(id: string, status: Goal['status']) {
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    
    const query = this.db.query(`
      UPDATE goals 
      SET status = $status, completed_at = $completedAt
      WHERE id = $id
    `);

    query.run({
      $id: id,
      $status: status,
      $completedAt: completedAt,
    });

    logger.debug(`Updated goal ${id} status to: ${status}`);
  }

  getPendingGoals(): Goal[] {
    const query = this.db.query(`
      SELECT * FROM goals 
      WHERE status = 'pending'
      ORDER BY priority ASC
    `);

    const rows = query.all() as any[];
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      description: row.description,
      priority: row.priority,
      status: row.status,
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    }));
  }

  // === Messages ===
  insertMessage(message: Message): number {
    const query = this.db.query(`
      INSERT INTO messages (role, content)
      VALUES ($role, $content)
    `);

    query.run({
      $role: message.role,
      $content: message.content,
    });

    // Get last inserted ID
    const lastId = this.db.query('SELECT last_insert_rowid() as id').get() as { id: number };
    logger.debug(`Inserted message with ID: ${lastId.id}`);
    return lastId.id;
  }

  getRecentMessages(limit: number = 10): Message[] {
    const query = this.db.query(`
      SELECT role, content FROM messages
      ORDER BY id DESC
      LIMIT $limit
    `);

    const rows = query.all({ $limit: limit }) as any[];
    return rows.map(row => ({
      role: row.role,
      content: row.content,
    }));
  }

  clearOldMessages(keepLast: number = 50) {
    const query = this.db.query(`
      DELETE FROM messages
      WHERE id NOT IN (
        SELECT id FROM messages
        ORDER BY id DESC
        LIMIT $keepLast
      )
    `);

    query.run({ $keepLast: keepLast });
    logger.info(`Cleared old messages, kept last ${keepLast}`);
  }

  // === World States ===
  insertWorldState(state: WorldStateRecord): number {
    const query = this.db.query(`
      INSERT INTO world_states (position_x, position_y, position_z, health, food, dimension)
      VALUES ($x, $y, $z, $health, $food, $dimension)
    `);

    query.run({
      $x: state.position.x,
      $y: state.position.y,
      $z: state.position.z,
      $health: state.health,
      $food: state.food,
      $dimension: state.dimension,
    });

    const lastId = this.db.query('SELECT last_insert_rowid() as id').get() as { id: number };
    return lastId.id;
  }

  getLatestWorldState(): WorldStateRecord | null {
    const query = this.db.query(`
      SELECT * FROM world_states
      ORDER BY id DESC
      LIMIT 1
    `);

    const row = query.get() as any;
    if (!row) return null;

    return {
      position: {
        x: row.position_x,
        y: row.position_y,
        z: row.position_z,
      },
      health: row.health,
      food: row.food,
      dimension: row.dimension,
      timestamp: row.created_at,
    };
  }

  // Close database connection
  close() {
    this.db.close();
    logger.info('Database connection closed');
  }
}

export default DatabaseManager;
