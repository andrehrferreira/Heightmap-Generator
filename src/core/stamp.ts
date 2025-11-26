/**
 * Stamp System for manual terrain feature placement.
 * Stamps are pre-defined or custom terrain features that can be placed anywhere.
 */

/**
 * Stamp shape types.
 */
export type StampShape =
  | 'circle'    // Circular stamp
  | 'square'    // Square stamp
  | 'rectangle' // Rectangular stamp
  | 'custom';   // Custom shape (from image/data)

/**
 * Stamp falloff types.
 */
export type StampFalloff =
  | 'none'      // Hard edge
  | 'linear'    // Linear falloff
  | 'smooth'    // Smooth (cubic) falloff
  | 'gaussian'; // Gaussian falloff

/**
 * Stamp category for organization.
 */
export type StampCategory =
  | 'terrain'   // General terrain features
  | 'mountain'  // Mountain/hill stamps
  | 'valley'    // Valley/canyon stamps
  | 'water'     // Water feature stamps
  | 'road'      // Road/path stamps
  | 'custom';   // User-defined

/**
 * Stamp definition interface.
 */
export interface StampDefinition {
  /** Unique stamp identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Stamp category */
  category: StampCategory;
  /** Shape type */
  shape: StampShape;
  /** Base width in cells */
  width: number;
  /** Base height in cells */
  height: number;
  /** Height offset (positive = raise, negative = lower) */
  heightOffset: number;
  /** Falloff type */
  falloff: StampFalloff;
  /** Falloff radius (0-1, percentage of size) */
  falloffRadius: number;
  /** Custom height data (for shape='custom') */
  heightData?: Float32Array;
  /** Thumbnail/preview color */
  previewColor: string;
  /** Description */
  description?: string;
}

/**
 * Placed stamp instance.
 */
export interface StampInstance {
  /** Instance identifier */
  id: string;
  /** Reference to stamp definition ID */
  stampId: string;
  /** Center X position (in cells) */
  x: number;
  /** Center Y position (in cells) */
  y: number;
  /** Scale factor (1 = original size) */
  scale: number;
  /** Rotation in degrees */
  rotation: number;
  /** Height multiplier */
  heightMultiplier: number;
  /** Whether this stamp is currently visible */
  visible: boolean;
  /** Layer ID this stamp belongs to */
  layerId?: string;
}

/**
 * Stamp library for storing stamp definitions.
 */
export class StampLibrary {
  private stamps: Map<string, StampDefinition> = new Map();
  private nextId: number = 1;

  constructor() {
    this.loadBuiltinStamps();
  }

  /**
   * Loads built-in stamp definitions.
   */
  private loadBuiltinStamps(): void {
    // Mountain stamps - various sizes and heights
    this.addStamp(createMountainStamp('tiny', 'Tiny Hill', 10, 30));
    this.addStamp(createMountainStamp('small', 'Small Hill', 20, 50));
    this.addStamp(createMountainStamp('medium', 'Medium Mountain', 40, 120));
    this.addStamp(createMountainStamp('large', 'Large Mountain', 80, 200));
    this.addStamp(createMountainStamp('huge', 'Huge Mountain', 120, 350));
    this.addStamp(createMountainStamp('peak', 'Mountain Peak', 30, 300));
    this.addStamp(createMountainStamp('volcano', 'Volcano', 60, 250));

    // Ridge stamps (elongated mountains)
    this.addStamp(createRidgeStamp('small', 'Small Ridge', 60, 20, 80));
    this.addStamp(createRidgeStamp('medium', 'Mountain Ridge', 100, 30, 150));
    this.addStamp(createRidgeStamp('large', 'Large Ridge', 150, 40, 220));

    // Crater stamps
    this.addStamp(createCraterStamp('small', 'Small Crater', 20, 40, 15));
    this.addStamp(createCraterStamp('medium', 'Medium Crater', 40, 80, 30));
    this.addStamp(createCraterStamp('large', 'Large Crater', 80, 150, 50));
    this.addStamp(createCraterStamp('impact', 'Impact Crater', 120, 200, 80));

    // Valley stamps
    this.addStamp(createValleyStamp('small', 'Small Depression', 20, -30));
    this.addStamp(createValleyStamp('medium', 'Valley', 50, -80));
    this.addStamp(createValleyStamp('large', 'Deep Canyon', 80, -150));
    this.addStamp(createValleyStamp('gorge', 'Gorge', 30, -200));

    // Plateau stamps
    this.addStamp(createPlateauStamp('small', 'Small Plateau', 30, 60));
    this.addStamp(createPlateauStamp('medium', 'Medium Plateau', 50, 80));
    this.addStamp(createPlateauStamp('large', 'Large Plateau', 80, 100));
    this.addStamp(createPlateauStamp('mesa', 'Mesa', 60, 150));

    // Water feature stamps
    this.addStamp(createLakeStamp('pond', 'Pond', 15, -20));
    this.addStamp(createLakeStamp('lake', 'Lake', 40, -40));
    this.addStamp(createLakeStamp('sea', 'Inland Sea', 100, -60));

    // Noise-based stamps for natural variation
    this.addStamp(createNoiseStamp('rough', 'Rough Terrain', 40, 30));
    this.addStamp(createNoiseStamp('bumpy', 'Bumpy Hills', 60, 50));
    this.addStamp(createNoiseStamp('rocky', 'Rocky Area', 80, 80));
  }

  /**
   * Adds a stamp definition.
   */
  addStamp(stamp: StampDefinition): void {
    this.stamps.set(stamp.id, stamp);
  }

  /**
   * Gets a stamp by ID.
   */
  getStamp(id: string): StampDefinition | undefined {
    return this.stamps.get(id);
  }

  /**
   * Gets all stamps.
   */
  getAllStamps(): StampDefinition[] {
    return Array.from(this.stamps.values());
  }

  /**
   * Gets stamps by category.
   */
  getStampsByCategory(category: StampCategory): StampDefinition[] {
    return this.getAllStamps().filter(s => s.category === category);
  }

  /**
   * Creates a custom stamp from height data.
   */
  createCustomStamp(
    name: string,
    width: number,
    height: number,
    heightData: Float32Array,
    category: StampCategory = 'custom'
  ): StampDefinition {
    const id = `custom-${this.nextId++}`;
    const stamp: StampDefinition = {
      id,
      name,
      category,
      shape: 'custom',
      width,
      height,
      heightOffset: 0, // Custom stamps use heightData
      falloff: 'none',
      falloffRadius: 0,
      heightData,
      previewColor: '#f85149',
    };
    this.addStamp(stamp);
    return stamp;
  }

  /**
   * Removes a stamp definition.
   */
  removeStamp(id: string): boolean {
    // Don't remove built-in stamps
    if (!id.startsWith('custom-')) return false;
    return this.stamps.delete(id);
  }
}

/**
 * Creates a mountain stamp definition.
 */
function createMountainStamp(id: string, name: string, size: number, height: number): StampDefinition {
  return {
    id: `mountain-${id}`,
    name,
    category: 'mountain',
    shape: 'circle',
    width: size,
    height: size,
    heightOffset: height,
    falloff: 'smooth',
    falloffRadius: 0.8,
    previewColor: '#8b949e',
    description: `${name} - raises terrain by ${height} units`,
  };
}

/**
 * Creates a valley stamp definition.
 */
function createValleyStamp(id: string, name: string, size: number, depth: number): StampDefinition {
  return {
    id: `valley-${id}`,
    name,
    category: 'valley',
    shape: 'circle',
    width: size,
    height: size,
    heightOffset: depth,
    falloff: 'smooth',
    falloffRadius: 0.7,
    previewColor: '#7c3aed',
    description: `${name} - lowers terrain by ${Math.abs(depth)} units`,
  };
}

/**
 * Creates a plateau stamp definition.
 */
function createPlateauStamp(id: string, name: string, size: number, height: number): StampDefinition {
  return {
    id: `plateau-${id}`,
    name,
    category: 'terrain',
    shape: 'square',
    width: size,
    height: size,
    heightOffset: height,
    falloff: 'linear',
    falloffRadius: 0.3,
    previewColor: '#d29922',
    description: `${name} - flat raised area, ${height} units high`,
  };
}

/**
 * Creates a lake stamp definition.
 */
function createLakeStamp(id: string, name: string, size: number, depth: number): StampDefinition {
  return {
    id: `lake-${id}`,
    name,
    category: 'water',
    shape: 'circle',
    width: size,
    height: size,
    heightOffset: depth,
    falloff: 'smooth',
    falloffRadius: 0.5,
    previewColor: '#1f6feb',
    description: `${name} - water depression, ${Math.abs(depth)} units deep`,
  };
}

/**
 * Creates a ridge stamp definition (elongated mountain).
 */
function createRidgeStamp(id: string, name: string, length: number, width: number, height: number): StampDefinition {
  return {
    id: `ridge-${id}`,
    name,
    category: 'mountain',
    shape: 'rectangle',
    width: length,
    height: width,
    heightOffset: height,
    falloff: 'smooth',
    falloffRadius: 0.6,
    previewColor: '#6e7681',
    description: `${name} - elongated mountain ridge, ${height} units high`,
  };
}

/**
 * Creates a crater stamp definition (ring with depression).
 */
function createCraterStamp(id: string, name: string, innerSize: number, outerSize: number, rimHeight: number): StampDefinition {
  // Create custom height data for crater shape
  const size = outerSize;
  const heightData = new Float32Array(size * size);
  const center = size / 2;
  const innerRadius = innerSize / 2;
  const outerRadius = outerSize / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let height = 0;
      if (dist < innerRadius) {
        // Inner depression
        const t = dist / innerRadius;
        height = -rimHeight * 0.5 * (1 - t * t);
      } else if (dist < outerRadius) {
        // Rim
        const t = (dist - innerRadius) / (outerRadius - innerRadius);
        // Bell curve for rim
        const rimT = Math.sin(t * Math.PI);
        height = rimHeight * rimT;
      }

      heightData[y * size + x] = height;
    }
  }

  return {
    id: `crater-${id}`,
    name,
    category: 'valley',
    shape: 'custom',
    width: size,
    height: size,
    heightOffset: 0,
    falloff: 'none',
    falloffRadius: 0,
    heightData,
    previewColor: '#f85149',
    description: `${name} - crater with rim height ${rimHeight} units`,
  };
}

/**
 * Creates a noise-based stamp for natural terrain variation.
 */
function createNoiseStamp(id: string, name: string, size: number, amplitude: number): StampDefinition {
  const heightData = new Float32Array(size * size);
  const center = size / 2;

  // Simple noise using multiple sine waves
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy) / center;

      // Multiple frequency noise
      let noise = 0;
      noise += Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.5;
      noise += Math.sin(x * 0.7 + 1.3) * Math.cos(y * 0.5 + 0.7) * 0.3;
      noise += Math.sin(x * 1.1 + 2.1) * Math.cos(y * 0.9 + 1.4) * 0.2;

      // Fade out at edges
      const fade = Math.max(0, 1 - dist);
      const smoothFade = fade * fade * (3 - 2 * fade);

      heightData[y * size + x] = noise * amplitude * smoothFade;
    }
  }

  return {
    id: `noise-${id}`,
    name,
    category: 'terrain',
    shape: 'custom',
    width: size,
    height: size,
    heightOffset: 0,
    falloff: 'none',
    falloffRadius: 0,
    heightData,
    previewColor: '#a5d6ff',
    description: `${name} - adds natural terrain variation`,
  };
}

/**
 * Calculates stamp height at a given position.
 */
export function calculateStampHeight(
  stamp: StampDefinition,
  instance: StampInstance,
  worldX: number,
  worldY: number
): number {
  // Transform to local stamp coordinates
  const localX = worldX - instance.x;
  const localY = worldY - instance.y;

  // Apply inverse rotation
  const cos = Math.cos(-instance.rotation * Math.PI / 180);
  const sin = Math.sin(-instance.rotation * Math.PI / 180);
  const rotX = localX * cos - localY * sin;
  const rotY = localX * sin + localY * cos;

  // Apply inverse scale
  const scaledX = rotX / instance.scale;
  const scaledY = rotY / instance.scale;

  // Check if within stamp bounds
  const halfW = stamp.width / 2;
  const halfH = stamp.height / 2;

  let influence = 0;

  if (stamp.shape === 'custom' && stamp.heightData) {
    // Custom stamp - sample from height data
    const dataX = Math.floor((scaledX + halfW) / stamp.width * stamp.width);
    const dataY = Math.floor((scaledY + halfH) / stamp.height * stamp.height);

    if (dataX >= 0 && dataX < stamp.width && dataY >= 0 && dataY < stamp.height) {
      return stamp.heightData[dataY * stamp.width + dataX] * instance.heightMultiplier;
    }
    return 0;
  }

  // Calculate distance-based influence
  if (stamp.shape === 'circle') {
    const radius = Math.min(halfW, halfH);
    const distance = Math.sqrt(scaledX * scaledX + scaledY * scaledY);

    if (distance > radius) return 0;

    const normalizedDist = distance / radius;
    influence = calculateFalloff(normalizedDist, stamp.falloff, stamp.falloffRadius);
  } else if (stamp.shape === 'square' || stamp.shape === 'rectangle') {
    if (Math.abs(scaledX) > halfW || Math.abs(scaledY) > halfH) return 0;

    const distX = Math.abs(scaledX) / halfW;
    const distY = Math.abs(scaledY) / halfH;
    const maxDist = Math.max(distX, distY);

    influence = calculateFalloff(maxDist, stamp.falloff, stamp.falloffRadius);
  }

  return stamp.heightOffset * influence * instance.heightMultiplier;
}

/**
 * Calculates falloff value based on distance and falloff type.
 */
function calculateFalloff(normalizedDistance: number, falloff: StampFalloff, falloffRadius: number): number {
  if (falloff === 'none') {
    return 1;
  }

  // Calculate where falloff starts (1 - falloffRadius)
  const falloffStart = 1 - falloffRadius;

  if (normalizedDistance <= falloffStart) {
    return 1;
  }

  // Normalize distance within falloff zone
  const t = (normalizedDistance - falloffStart) / falloffRadius;

  switch (falloff) {
    case 'linear':
      return 1 - t;
    case 'smooth':
      // Smoothstep
      return 1 - (t * t * (3 - 2 * t));
    case 'gaussian':
      // Gaussian-like falloff
      return Math.exp(-4 * t * t);
    default:
      return 1 - t;
  }
}

/**
 * Creates a stamp instance.
 */
export function createStampInstance(
  stampId: string,
  x: number,
  y: number,
  options: Partial<Omit<StampInstance, 'id' | 'stampId' | 'x' | 'y'>> = {}
): StampInstance {
  return {
    id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    stampId,
    x,
    y,
    scale: options.scale ?? 1,
    rotation: options.rotation ?? 0,
    heightMultiplier: options.heightMultiplier ?? 1,
    visible: options.visible ?? true,
    layerId: options.layerId,
  };
}

/**
 * Blend modes for stamp application.
 */
export type StampBlendMode = 'add' | 'subtract' | 'multiply' | 'replace' | 'max' | 'min';

/**
 * Options for applying a stamp to a grid.
 */
export interface ApplyStampOptions {
  /** Blend mode for combining stamp with existing terrain */
  blendMode?: StampBlendMode;
  /** Opacity/strength of the stamp (0-1) */
  opacity?: number;
  /** Whether to clamp heights to valid range */
  clampHeight?: boolean;
  /** Minimum height after clamping */
  minHeight?: number;
  /** Maximum height after clamping */
  maxHeight?: number;
}

/**
 * Applies a stamp instance to a grid, modifying cell heights.
 */
export function applyStampToGrid(
  grid: any, // Grid type
  stamp: StampDefinition,
  instance: StampInstance,
  options: ApplyStampOptions = {}
): void {
  const {
    blendMode = 'add',
    opacity = 1,
    clampHeight = true,
    minHeight = 0,
    maxHeight = 1000,
  } = options;

  if (!instance.visible) return;

  const cols = grid.getCols();
  const rows = grid.getRows();

  // Calculate affected area
  const scaledWidth = stamp.width * instance.scale;
  const scaledHeight = stamp.height * instance.scale;
  const halfW = scaledWidth / 2;
  const halfH = scaledHeight / 2;

  // Bounding box (with some margin for rotation)
  const margin = Math.max(halfW, halfH) * 1.5;
  const minX = Math.max(0, Math.floor(instance.x - margin));
  const maxX = Math.min(cols - 1, Math.ceil(instance.x + margin));
  const minY = Math.max(0, Math.floor(instance.y - margin));
  const maxY = Math.min(rows - 1, Math.ceil(instance.y + margin));

  // Apply stamp to each cell in affected area
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cell = grid.getCell(x, y);
      if (!cell) continue;

      const stampHeight = calculateStampHeight(stamp, instance, x, y);
      if (stampHeight === 0) continue;

      const adjustedHeight = stampHeight * opacity;
      let newHeight = cell.height;

      switch (blendMode) {
        case 'add':
          newHeight = cell.height + adjustedHeight;
          break;
        case 'subtract':
          newHeight = cell.height - adjustedHeight;
          break;
        case 'multiply':
          newHeight = cell.height * (1 + adjustedHeight / 100);
          break;
        case 'replace':
          newHeight = adjustedHeight;
          break;
        case 'max':
          newHeight = Math.max(cell.height, cell.height + adjustedHeight);
          break;
        case 'min':
          newHeight = Math.min(cell.height, cell.height + adjustedHeight);
          break;
      }

      if (clampHeight) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      }

      cell.height = newHeight;
    }
  }
}

/**
 * Applies multiple stamp instances to a grid.
 */
export function applyStampsToGrid(
  grid: any,
  library: StampLibrary,
  instances: StampInstance[],
  options: ApplyStampOptions = {}
): void {
  for (const instance of instances) {
    const stamp = library.getStamp(instance.stampId);
    if (stamp) {
      applyStampToGrid(grid, stamp, instance, options);
    }
  }
}

/**
 * Creates a random mountain range using multiple stamps.
 */
export function createMountainRange(
  library: StampLibrary,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options: {
    density?: number;
    heightVariation?: number;
    scaleVariation?: number;
  } = {}
): StampInstance[] {
  const { density = 0.5, heightVariation = 0.3, scaleVariation = 0.4 } = options;

  const instances: StampInstance[] = [];
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(length * density / 20);

  const mountainStamps = library.getStampsByCategory('mountain');
  if (mountainStamps.length === 0) return instances;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = startX + dx * t + (Math.random() - 0.5) * 30;
    const y = startY + dy * t + (Math.random() - 0.5) * 30;

    // Pick random mountain stamp
    const stamp = mountainStamps[Math.floor(Math.random() * mountainStamps.length)];

    const instance = createStampInstance(stamp.id, x, y, {
      scale: 0.8 + Math.random() * scaleVariation,
      rotation: Math.random() * 360,
      heightMultiplier: 0.7 + Math.random() * heightVariation,
    });

    instances.push(instance);
  }

  return instances;
}

/**
 * Creates a crater field using multiple crater stamps.
 */
export function createCraterField(
  library: StampLibrary,
  centerX: number,
  centerY: number,
  radius: number,
  count: number
): StampInstance[] {
  const instances: StampInstance[] = [];
  const craterStamps = library.getStampsByCategory('valley').filter(s => s.id.startsWith('crater-'));

  if (craterStamps.length === 0) return instances;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const x = centerX + Math.cos(angle) * dist;
    const y = centerY + Math.sin(angle) * dist;

    const stamp = craterStamps[Math.floor(Math.random() * craterStamps.length)];

    const instance = createStampInstance(stamp.id, x, y, {
      scale: 0.5 + Math.random() * 0.8,
      rotation: Math.random() * 360,
      heightMultiplier: 0.6 + Math.random() * 0.5,
    });

    instances.push(instance);
  }

  return instances;
}

