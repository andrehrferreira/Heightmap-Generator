/**
 * Border Barrier Generator
 * Creates barriers around the map edges with configurable exits.
 */

import { Grid } from '../core/grid.js';
import { BorderConfig } from '../core/biome.js';

/**
 * Simple noise function for natural variation
 */
function noise2D(x: number, y: number, seed: number = 12345): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1; // -1 to 1
}

/**
 * Fractal noise for smoother variation
 */
function fbmNoise(x: number, y: number, octaves: number = 3, seed: number = 12345): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency, seed + i * 100);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value / maxValue;
}

/**
 * Edge identifiers.
 */
export type Edge = 'north' | 'south' | 'east' | 'west';

/**
 * Exit position on an edge.
 */
export interface ExitPosition {
  edge: Edge;
  /** Position along the edge (0-1) */
  position: number;
  /** Width in cells */
  width: number;
}

/**
 * Calculate exit positions for all edges.
 */
export function calculateExitPositions(
  config: BorderConfig,
  _cols: number,
  _rows: number
): ExitPosition[] {
  const exits: ExitPosition[] = [];
  
  if (config.exitCount <= 0 || !config.enabled) {
    return exits;
  }
  
  const edges: Edge[] = ['north', 'south', 'east', 'west'];
  
  // If positions are provided, use them
  if (config.exitPositions && config.exitPositions.length > 0) {
    for (let i = 0; i < Math.min(config.exitCount, config.exitPositions.length); i++) {
      const edge = edges[i % 4];
      exits.push({
        edge,
        position: config.exitPositions[i],
        width: config.exitWidth,
      });
    }
    return exits;
  }
  
  // Auto-distribute exits
  if (config.exitCount === 1) {
    // Single exit on south
    exits.push({ edge: 'south', position: 0.5, width: config.exitWidth });
  } else if (config.exitCount === 2) {
    // Two exits: north and south
    exits.push({ edge: 'north', position: 0.5, width: config.exitWidth });
    exits.push({ edge: 'south', position: 0.5, width: config.exitWidth });
  } else if (config.exitCount === 3) {
    // Three exits: north, east, south
    exits.push({ edge: 'north', position: 0.5, width: config.exitWidth });
    exits.push({ edge: 'east', position: 0.5, width: config.exitWidth });
    exits.push({ edge: 'south', position: 0.5, width: config.exitWidth });
  } else {
    // Four or more: one on each edge, then distribute rest
    for (let i = 0; i < Math.min(config.exitCount, 4); i++) {
      exits.push({ edge: edges[i], position: 0.5, width: config.exitWidth });
    }
    
    // Additional exits distributed on edges
    for (let i = 4; i < config.exitCount; i++) {
      const edge = edges[i % 4];
      const offset = Math.floor(i / 4) * 0.25;
      exits.push({ 
        edge, 
        position: 0.25 + offset, 
        width: config.exitWidth 
      });
    }
  }
  
  return exits;
}

/**
 * Check if a cell position is within an exit.
 */
function isInExit(
  x: number,
  y: number,
  cols: number,
  rows: number,
  exits: ExitPosition[],
  barrierWidth: number
): boolean {
  for (const exit of exits) {
    const halfWidth = exit.width / 2;
    
    switch (exit.edge) {
      case 'north': {
        const exitCenter = Math.floor(exit.position * cols);
        if (y < barrierWidth && 
            x >= exitCenter - halfWidth && 
            x <= exitCenter + halfWidth) {
          return true;
        }
        break;
      }
      case 'south': {
        const exitCenter = Math.floor(exit.position * cols);
        if (y >= rows - barrierWidth && 
            x >= exitCenter - halfWidth && 
            x <= exitCenter + halfWidth) {
          return true;
        }
        break;
      }
      case 'east': {
        const exitCenter = Math.floor(exit.position * rows);
        if (x >= cols - barrierWidth && 
            y >= exitCenter - halfWidth && 
            y <= exitCenter + halfWidth) {
          return true;
        }
        break;
      }
      case 'west': {
        const exitCenter = Math.floor(exit.position * rows);
        if (x < barrierWidth && 
            y >= exitCenter - halfWidth && 
            y <= exitCenter + halfWidth) {
          return true;
        }
        break;
      }
    }
  }
  
  return false;
}

/**
 * Apply border barriers to a grid.
 */
export function applyBorderBarriers(
  grid: Grid,
  config: BorderConfig
): void {
  if (!config.enabled || config.type === 'none') {
    return;
  }
  
  const cols = grid.getCols();
  const rows = grid.getRows();
  
  // Calculate exit positions
  const exits = calculateExitPositions(config, cols, rows);
  
  console.log(`[Border] Applying ${config.type} barriers with ${exits.length} exits`);
  
  // Apply barriers
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Calculate distance from each edge
      const distNorth = y;
      const distSouth = rows - 1 - y;
      const distEast = cols - 1 - x;
      const distWest = x;
      
      // Find minimum distance to any edge
      const minDist = Math.min(distNorth, distSouth, distEast, distWest);
      
      // Skip if not in barrier zone
      if (minDist >= config.width) {
        continue;
      }
      
      // Configurable noise
      const noiseScale = config.noiseScale ?? 0.05;
      const noiseAmp = config.noiseAmplitude ?? 50;
      const noiseSeed = 54321;
      
      // Check if this cell is in an exit
      if (isInExit(x, y, cols, rows, exits, config.width)) {
        const cell = grid.getCell(x, y);
        cell.flags.road = true;
        cell.flags.playable = true;
        cell.flags.visualOnly = false;
        cell.flags.cliff = false;
        
        // Simple ramp: lower terrain gradually toward edge
        const rampProgress = minDist / config.width; // 0 at edge, 1 at inner
        
        // Add noise to exit edges for natural look
        const exitNoise = fbmNoise(x * noiseScale, y * noiseScale, 3, noiseSeed);
        const noiseOffset = exitNoise * (noiseAmp * 0.2) * (1 - rampProgress); // Scaled noise
        
        // Only LOWER the terrain, don't raise it
        const exitFloor = 20;
        const maxDrop = Math.max(0, cell.height - exitFloor);
        
        // Smoothstep curve
        const t = rampProgress * rampProgress * (3 - 2 * rampProgress);
        
        // Blend: at edge use exitFloor, at inner use original + noise
        cell.height = exitFloor + maxDrop * t + noiseOffset;
        continue;
      }
      
      const cell = grid.getCell(x, y);
      
      // Calculate blend factor (0 at inner edge, 1 at map edge)
      const blendFactor = 1 - (minDist / config.width);
      
      switch (config.type) {
        case 'mountain':
          // Mountain barrier with configurable noise
          const mtnSmooth = blendFactor * blendFactor * (3 - 2 * blendFactor);
          const mtnNoise = fbmNoise(x * noiseScale * 2, y * noiseScale * 2, 5, noiseSeed);
          const mtnHeight = config.height * 3 * mtnSmooth + mtnNoise * noiseAmp * blendFactor;
          
          cell.height = Math.max(cell.height, mtnHeight);
          
          if (blendFactor > 0.3) {
            cell.flags.playable = false;
            cell.flags.visualOnly = true;
          }
          break;
          
        case 'cliff':
          // Cliff barrier with configurable noise
          const cliffSmooth = blendFactor * blendFactor;
          if (blendFactor > 0.2) {
            const cliffNoise = fbmNoise(x * noiseScale * 3, y * noiseScale * 3, 4, noiseSeed);
            const cliffHeight = config.height * 4 * cliffSmooth + cliffNoise * noiseAmp * 0.8 * blendFactor;
            cell.height = Math.max(cell.height, cliffHeight);
            cell.flags.playable = false;
            cell.flags.visualOnly = true;
            cell.flags.cliff = true;
          }
          break;
          
        case 'water':
          // Water barrier with configurable noise
          const waterSmooth = blendFactor * blendFactor * (3 - 2 * blendFactor);
          if (blendFactor > 0.4) {
            const waterNoise = fbmNoise(x * noiseScale, y * noiseScale, 3, noiseSeed);
            cell.height = -100 - config.height * waterSmooth + waterNoise * noiseAmp * 0.4;
            cell.flags.water = true;
            cell.flags.playable = false;
          } else {
            // Beach transition with noise
            const beachNoise = fbmNoise(x * noiseScale * 2, y * noiseScale * 2, 3, noiseSeed);
            cell.height = cell.height * (1 - blendFactor * 2) - 20 * blendFactor + beachNoise * noiseAmp * 0.2;
          }
          break;
      }
      
      // Mark as boundary
      cell.flags.boundaryType = 'edge';
    }
  }
  
  console.log(`[Border] Barrier application complete`);
}

/**
 * Create a smooth transition at exits.
 */
export function smoothExitTransitions(
  grid: Grid,
  exits: ExitPosition[],
  barrierWidth: number,
  transitionWidth: number = 10
): void {
  const cols = grid.getCols();
  const rows = grid.getRows();
  
  for (const exit of exits) {
    const halfWidth = exit.width / 2 + transitionWidth;
    
    let startX: number, endX: number, startY: number, endY: number;
    
    switch (exit.edge) {
      case 'north':
        startX = Math.max(0, Math.floor(exit.position * cols) - halfWidth);
        endX = Math.min(cols - 1, Math.floor(exit.position * cols) + halfWidth);
        startY = 0;
        endY = barrierWidth + transitionWidth;
        break;
      case 'south':
        startX = Math.max(0, Math.floor(exit.position * cols) - halfWidth);
        endX = Math.min(cols - 1, Math.floor(exit.position * cols) + halfWidth);
        startY = rows - barrierWidth - transitionWidth;
        endY = rows - 1;
        break;
      case 'east':
        startX = cols - barrierWidth - transitionWidth;
        endX = cols - 1;
        startY = Math.max(0, Math.floor(exit.position * rows) - halfWidth);
        endY = Math.min(rows - 1, Math.floor(exit.position * rows) + halfWidth);
        break;
      case 'west':
        startX = 0;
        endX = barrierWidth + transitionWidth;
        startY = Math.max(0, Math.floor(exit.position * rows) - halfWidth);
        endY = Math.min(rows - 1, Math.floor(exit.position * rows) + halfWidth);
        break;
    }
    
    // Apply gaussian smoothing to exit area
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const cell = grid.getCell(x, y);
        
        // Sample neighbors and average
        let sum = 0;
        let count = 0;
        const radius = 3;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const neighbor = grid.getCell(nx, ny);
              const dist = Math.sqrt(dx * dx + dy * dy);
              const weight = Math.exp(-dist * dist / (radius * radius));
              sum += neighbor.height * weight;
              count += weight;
            }
          }
        }
        
        if (count > 0) {
          cell.height = sum / count;
        }
      }
    }
  }
}

