import { createCell, createCellFlags } from '../../../src/core/cell.js';

describe('Cell and CellFlags', () => {
  describe('createCellFlags', () => {
    it('should create CellFlags with all flags set to false', () => {
      const flags = createCellFlags();

      expect(flags.road).toBe(false);
      expect(flags.ramp).toBe(false);
      expect(flags.water).toBe(false);
      expect(flags.underwater).toBe(false);
      expect(flags.blocked).toBe(false);
      expect(flags.cliff).toBe(false);
      expect(flags.playable).toBe(false);
      expect(flags.visualOnly).toBe(false);
      expect(flags.boundary).toBe(false);
      expect(flags.boundaryType).toBeUndefined();
    });

    it('should allow setting individual flags', () => {
      const flags = createCellFlags();
      flags.road = true;
      flags.water = true;

      expect(flags.road).toBe(true);
      expect(flags.water).toBe(true);
      expect(flags.ramp).toBe(false);
    });
  });

  describe('createCell', () => {
    it('should create a cell with default values', () => {
      const cell = createCell();

      expect(cell.levelId).toBe(0);
      expect(cell.height).toBe(0);
      expect(cell.flags).toBeDefined();
      expect(cell.roadId).toBeUndefined();
    });

    it('should create a cell with specified levelId and height', () => {
      const cell = createCell(1, 270);

      expect(cell.levelId).toBe(1);
      expect(cell.height).toBe(270);
      expect(cell.flags).toBeDefined();
    });

    it('should create a cell with flags initialized', () => {
      const cell = createCell();

      expect(cell.flags.road).toBe(false);
      expect(cell.flags.water).toBe(false);
    });
  });

  describe('Cell interface', () => {
    it('should allow setting roadId', () => {
      const cell = createCell();
      cell.roadId = 42;

      expect(cell.roadId).toBe(42);
    });

    it('should allow modifying flags', () => {
      const cell = createCell();
      cell.flags.road = true;
      cell.flags.water = true;
      cell.flags.boundary = true;
      cell.flags.boundaryType = 'edge';

      expect(cell.flags.road).toBe(true);
      expect(cell.flags.water).toBe(true);
      expect(cell.flags.boundary).toBe(true);
      expect(cell.flags.boundaryType).toBe('edge');
    });
  });
});

