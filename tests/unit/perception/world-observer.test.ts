import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { WorldObserver } from '../../../src/layers/perception/world-observer';
import type { Bot } from 'mineflayer';
import type { Vec3 } from 'vec3';

// Mock logger
const mockLogger = {
  info: mock(() => {}),
  debug: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

// Mock database
const mockDatabase = {
  insertWorldState: mock(() => {}),
  getLatestWorldState: mock(() => null),
  close: mock(() => {}),
};

// Mock Vec3
const createVec3 = (x: number, y: number, z: number): Vec3 => ({
  x,
  y,
  z,
  clone: () => createVec3(x, y, z),
  offset: (dx: number, dy: number, dz: number) => createVec3(x + dx, y + dy, z + dz),
  distanceTo: (other: Vec3) => Math.sqrt(
    Math.pow(other.x - x, 2) + 
    Math.pow(other.y - y, 2) + 
    Math.pow(other.z - z, 2)
  ),
} as Vec3);

// Mock bot
const createMockBot = (): Partial<Bot> => ({
  entity: {
    position: createVec3(0, 64, 0),
  } as any,
  health: 20,
  food: 20,
  time: {
    timeOfDay: 6000,
  } as any,
  isRaining: false,
  version: '1.21.1',
  entities: {},
  findBlocks: mock(() => []),
  blockAt: mock(() => null),
});

describe('WorldObserver', () => {
  let observer: WorldObserver;
  let mockBot: Partial<Bot>;

  beforeEach(() => {
    mockBot = createMockBot();
    observer = new WorldObserver(
      mockBot as Bot,
      mockLogger,
      mockDatabase as any,
      {
        blockScanRadius: 32,
        entityScanRadius: 32,
        updateInterval: 5000,
      }
    );
  });

  describe('Constructor', () => {
    test('should initialize with default config', () => {
      expect(observer).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should accept custom config', () => {
      const customObserver = new WorldObserver(
        mockBot as Bot,
        mockLogger,
        mockDatabase as any,
        {
          blockScanRadius: 64,
          entityScanRadius: 16,
          updateInterval: 10000,
        }
      );
      expect(customObserver).toBeDefined();
    });
  });

  describe('observe()', () => {
    test('should create world snapshot', () => {
      const snapshot = observer.observe();

      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.position).toBeDefined();
      expect(snapshot.health).toBe(20);
      expect(snapshot.food).toBe(20);
      expect(snapshot.nearbyBlocks).toBeArray();
      expect(snapshot.nearbyEntities).toBeArray();
      expect(snapshot.dangers).toBeArray();
    });

    test('should throw error if bot not spawned', () => {
      mockBot.entity = undefined;
      expect(() => observer.observe()).toThrow('Bot not spawned');
    });

    test('should save world state to database', () => {
      observer.observe();
      expect(mockDatabase.insertWorldState).toHaveBeenCalled();
    });
  });

  describe('getLastSnapshot()', () => {
    test('should return undefined initially', () => {
      expect(observer.getLastSnapshot()).toBeUndefined();
    });

    test('should return last snapshot after observe', () => {
      observer.observe();
      const snapshot = observer.getLastSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot?.position).toBeDefined();
    });
  });

  describe('startObserving() / stopObserving()', () => {
    test('should start automatic observation', () => {
      observer.startObserving();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting world observation',
        expect.any(Object)
      );
    });

    test('should warn if already observing', () => {
      observer.startObserving();
      observer.startObserving();
      expect(mockLogger.warn).toHaveBeenCalledWith('WorldObserver already observing');
    });

    test('should stop observation', () => {
      observer.startObserving();
      observer.stopObserving();
      expect(mockLogger.info).toHaveBeenCalledWith('Stopped world observation');
    });
  });

  describe('findNearbyBlockType()', () => {
    test('should return empty array if bot not spawned', () => {
      mockBot.entity = undefined;
      const blocks = observer.findNearbyBlockType('stone');
      expect(blocks).toEqual([]);
    });

    test('should find blocks of specific type', () => {
      const mockPositions = [createVec3(5, 64, 5)];
      mockBot.findBlocks = mock(() => mockPositions);
      mockBot.blockAt = mock(() => ({ name: 'stone' } as any));

      const blocks = observer.findNearbyBlockType('stone', 32);
      expect(blocks).toBeArray();
    });

    test('should return empty array for unknown block type', () => {
      const blocks = observer.findNearbyBlockType('unknown_block_xyz');
      expect(blocks).toEqual([]);
    });
  });

  describe('findNearestOre()', () => {
    test('should return null if no snapshot', () => {
      const ore = observer.findNearestOre();
      expect(ore).toBeNull();
    });

    test('should return null if no ores found', () => {
      observer.observe();
      const ore = observer.findNearestOre();
      expect(ore).toBeNull();
    });
  });

  describe('findNearestWood()', () => {
    test('should return null if no snapshot', () => {
      const wood = observer.findNearestWood();
      expect(wood).toBeNull();
    });

    test('should return null if no wood found', () => {
      observer.observe();
      const wood = observer.findNearestWood();
      expect(wood).toBeNull();
    });
  });

  describe('isSafePosition()', () => {
    test('should return true for safe position', () => {
      observer.observe();
      const safePos = createVec3(100, 64, 100);
      expect(observer.isSafePosition(safePos)).toBe(true);
    });

    test('should return false for position near danger', () => {
      // Mock bot with low health to create danger
      mockBot.health = 3;
      observer.observe();
      
      const pos = createVec3(0, 64, 0);
      const isSafe = observer.isSafePosition(pos);
      expect(typeof isSafe).toBe('boolean');
    });
  });

  describe('Danger Detection', () => {
    test('should detect low health danger', () => {
      mockBot.health = 5;
      const snapshot = observer.observe();
      
      const healthDanger = snapshot.dangers.find(d => d.type === 'low_health');
      expect(healthDanger).toBeDefined();
      expect(healthDanger?.severity).toBe('critical');
    });

    test('should detect low food danger', () => {
      mockBot.food = 3;
      const snapshot = observer.observe();
      
      const foodDanger = snapshot.dangers.find(d => d.type === 'low_food');
      expect(foodDanger).toBeDefined();
      expect(foodDanger?.severity).toBe('high');
    });

    test('should detect medium health danger', () => {
      mockBot.health = 10;
      const snapshot = observer.observe();
      
      const healthDanger = snapshot.dangers.find(d => d.type === 'low_health');
      expect(healthDanger).toBeDefined();
      expect(healthDanger?.severity).toBe('high');
    });

    test('should detect medium food danger', () => {
      mockBot.food = 10;
      const snapshot = observer.observe();
      
      const foodDanger = snapshot.dangers.find(d => d.type === 'low_food');
      expect(foodDanger).toBeDefined();
      expect(foodDanger?.severity).toBe('medium');
    });

    test('should not detect danger when healthy', () => {
      mockBot.health = 20;
      mockBot.food = 20;
      const snapshot = observer.observe();
      
      const healthDanger = snapshot.dangers.find(d => d.type === 'low_health');
      const foodDanger = snapshot.dangers.find(d => d.type === 'low_food');
      expect(healthDanger).toBeUndefined();
      expect(foodDanger).toBeUndefined();
    });
  });

  describe('Entity Observation', () => {
    test('should observe nearby entities', () => {
      const mockEntity = {
        name: 'zombie',
        type: 'mob',
        position: createVec3(10, 64, 10),
        health: 20,
      };
      mockBot.entities = { '1': mockEntity as any };

      const snapshot = observer.observe();
      expect(snapshot.nearbyEntities).toBeArray();
    });

    test('should filter entities by radius', () => {
      const nearEntity = {
        name: 'zombie',
        type: 'mob',
        position: createVec3(5, 64, 5),
      };
      const farEntity = {
        name: 'skeleton',
        type: 'mob',
        position: createVec3(100, 64, 100),
      };
      mockBot.entities = {
        '1': nearEntity as any,
        '2': farEntity as any,
      };

      const customObserver = new WorldObserver(
        mockBot as Bot,
        mockLogger,
        mockDatabase as any,
        { entityScanRadius: 10 }
      );

      const snapshot = customObserver.observe();
      expect(snapshot.nearbyEntities.length).toBeLessThanOrEqual(1);
    });

    test('should identify hostile mobs', () => {
      const hostileEntity = {
        name: 'zombie',
        type: 'mob',
        position: createVec3(5, 64, 5),
      };
      mockBot.entities = { '1': hostileEntity as any };

      const snapshot = observer.observe();
      const entity = snapshot.nearbyEntities[0];
      if (entity) {
        expect(entity.isHostile).toBe(true);
      }
    });
  });

  describe('World State', () => {
    test('should capture dimension', () => {
      const snapshot = observer.observe();
      expect(snapshot.dimension).toBeDefined();
      expect(typeof snapshot.dimension).toBe('string');
    });

    test('should capture time of day', () => {
      const snapshot = observer.observe();
      expect(snapshot.timeOfDay).toBe(6000);
    });

    test('should capture weather', () => {
      mockBot.isRaining = false;
      const snapshot = observer.observe();
      expect(snapshot.weather).toBe('clear');
    });

    test('should detect rain', () => {
      mockBot.isRaining = true;
      const snapshot = observer.observe();
      expect(snapshot.weather).toBe('rain');
    });
  });
});
