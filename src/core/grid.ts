/**
 * Grid data structure for heightmap generation.
 * Uses typed arrays for efficient memory usage in large grids.
 */

import { Cell, createCell, CellFlags } from './cell.js';
import { calculateBaseHeight } from './level.js';

/**
 * Grid dimensions and configuration.
 */
export interface GridConfig {
  /** Map width in Unreal units */
  width: number;
  /** Map height in Unreal units */
  height: number;
  /** Size of each cell in Unreal units */
  cellSize: number;
}

/**
 * Grid class for managing 2D cell arrays.
 * Uses typed arrays (Float32Array, Int16Array) for performance.
 */
export class Grid {
  private readonly rows: number;
  private readonly cols: number;
  private readonly cells: Cell[][];
  private readonly heightData: Float32Array;
  private readonly levelData: Int16Array;

  /**
   * Creates a new Grid with specified dimensions.
   *
   * @param config - Grid configuration (width, height, cellSize)
   * @throws Error if dimensions are invalid
   */
  constructor(config: GridConfig) {
    if (config.width <= 0 || config.height <= 0 || config.cellSize <= 0) {
      throw new Error('Invalid grid dimensions: width, height, and cellSize must be positive');
    }

    this.cols = Math.floor(config.width / config.cellSize);
    this.rows = Math.floor(config.height / config.cellSize);

    if (this.rows <= 0 || this.cols <= 0) {
      throw new Error('Invalid grid dimensions: resulting grid size must be positive');
    }

    // Initialize typed arrays for performance
    const totalCells = this.rows * this.cols;
    this.heightData = new Float32Array(totalCells);
    this.levelData = new Int16Array(totalCells);

    // Initialize 2D cell array
    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      this.cells[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const index = y * this.cols + x;
        const levelId = 0;
        const height = calculateBaseHeight(levelId);

        this.levelData[index] = levelId;
        this.heightData[index] = height;

        this.cells[y][x] = createCell(levelId, height);
      }
    }
  }

  /**
   * Gets the number of rows in the grid.
   * @returns Number of rows
   */
  getRows(): number {
    return this.rows;
  }

  /**
   * Gets the number of columns in the grid.
   * @returns Number of columns
   */
  getCols(): number {
    return this.cols;
  }

  /**
   * Gets a cell at the specified coordinates.
   *
   * @param x - Column index (0-based)
   * @param y - Row index (0-based)
   * @returns Cell at (x, y)
   * @throws Error if coordinates are out of bounds
   */
  getCell(x: number, y: number): Cell {
    this.validateCoordinates(x, y);
    return this.cells[y][x];
  }

  /**
   * Sets a cell at the specified coordinates.
   *
   * @param x - Column index (0-based)
   * @param y - Row index (0-based)
   * @param cell - Cell to set
   * @throws Error if coordinates are out of bounds
   */
  setCell(x: number, y: number, cell: Cell): void {
    this.validateCoordinates(x, y);

    const index = y * this.cols + x;
    this.levelData[index] = cell.levelId;
    this.heightData[index] = cell.height;
    this.cells[y][x] = cell;
  }

  /**
   * Updates cell height at the specified coordinates.
   *
   * @param x - Column index (0-based)
   * @param y - Row index (0-based)
   * @param height - New height value
   * @throws Error if coordinates are out of bounds
   */
  setHeight(x: number, y: number, height: number): void {
    this.validateCoordinates(x, y);

    const index = y * this.cols + x;
    this.heightData[index] = height;
    this.cells[y][x].height = height;
  }

  /**
   * Updates cell level ID at the specified coordinates.
   *
   * @param x - Column index (0-based)
   * @param y - Row index (0-based)
   * @param levelId - New level ID
   * @throws Error if coordinates are out of bounds
   */
  setLevelId(x: number, y: number, levelId: number): void {
    this.validateCoordinates(x, y);

    const index = y * this.cols + x;
    this.levelData[index] = levelId;
    this.cells[y][x].levelId = levelId;
    this.cells[y][x].height = calculateBaseHeight(levelId);
    this.heightData[index] = this.cells[y][x].height;
  }

  /**
   * Gets cell flags at the specified coordinates.
   *
   * @param x - Column index (0-based)
   * @param y - Row index (0-based)
   * @returns CellFlags at (x, y)
   * @throws Error if coordinates are out of bounds
   */
  getFlags(x: number, y: number): CellFlags {
    this.validateCoordinates(x, y);
    return this.cells[y][x].flags;
  }

  /**
   * Validates that coordinates are within grid bounds.
   *
   * @param x - Column index
   * @param y - Row index
   * @throws Error if coordinates are out of bounds
   */
  private validateCoordinates(x: number, y: number): void {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
      throw new Error(
        `Coordinates out of bounds: (${x}, ${y}) not in range [0, ${this.cols}) x [0, ${this.rows})`
      );
    }
  }

  /**
   * Iterates over all cells in the grid.
   *
   * @param callback - Function called for each cell with (cell, x, y)
   */
  forEachCell(callback: (cell: Cell, x: number, y: number) => void): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        callback(this.cells[y][x], x, y);
      }
    }
  }

  /**
   * Gets the underlying height data array (read-only).
   * @returns Float32Array of height values
   */
  getHeightData(): Readonly<Float32Array> {
    return this.heightData;
  }

  /**
   * Gets the underlying level data array (read-only).
   * @returns Int16Array of level IDs
   */
  getLevelData(): Readonly<Int16Array> {
    return this.levelData;
  }
}

