import {
  DEFAULT_CHARACTER_HEIGHT,
  MAX_HEIGHT_DIFFERENCE,
  calculateBaseHeight,
  validateHeightDifference,
  isUnderwaterLevel,
  isMountainPeakLevel,
} from '../../../src/core/level.js';

describe('Level System', () => {
  describe('Constants', () => {
    it('should have correct DEFAULT_CHARACTER_HEIGHT', () => {
      expect(DEFAULT_CHARACTER_HEIGHT).toBe(180);
    });

    it('should have correct MAX_HEIGHT_DIFFERENCE', () => {
      expect(MAX_HEIGHT_DIFFERENCE).toBe(270); // 180 * 1.5
    });
  });

  describe('calculateBaseHeight', () => {
    it('should calculate base height for level 0', () => {
      expect(calculateBaseHeight(0)).toBe(0);
    });

    it('should calculate base height for positive levels', () => {
      expect(calculateBaseHeight(1)).toBe(270);
      expect(calculateBaseHeight(2)).toBe(540);
      expect(calculateBaseHeight(3)).toBe(810);
    });

    it('should calculate base height for negative levels (underwater)', () => {
      expect(calculateBaseHeight(-1)).toBe(-270);
      expect(calculateBaseHeight(-2)).toBe(-540);
      expect(calculateBaseHeight(-3)).toBe(-810);
    });

    it('should use MAX_HEIGHT_DIFFERENCE for calculation', () => {
      const levelId = 5;
      const expected = levelId * MAX_HEIGHT_DIFFERENCE;
      expect(calculateBaseHeight(levelId)).toBe(expected);
    });
  });

  describe('validateHeightDifference', () => {
    it('should return true for adjacent levels (difference = MAX_HEIGHT_DIFFERENCE)', () => {
      expect(validateHeightDifference(0, 1)).toBe(true);
      expect(validateHeightDifference(1, 0)).toBe(true);
      expect(validateHeightDifference(-1, 0)).toBe(true);
      expect(validateHeightDifference(1, 2)).toBe(true);
    });

    it('should return true for same level (difference = 0)', () => {
      expect(validateHeightDifference(0, 0)).toBe(true);
      expect(validateHeightDifference(1, 1)).toBe(true);
    });

    it('should return false for levels with difference > MAX_HEIGHT_DIFFERENCE', () => {
      expect(validateHeightDifference(0, 2)).toBe(false); // 540 > 270
      expect(validateHeightDifference(0, 3)).toBe(false); // 810 > 270
      expect(validateHeightDifference(-2, 1)).toBe(false); // 810 > 270
    });

    it('should handle negative levels correctly', () => {
      expect(validateHeightDifference(-1, 0)).toBe(true); // 270 = 270
      expect(validateHeightDifference(-2, -1)).toBe(true); // 270 = 270
      expect(validateHeightDifference(-2, 0)).toBe(false); // 540 > 270
    });
  });

  describe('isUnderwaterLevel', () => {
    it('should return true for negative level IDs', () => {
      expect(isUnderwaterLevel(-1)).toBe(true);
      expect(isUnderwaterLevel(-2)).toBe(true);
      expect(isUnderwaterLevel(-10)).toBe(true);
    });

    it('should return false for zero or positive level IDs', () => {
      expect(isUnderwaterLevel(0)).toBe(false);
      expect(isUnderwaterLevel(1)).toBe(false);
      expect(isUnderwaterLevel(10)).toBe(false);
    });
  });

  describe('isMountainPeakLevel', () => {
    it('should return true for levels above maxWalkableLevel', () => {
      expect(isMountainPeakLevel(3, 2)).toBe(true);
      expect(isMountainPeakLevel(4, 2)).toBe(true);
      expect(isMountainPeakLevel(5, 2)).toBe(true);
    });

    it('should return false for levels at or below maxWalkableLevel', () => {
      expect(isMountainPeakLevel(0, 2)).toBe(false);
      expect(isMountainPeakLevel(1, 2)).toBe(false);
      expect(isMountainPeakLevel(2, 2)).toBe(false);
    });

    it('should use default maxWalkableLevel of 2', () => {
      expect(isMountainPeakLevel(3)).toBe(true);
      expect(isMountainPeakLevel(2)).toBe(false);
      expect(isMountainPeakLevel(1)).toBe(false);
    });
  });
});

