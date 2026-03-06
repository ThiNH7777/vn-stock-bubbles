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
  radius: Float32Array;  // bubble radius (CSS pixels) -- current (animated)
  targetRadius: Float32Array; // target radius for animation lerp
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
    targetRadius: new Float32Array(count),
    mass: new Float32Array(count),
    seedX,
    seedY,
  };
}

/**
 * ════════════════════════════════════════════════════════════════════
 * BUBBLE RADIUS FORMULA — depends on 3 factors:
 *
 *   1. Screen size  (W × H)  — responsive, bubbles scale with viewport
 *   2. % change     (|Δ_i|)  — bigger move → bigger bubble
 *   3. Bubble count (N)      — more bubbles → each one smaller
 *
 * ── Derivation ──
 *
 *   Target average radius (from screen + count):
 *     r_avg = √( fill × W × H / (N × π) )
 *
 *   Per-bubble weight (from % change, 0→1 range):
 *     w_i = α + (1 − α) × |Δ_i| / Δ_cap
 *     α = 0.25 (floor: 0% change stock = 25% of max radius)
 *     Δ_cap = 95th-percentile of |Δ|  (caps outliers)
 *
 *   Per-bubble radius (weight / avgWeight × targetAvg):
 *     r_i = r_avg × (w_i / w̄)
 *
 *   This guarantees:  Σ π r_i² ≈ fill × W × H
 *   (total bubble area = fill fraction of screen, regardless of N or screen size)
 *
 *   fill = 0.90  — bubbles fill ~90% of the screen
 * ════════════════════════════════════════════════════════════════════
 */

/**
 * Compute target radii from an array of |% change| values.
 * Writes into `out` Float32Array. Returns minR for reference.
 */
export function computeRadii(
  out: Float32Array,
  absChanges: number[],
  areaWidth: number,
  areaHeight: number,
): void {
  const N = absChanges.length;
  if (N === 0) return;

  const fill = 0.90 * 4;
  const rAvgTarget = Math.sqrt(fill * areaWidth * areaHeight / (N * Math.PI));

  const sorted = [...absChanges].sort((a, b) => a - b);
  const changeCap = Math.max(sorted[Math.floor(N * 0.95)] || 1, 0.5);

  const alpha = 0.25;
  const weights = new Float32Array(N);
  let wSum = 0;
  for (let i = 0; i < N; i++) {
    const t = Math.min(absChanges[i]! / changeCap, 1);
    weights[i] = alpha + (1 - alpha) * Math.sqrt(t);
    wSum += weights[i]!;
  }
  const wAvg = wSum / N;

  const minR = Math.max(8, Math.min(areaWidth, areaHeight) * 0.01);
  for (let i = 0; i < N; i++) {
    out[i] = Math.max(minR, rAvgTarget * (weights[i]! / wAvg));
  }
}

export function initBuffersFromStocks(
  buffers: SimulationBuffers,
  stocks: { marketCap: number; changeDay: number }[],
  _minRadius: number,
  _maxRadius: number,
  areaWidth: number = 800,
  areaHeight: number = 600,
): void {
  const N = stocks.length;
  if (N === 0) return;

  const absChanges = stocks.map(s => Math.abs(s.changeDay));
  computeRadii(buffers.radius, absChanges, areaWidth, areaHeight);

  // Copy to targetRadius (no animation on init)
  for (let i = 0; i < N; i++) {
    buffers.targetRadius[i] = buffers.radius[i]!;
    buffers.mass[i] = buffers.radius[i]! * buffers.radius[i]!;
  }

  // ── Initial random positions ──
  const cx = areaWidth / 2;
  const cy = areaHeight / 2;
  const sx = areaWidth * 0.4;
  const sy = areaHeight * 0.4;
  for (let i = 0; i < N; i++) {
    buffers.x[i] = cx + (Math.random() - 0.5) * 2 * sx;
    buffers.y[i] = cy + (Math.random() - 0.5) * 2 * sy;
  }
}
