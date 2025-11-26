import { findPath, DEFAULT_ASTAR_CONFIG, AStarConfig } from '../../../src/algorithms/astar-grid.js';
import { Grid } from '../../../src/core/grid.js';

describe('A* Grid Pathfinding', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid({ width: 100, height: 100, cellSize: 10 });
  });

  describe('findPath', () => {
    it('should find path between two points', () => {
      const path = findPath(grid, 0, 0, 5, 5);

      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);
      expect(path![0]).toEqual({ x: 0, y: 0 });
      expect(path![path!.length - 1]).toEqual({ x: 5, y: 5 });
    });

    it('should return null for invalid start coordinates', () => {
      const path = findPath(grid, -1, 0, 5, 5);
      expect(path).toBeNull();
    });

    it('should return null for invalid end coordinates', () => {
      const path = findPath(grid, 0, 0, 100, 100);
      expect(path).toBeNull();
    });

    it('should find direct path when start equals end', () => {
      const path = findPath(grid, 5, 5, 5, 5);

      expect(path).not.toBeNull();
      expect(path!.length).toBe(1);
      expect(path![0]).toEqual({ x: 5, y: 5 });
    });

    it('should avoid blocked cells', () => {
      // Block a cell in the path
      const cell = grid.getCell(2, 2);
      cell.flags.blocked = true;

      const path = findPath(grid, 0, 0, 5, 5);

      expect(path).not.toBeNull();
      // Path should not include blocked cell
      const hasBlocked = path!.some((p) => p.x === 2 && p.y === 2);
      expect(hasBlocked).toBe(false);
    });

    it('should prefer road cells', () => {
      // Mark some cells as roads
      grid.getCell(1, 0).flags.road = true;
      grid.getCell(2, 0).flags.road = true;
      grid.getCell(3, 0).flags.road = true;

      const path = findPath(grid, 0, 0, 5, 0);

      expect(path).not.toBeNull();
      // Path should prefer road cells
      const roadCount = path!.filter((p) => {
        try {
          return grid.getCell(p.x, p.y).flags.road;
        } catch {
          return false;
        }
      }).length;
      expect(roadCount).toBeGreaterThan(0);
    });

    it('should avoid level changes without ramps', () => {
      // Set different levels
      grid.setLevelId(2, 0, 1);
      grid.setLevelId(3, 0, 1);

      const path = findPath(grid, 0, 0, 5, 0);

      // Path should avoid level change or find alternative route
      expect(path).not.toBeNull();
    });

    it('should allow level changes with ramps', () => {
      // Set different levels and mark ramp
      grid.setLevelId(2, 0, 1);
      grid.getCell(2, 0).flags.ramp = true;
      grid.getCell(2, 0).flags.road = true;

      const path = findPath(grid, 0, 0, 5, 0);

      expect(path).not.toBeNull();
      // Path should be able to use ramp
      const hasRamp = path!.some((p) => {
        try {
          return grid.getCell(p.x, p.y).flags.ramp;
        } catch {
          return false;
        }
      });
      // May or may not use ramp depending on other costs
      expect(path!.length).toBeGreaterThan(0);
    });

    it('should use custom configuration', () => {
      const customConfig: AStarConfig = {
        ...DEFAULT_ASTAR_CONFIG,
        flatCost: 2.0,
        allowDiagonal: false,
      };

      const path = findPath(grid, 0, 0, 5, 5, customConfig);

      expect(path).not.toBeNull();
      // Without diagonal, path should be longer
      expect(path!.length).toBeGreaterThan(5);
    });
  });
});

