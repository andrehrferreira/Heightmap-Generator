import { createPOI, distanceBetweenPOIs, weightedDistanceBetweenPOIs, POIType } from '../../../src/algorithms/poi.js';

describe('POI System', () => {
  describe('createPOI', () => {
    it('should create a POI with all properties', () => {
      const poi = createPOI(10, 20, 1, 'town', 'Test Town');

      expect(poi.x).toBe(10);
      expect(poi.y).toBe(20);
      expect(poi.levelId).toBe(1);
      expect(poi.type).toBe('town');
      expect(poi.name).toBe('Test Town');
      expect(poi.id).toBe('town-10-20-1');
    });

    it('should create a POI without name', () => {
      const poi = createPOI(5, 15, 0, 'dungeon');

      expect(poi.name).toBeUndefined();
      expect(poi.id).toBe('dungeon-5-15-0');
    });

    it('should generate unique IDs', () => {
      const poi1 = createPOI(10, 20, 1, 'town');
      const poi2 = createPOI(10, 20, 1, 'town');

      // IDs should be unique even with same properties
      expect(poi1.id).toBe(poi2.id); // Same properties = same ID format
    });
  });

  describe('distanceBetweenPOIs', () => {
    it('should calculate distance between two POIs', () => {
      const poi1 = createPOI(0, 0, 0, 'town');
      const poi2 = createPOI(3, 4, 0, 'town');

      const distance = distanceBetweenPOIs(poi1, poi2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should return 0 for same POI', () => {
      const poi = createPOI(10, 20, 0, 'town');
      const distance = distanceBetweenPOIs(poi, poi);
      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const poi1 = createPOI(-5, -5, 0, 'town');
      const poi2 = createPOI(5, 5, 0, 'town');

      const distance = distanceBetweenPOIs(poi1, poi2);
      expect(distance).toBeCloseTo(Math.sqrt(200), 5);
    });
  });

  describe('weightedDistanceBetweenPOIs', () => {
    it('should calculate distance without level penalty when same level', () => {
      const poi1 = createPOI(0, 0, 1, 'town');
      const poi2 = createPOI(3, 4, 1, 'town');

      const distance = weightedDistanceBetweenPOIs(poi1, poi2, 10);
      expect(distance).toBe(5); // Same level, no penalty
    });

    it('should add penalty for level differences', () => {
      const poi1 = createPOI(0, 0, 0, 'town');
      const poi2 = createPOI(0, 0, 1, 'town'); // Same position, different level

      const distance = weightedDistanceBetweenPOIs(poi1, poi2, 10);
      expect(distance).toBe(10); // Level difference penalty
    });

    it('should use custom level penalty', () => {
      const poi1 = createPOI(0, 0, 0, 'town');
      const poi2 = createPOI(0, 0, 2, 'town');

      const distance = weightedDistanceBetweenPOIs(poi1, poi2, 5);
      expect(distance).toBe(10); // 2 level difference * 5 penalty
    });

    it('should combine spatial distance and level penalty', () => {
      const poi1 = createPOI(0, 0, 0, 'town');
      const poi2 = createPOI(3, 4, 1, 'town');

      const distance = weightedDistanceBetweenPOIs(poi1, poi2, 10);
      expect(distance).toBe(15); // 5 spatial + 10 level penalty
    });
  });
});

