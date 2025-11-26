import { simplifyPath, simplifyPathWithLevels, Point, PointWithLevel } from '../../../src/algorithms/douglas-peucker.js';

describe('Douglas-Peucker Algorithm', () => {
  describe('simplifyPath', () => {
    it('should return original path if length <= 2', () => {
      const path: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      const simplified = simplifyPath(path);

      expect(simplified).toHaveLength(2);
      expect(simplified[0]).toEqual({ x: 0, y: 0 });
      expect(simplified[1]).toEqual({ x: 1, y: 1 });
    });

    it('should always keep first and last points', () => {
      const path: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0.1 },
        { x: 2, y: 0 },
        { x: 3, y: 0.1 },
        { x: 4, y: 0 },
      ];

      const simplified = simplifyPath(path, 0.5);

      expect(simplified[0]).toEqual({ x: 0, y: 0 });
      expect(simplified[simplified.length - 1]).toEqual({ x: 4, y: 0 });
    });

    it('should simplify path based on epsilon', () => {
      const path: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0.1 },
        { x: 2, y: 0 },
        { x: 3, y: 0.1 },
        { x: 4, y: 0 },
      ];

      const simplified = simplifyPath(path, 0.2);
      // With epsilon 0.2, points at y=0.1 should be removed
      expect(simplified.length).toBeLessThan(path.length);
    });

    it('should keep points that are far from line', () => {
      const path: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 5 }, // Far from line
        { x: 3, y: 0 },
        { x: 4, y: 0 },
      ];

      const simplified = simplifyPath(path, 1.0);
      // Should keep the point at (2, 5) because it's far from the line
      const hasPointAt2 = simplified.some((p) => p.x === 2 && p.y === 5);
      expect(hasPointAt2).toBe(true);
    });

    it('should handle empty path', () => {
      const simplified = simplifyPath([]);
      expect(simplified).toHaveLength(0);
    });

    it('should handle single point', () => {
      const path: Point[] = [{ x: 0, y: 0 }];
      const simplified = simplifyPath(path);
      expect(simplified).toHaveLength(1);
    });
  });

  describe('simplifyPathWithLevels', () => {
    it('should preserve level change points', () => {
      const path: PointWithLevel[] = [
        { x: 0, y: 0, levelId: 0 },
        { x: 1, y: 0, levelId: 0 },
        { x: 2, y: 0, levelId: 1 }, // Level change
        { x: 3, y: 0, levelId: 1 },
        { x: 4, y: 0, levelId: 1 },
      ];

      const simplified = simplifyPathWithLevels(path, 0.1);

      // Should keep the level change point
      const hasLevelChange = simplified.some((p) => p.x === 2 && p.levelId === 1);
      expect(hasLevelChange).toBe(true);
    });

    it('should simplify while preserving level transitions', () => {
      const path: PointWithLevel[] = [
        { x: 0, y: 0, levelId: 0 },
        { x: 1, y: 0.05, levelId: 0 },
        { x: 2, y: 0.05, levelId: 0 },
        { x: 3, y: 0, levelId: 1 }, // Level change
        { x: 4, y: 0.05, levelId: 1 },
        { x: 5, y: 0, levelId: 1 },
      ];

      const simplified = simplifyPathWithLevels(path, 0.2);

      // Should keep first, last, and level change point
      expect(simplified[0].x).toBe(0);
      expect(simplified[simplified.length - 1].x).toBe(5);
      const hasLevelChange = simplified.some((p) => p.x === 3 && p.levelId === 1);
      expect(hasLevelChange).toBe(true);
    });

    it('should work without level information', () => {
      const path: PointWithLevel[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0.1 },
        { x: 2, y: 0 },
      ];

      const simplified = simplifyPathWithLevels(path, 0.2);
      expect(simplified.length).toBeGreaterThanOrEqual(2);
    });
  });
});

