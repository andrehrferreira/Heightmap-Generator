/**
 * Stamp Loader - Loads PNG heightmap stamps and converts them to usable format.
 * Uses pre-generated thumbnails and manifest for fast loading.
 */

export interface LoadedStamp {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  heightData: Float32Array | null; // Loaded on demand
  thumbnail: string; // URL to thumbnail
  filename: string;
  fullPath: string;
  loaded: boolean;
}

interface StampManifest {
  generated: string;
  thumbSize: number;
  stamps: Array<{
    id: string;
    file: string;
    name: string;
    category: string;
    thumb: string;
  }>;
}

/**
 * Loads the full stamp image and extracts heightmap data.
 * Called on-demand when a stamp is selected.
 */
export async function loadStampHeightData(stamp: LoadedStamp): Promise<LoadedStamp> {
  if (stamp.loaded && stamp.heightData) {
    return stamp;
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const pixels = imageData.data;
      
      const heightData = new Float32Array(img.width * img.height);
      
      for (let i = 0; i < heightData.length; i++) {
        const pixelIndex = i * 4;
        const r = pixels[pixelIndex];
        const g = pixels[pixelIndex + 1];
        const b = pixels[pixelIndex + 2];
        heightData[i] = (r + g + b) / 3 / 255;
      }
      
      resolve({
        ...stamp,
        width: img.width,
        height: img.height,
        heightData,
        loaded: true,
      });
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load stamp: ${stamp.fullPath}`));
    };
    
    img.src = stamp.fullPath;
  });
}

/**
 * Loads stamp metadata from manifest (fast - no image loading).
 * Thumbnails are loaded via img src, full data loaded on demand.
 */
export async function loadAllStamps(): Promise<LoadedStamp[]> {
  try {
    // Try to load from manifest first (fast)
    const response = await fetch('/stamps/manifest.json');
    if (response.ok) {
      const manifest: StampManifest = await response.json();
      
      const stamps: LoadedStamp[] = manifest.stamps.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        width: 0, // Will be set when loaded
        height: 0,
        heightData: null,
        thumbnail: `/stamps/${s.thumb}`,
        filename: s.file,
        fullPath: `/stamps/${s.file}`,
        loaded: false,
      }));
      
      // Sort by category then name
      stamps.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
      
      console.log(`[Stamps] Loaded ${stamps.length} stamps from manifest`);
      return stamps;
    }
  } catch (error) {
    console.warn('[Stamps] Manifest not found, using fallback');
  }
  
  // Fallback: hardcoded list
  const stampFiles = [
    'HM_Alien_World_Bobble_02_Ex.png',
    'HM_Alien_World_Swirl_01_Ex.png',
    'HM_Alien_World_Voronian_03_Ex.png',
    'HM_Canyon_04_Ex.png',
    'HM_Canyon_18_Ex.png',
    'HM_Canyon_Shapes_03_Ex.png',
    'HM_Craters_01_Ex.png',
    'HM_Dover_Cliffs_06_Ex.png',
    'HM_Dover_Cliffs_15_Ex.png',
    'HM_Dune_Shapes_10_Ex.png',
    'HM_Dunes_06_Ex.png',
    'HM_Dunes_11_Ex.png',
    'HM_Dunes_19_Ex.png',
    'HM_Highlands_02_Ex.png',
    'HM_Highlands_09_Ex.png',
    'HM_Impact_02_Ex.png',
    'HM_Impact_14_Ex.png',
    'HM_Islands_07_Ex.png',
    'HM_Islands_23_Ex.png',
    'HM_Meadows_04_Ex.png',
    'HM_Meadows_12_Ex.png',
    'HM_Meadows_28_Ex.png',
    'HM_Monument_Desert_02_Ex.png',
    'HM_Pride_Rocks_01_Ex.png',
    'HM_Pride_Rocks_02_Ex.png',
    'HM_Pride_Rocks_11_Ex.png',
    'HM_Rocky_Desert_01_Ex.png',
    'HM_Rocky_Desert_12_Ex.png',
    'HM_Rocky_Plateaus_01_Ex.png',
    'HM_Rolling_Hills_06_Ex.png',
    'HM_Rough_Cliffs_18_Ex.png',
    'HM_Rugged_Rocks_02_Ex.png',
    'HM_Rugged_Rocks_14_Ex.png',
    'HM_Rugged_Rocks_20_Ex.png',
    'HM_Rugged_Sedi_Rocks_08_Ex.png',
    'HM_Rugged_Sedi_Rocks_24_Ex.png',
    'HM_Sandy_Beaches_05_Ex.png',
    'HM_Seaside_Cliffs_02_Ex.png',
    'HM_Seaside_Cliffs_06_Ex.png',
    'HM_Stranger_Lands_02_Ex.png',
    'HM_Stranger_Lands_06_Ex.png',
    'HM_Stranger_Lands_24_Ex.png',
    'HM_Terrace_Fields_15_Ex.png',
    'HM_Terraced_Cliffs_01_Ex.png',
    'HM_Terraced_Cliffs_06_Ex.png',
    'HM_Terraced_Cliffs_Drake_Ex.png',
    'HM_Tundra_01_Ex.png',
    'HM_Tundra_11_Ex.png',
    'HM_Valleys_01_Ex.png',
    'HM_Volcano_03_Ex.png',
    'HM_Volcano_10_Ex.png',
    'HM_Volcano_20_Ex.png',
  ];
  
  // Detect category from filename
  const detectCategory = (filename: string): string => {
    if (/crater|impact/i.test(filename)) return 'crater';
    if (/canyon/i.test(filename)) return 'canyon';
    if (/volcano/i.test(filename)) return 'volcano';
    if (/highland|mountain|peak|rock|cliff|rugged/i.test(filename)) return 'mountain';
    if (/valley|meadow|rolling/i.test(filename)) return 'valley';
    if (/dune|desert|sandy/i.test(filename)) return 'desert';
    if (/island|beach|seaside/i.test(filename)) return 'island';
    if (/alien|stranger|voronian/i.test(filename)) return 'alien';
    if (/terrace/i.test(filename)) return 'terrace';
    if (/tundra/i.test(filename)) return 'tundra';
    return 'terrain';
  };
  
  const filenameToName = (filename: string): string => {
    return filename
      .replace(/^HM_/, '')
      .replace(/_Ex\.png$/i, '')
      .replace(/_/g, ' ')
      .replace(/(\d+)$/, ' $1')
      .trim();
  };
  
  const stamps: LoadedStamp[] = stampFiles.map(file => ({
    id: `stamp-${file.replace(/\.[^.]+$/, '')}`,
    name: filenameToName(file),
    category: detectCategory(file),
    width: 0,
    height: 0,
    heightData: null,
    thumbnail: `/stamps/thumbs/${file}`,
    filename: file,
    fullPath: `/stamps/${file}`,
    loaded: false,
  }));
  
  stamps.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
  
  console.log(`[Stamps] Loaded ${stamps.length} stamps (fallback)`);
  return stamps;
}

/**
 * Applies a loaded stamp to a grid at the specified position.
 */
export function applyLoadedStampToGrid(
  grid: any,
  stamp: LoadedStamp,
  centerX: number,
  centerY: number,
  options: {
    scale?: number;
    rotation?: number;
    strength?: number;
    blendMode?: 'add' | 'subtract' | 'replace' | 'max' | 'min';
  } = {}
): void {
  if (!stamp.heightData || stamp.width === 0 || stamp.height === 0) {
    console.error('[Stamps] Cannot apply stamp: no height data loaded');
    return;
  }
  
  const {
    scale = 1,
    rotation = 0,
    strength = 100, // Height multiplier
    blendMode = 'add',
  } = options;
  
  const cols = grid.getCols();
  const rows = grid.getRows();
  
  console.log(`[Stamps] Applying stamp ${stamp.width}x${stamp.height} at (${centerX}, ${centerY}) with scale=${scale} (effective=${effectiveScale.toFixed(3)}), strength=${strength}`);
  
  // Scale stamp to fit within a reasonable portion of the grid
  // Stamps are typically 4096x4096, we want them to cover ~25% of the grid by default
  const baseScale = Math.min(cols, rows) / stamp.width * 0.25;
  const effectiveScale = baseScale * scale;
  
  const scaledWidth = stamp.width * effectiveScale;
  const scaledHeight = stamp.height * effectiveScale;
  const halfW = scaledWidth / 2;
  const halfH = scaledHeight / 2;
  
  // Rotation
  const cos = Math.cos(rotation * Math.PI / 180);
  const sin = Math.sin(rotation * Math.PI / 180);
  
  // Calculate bounds
  const margin = Math.max(halfW, halfH) * 1.5;
  const minX = Math.max(0, Math.floor(centerX - margin));
  const maxX = Math.min(cols - 1, Math.ceil(centerX + margin));
  const minY = Math.max(0, Math.floor(centerY - margin));
  const maxY = Math.min(rows - 1, Math.ceil(centerY + margin));
  
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cell = grid.getCell(x, y);
      if (!cell) continue;
      
      // Transform to stamp local coordinates
      const localX = x - centerX;
      const localY = y - centerY;
      
      // Apply inverse rotation
      const rotX = localX * cos + localY * sin;
      const rotY = -localX * sin + localY * cos;
      
      // Scale to stamp coordinates
      const stampX = (rotX / effectiveScale) + stamp.width / 2;
      const stampY = (rotY / effectiveScale) + stamp.height / 2;
      
      // Check bounds
      if (stampX < 0 || stampX >= stamp.width || stampY < 0 || stampY >= stamp.height) {
        continue;
      }
      
      // Bilinear interpolation for smooth sampling
      const x0 = Math.floor(stampX);
      const y0 = Math.floor(stampY);
      const x1 = Math.min(x0 + 1, stamp.width - 1);
      const y1 = Math.min(y0 + 1, stamp.height - 1);
      const tx = stampX - x0;
      const ty = stampY - y0;
      
      const h00 = stamp.heightData[y0 * stamp.width + x0];
      const h10 = stamp.heightData[y0 * stamp.width + x1];
      const h01 = stamp.heightData[y1 * stamp.width + x0];
      const h11 = stamp.heightData[y1 * stamp.width + x1];
      
      const h0 = h00 * (1 - tx) + h10 * tx;
      const h1 = h01 * (1 - tx) + h11 * tx;
      const sampledHeight = (h0 * (1 - ty) + h1 * ty) * strength;
      
      // Apply blend mode
      let newHeight = cell.height;
      switch (blendMode) {
        case 'add':
          newHeight = cell.height + sampledHeight;
          break;
        case 'subtract':
          newHeight = cell.height - sampledHeight;
          break;
        case 'replace':
          newHeight = sampledHeight;
          break;
        case 'max':
          newHeight = Math.max(cell.height, sampledHeight);
          break;
        case 'min':
          newHeight = Math.min(cell.height, sampledHeight);
          break;
      }
      
      cell.height = Math.max(0, newHeight);
    }
  }
}

/**
 * Gets unique categories from loaded stamps.
 */
export function getStampCategories(stamps: LoadedStamp[]): string[] {
  const categories = new Set(stamps.map(s => s.category));
  return Array.from(categories).sort();
}

