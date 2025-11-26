import { Grid, GridConfig } from '../../../src/core/grid.js';
import { calculateBaseHeight } from '../../../src/core/level.js';

describe('Grid', () => {
  const createTestConfig = (): GridConfig => ({
    width: 100,
    height: 100,
    cellSize: 10,
  });

  describe('Constructor', () => {
    it('should create a grid with correct dimensions', () => {
      const config = createTestConfig();
      const grid = new Grid(config);

      expect(grid.getRows()).toBe(10); // 100 / 10
      expect(grid.getCols()).toBe(10); // 100 / 10
    });

    it('should initialize all cells with default values', () => {
      const config = createTestConfig();
      const grid = new Grid(config);

      for (let y = 0; y < grid.getRows(); y++) {
        for (let x = 0; x < grid.getCols(); x++) {
          const cell = grid.getCell(x, y);
          expect(cell.levelId).toBe(0);
          expect(cell.height).toBe(calculateBaseHeight(0));
          expect(cell.flags).toBeDefined();
        }
      }
    });

    it('should throw error for invalid width', () => {
      const config: GridConfig = { width: -1, height: 100, cellSize: 10 };
      expect(() => new Grid(config)).toThrow('Invalid grid dimensions');
    });

    it('should throw error for invalid height', () => {
      const config: GridConfig = { width: 100, height: -1, cellSize: 10 };
      expect(() => new Grid(config)).toThrow('Invalid grid dimensions');
    });

    it('should throw error for invalid cellSize', () => {
      const config: GridConfig = { width: 100, height: 100, cellSize: 0 };
      expect(() => new Grid(config)).toThrow('Invalid grid dimensions');
    });

    it('should throw error if resulting grid size is zero', () => {
      const config: GridConfig = { width: 5, height: 5, cellSize: 10 };
      expect(() => new Grid(config)).toThrow('Invalid grid dimensions');
    });
  });

  describe('getCell', () => {
    it('should return cell at valid coordinates', () => {
      const grid = new Grid(createTestConfig());
      const cell = grid.getCell(0, 0);

      expect(cell).toBeDefined();
      expect(cell.levelId).toBe(0);
    });

    it('should throw error for out of bounds x', () => {
      const grid = new Grid(createTestConfig());
      expect(() => grid.getCell(10, 0)).toThrow('Coordinates out of bounds');
      expect(() => grid.getCell(-1, 0)).toThrow('Coordinates out of bounds');
    });

    it('should throw error for out of bounds y', () => {
      const grid = new Grid(createTestConfig());
      expect(() => grid.getCell(0, 10)).toThrow('Coordinates out of bounds');
      expect(() => grid.getCell(0, -1)).toThrow('Coordinates out of bounds');
    });
  });

  describe('setCell', () => {
    it('should set cell at valid coordinates', () => {
      const grid = new Grid(createTestConfig());
      const newCell = {
        levelId: 1,
        height: 270,
        flags: grid.getCell(0, 0).flags,
      };

      grid.setCell(0, 0, newCell);
      const cell = grid.getCell(0, 0);

      expect(cell.levelId).toBe(1);
      expect(cell.height).toBe(270);
    });

    it('should throw error for out of bounds coordinates', () => {
      const grid = new Grid(createTestConfig());
      const cell = grid.getCell(0, 0);

      expect(() => grid.setCell(10, 0, cell)).toThrow('Coordinates out of bounds');
    });
  });

  describe('setHeight', () => {
    it('should update cell height', () => {
      const grid = new Grid(createTestConfig());
      grid.setHeight(0, 0, 500);

      const cell = grid.getCell(0, 0);
      expect(cell.height).toBe(500);
    });

    it('should update height data array', () => {
      const grid = new Grid(createTestConfig());
      grid.setHeight(0, 0, 500);

      const heightData = grid.getHeightData();
      expect(heightData[0]).toBe(500);
    });
  });

  describe('setLevelId', () => {
    it('should update cell levelId and recalculate height', () => {
      const grid = new Grid(createTestConfig());
      grid.setLevelId(0, 0, 1);

      const cell = grid.getCell(0, 0);
      expect(cell.levelId).toBe(1);
      expect(cell.height).toBe(calculateBaseHeight(1));
    });

    it('should update level data array', () => {
      const grid = new Grid(createTestConfig());
      grid.setLevelId(0, 0, 2);

      const levelData = grid.getLevelData();
      expect(levelData[0]).toBe(2);
    });

    it('should handle negative levelIds (underwater)', () => {
      const grid = new Grid(createTestConfig());
      grid.setLevelId(0, 0, -1);

      const cell = grid.getCell(0, 0);
      expect(cell.levelId).toBe(-1);
      expect(cell.height).toBe(calculateBaseHeight(-1));
    });
  });

  describe('getFlags', () => {
    it('should return cell flags', () => {
      const grid = new Grid(createTestConfig());
      const flags = grid.getFlags(0, 0);

      expect(flags).toBeDefined();
      expect(flags.road).toBe(false);
    });

    it('should allow modifying flags', () => {
      const grid = new Grid(createTestConfig());
      const flags = grid.getFlags(0, 0);
      flags.road = true;

      const updatedFlags = grid.getFlags(0, 0);
      expect(updatedFlags.road).toBe(true);
    });
  });

  describe('forEachCell', () => {
    it('should iterate over all cells', () => {
      const grid = new Grid(createTestConfig());
      let count = 0;

      grid.forEachCell(() => {
        count++;
      });

      expect(count).toBe(100); // 10 * 10
    });

    it('should call callback with correct parameters', () => {
      const grid = new Grid(createTestConfig());
      const visited: Array<[number, number]> = [];

      grid.forEachCell((cell, x, y) => {
        visited.push([x, y]);
        expect(cell).toBeDefined();
      });

      expect(visited.length).toBe(100);
      expect(visited[0]).toEqual([0, 0]);
      expect(visited[99]).toEqual([9, 9]);
    });
  });

  describe('getHeightData and getLevelData', () => {
    it('should return typed arrays', () => {
      const grid = new Grid(createTestConfig());

      const heightData = grid.getHeightData();
      const levelData = grid.getLevelData();

      expect(heightData).toBeInstanceOf(Float32Array);
      expect(levelData).toBeInstanceOf(Int16Array);
      expect(heightData.length).toBe(100);
      expect(levelData.length).toBe(100);
    });

    it('should have correct initial values', () => {
      const grid = new Grid(createTestConfig());

      const heightData = grid.getHeightData();
      const levelData = grid.getLevelData();

      expect(heightData[0]).toBe(calculateBaseHeight(0));
      expect(levelData[0]).toBe(0);
    });
  });
});

