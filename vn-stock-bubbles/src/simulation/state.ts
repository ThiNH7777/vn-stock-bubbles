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
  seedX: Float32Array;   // per-bubble noise seed X (random, unique per bubble)
  seedY: Float32Array;   // per-bubble noise seed Y (random, unique per bubble)
}

/**
 * Allocate all 6 typed arrays of the given size.
 * Float32Arrays are zero-initialized by default (vx/vy stay 0 for Phase 1).
 */
export function createSimulationBuffers(count: number): SimulationBuffers {
  const seedX = new Float32Array(count);
  const seedY = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    seedX[i] = Math.random() * 1000;
    seedY[i] = Math.random() * 1000;
  }
  return {
    x: new Float32Array(count),
    y: new Float32Array(count),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    radius: new Float32Array(count),
    mass: new Float32Array(count),
    seedX,
    seedY,
  };
}

/**
 * Initialize radius and mass from stock data.
 *
 * Radius is LINEAR proportional to |% change| — preserves exact ratio:
 *   radius = max(minRadius, maxRadius * |change| / maxAbsChange)
 *   e.g., 1% vs 5% → radius ratio = 1:5
 *
 * Mass is proportional to bubble area (radius^2) so bigger bubbles are heavier.
 */
export function initBuffersFromStocks(
  buffers: SimulationBuffers,
  stocks: { marketCap: number; changeDay: number }[],
  minRadius: number,
  maxRadius: number,
  areaWidth: number = 800,
  areaHeight: number = 600,
): void {
  const maxAbsChange = Math.max(...stocks.map(s => Math.abs(s.changeDay))) || 1;

  const centerX = areaWidth / 2;
  const centerY = areaHeight / 2;
  const spreadX = areaWidth * 0.4;
  const spreadY = areaHeight * 0.4;

  for (let i = 0; i < stocks.length; i++) {
    // Power curve t^1.5: small % → tiny bubble, big % → big bubble
    // 1%/5% → 14px, 3%/5% → 39px, 5%/5% → 75px (like reference)
    const t = Math.abs(stocks[i].changeDay) / maxAbsChange;
    buffers.radius[i] = minRadius + Math.pow(t, 1.5) * (maxRadius - minRadius);
    buffers.mass[i] = buffers.radius[i] * buffers.radius[i];

    buffers.x[i] = centerX + (Math.random() - 0.5) * 2 * spreadX;
    buffers.y[i] = centerY + (Math.random() - 0.5) * 2 * spreadY;
  }
}
