/**
 * Advanced ramp system - Creates gradual slopes between terrain levels.
 * 
 * Similar to map exits: creates a smooth transition that rises from 
 * the lower level height to the higher level height.
 */

import { Grid } from './grid.js';

export interface AdvancedRampConfig {
  enabled: boolean;
  maxAngle: number;
  minAngle: number;
  rampWidth: number;
  noiseAmplitude: number;
  noiseScale: number;
  enableInaccessible: boolean;
  inaccessibleMinLevel: number;
  inaccessiblePercentage: number;
  rampsPerTransition: number;
  seed?: number;
}

export const DEFAULT_ADVANCED_RAMP_CONFIG: AdvancedRampConfig = {
  enabled: true,
  maxAngle: 70, // Higher = shorter ramp
  minAngle: 55,
  rampWidth: 12, // Wider ramps
  noiseAmplitude: 0.005,
  noiseScale: 0.005,
  enableInaccessible: false,
  inaccessibleMinLevel: 3,
  inaccessiblePercentage: 0.3,
  rampsPerTransition: 4,
  seed: 12345,
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface LevelBoundary {
  x: number;
  y: number;
  lowHeight: number;
  highHeight: number;
  // Direction pointing from LOW to HIGH
  normalX: number;
  normalY: number;
}

/**
 * Find boundaries between different height levels.
 */
function findLevelBoundaries(grid: Grid, minHeightDiff: number): LevelBoundary[] {
  const boundaries: LevelBoundary[] = [];
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const cell = grid.getCell(x, y);
      const h = cell.height;

      // Check 4 cardinal directions
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
      ];

      for (const dir of dirs) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= cols || ny >= rows) continue;

        const neighbor = grid.getCell(nx, ny);
        const nh = neighbor.height;
        const diff = Math.abs(nh - h);

        if (diff >= minHeightDiff) {
          const isLow = h < nh;
          boundaries.push({
            // Position is on the LOW side
            x: isLow ? x : nx,
            y: isLow ? y : ny,
            lowHeight: Math.min(h, nh),
            highHeight: Math.max(h, nh),
            // Direction from low to high
            normalX: isLow ? dir.dx : -dir.dx,
            normalY: isLow ? dir.dy : -dir.dy,
          });
        }
      }
    }
  }

  return boundaries;
}

/**
 * Create a smooth ramp by ONLY lowering the high side terrain.
 * The low side stays untouched - we just "cut" into the cliff.
 */
function createRampTransition(
  grid: Grid,
  boundary: LevelBoundary,
  width: number,
  maxAngleDeg: number,
  seed: number,
  noiseAmp: number
): number {
  const cols = grid.getCols();
  const rows = grid.getRows();
  const random = seededRandom(seed);

  const heightDiff = boundary.highHeight - boundary.lowHeight;

  // Calculate ramp length - (max 32 pixels = ~40% of original)
  const angleRad = (maxAngleDeg * Math.PI) / 180;
  let rampLength = Math.ceil(heightDiff / Math.tan(angleRad));
  rampLength = Math.min(rampLength, 32); // Cap at 32 pixels max

  // Perpendicular direction for width
  const perpX = -boundary.normalY;
  const perpY = boundary.normalX;

  let cellsModified = 0;

  // Ramp extends ONLY into the HIGH side (positive direction from boundary)
  // dist = 0: at the boundary (starts at lowHeight)
  // dist = rampLength: end of ramp (reaches highHeight)
  for (let dist = 0; dist <= rampLength; dist++) {
    // Progress from 0 to 1 along the ramp
    const t = dist / rampLength;

    // Smoothstep for natural S-curve (starts low, ends high)
    const smoothT = t * t * (3 - 2 * t);

    // Target height at this position (starts at lowHeight, ends at highHeight)
    const targetHeight = boundary.lowHeight + heightDiff * smoothT;

    // Position along ramp (moving INTO the high side)
    const cx = boundary.x + boundary.normalX * dist;
    const cy = boundary.y + boundary.normalY * dist;

    // Width is constant (wide) - no tapering
    const currentWidth = Math.max(width, 8);

    // Apply across the width
    for (let w = -currentWidth; w <= currentWidth; w++) {
      const px = Math.round(cx + perpX * w);
      const py = Math.round(cy + perpY * w);

      if (px < 1 || px >= cols - 1 || py < 1 || py >= rows - 1) continue;

      const cell = grid.getCell(px, py);
      if (cell.flags.road || cell.flags.blocked) continue;

      const currentHeight = cell.height;

      // ONLY modify if current height is ABOVE target (we're cutting DOWN)
      if (currentHeight <= targetHeight) continue;

      // Edge falloff - center gets full effect, edges blend
      const distFromCenter = Math.abs(w) / currentWidth;
      const edgeFalloff = distFromCenter * distFromCenter;

      // Add subtle noise
      const noise = (random() - 0.5) * noiseAmp * heightDiff;

      // Calculate ramp height with noise
      const rampHeight = targetHeight + noise;

      // Blend: center uses ramp height, edges blend with existing
      const blendedHeight = rampHeight * (1 - edgeFalloff) + currentHeight * edgeFalloff;

      // Only lower the terrain, never raise it
      if (blendedHeight < currentHeight) {
        grid.setHeight(px, py, blendedHeight);
        cell.flags.ramp = true;
        cell.flags.playable = true;
        cellsModified++;
      }
    }
  }

  return cellsModified;
}

/**
 * Find connected regions (islands) of similar height.
 * Returns array of regions, each containing boundary points that belong to it.
 */
function findIslands(
  grid: Grid,
  boundaries: LevelBoundary[],
  heightThreshold: number
): Map<number, LevelBoundary[]> {
  const rows = grid.getRows();
  const cols = grid.getCols();

  // Create a map of boundary points by position
  const boundaryMap = new Map<string, LevelBoundary>();
  for (const b of boundaries) {
    boundaryMap.set(`${b.x},${b.y}`, b);
  }

  // Find all cells in the "high" regions and group them
  const visited = new Set<string>();
  const islands = new Map<number, LevelBoundary[]>();
  let islandId = 0;

  // For each boundary point, flood fill to find its island
  for (const b of boundaries) {
    const startKey = `${b.x + b.normalX},${b.y + b.normalY}`; // Start from high side
    if (visited.has(startKey)) continue;

    const islandBoundaries: LevelBoundary[] = [];
    const queue: [number, number][] = [[b.x + b.normalX, b.y + b.normalY]];
    const islandCells = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      if (visited.has(key) || islandCells.has(key)) continue;
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

      const cell = grid.getCell(x, y);
      if (cell.height < b.highHeight - heightThreshold) continue;

      islandCells.add(key);
      visited.add(key);

      // Check if this cell has a boundary point
      const boundaryKey = `${x - 1},${y}`;
      if (boundaryMap.has(boundaryKey)) {
        const bp = boundaryMap.get(boundaryKey)!;
        if (!islandBoundaries.includes(bp)) islandBoundaries.push(bp);
      }

      // Add neighbors
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    // Also add the original boundary
    if (!islandBoundaries.includes(b)) islandBoundaries.push(b);

    if (islandBoundaries.length > 0) {
      islands.set(islandId++, islandBoundaries);
    }
  }

  return islands;
}

/**
 * Main ramp creation function.
 */
export function createAdvancedRamps(
  grid: Grid,
  config: AdvancedRampConfig = DEFAULT_ADVANCED_RAMP_CONFIG
): void {
  if (!config.enabled) return;

  const rows = grid.getRows();
  const cols = grid.getCols();
  const seed = config.seed ?? 12345;
  const random = seededRandom(seed);

  console.log('[Ramps] Finding level boundaries...');

  // Find boundaries with significant height differences
  const minHeightDiff = 40;
  const boundaries = findLevelBoundaries(grid, minHeightDiff);

  console.log(`[Ramps] Found ${boundaries.length} boundary points`);

  if (boundaries.length === 0) {
    console.log('[Ramps] No significant height transitions found');
    return;
  }

  // Separate level 0→1 boundaries from others (level 0→1 is CRITICAL)
  const level0to1: LevelBoundary[] = [];
  const otherBoundaries: LevelBoundary[] = [];

  for (const b of boundaries) {
    // Level 0→1 transition (low height < 100, high height between 100-200)
    if (b.lowHeight < 100 && b.highHeight >= 80 && b.highHeight < 250) {
      level0to1.push(b);
    } else {
      otherBoundaries.push(b);
    }
  }

  console.log(`[Ramps] Level 0→1: ${level0to1.length} candidates, Others: ${otherBoundaries.length}`);

  const edgeMargin = Math.max(50, config.rampWidth * 2);
  const selectedRamps: LevelBoundary[] = [];

  // PRIORITY 1: Ensure ALL level 0→1 islands have at least one ramp
  if (level0to1.length > 0) {
    // Find islands in level 1
    const islands = findIslands(grid, level0to1, 50);
    console.log(`[Ramps] Found ${islands.size} separate level-1 islands`);

    // Ensure each island has at least 1 ramp (preferably 2)
    for (const [islandId, islandBoundaries] of islands) {
      console.log(`[Ramps] Island ${islandId}: ${islandBoundaries.length} boundary points`);

      // Shuffle boundaries for this island
      for (let i = islandBoundaries.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [islandBoundaries[i], islandBoundaries[j]] = [islandBoundaries[j], islandBoundaries[i]];
      }

      // Select at least 1 ramp per island, up to rampsPerTransition
      const rampsForIsland = Math.max(1, Math.min(2, config.rampsPerTransition));
      let islandRampCount = 0;

      for (const point of islandBoundaries) {
        if (islandRampCount >= rampsForIsland) break;

        // Skip edges
        if (point.x < edgeMargin || point.x > cols - edgeMargin ||
          point.y < edgeMargin || point.y > rows - edgeMargin) {
          continue;
        }

        // Check spacing with existing ramps
        let tooClose = false;
        const minIslandSpacing = 50; // Minimum spacing within island
        for (const selected of selectedRamps) {
          const dist = Math.sqrt(
            (point.x - selected.x) ** 2 +
            (point.y - selected.y) ** 2
          );
          if (dist < minIslandSpacing) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          selectedRamps.push(point);
          islandRampCount++;
          console.log(`[Ramps] Added ramp for island ${islandId} at (${point.x},${point.y})`);
        }
      }

      // If no ramp was added (all candidates at edges), force one
      if (islandRampCount === 0 && islandBoundaries.length > 0) {
        const forced = islandBoundaries[0];
        selectedRamps.push(forced);
        console.log(`[Ramps] FORCED ramp for island ${islandId} at (${forced.x},${forced.y})`);
      }
    }
  }

  // PRIORITY 2: Add ramps for other level transitions
  const heightGroups = new Map<string, LevelBoundary[]>();
  for (const b of otherBoundaries) {
    const lowRound = Math.round(b.lowHeight / 50) * 50;
    const highRound = Math.round(b.highHeight / 50) * 50;
    const key = `${lowRound}-${highRound}`;
    if (!heightGroups.has(key)) {
      heightGroups.set(key, []);
    }
    heightGroups.get(key)!.push(b);
  }

  const minSpacing = Math.min(cols, rows) / (config.rampsPerTransition + 1);

  for (const [transition, points] of heightGroups) {
    console.log(`[Ramps] Transition ${transition}: ${points.length} candidates`);

    // Shuffle
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }

    let count = 0;

    for (const point of points) {
      if (count >= config.rampsPerTransition) break;

      // Skip edges
      if (point.x < edgeMargin || point.x > cols - edgeMargin ||
        point.y < edgeMargin || point.y > rows - edgeMargin) {
        continue;
      }

      // Check spacing
      let tooClose = false;
      for (const selected of selectedRamps) {
        const dist = Math.sqrt(
          (point.x - selected.x) ** 2 +
          (point.y - selected.y) ** 2
        );
        if (dist < minSpacing) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        selectedRamps.push(point);
        count++;
      }
    }
  }

  console.log(`[Ramps] Creating ${selectedRamps.length} ramps total`);

  // Create the ramps
  let totalCells = 0;

  for (let i = 0; i < selectedRamps.length; i++) {
    const ramp = selectedRamps[i];

    console.log(`[Ramps] Ramp ${i + 1} at (${ramp.x},${ramp.y}): h=${ramp.lowHeight.toFixed(0)} -> ${ramp.highHeight.toFixed(0)}, dir=(${ramp.normalX},${ramp.normalY})`);

    const cells = createRampTransition(
      grid,
      ramp,
      config.rampWidth,
      config.maxAngle,
      seed + i * 1000,
      config.noiseAmplitude
    );

    totalCells += cells;
  }

  // Final smoothing
  smoothRamps(grid, 3);

  console.log(`[Ramps] Complete: ${selectedRamps.length} ramps, ${totalCells} cells`);
}

/**
 * Smooth ramp cells for better blending.
 */
function smoothRamps(grid: Grid, passes: number): void {
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let pass = 0; pass < passes; pass++) {
    const heights = new Float32Array(rows * cols);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        heights[y * cols + x] = grid.getCell(x, y).height;
      }
    }

    for (let y = 2; y < rows - 2; y++) {
      for (let x = 2; x < cols - 2; x++) {
        const cell = grid.getCell(x, y);
        if (!cell.flags.ramp) continue;

        let sum = 0;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += heights[(y + dy) * cols + (x + dx)];
            count++;
          }
        }

        const avg = sum / count;
        const current = heights[y * cols + x];
        grid.setHeight(x, y, current * 0.6 + avg * 0.4);
      }
    }
  }
}

export function applyAdvancedRamps(
  grid: Grid,
  config: AdvancedRampConfig = DEFAULT_ADVANCED_RAMP_CONFIG
): void {
  if (!config.enabled) {
    console.log('[Ramps] Disabled');
    return;
  }

  console.log('[Ramps] Creating level transitions:', {
    width: config.rampWidth,
    maxAngle: config.maxAngle,
    rampsPerTransition: config.rampsPerTransition,
  });

  createAdvancedRamps(grid, config);
}
