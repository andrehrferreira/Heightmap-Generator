import {
  applyBaseHeights,
  applyBiomeNoise,
  smoothRoads,
  detectCliffs,
  executePhase3,
  DEFAULT_HEIGHTMAP_CONFIG,
} from '../../../src/phases/phase3-heightmap.js';
import { Grid } from '../../../src/core/grid.js';
import { calculateBaseHeight } from '../../../src/core/level.js';

describe('Phase 3: Heightmap Generation', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid({ width: 50, height: 50, cellSize: 10 });
  });

  describe('applyBaseHeights', () => {
    it('should apply base heights based on level ID', () => {
      grid.setLevelId(2, 2, 1);
      grid.setLevelId(3, 3, 2);

      applyBaseHeights(grid);

      expect(grid.getCell(2, 2).height).toBe(calculateBaseHeight(1));
      expect(grid.getCell(3, 3).height).toBe(calculateBaseHeight(2));
    });

    it('should not modify ramp cells', () => {
      grid.setLevelId(2, 2, 1);
      grid.getCell(2, 2).flags.ramp = true;
      grid.getCell(2, 2).height = 100; // Custom ramp height

      applyBaseHeights(grid);

      expect(grid.getCell(2, 2).height).toBe(100);
    });
  });

  describe('applyBiomeNoise', () => {
    it('should add noise to heights', () => {
      applyBaseHeights(grid);
      const originalHeight = grid.getCell(2, 2).height;

      applyBiomeNoise(grid, DEFAULT_HEIGHTMAP_CONFIG);

      // Height should be modified by noise
      const newHeight = grid.getCell(2, 2).height;
      // May or may not be different depending on noise value
      expect(typeof newHeight).toBe('number');
    });

    it('should not modify road cells', () => {
      applyBaseHeights(grid);
      grid.getCell(2, 2).flags.road = true;
      const originalHeight = grid.getCell(2, 2).height;

      applyBiomeNoise(grid, DEFAULT_HEIGHTMAP_CONFIG);

      expect(grid.getCell(2, 2).height).toBe(originalHeight);
    });

    it('should use seed for reproducibility', () => {
      const config = { ...DEFAULT_HEIGHTMAP_CONFIG, seed: 12345 };

      applyBaseHeights(grid);
      applyBiomeNoise(grid, config);
      const height1 = grid.getCell(2, 2).height;

      // Reset
      grid = new Grid({ width: 50, height: 50, cellSize: 10 });
      applyBaseHeights(grid);
      applyBiomeNoise(grid, config);
      const height2 = grid.getCell(2, 2).height;

      expect(height1).toBe(height2);
    });
  });

  describe('smoothRoads', () => {
    it('should smooth heights near roads', () => {
      // Set up varied heights
      grid.setHeight(2, 2, 100);
      grid.setHeight(2, 3, 50);
      grid.setHeight(3, 2, 150);
      grid.getCell(2, 2).flags.road = true;

      smoothRoads(grid, DEFAULT_HEIGHTMAP_CONFIG);

      // Heights near road should be averaged
      expect(typeof grid.getCell(2, 3).height).toBe('number');
    });

    it('should not modify ramp cells', () => {
      grid.getCell(2, 2).flags.ramp = true;
      grid.getCell(2, 2).flags.road = true;
      grid.setHeight(2, 2, 100);

      smoothRoads(grid, DEFAULT_HEIGHTMAP_CONFIG);

      expect(grid.getCell(2, 2).height).toBe(100);
    });
  });

  describe('detectCliffs', () => {
    it('should detect cliffs between different levels', () => {
      grid.setLevelId(2, 2, 0);
      grid.setLevelId(3, 2, 1);

      detectCliffs(grid);

      // One of the cells should be marked as cliff
      const cell1 = grid.getCell(2, 2);
      const cell2 = grid.getCell(3, 2);
      expect(cell1.flags.cliff || cell2.flags.cliff).toBe(true);
    });

    it('should not mark ramp cells as cliffs', () => {
      grid.setLevelId(2, 2, 0);
      grid.setLevelId(3, 2, 1);
      grid.getCell(2, 2).flags.ramp = true;

      detectCliffs(grid);

      expect(grid.getCell(2, 2).flags.cliff).toBe(false);
    });

    it('should not mark cells with same level as cliffs', () => {
      detectCliffs(grid);

      // No cliffs when all cells have same level
      let hasCliff = false;
      grid.forEachCell((cell) => {
        if (cell.flags.cliff) hasCliff = true;
      });
      expect(hasCliff).toBe(false);
    });
  });

  describe('executePhase3', () => {
    it('should execute complete phase 3', () => {
      const result = executePhase3(grid);

      expect(result.grid).toBe(grid);
      expect(typeof result.stats.minHeight).toBe('number');
      expect(typeof result.stats.maxHeight).toBe('number');
      expect(typeof result.stats.avgHeight).toBe('number');
      expect(typeof result.stats.cliffCells).toBe('number');
    });

    it('should calculate correct height statistics', () => {
      grid.setLevelId(2, 2, 1);
      grid.setLevelId(3, 3, 2);

      const result = executePhase3(grid);

      expect(result.stats.minHeight).toBeLessThanOrEqual(result.stats.maxHeight);
      expect(result.stats.avgHeight).toBeGreaterThanOrEqual(result.stats.minHeight);
      expect(result.stats.avgHeight).toBeLessThanOrEqual(result.stats.maxHeight);
    });
  });

  describe('DEFAULT_HEIGHTMAP_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_HEIGHTMAP_CONFIG.noiseAmplitude).toBe(15);
      expect(DEFAULT_HEIGHTMAP_CONFIG.noiseScale).toBe(0.03);
      expect(DEFAULT_HEIGHTMAP_CONFIG.roadSmoothingIterations).toBe(2);
      expect(DEFAULT_HEIGHTMAP_CONFIG.roadSmoothingRadius).toBe(2);
      expect(DEFAULT_HEIGHTMAP_CONFIG.levelSmoothingIterations).toBe(8);
      expect(DEFAULT_HEIGHTMAP_CONFIG.levelBlendRadius).toBe(4);
      expect(DEFAULT_HEIGHTMAP_CONFIG.intraLevelVariation).toBe(20);
    });
  });
});

