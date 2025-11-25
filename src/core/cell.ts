/**
 * Cell and CellFlags interfaces for heightmap grid cells.
 * Each cell represents a single grid position with level, height, and feature flags.
 */

/**
 * Type of boundary for a cell.
 */
export type BoundaryType = 'edge' | 'interior' | 'ocean' | 'custom';

/**
 * Feature flags for a grid cell.
 * Flags indicate various terrain features and properties.
 */
export interface CellFlags {
  /** Is part of a road */
  road: boolean;
  /** Is part of a ramp */
  ramp: boolean;
  /** Is water (river/lake) */
  water: boolean;
  /** Is underwater (negative level) */
  underwater: boolean;
  /** Blocked/unplayable area */
  blocked: boolean;
  /** Is a cliff edge */
  cliff: boolean;
  /** Is playable area */
  playable: boolean;
  /** Visual only (e.g., mountain peaks above walkable) */
  visualOnly: boolean;
  /** Is a boundary (edge, interior, or ocean) */
  boundary: boolean;
  /** Type of boundary (edge, interior, ocean, custom) */
  boundaryType?: BoundaryType;
}

/**
 * Creates a new CellFlags object with all flags set to false.
 * @returns New CellFlags with default values
 */
export function createCellFlags(): CellFlags {
  return {
    road: false,
    ramp: false,
    water: false,
    underwater: false,
    blocked: false,
    cliff: false,
    playable: false,
    visualOnly: false,
    boundary: false,
  };
}

/**
 * Grid cell representing a single position in the heightmap.
 * Each cell contains level ID, height, flags, and optional road identifier.
 */
export interface Cell {
  /** Floor level (-2, -1, 0, 1, 2, ...) */
  levelId: number;
  /** Height in Unreal units */
  height: number;
  /** Feature flags */
  flags: CellFlags;
  /** Road identifier (if part of a road) */
  roadId?: number;
}

/**
 * Creates a new Cell with default values.
 * @param levelId - Initial level ID (default: 0)
 * @param height - Initial height (default: 0)
 * @returns New Cell with default values
 */
export function createCell(levelId: number = 0, height: number = 0): Cell {
  return {
    levelId,
    height,
    flags: createCellFlags(),
  };
}

