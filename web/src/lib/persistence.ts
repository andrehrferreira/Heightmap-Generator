/**
 * Persistence utilities using IndexedDB for large data storage.
 * IndexedDB has much larger storage limits than localStorage.
 */

const DB_NAME = 'heightmap-generator';
const DB_VERSION = 1;
const STORE_NAME = 'terrain-data';

interface StoredData {
  id: string;
  data: any;
  timestamp: number;
}

/**
 * Open IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Save data to IndexedDB.
 */
export async function saveToIndexedDB(key: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const storedData: StoredData = {
      id: key,
      data,
      timestamp: Date.now(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(storedData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Save failed:', error);
    throw error;
  }
}

/**
 * Load data from IndexedDB.
 */
export async function loadFromIndexedDB(key: string): Promise<any | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db.close();
        const result = request.result as StoredData | undefined;
        resolve(result?.data ?? null);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Load failed:', error);
    return null;
  }
}

/**
 * Delete data from IndexedDB.
 */
export async function deleteFromIndexedDB(key: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Delete failed:', error);
  }
}

/**
 * Compress height data to binary format for efficient storage.
 * Heights are stored as Float32Array which is much smaller than JSON.
 */
export function compressHeightData(
  width: number,
  height: number,
  heights: number[],
  levelIds: number[],
  flags: number[] // Packed flags as bitmask
): ArrayBuffer {
  // Header: width (4), height (4)
  // Heights: Float32 array
  // LevelIds: Uint8 array
  // Flags: Uint16 array (16 possible flags)
  
  const headerSize = 8;
  const heightsSize = heights.length * 4;
  const levelIdsSize = levelIds.length;
  const flagsSize = flags.length * 2;
  
  const buffer = new ArrayBuffer(headerSize + heightsSize + levelIdsSize + flagsSize);
  const view = new DataView(buffer);
  
  // Write header
  view.setUint32(0, width, true);
  view.setUint32(4, height, true);
  
  // Write heights
  const heightsArray = new Float32Array(buffer, headerSize, heights.length);
  heightsArray.set(heights);
  
  // Write levelIds
  const levelIdsArray = new Uint8Array(buffer, headerSize + heightsSize, levelIds.length);
  levelIdsArray.set(levelIds);
  
  // Write flags
  const flagsArray = new Uint16Array(buffer, headerSize + heightsSize + levelIdsSize, flags.length);
  flagsArray.set(flags);
  
  return buffer;
}

/**
 * Decompress height data from binary format.
 */
export function decompressHeightData(buffer: ArrayBuffer): {
  width: number;
  height: number;
  heights: Float32Array;
  levelIds: Uint8Array;
  flags: Uint16Array;
} {
  const view = new DataView(buffer);
  
  const width = view.getUint32(0, true);
  const height = view.getUint32(4, true);
  const cellCount = width * height;
  
  const headerSize = 8;
  const heightsSize = cellCount * 4;
  const levelIdsSize = cellCount;
  
  const heights = new Float32Array(buffer, headerSize, cellCount);
  const levelIds = new Uint8Array(buffer, headerSize + heightsSize, cellCount);
  const flags = new Uint16Array(buffer, headerSize + heightsSize + levelIdsSize, cellCount);
  
  return { width, height, heights, levelIds, flags };
}

/**
 * Pack cell flags into a single number.
 */
export function packFlags(flags: Record<string, boolean>): number {
  let packed = 0;
  if (flags.road) packed |= 1;
  if (flags.ramp) packed |= 2;
  if (flags.water) packed |= 4;
  if (flags.cliff) packed |= 8;
  if (flags.playable) packed |= 16;
  if (flags.underwater) packed |= 32;
  if (flags.visualOnly) packed |= 64;
  if (flags.blocked) packed |= 128;
  if (flags.boundary) packed |= 256;
  return packed;
}

/**
 * Unpack cell flags from a number.
 */
export function unpackFlags(packed: number): Record<string, boolean> {
  return {
    road: (packed & 1) !== 0,
    ramp: (packed & 2) !== 0,
    water: (packed & 4) !== 0,
    cliff: (packed & 8) !== 0,
    playable: (packed & 16) !== 0,
    underwater: (packed & 32) !== 0,
    visualOnly: (packed & 64) !== 0,
    blocked: (packed & 128) !== 0,
    boundary: (packed & 256) !== 0,
  };
}

// Storage keys
export const KEYS = {
  CONFIG: 'config',
  VIEW_MODE: 'viewMode',
  GRID_DATA: 'gridData',
  ROAD_NETWORK: 'roadNetwork',
  HEIGHT_STATS: 'heightStats',
  CAMERA: 'camera',
};

/**
 * Clear all stored data.
 */
export async function clearAllData(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db.close();
        console.log('[IndexedDB] All data cleared');
        resolve();
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Clear failed:', error);
  }
}

