/**
 * Simulation state using Float32Array typed arrays for cache-friendly,
 * high-performance physics computation. These buffers live outside React's
 * render cycle to avoid re-renders during 60fps simulation updates.
 *
 * Linked to the stock data array by matching index position:
 * buffers.x[i] corresponds to MOCK_STOCKS[i].
 */

export interface SimulationBuffers {
  x: Float32Array;       // x position (CSS pixels)
  y: Float32Array;       // y position (CSS pixels)
  vx: Float32Array;      // x velocity (px/frame) -- 0 in Phase 1
  vy: Float32Array;      // y velocity (px/frame) -- 0 in Phase 1
  radius: Float32Array;  // bubble radius (CSS pixels)
  mass: Float32Array;    // derived from market cap (billions VND)
}

/**
 * Allocate all 6 typed arrays of the given size.
 * Float32Arrays are zero-initialized by default (vx/vy stay 0 for Phase 1).
 */
export function createSimulationBuffers(count: number): SimulationBuffers {
  return {
    x: new Float32Array(count),
    y: new Float32Array(count),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    radius: new Float32Array(count),
    mass: new Float32Array(count),
  };
}

/**
 * Initialize radius and mass from stock data.
 *
 * Radius uses sqrt scale for area-proportional sizing:
 *   t = (sqrt(marketCap) - sqrt(minCap)) / (sqrt(maxCap) - sqrt(minCap))
 *   radius[i] = minRadius + t * (maxRadius - minRadius)
 *
 * Mass is set to raw marketCap value for physics (Phase 2).
 * x, y are scattered randomly around center (Phase 2 repositions with physics).
 * vx, vy remain at 0 (Float32Array default).
 */
export function initBuffersFromStocks(
  buffers: SimulationBuffers,
  stocks: { marketCap: number }[],
  minRadius: number,
  maxRadius: number,
  areaWidth: number = 800,
  areaHeight: number = 600,
): void {
  const caps = stocks.map(s => s.marketCap);
  const maxCap = Math.max(...caps);
  const minCap = Math.min(...caps);
  const sqrtMaxCap = Math.sqrt(maxCap);
  const sqrtMinCap = Math.sqrt(minCap);
  const sqrtRange = sqrtMaxCap - sqrtMinCap;

  const centerX = areaWidth / 2;
  const centerY = areaHeight / 2;
  const spreadX = areaWidth * 0.4;
  const spreadY = areaHeight * 0.4;

  for (let i = 0; i < stocks.length; i++) {
    // sqrt scale for area-proportional sizing
    const t = sqrtRange > 0
      ? (Math.sqrt(stocks[i].marketCap) - sqrtMinCap) / sqrtRange
      : 0.5;
    buffers.radius[i] = minRadius + t * (maxRadius - minRadius);
    buffers.mass[i] = stocks[i].marketCap;

    // Scatter randomly within a reasonable area around center
    // Phase 2 will reposition with physics
    buffers.x[i] = centerX + (Math.random() - 0.5) * 2 * spreadX;
    buffers.y[i] = centerY + (Math.random() - 0.5) * 2 * spreadY;

    // vx, vy remain 0 (Float32Array default)
  }
}
