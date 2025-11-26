/**
 * Phase 4: Export to Unreal Engine
 * Exports heightmap and masks as PNG/R16 files with metadata JSON.
 */

import { Grid } from '../core/grid.js';

/**
 * Export configuration.
 */
export interface ExportConfig {
  /** Output format for heightmap */
  heightmapFormat: 'png16' | 'r16' | 'raw';
  /** Output format for masks */
  maskFormat: 'png8' | 'png16';
  /** Include road mask */
  includeRoadMask: boolean;
  /** Include level mask */
  includeLevelMask: boolean;
  /** Include cliff mask */
  includeCliffMask: boolean;
  /** Include playable mask */
  includePlayableMask: boolean;
  /** Scale factor for height normalization */
  heightScale: number;
  /** Offset for height normalization */
  heightOffset: number;
}

/**
 * Default export configuration.
 */
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  heightmapFormat: 'png16',
  maskFormat: 'png8',
  includeRoadMask: true,
  includeLevelMask: true,
  includeCliffMask: true,
  includePlayableMask: true,
  heightScale: 1.0,
  heightOffset: 32768, // Center at mid-range for signed heights
};

/**
 * Export result containing all generated data.
 */
export interface ExportResult {
  /** Heightmap data as Uint16Array */
  heightmap: Uint16Array;
  /** Road mask data as Uint8Array */
  roadMask?: Uint8Array;
  /** Level mask data as Uint8Array */
  levelMask?: Uint8Array;
  /** Cliff mask data as Uint8Array */
  cliffMask?: Uint8Array;
  /** Playable mask data as Uint8Array */
  playableMask?: Uint8Array;
  /** Metadata */
  metadata: ExportMetadata;
}

/**
 * Export metadata for Unreal Engine import.
 */
export interface ExportMetadata {
  /** Grid width in cells */
  width: number;
  /** Grid height in cells */
  height: number;
  /** Minimum height value */
  minHeight: number;
  /** Maximum height value */
  maxHeight: number;
  /** Height scale used */
  heightScale: number;
  /** Height offset used */
  heightOffset: number;
  /** Export timestamp */
  timestamp: string;
  /** Version */
  version: string;
}

/**
 * Normalizes height value to 16-bit range.
 */
function normalizeHeight(
  height: number,
  minHeight: number,
  maxHeight: number,
  scale: number,
  offset: number
): number {
  const range = maxHeight - minHeight || 1;
  const normalized = ((height - minHeight) / range) * 65535 * scale;
  return Math.max(0, Math.min(65535, Math.round(normalized + offset - 32768)));
}

/**
 * Generates heightmap data from grid.
 */
export function generateHeightmapData(
  grid: Grid,
  config: ExportConfig = DEFAULT_EXPORT_CONFIG
): { data: Uint16Array; minHeight: number; maxHeight: number } {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const data = new Uint16Array(rows * cols);

  // Find min/max heights
  let minHeight = Infinity;
  let maxHeight = -Infinity;

  grid.forEachCell((cell) => {
    minHeight = Math.min(minHeight, cell.height);
    maxHeight = Math.max(maxHeight, cell.height);
  });

  // Normalize and store
  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);
      data[index++] = normalizeHeight(
        cell.height,
        minHeight,
        maxHeight,
        config.heightScale,
        config.heightOffset
      );
    }
  }

  return { data, minHeight, maxHeight };
}

/**
 * Generates road mask from grid.
 */
export function generateRoadMask(grid: Grid): Uint8Array {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const data = new Uint8Array(rows * cols);

  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);
      data[index++] = cell.flags.road ? 255 : 0;
    }
  }

  return data;
}

/**
 * Generates level mask from grid.
 * Each level is mapped to a grayscale value.
 */
export function generateLevelMask(grid: Grid, maxLevel: number = 10): Uint8Array {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const data = new Uint8Array(rows * cols);

  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);
      // Map level to 0-255 range
      const normalizedLevel = Math.max(0, Math.min(maxLevel, cell.levelId + 1));
      data[index++] = Math.round((normalizedLevel / maxLevel) * 255);
    }
  }

  return data;
}

/**
 * Generates cliff mask from grid.
 */
export function generateCliffMask(grid: Grid): Uint8Array {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const data = new Uint8Array(rows * cols);

  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);
      data[index++] = cell.flags.cliff ? 255 : 0;
    }
  }

  return data;
}

/**
 * Generates playable area mask from grid.
 */
export function generatePlayableMask(grid: Grid): Uint8Array {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const data = new Uint8Array(rows * cols);

  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);
      data[index++] = cell.flags.playable ? 255 : 0;
    }
  }

  return data;
}

/**
 * Executes Phase 4: Export to Unreal Engine.
 *
 * @param grid - Grid with heights and flags
 * @param config - Export configuration
 * @returns Export result with all data
 */
export function executePhase4(
  grid: Grid,
  config: ExportConfig = DEFAULT_EXPORT_CONFIG
): ExportResult {
  // Generate heightmap
  const { data: heightmap, minHeight, maxHeight } = generateHeightmapData(grid, config);

  // Generate masks
  const roadMask = config.includeRoadMask ? generateRoadMask(grid) : undefined;
  const levelMask = config.includeLevelMask ? generateLevelMask(grid) : undefined;
  const cliffMask = config.includeCliffMask ? generateCliffMask(grid) : undefined;
  const playableMask = config.includePlayableMask ? generatePlayableMask(grid) : undefined;

  // Create metadata
  const metadata: ExportMetadata = {
    width: grid.getCols(),
    height: grid.getRows(),
    minHeight,
    maxHeight,
    heightScale: config.heightScale,
    heightOffset: config.heightOffset,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  };

  return {
    heightmap,
    roadMask,
    levelMask,
    cliffMask,
    playableMask,
    metadata,
  };
}

/**
 * Converts Uint16Array to PNG-compatible RGBA data (16-bit in RG channels).
 */
export function heightmapToRGBA(data: Uint16Array): Uint8Array {
  const rgba = new Uint8Array(data.length * 4);

  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    const offset = i * 4;
    // Store 16-bit value in RG channels (little-endian)
    rgba[offset] = value & 0xff;         // R = low byte
    rgba[offset + 1] = (value >> 8) & 0xff; // G = high byte
    rgba[offset + 2] = 0;                 // B = 0
    rgba[offset + 3] = 255;               // A = 255
  }

  return rgba;
}

/**
 * Converts Uint8Array mask to PNG-compatible RGBA data.
 */
export function maskToRGBA(data: Uint8Array): Uint8Array {
  const rgba = new Uint8Array(data.length * 4);

  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    const offset = i * 4;
    rgba[offset] = value;     // R
    rgba[offset + 1] = value; // G
    rgba[offset + 2] = value; // B
    rgba[offset + 3] = 255;   // A
  }

  return rgba;
}

