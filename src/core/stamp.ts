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
    // Mountain stamps
    this.addStamp(createMountainStamp('small', 'Small Hill', 20, 50));
    this.addStamp(createMountainStamp('medium', 'Medium Mountain', 40, 120));
    this.addStamp(createMountainStamp('large', 'Large Mountain', 80, 200));
    this.addStamp(createMountainStamp('peak', 'Mountain Peak', 30, 300));

    // Valley stamps
    this.addStamp(createValleyStamp('small', 'Small Depression', 20, -30));
    this.addStamp(createValleyStamp('medium', 'Valley', 50, -80));
    this.addStamp(createValleyStamp('large', 'Deep Canyon', 80, -150));

    // Plateau stamps
    this.addStamp(createPlateauStamp('small', 'Small Plateau', 30, 60));
    this.addStamp(createPlateauStamp('large', 'Large Plateau', 60, 100));

    // Water feature stamps
    this.addStamp(createLakeStamp('pond', 'Pond', 15, -20));
    this.addStamp(createLakeStamp('lake', 'Lake', 40, -40));
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

