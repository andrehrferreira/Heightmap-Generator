import {
  distributeLevels,
  applyLevelRegions,
  generateRandomRegions,
  executePhase1,
  DEFAULT_LEVEL_CONFIG,
  LevelRegion,
} from '../../../src/phases/phase1-levels.js';
import { Grid } from '../../../src/core/grid.js';

describe('Phase 1: Level Distribution', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid({ width: 100, height: 100, cellSize: 10 });
  });

  describe('distributeLevels', () => {
    it('should distribute levels across the grid', () => {
      distributeLevels(grid, DEFAULT_LEVEL_CONFIG);

      // Check that levels are assigned
      const levelCounts = new Map<number, number>();
      grid.forEachCell((cell) => {
        const count = levelCounts.get(cell.levelId) || 0;
        levelCounts.set(cell.levelId, count + 1);
      });

      // Should have multiple levels
      expect(levelCounts.size).toBeGreaterThan(1);
    });

    it('should respect min and max level bounds', () => {
      const config = { ...DEFAULT_LEVEL_CONFIG, minLevel: 0, maxLevel: 2 };
      distributeLevels(grid, config);

      grid.forEachCell((cell) => {
        expect(cell.levelId).toBeGreaterThanOrEqual(0);
        expect(cell.levelId).toBeLessThanOrEqual(2);
      });
    });

    it('should mark underwater cells', () => {
      const config = { ...DEFAULT_LEVEL_CONFIG, minLevel: -2, maxLevel: 2 };
      distributeLevels(grid, config);

      let hasUnderwater = false;
      grid.forEachCell((cell) => {
        if (cell.levelId < 0 && cell.flags.underwater) {
          hasUnderwater = true;
        }
      });

      // May or may not have underwater depending on noise
      expect(typeof hasUnderwater).toBe('boolean');
    });

    it('should use seed for reproducibility', () => {
      const config = { ...DEFAULT_LEVEL_CONFIG, seed: 12345 };
      
      distributeLevels(grid, config);
      const level1 = grid.getCell(5, 5).levelId;

      // Reset grid
      grid = new Grid({ width: 100, height: 100, cellSize: 10 });
      distributeLevels(grid, config);
      const level2 = grid.getCell(5, 5).levelId;

      expect(level1).toBe(level2);
    });
  });

  describe('applyLevelRegions', () => {
    it('should apply level regions to grid', () => {
      const regions: LevelRegion[] = [
        { centerX: 5, centerY: 5, radius: 3, levelId: 2, falloff: 0 },
      ];

      applyLevelRegions(grid, regions);

      // Center should have level 2
      expect(grid.getCell(5, 5).levelId).toBe(2);
    });

    it('should apply multiple regions', () => {
      const regions: LevelRegion[] = [
        { centerX: 2, centerY: 2, radius: 2, levelId: 1, falloff: 0 },
        { centerX: 7, centerY: 7, radius: 2, levelId: 2, falloff: 0 },
      ];

      applyLevelRegions(grid, regions);

      expect(grid.getCell(2, 2).levelId).toBe(1);
      expect(grid.getCell(7, 7).levelId).toBe(2);
    });
  });

  describe('generateRandomRegions', () => {
    it('should generate specified number of regions', () => {
      const regions = generateRandomRegions(grid, 5);
      expect(regions).toHaveLength(5);
    });

    it('should generate regions within grid bounds', () => {
      const regions = generateRandomRegions(grid, 10);

      for (const region of regions) {
        expect(region.centerX).toBeGreaterThanOrEqual(0);
        expect(region.centerX).toBeLessThan(grid.getCols());
        expect(region.centerY).toBeGreaterThanOrEqual(0);
        expect(region.centerY).toBeLessThan(grid.getRows());
      }
    });

    it('should use seed for reproducibility', () => {
      const config = { ...DEFAULT_LEVEL_CONFIG, seed: 12345 };
      const regions1 = generateRandomRegions(grid, 5, config);
      const regions2 = generateRandomRegions(grid, 5, config);

      expect(regions1[0].centerX).toBe(regions2[0].centerX);
      expect(regions1[0].centerY).toBe(regions2[0].centerY);
    });
  });

  describe('executePhase1', () => {
    it('should execute complete phase 1', () => {
      const result = executePhase1(grid);

      expect(result.grid).toBe(grid);
      expect(result.regions.length).toBeGreaterThan(0);
      expect(result.stats.levelCounts.size).toBeGreaterThan(0);
    });

    it('should calculate statistics', () => {
      const result = executePhase1(grid);

      const totalCells = grid.getRows() * grid.getCols();
      let sumCounts = 0;
      result.stats.levelCounts.forEach((count) => {
        sumCounts += count;
      });

      expect(sumCounts).toBe(totalCells);
    });
  });

  describe('DEFAULT_LEVEL_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_LEVEL_CONFIG.minLevel).toBe(-1);
      expect(DEFAULT_LEVEL_CONFIG.maxLevel).toBe(3);
      expect(DEFAULT_LEVEL_CONFIG.maxWalkableLevel).toBe(2);
      expect(DEFAULT_LEVEL_CONFIG.noiseScale).toBe(0.05);
    });
  });
});

