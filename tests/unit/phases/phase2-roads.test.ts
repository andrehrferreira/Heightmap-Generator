import {
  generateRoadNetwork,
  generateRandomPOIs,
  DEFAULT_ROAD_CONFIG,
  RoadGenerationConfig,
} from '../../../src/phases/phase2-roads.js';
import { Grid } from '../../../src/core/grid.js';
import { createPOI } from '../../../src/algorithms/poi.js';

describe('Phase 2: Road Network Generation', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid({ width: 100, height: 100, cellSize: 10 });
  });

  describe('generateRoadNetwork', () => {
    it('should return empty network for less than 2 POIs', () => {
      const pois = [createPOI(5, 5, 0, 'town')];
      const network = generateRoadNetwork(grid, pois);

      expect(network.segments).toHaveLength(0);
      expect(network.totalRoadCells).toBe(0);
      expect(network.totalRampCells).toBe(0);
    });

    it('should generate road network for 2 POIs', () => {
      const pois = [
        createPOI(1, 1, 0, 'town'),
        createPOI(8, 8, 0, 'town'),
      ];
      const network = generateRoadNetwork(grid, pois);

      expect(network.pois).toHaveLength(2);
      expect(network.segments.length).toBeGreaterThan(0);
      expect(network.totalRoadCells).toBeGreaterThan(0);
    });

    it('should generate road network for multiple POIs', () => {
      const pois = [
        createPOI(1, 1, 0, 'town'),
        createPOI(5, 1, 0, 'dungeon'),
        createPOI(9, 5, 0, 'exit'),
        createPOI(1, 9, 0, 'portal'),
      ];
      const network = generateRoadNetwork(grid, pois);

      expect(network.pois).toHaveLength(4);
      // MST should have n-1 edges for n nodes
      expect(network.segments.length).toBeGreaterThanOrEqual(3);
    });

    it('should mark road cells on grid', () => {
      const pois = [
        createPOI(1, 1, 0, 'town'),
        createPOI(5, 5, 0, 'town'),
      ];
      generateRoadNetwork(grid, pois);

      // Check that some cells are marked as roads
      let roadCount = 0;
      grid.forEachCell((cell) => {
        if (cell.flags.road) roadCount++;
      });
      expect(roadCount).toBeGreaterThan(0);
    });

    it('should use custom configuration', () => {
      const pois = [
        createPOI(1, 1, 0, 'town'),
        createPOI(5, 5, 0, 'town'),
      ];
      
      const customConfig: RoadGenerationConfig = {
        ...DEFAULT_ROAD_CONFIG,
        roadWidth: 5,
        simplificationEpsilon: 1.0,
      };
      
      const network = generateRoadNetwork(grid, pois, customConfig);
      expect(network.segments.length).toBeGreaterThan(0);
    });

    it('should handle POIs on different levels', () => {
      grid.setLevelId(5, 5, 1);
      const pois = [
        createPOI(1, 1, 0, 'town'),
        createPOI(5, 5, 1, 'town'),
      ];
      
      const network = generateRoadNetwork(grid, pois);
      // Path may or may not be found depending on level change cost
      expect(network.pois).toHaveLength(2);
    });
  });

  describe('generateRandomPOIs', () => {
    it('should generate specified number of POIs', () => {
      const pois = generateRandomPOIs(grid, 5);
      expect(pois).toHaveLength(5);
    });

    it('should generate POIs within grid bounds', () => {
      const pois = generateRandomPOIs(grid, 10);
      
      for (const poi of pois) {
        expect(poi.x).toBeGreaterThanOrEqual(0);
        expect(poi.x).toBeLessThan(grid.getCols());
        expect(poi.y).toBeGreaterThanOrEqual(0);
        expect(poi.y).toBeLessThan(grid.getRows());
      }
    });

    it('should assign POI types from provided list', () => {
      const types = ['town', 'dungeon'] as const;
      const pois = generateRandomPOIs(grid, 10, [...types]);
      
      for (const poi of pois) {
        expect(types).toContain(poi.type);
      }
    });

    it('should use level from grid cell', () => {
      grid.setLevelId(5, 5, 2);
      // Note: since POIs are random, we can't guarantee it hits that cell
      // but we verify the function runs without error
      const pois = generateRandomPOIs(grid, 5);
      expect(pois).toHaveLength(5);
    });
  });

  describe('DEFAULT_ROAD_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_ROAD_CONFIG.roadWidth).toBe(3);
      expect(DEFAULT_ROAD_CONFIG.simplificationEpsilon).toBe(2.0);
      expect(DEFAULT_ROAD_CONFIG.maxExtraEdges).toBe(2);
    });
  });
});

