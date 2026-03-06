/**
 * SpatialHashGrid -- O(1) neighbor lookup for circle collision detection.
 *
 * Uses pre-allocated Int32Array storage (zero per-frame allocations).
 * Rebuilt every frame via clear() + insert() -- intentional and fast for 400 items.
 * Cell size should be 2 * maxRadius so any circle touches at most 4 cells.
 */
export class SpatialHashGrid {
  private cellSize: number;
  private cols: number;
  private rows: number;
  private cells: Int32Array;
  private cellCounts: Int32Array;
  private maxPerCell: number;
  private totalCells: number;

  constructor(width: number, height: number, cellSize: number, _maxEntries: number) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.maxPerCell = 16;
    this.totalCells = this.cols * this.rows;
    this.cells = new Int32Array(this.totalCells * this.maxPerCell).fill(-1);
    this.cellCounts = new Int32Array(this.totalCells);
  }

  /** Reset cell counts -- no need to clear cells array (count controls reads). */
  clear(): void {
    this.cellCounts.fill(0);
  }

  /**
   * Insert a circle into all overlapping cells.
   * A circle at (x, y) with radius r spans cells from
   * floor((x-r)/cellSize) to floor((x+r)/cellSize), clamped to grid bounds.
   */
  insert(index: number, x: number, y: number, radius: number): void {
    const cs = this.cellSize;
    const minCol = Math.max(0, Math.floor((x - radius) / cs));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / cs));
    const minRow = Math.max(0, Math.floor((y - radius) / cs));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / cs));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellIdx = row * this.cols + col;
        const count = this.cellCounts[cellIdx]!;
        if (count < this.maxPerCell) {
          this.cells[cellIdx * this.maxPerCell + count] = index;
          this.cellCounts[cellIdx] = count + 1;
        }
      }
    }
  }

  /**
   * Query neighbors for a circle. Uses `other > index` guard to check
   * each pair only once. Calls callback(other) for each candidate.
   */
  queryNeighbors(index: number, x: number, y: number, radius: number, callback: (other: number) => void): void {
    const cs = this.cellSize;
    const minCol = Math.max(0, Math.floor((x - radius) / cs));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / cs));
    const minRow = Math.max(0, Math.floor((y - radius) / cs));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / cs));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellIdx = row * this.cols + col;
        const count = this.cellCounts[cellIdx]!;
        const base = cellIdx * this.maxPerCell;
        for (let k = 0; k < count; k++) {
          const other = this.cells[base + k]!;
          if (other > index) {
            callback(other);
          }
        }
      }
    }
  }

  /**
   * Handle canvas resize. Re-allocate arrays if new total cells exceeds
   * current capacity. Safe to call frequently -- only allocates when needed.
   */
  resize(width: number, height: number): void {
    const newCols = Math.ceil(width / this.cellSize);
    const newRows = Math.ceil(height / this.cellSize);
    const newTotalCells = newCols * newRows;

    this.cols = newCols;
    this.rows = newRows;

    if (newTotalCells > this.totalCells) {
      this.totalCells = newTotalCells;
      this.cells = new Int32Array(newTotalCells * this.maxPerCell).fill(-1);
      this.cellCounts = new Int32Array(newTotalCells);
    } else {
      this.totalCells = newTotalCells;
    }
  }
}
