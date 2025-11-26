import {
  SlopeCurve,
  SlopeConfig,
  DEFAULT_SLOPE_CONFIG,
  calculateSlopeFactor,
  calculateProgressiveSlope,
  calculateMinRampLength,
  interpolateRampHeight,
  validateRampTransition,
  getSlopeAngleAt,
  isWalkableSlope,
} from '../../../src/core/slope.js';
import { MAX_HEIGHT_DIFFERENCE } from '../../../src/core/level.js';

describe('Slope System', () => {
  describe('SlopeCurve enum', () => {
    it('should have all curve types defined', () => {
      expect(SlopeCurve.LINEAR).toBe('linear');
      expect(SlopeCurve.EASE_IN).toBe('ease-in');
      expect(SlopeCurve.EASE_OUT).toBe('ease-out');
      expect(SlopeCurve.EASE_IN_OUT).toBe('ease-in-out');
      expect(SlopeCurve.EXPONENTIAL).toBe('exponential');
    });
  });

  describe('DEFAULT_SLOPE_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SLOPE_CONFIG.startAngle).toBe(20);
      expect(DEFAULT_SLOPE_CONFIG.endAngle).toBe(87);
      expect(DEFAULT_SLOPE_CONFIG.transitionLength).toBe(30);
      expect(DEFAULT_SLOPE_CONFIG.curveType).toBe(SlopeCurve.EASE_IN);
    });
  });

  describe('calculateSlopeFactor', () => {
    it('should return 0.0 for 0° angle', () => {
      expect(calculateSlopeFactor(0, SlopeCurve.LINEAR)).toBe(0);
    });

    it('should return 1.0 for 90° angle', () => {
      expect(calculateSlopeFactor(90, SlopeCurve.LINEAR)).toBe(1);
    });

    it('should return 0.5 for 45° angle with LINEAR', () => {
      const factor = calculateSlopeFactor(45, SlopeCurve.LINEAR);
      expect(factor).toBeCloseTo(0.5, 5);
    });

    it('should handle EASE_IN curve correctly', () => {
      const factor = calculateSlopeFactor(45, SlopeCurve.EASE_IN);
      // EASE_IN: normalizedAngle^2 = 0.5^2 = 0.25
      expect(factor).toBeCloseTo(0.25, 5);
    });

    it('should handle EASE_OUT curve correctly', () => {
      const factor = calculateSlopeFactor(45, SlopeCurve.EASE_OUT);
      // EASE_OUT: 1 - (1 - 0.5)^2 = 1 - 0.25 = 0.75
      expect(factor).toBeCloseTo(0.75, 5);
    });

    it('should handle EASE_IN_OUT curve correctly', () => {
      const factor = calculateSlopeFactor(45, SlopeCurve.EASE_IN_OUT);
      // EASE_IN_OUT at 0.5: 2 * 0.5^2 = 0.5
      expect(factor).toBeCloseTo(0.5, 5);
    });

    it('should handle EXPONENTIAL curve correctly', () => {
      const factor = calculateSlopeFactor(45, SlopeCurve.EXPONENTIAL);
      // EXPONENTIAL: 0.5^2.5 ≈ 0.1768
      expect(factor).toBeCloseTo(0.1768, 3);
    });

    it('should clamp angles outside 0-90 range', () => {
      expect(calculateSlopeFactor(-10, SlopeCurve.LINEAR)).toBe(0);
      expect(calculateSlopeFactor(100, SlopeCurve.LINEAR)).toBe(1);
    });
  });

  describe('calculateProgressiveSlope', () => {
    const config: SlopeConfig = {
      startAngle: 20,
      endAngle: 87,
      transitionLength: 30,
      curveType: SlopeCurve.EASE_IN,
    };

    it('should return gentle slope at start (t=0)', () => {
      const factor = calculateProgressiveSlope(0, config);
      // At start, angle is 20°, normalized = 20/90 = 0.222
      // EASE_IN: 0.222^2 ≈ 0.049
      expect(factor).toBeLessThan(0.1); // Gentle
    });

    it('should return steep slope at end (t=1)', () => {
      const factor = calculateProgressiveSlope(1, config);
      // At end, angle is 87°, normalized = 87/90 = 0.967
      // EASE_IN: 0.967^2 ≈ 0.935
      expect(factor).toBeGreaterThan(0.9); // Steep
    });

    it('should progress from gentle to steep', () => {
      const startFactor = calculateProgressiveSlope(0, config);
      const middleFactor = calculateProgressiveSlope(0.5, config);
      const endFactor = calculateProgressiveSlope(1, config);

      expect(startFactor).toBeLessThan(middleFactor);
      expect(middleFactor).toBeLessThan(endFactor);
    });

    it('should clamp t to valid range', () => {
      const factorNeg = calculateProgressiveSlope(-0.5, config);
      const factorOver = calculateProgressiveSlope(1.5, config);

      expect(factorNeg).toBeGreaterThanOrEqual(0);
      expect(factorOver).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateMinRampLength', () => {
    it('should calculate minimum length for height difference', () => {
      const heightDiff = MAX_HEIGHT_DIFFERENCE; // 270 units
      const minLength = calculateMinRampLength(heightDiff, 30);

      // For 30°: length = 270 / tan(30°) ≈ 270 / 0.577 ≈ 468 units
      expect(minLength).toBeGreaterThan(400);
      expect(minLength).toBeLessThan(500);
    });

    it('should return 0 for zero or negative height difference', () => {
      expect(calculateMinRampLength(0)).toBe(0);
      expect(calculateMinRampLength(-100)).toBe(0);
    });

    it('should handle different angles', () => {
      const heightDiff = 270;
      const length30 = calculateMinRampLength(heightDiff, 30);
      const length45 = calculateMinRampLength(heightDiff, 45);

      // 45° requires less length than 30°
      expect(length45).toBeLessThan(length30);
    });
  });

  describe('interpolateRampHeight', () => {
    it('should return approximately startHeight at t=0 (with progressive slope)', () => {
      const height = interpolateRampHeight(0, 270, 0);
      // With EASE_IN curve, t=0 gives gentle slope, so height is close to start but not exactly
      expect(height).toBeLessThan(50); // Should be very close to start
    });

    it('should return approximately endHeight at t=1 (with progressive slope)', () => {
      const height = interpolateRampHeight(0, 270, 1);
      // With EASE_IN curve, t=1 gives steep slope, so height is close to end but not exactly
      expect(height).toBeGreaterThan(250); // Should be very close to end
    });

    it('should interpolate progressively (gentle start, steep end)', () => {
      const start = interpolateRampHeight(0, 270, 0.0);
      const early = interpolateRampHeight(0, 270, 0.1);
      const late = interpolateRampHeight(0, 270, 0.9);
      const end = interpolateRampHeight(0, 270, 1.0);

      // Early should be closer to start than late
      const earlyProgress = early - start;
      const lateProgress = late - start;
      const endProgress = end - start;

      // With EASE_IN, early progress should be less than late progress
      expect(earlyProgress).toBeLessThan(lateProgress);
      expect(lateProgress).toBeLessThan(endProgress);
    });

    it('should use custom config when provided', () => {
      const customConfig: SlopeConfig = {
        startAngle: 15,
        endAngle: 85,
        transitionLength: 20,
        curveType: SlopeCurve.LINEAR,
      };

      const height = interpolateRampHeight(0, 270, 0.5, customConfig);
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThan(270);
    });
  });

  describe('validateRampTransition', () => {
    it('should return true for valid transitions', () => {
      expect(validateRampTransition(0, 1)).toBe(true);
      expect(validateRampTransition(1, 0)).toBe(true);
      expect(validateRampTransition(-1, 0)).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(validateRampTransition(0, 2)).toBe(false);
      expect(validateRampTransition(0, 3)).toBe(false);
    });

    it('should return true for same level', () => {
      expect(validateRampTransition(0, 0)).toBe(true);
      expect(validateRampTransition(1, 1)).toBe(true);
    });
  });

  describe('getSlopeAngleAt', () => {
    const config: SlopeConfig = {
      startAngle: 20,
      endAngle: 87,
      transitionLength: 30,
      curveType: SlopeCurve.LINEAR,
    };

    it('should return startAngle at t=0', () => {
      expect(getSlopeAngleAt(0, config)).toBe(20);
    });

    it('should return endAngle at t=1', () => {
      expect(getSlopeAngleAt(1, config)).toBe(87);
    });

    it('should interpolate angle linearly', () => {
      const angle = getSlopeAngleAt(0.5, config);
      // Linear: (20 + 87) / 2 = 53.5
      expect(angle).toBeCloseTo(53.5, 1);
    });

    it('should clamp t to valid range', () => {
      expect(getSlopeAngleAt(-0.5, config)).toBe(20);
      expect(getSlopeAngleAt(1.5, config)).toBe(87);
    });
  });

  describe('isWalkableSlope', () => {
    it('should return true for gentle slopes', () => {
      expect(isWalkableSlope(15)).toBe(true);
      expect(isWalkableSlope(30)).toBe(true);
      expect(isWalkableSlope(45)).toBe(true);
    });

    it('should return false for steep slopes', () => {
      expect(isWalkableSlope(46)).toBe(false);
      expect(isWalkableSlope(60)).toBe(false);
      expect(isWalkableSlope(90)).toBe(false);
    });

    it('should use custom maxWalkableAngle', () => {
      expect(isWalkableSlope(50, 60)).toBe(true);
      expect(isWalkableSlope(70, 60)).toBe(false);
    });

    it('should handle boundary cases', () => {
      expect(isWalkableSlope(45, 45)).toBe(true);
      expect(isWalkableSlope(45.1, 45)).toBe(false);
    });
  });
});

