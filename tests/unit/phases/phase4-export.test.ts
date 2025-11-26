import {
  generateHeightmapData,
  generateRoadMask,
  generateLevelMask,
  generateCliffMask,
  generatePlayableMask,
  executePhase4,
  heightmapToRGBA,
  maskToRGBA,
  DEFAULT_EXPORT_CONFIG,
} from '../../../src/phases/phase4-export.js';
import { Grid } from '../../../src/core/grid.js';

describe('Phase 4: Export', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid({ width: 10, height: 10, cellSize: 1 });
  });

  describe('generateHeightmapData', () => {
    it('should generate heightmap data', () => {
      const { data, minHeight, maxHeight } = generateHeightmapData(grid);
      
      expect(data).toBeInstanceOf(Uint16Array);
      expect(data.length).toBe(100);
      expect(typeof minHeight).toBe('number');
      expect(typeof maxHeight).toBe('number');
    });

    it('should normalize heights to 16-bit range', () => {
      grid.setHeight(5, 5, 1000);
      grid.setHeight(0, 0, -1000);

      const { data } = generateHeightmapData(grid);
      
      // All values should be within 16-bit range
      for (let i = 0; i < data.length; i++) {
        expect(data[i]).toBeGreaterThanOrEqual(0);
        expect(data[i]).toBeLessThanOrEqual(65535);
      }
    });
  });

  describe('generateRoadMask', () => {
    it('should generate road mask', () => {
      const mask = generateRoadMask(grid);
      
      expect(mask).toBeInstanceOf(Uint8Array);
      expect(mask.length).toBe(100);
    });

    it('should mark road cells as 255', () => {
      grid.getCell(5, 5).flags.road = true;
      
      const mask = generateRoadMask(grid);
      
      expect(mask[5 * 10 + 5]).toBe(255);
      expect(mask[0]).toBe(0);
    });
  });

  describe('generateLevelMask', () => {
    it('should generate level mask', () => {
      const mask = generateLevelMask(grid);
      
      expect(mask).toBeInstanceOf(Uint8Array);
      expect(mask.length).toBe(100);
    });

    it('should map levels to grayscale', () => {
      grid.setLevelId(5, 5, 2);
      
      const mask = generateLevelMask(grid, 10);
      
      // Level 2 + 1 = 3, normalized to 255 scale: (3/10) * 255 ≈ 76
      expect(mask[5 * 10 + 5]).toBe(Math.round((3 / 10) * 255));
    });
  });

  describe('generateCliffMask', () => {
    it('should generate cliff mask', () => {
      const mask = generateCliffMask(grid);
      
      expect(mask).toBeInstanceOf(Uint8Array);
      expect(mask.length).toBe(100);
    });

    it('should mark cliff cells as 255', () => {
      grid.getCell(5, 5).flags.cliff = true;
      
      const mask = generateCliffMask(grid);
      
      expect(mask[5 * 10 + 5]).toBe(255);
    });
  });

  describe('generatePlayableMask', () => {
    it('should generate playable mask', () => {
      const mask = generatePlayableMask(grid);
      
      expect(mask).toBeInstanceOf(Uint8Array);
      expect(mask.length).toBe(100);
    });

    it('should mark playable cells as 255', () => {
      grid.getCell(5, 5).flags.playable = true;
      
      const mask = generatePlayableMask(grid);
      
      expect(mask[5 * 10 + 5]).toBe(255);
    });
  });

  describe('executePhase4', () => {
    it('should execute complete export', () => {
      const result = executePhase4(grid);
      
      expect(result.heightmap).toBeInstanceOf(Uint16Array);
      expect(result.roadMask).toBeInstanceOf(Uint8Array);
      expect(result.levelMask).toBeInstanceOf(Uint8Array);
      expect(result.cliffMask).toBeInstanceOf(Uint8Array);
      expect(result.playableMask).toBeInstanceOf(Uint8Array);
      expect(result.metadata).toBeDefined();
    });

    it('should include metadata', () => {
      const result = executePhase4(grid);
      
      expect(result.metadata.width).toBe(10);
      expect(result.metadata.height).toBe(10);
      expect(result.metadata.version).toBe('0.1.0');
      expect(result.metadata.timestamp).toBeDefined();
    });

    it('should respect config options', () => {
      const config = {
        ...DEFAULT_EXPORT_CONFIG,
        includeRoadMask: false,
        includeLevelMask: false,
      };
      
      const result = executePhase4(grid, config);
      
      expect(result.roadMask).toBeUndefined();
      expect(result.levelMask).toBeUndefined();
      expect(result.cliffMask).toBeDefined();
      expect(result.playableMask).toBeDefined();
    });
  });

  describe('heightmapToRGBA', () => {
    it('should convert heightmap to RGBA', () => {
      const heightmap = new Uint16Array([0, 255, 65535]);
      const rgba = heightmapToRGBA(heightmap);
      
      expect(rgba).toBeInstanceOf(Uint8Array);
      expect(rgba.length).toBe(12); // 3 pixels * 4 channels
    });

    it('should store 16-bit values in RG channels', () => {
      const heightmap = new Uint16Array([0x1234]);
      const rgba = heightmapToRGBA(heightmap);
      
      expect(rgba[0]).toBe(0x34); // R = low byte
      expect(rgba[1]).toBe(0x12); // G = high byte
      expect(rgba[2]).toBe(0);    // B = 0
      expect(rgba[3]).toBe(255);  // A = 255
    });
  });

  describe('maskToRGBA', () => {
    it('should convert mask to RGBA', () => {
      const mask = new Uint8Array([0, 128, 255]);
      const rgba = maskToRGBA(mask);
      
      expect(rgba).toBeInstanceOf(Uint8Array);
      expect(rgba.length).toBe(12); // 3 pixels * 4 channels
    });

    it('should replicate value to RGB channels', () => {
      const mask = new Uint8Array([128]);
      const rgba = maskToRGBA(mask);
      
      expect(rgba[0]).toBe(128); // R
      expect(rgba[1]).toBe(128); // G
      expect(rgba[2]).toBe(128); // B
      expect(rgba[3]).toBe(255); // A
    });
  });

  describe('DEFAULT_EXPORT_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_EXPORT_CONFIG.heightmapFormat).toBe('png16');
      expect(DEFAULT_EXPORT_CONFIG.maskFormat).toBe('png8');
      expect(DEFAULT_EXPORT_CONFIG.includeRoadMask).toBe(true);
      expect(DEFAULT_EXPORT_CONFIG.includeLevelMask).toBe(true);
      expect(DEFAULT_EXPORT_CONFIG.includeCliffMask).toBe(true);
      expect(DEFAULT_EXPORT_CONFIG.includePlayableMask).toBe(true);
    });
  });
});

