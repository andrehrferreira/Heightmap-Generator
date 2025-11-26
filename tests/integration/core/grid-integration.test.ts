import { Grid, GridConfig } from '../../../src/core/grid.js';
import { calculateBaseHeight, isUnderwaterLevel, isMountainPeakLevel } from '../../../src/core/level.js';

describe('Grid Integration Tests', () => {
  const createTestConfig = (): GridConfig => ({
    width: 200,
    height: 200,
    cellSize: 10,
  });

  describe('Underwater Level Support', () => {
    it('should handle underwater levels correctly', () => {
      const grid = new Grid(createTestConfig());

      // Set underwater level
      grid.setLevelId(5, 5, -1);
      const cell = grid.getCell(5, 5);

      expect(cell.levelId).toBe(-1);
      expect(cell.height).toBe(calculateBaseHeight(-1));
      expect(isUnderwaterLevel(cell.levelId)).toBe(true);
      expect(cell.flags.underwater).toBe(false); // Flag not auto-set, needs manual setting
    });

    it('should support multiple underwater levels', () => {
      const grid = new Grid(createTestConfig());

      grid.setLevelId(0, 0, -1);
      grid.setLevelId(1, 1, -2);
      grid.setLevelId(2, 2, -3);

      expect(grid.getCell(0, 0).levelId).toBe(-1);
      expect(grid.getCell(1, 1).levelId).toBe(-2);
      expect(grid.getCell(2, 2).levelId).toBe(-3);

      expect(isUnderwaterLevel(grid.getCell(0, 0).levelId)).toBe(true);
      expect(isUnderwaterLevel(grid.getCell(1, 1).levelId)).toBe(true);
      expect(isUnderwaterLevel(grid.getCell(2, 2).levelId)).toBe(true);
    });
  });

  describe('Mountain Peak Level Support', () => {
    it('should handle mountain peak levels correctly', () => {
      const grid = new Grid(createTestConfig());
      const maxWalkableLevel = 2;

      // Set mountain peak level
      grid.setLevelId(5, 5, 3);
      const cell = grid.getCell(5, 5);

      expect(cell.levelId).toBe(3);
      expect(cell.height).toBe(calculateBaseHeight(3));
      expect(isMountainPeakLevel(cell.levelId, maxWalkableLevel)).toBe(true);
      expect(cell.flags.visualOnly).toBe(false); // Flag not auto-set, needs manual setting
    });

    it('should support multiple mountain peak levels', () => {
      const grid = new Grid(createTestConfig());
      const maxWalkableLevel = 2;

      grid.setLevelId(0, 0, 3);
      grid.setLevelId(1, 1, 4);
      grid.setLevelId(2, 2, 5);

      expect(isMountainPeakLevel(grid.getCell(0, 0).levelId, maxWalkableLevel)).toBe(true);
      expect(isMountainPeakLevel(grid.getCell(1, 1).levelId, maxWalkableLevel)).toBe(true);
      expect(isMountainPeakLevel(grid.getCell(2, 2).levelId, maxWalkableLevel)).toBe(true);
    });
  });

  describe('Grid Operations Integration', () => {
    it('should maintain consistency between typed arrays and cell objects', () => {
      const grid = new Grid(createTestConfig());

      // Modify via setLevelId
      grid.setLevelId(5, 5, 2);
      const cell = grid.getCell(5, 5);
      const heightData = grid.getHeightData();
      const levelData = grid.getLevelData();
      const index = 5 * grid.getCols() + 5;

      expect(cell.levelId).toBe(2);
      expect(cell.height).toBe(calculateBaseHeight(2));
      expect(levelData[index]).toBe(2);
      expect(heightData[index]).toBe(calculateBaseHeight(2));
    });

    it('should maintain consistency when modifying height directly', () => {
      const grid = new Grid(createTestConfig());

      grid.setHeight(5, 5, 500);
      const cell = grid.getCell(5, 5);
      const heightData = grid.getHeightData();
      const index = 5 * grid.getCols() + 5;

      expect(cell.height).toBe(500);
      expect(heightData[index]).toBe(500);
    });

    it('should handle forEachCell correctly with all operations', () => {
      const grid = new Grid(createTestConfig());
      let modifiedCount = 0;

      grid.forEachCell((_cell, x, y) => {
        if (x % 2 === 0 && y % 2 === 0) {
          grid.setLevelId(x, y, 1);
          modifiedCount++;
        }
      });

      expect(modifiedCount).toBeGreaterThan(0);

      let verifiedCount = 0;
      grid.forEachCell((cell, x, y) => {
        if (x % 2 === 0 && y % 2 === 0) {
          expect(cell.levelId).toBe(1);
          verifiedCount++;
        }
      });

      expect(verifiedCount).toBe(modifiedCount);
    });
  });

  describe('Large Grid Performance', () => {
    it('should handle large grids efficiently', () => {
      const largeConfig: GridConfig = {
        width: 1024,
        height: 1024,
        cellSize: 1,
      };

      const startTime = Date.now();
      const grid = new Grid(largeConfig);
      const initTime = Date.now() - startTime;

      expect(grid.getRows()).toBe(1024);
      expect(grid.getCols()).toBe(1024);
      expect(initTime).toBeLessThan(5000); // Should initialize in less than 5 seconds

      // Test iteration performance
      const iterateStart = Date.now();
      let count = 0;
      grid.forEachCell(() => {
        count++;
      });
      const iterateTime = Date.now() - iterateStart;

      expect(count).toBe(1024 * 1024);
      expect(iterateTime).toBeLessThan(1000); // Should iterate in less than 1 second
    });
  });
});

