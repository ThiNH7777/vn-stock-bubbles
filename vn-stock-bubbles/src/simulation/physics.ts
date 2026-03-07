/**
 * Core physics engine -- pure-function module with NO React dependencies.
 * All functions operate directly on SimulationBuffers typed arrays.
 *
 * Physics step chain: applyForces -> applySpreadForce -> resolveCollisions -> enforceBoundary
 * Called once per fixed timestep by the game loop (Phase 2, Plan 2).
 *
 * No center gravity force anywhere (PHYS-05 overridden by user decision).
 * Large bubbles near center is achieved via initialPlacement only.
 */

import type { SimulationBuffers } from './state';
import { SpatialHashGrid } from './spatialHash';
import { createNoise2D } from 'simplex-noise';

// ---------------------------------------------------------------------------
// Physics constants (exported for easy tuning)
// ---------------------------------------------------------------------------
export const PHYSICS = {
  NOISE_FREQUENCY: 0.0005,      // Very low = ultra-smooth drift
  NOISE_AMPLITUDE: 0.0003,      // Near-zero drift force
  NOISE_TIME_SCALE: 0.000015,   // Glacial drift evolution
  DAMPING: 0.82,                // Very heavy damping
  MAX_VELOCITY: 0.012,          // Near-static
  COLLISION_ITERATIONS: 4,      // Four passes for reliable separation
  COLLISION_GAP: 2,             // Minimum px gap between bubbles (prevents visual touching)
  OVERLAP_SLOP: 0,              // Zero tolerance -- no overlap allowed
  PUSH_STRENGTH: 0.7,           // Strong separation for overlapping bubbles during radius transitions
  BOUNDARY_PADDING: 15,         // px from canvas edge
  BOUNDARY_STIFFNESS: 0.02,     // Barely push from edge
  BOUNDARY_DAMPING: 0.02,       // Almost no bounce
  SPREAD_GRID_COLS: 10,         // Density grid columns for spread force
  SPREAD_GRID_ROWS: 8,          // Density grid rows for spread force
  SPREAD_STRENGTH: 0.00003,     // Moderate spread to help mobile separation
} as const;

// ---------------------------------------------------------------------------
// Physics state (created once, reused every frame)
// ---------------------------------------------------------------------------
export interface PhysicsState {
  grid: SpatialHashGrid;
  noise2D: (x: number, y: number) => number;
  canvasWidth: number;
  canvasHeight: number;
  densityGrid: Float32Array;  // Pre-allocated for spread force (zero GC)
}

/**
 * Factory function creating physics state. Call once at startup.
 * The SpatialHashGrid and noise2D function are reused every frame.
 */
export function createPhysicsState(
  maxBubbles: number,
  canvasWidth: number = 800,
  canvasHeight: number = 600,
  cellSize: number = 120,
): PhysicsState {
  return {
    grid: new SpatialHashGrid(canvasWidth, canvasHeight, cellSize, maxBubbles),
    noise2D: createNoise2D(),
    canvasWidth,
    canvasHeight,
    densityGrid: new Float32Array(PHYSICS.SPREAD_GRID_COLS * PHYSICS.SPREAD_GRID_ROWS),
  };
}

// ---------------------------------------------------------------------------
// Force application -- Simplex noise ambient force with semi-implicit Euler
// ---------------------------------------------------------------------------

/**
 * Apply Simplex noise ambient forces. Smaller bubbles drift faster
 * (inverse sqrt mass scaling). Semi-implicit Euler: velocity first,
 * then position.
 *
 * NO center gravity force (PHYS-05 user override).
 */
export function applyForces(
  buffers: SimulationBuffers,
  count: number,
  time: number,
  dt: number,
  noise2D: (x: number, y: number) => number,
): void {
  const { x, y, vx, vy, mass, seedX, seedY } = buffers;
  const amp = PHYSICS.NOISE_AMPLITUDE;
  const timeScale = PHYSICS.NOISE_TIME_SCALE;
  const damping = PHYSICS.DAMPING;
  const maxVel = PHYSICS.MAX_VELOCITY;

  for (let i = 0; i < count; i++) {
    // Simplex noise ambient force -- unique per bubble via seed (not position)
    // Each bubble drifts in its own independent direction
    const noiseX = noise2D(seedX[i]! + time * timeScale, seedY[i]!);
    const noiseY = noise2D(seedX[i]!, seedY[i]! + time * timeScale + 500);

    // Gentle mass scaling: big bubbles drift slightly slower, small ones slightly faster
    // Exponent 0.15 → ratio ~1.7x (not 10x like sqrt was)
    const invMassScale = 1.0 / Math.pow(mass[i]! + 1, 0.15);
    const forceX = noiseX * amp * invMassScale;
    const forceY = noiseY * amp * invMassScale;

    // Semi-implicit Euler: update velocity FIRST
    let newVx = (vx[i]! + forceX * dt) * damping;
    let newVy = (vy[i]! + forceY * dt) * damping;

    // Clamp velocity to MAX_VELOCITY to prevent runaways
    const speed = Math.sqrt(newVx * newVx + newVy * newVy);
    if (speed > maxVel) {
      const scale = maxVel / speed;
      newVx *= scale;
      newVy *= scale;
    }

    vx[i] = newVx;
    vy[i] = newVy;

    // Then update position with new velocity
    x[i] = x[i]! + newVx * dt;
    y[i] = y[i]! + newVy * dt;
  }
}

// ---------------------------------------------------------------------------
// Spread force -- bubbles drift toward empty space via density gradient
// ---------------------------------------------------------------------------

/**
 * Coarse density grid approach (O(n)):
 * 1. Accumulate bubble area into a low-res grid
 * 2. For each bubble, compute density gradient from adjacent cells
 * 3. Push bubble away from high density (toward empty space)
 *
 * Out-of-bounds cells treated as high density to discourage edge crowding.
 * Smaller bubbles respond more (inverse sqrt mass scaling).
 */
export function applySpreadForce(
  buffers: SimulationBuffers,
  count: number,
  canvasWidth: number,
  canvasHeight: number,
  densityGrid: Float32Array,
): void {
  const { x, y, vx, vy, radius, mass } = buffers;
  const cols = PHYSICS.SPREAD_GRID_COLS;
  const rows = PHYSICS.SPREAD_GRID_ROWS;
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;
  const strength = PHYSICS.SPREAD_STRENGTH;

  // 1. Clear and accumulate density (proportional to bubble area)
  densityGrid.fill(0);
  for (let i = 0; i < count; i++) {
    const col = Math.min(cols - 1, Math.max(0, Math.floor(x[i]! / cellW)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(y[i]! / cellH)));
    densityGrid[row * cols + col] += radius[i]! * radius[i]!;
  }

  // 2. For each bubble, compute gradient and apply force toward lower density
  for (let i = 0; i < count; i++) {
    const ci = Math.min(cols - 1, Math.max(0, Math.floor(x[i]! / cellW)));
    const ri = Math.min(rows - 1, Math.max(0, Math.floor(y[i]! / cellH)));
    const here = densityGrid[ri * cols + ci]!;

    // Sample adjacent cells; out-of-bounds = 2x local density (repels from edges)
    const dLeft  = ci > 0        ? densityGrid[ri * cols + (ci - 1)]! : here * 2;
    const dRight = ci < cols - 1 ? densityGrid[ri * cols + (ci + 1)]! : here * 2;
    const dUp    = ri > 0        ? densityGrid[(ri - 1) * cols + ci]! : here * 2;
    const dDown  = ri < rows - 1 ? densityGrid[(ri + 1) * cols + ci]! : here * 2;

    // Gradient points from low->high density; negate to push toward low density
    const gradX = dRight - dLeft;
    const gradY = dDown - dUp;

    const invMassScale = 1.0 / Math.pow(mass[i]! + 1, 0.15);
    vx[i] = vx[i]! - gradX * strength * invMassScale;
    vy[i] = vy[i]! - gradY * strength * invMassScale;
  }
}

// ---------------------------------------------------------------------------
// Collision resolution -- multi-pass soft-body with mass-weighted push-back
// ---------------------------------------------------------------------------

/**
 * Multi-pass collision resolution using SpatialHashGrid for O(1) lookups.
 * 4 passes (PHYS-03) with soft-body overlap and mass-weighted separation.
 * Small bubbles move more, large bubbles barely budge.
 */
export function resolveCollisions(
  buffers: SimulationBuffers,
  count: number,
  grid: SpatialHashGrid,
): void {
  const { x, y, radius, mass } = buffers;
  const iterations = PHYSICS.COLLISION_ITERATIONS;
  const slop = PHYSICS.OVERLAP_SLOP;
  const strength = PHYSICS.PUSH_STRENGTH;
  const gap = PHYSICS.COLLISION_GAP;

  for (let iter = 0; iter < iterations; iter++) {
    // Rebuild grid each iteration (positions shift during resolution)
    grid.clear();
    for (let i = 0; i < count; i++) {
      grid.insert(i, x[i]!, y[i]!, radius[i]! + gap);
    }

    for (let i = 0; i < count; i++) {
      // Query radius covers the maximum distance at which collision is possible
      grid.queryNeighbors(i, x[i]!, y[i]!, (radius[i]! + gap) * 2, (j: number) => {
        const dx = x[j]! - x[i]!;
        const dy = y[j]! - y[i]!;
        const distSq = dx * dx + dy * dy;
        const minDist = radius[i]! + radius[j]! + gap;

        // Squared distance comparison first -- only compute sqrt when overlap confirmed
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;

          if (overlap > slop) {
            // Normalize collision direction
            const nx = dx / dist;
            const ny = dy / dist;

            // Mass-weighted separation (small bubbles move more)
            const invMassI = 1 / mass[i]!;
            const invMassJ = 1 / mass[j]!;
            const totalInvMass = invMassI + invMassJ;
            const pushI = invMassI / totalInvMass;
            const pushJ = invMassJ / totalInvMass;

            const correction = (overlap - slop) * strength;

            // Push apart along collision normal
            x[i] = x[i]! - nx * correction * pushI;
            y[i] = y[i]! - ny * correction * pushI;
            x[j] = x[j]! + nx * correction * pushJ;
            y[j] = y[j]! + ny * correction * pushJ;

            // No velocity transfer -- position-only correction prevents jitter
            // when multiple bubbles collide simultaneously
          }
        }
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Boundary containment -- soft bounce at canvas edges (PHYS-06)
// ---------------------------------------------------------------------------

/**
 * Keep all circles fully inside the canvas with padding.
 * Soft bounce: clamp position, reverse and damp velocity.
 * No jerk -- deceleration only (PHYS-06).
 */
export function enforceBoundary(
  buffers: SimulationBuffers,
  count: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const { x, y, vx, vy, radius } = buffers;
  const pad = PHYSICS.BOUNDARY_PADDING;
  const bDamp = PHYSICS.BOUNDARY_DAMPING;

  for (let i = 0; i < count; i++) {
    const r = radius[i]!;
    const minX = r + pad;
    const maxX = canvasWidth - r - pad;
    const minY = r + pad;
    const maxY = canvasHeight - r - pad;

    // Left boundary
    if (x[i]! < minX) {
      x[i] = minX;
      if (vx[i]! < 0) vx[i] = vx[i]! * -bDamp;
    }
    // Right boundary
    if (x[i]! > maxX) {
      x[i] = maxX;
      if (vx[i]! > 0) vx[i] = vx[i]! * -bDamp;
    }
    // Top boundary
    if (y[i]! < minY) {
      y[i] = minY;
      if (vy[i]! < 0) vy[i] = vy[i]! * -bDamp;
    }
    // Bottom boundary
    if (y[i]! > maxY) {
      y[i] = maxY;
      if (vy[i]! > 0) vy[i] = vy[i]! * -bDamp;
    }
  }
}

// ---------------------------------------------------------------------------
// Initial placement -- large bubbles near center, small toward edges
// ---------------------------------------------------------------------------

/**
 * Greedy placement: place each bubble at the position with least overlap.
 * Largest bubbles first (hardest to fit). For each bubble, try N random
 * candidates and pick the one farthest from already-placed neighbors.
 * Result: bubbles appear spread across the full screen with minimal overlap.
 */
export function initialPlacement(
  buffers: SimulationBuffers,
  count: number,
  width: number,
  height: number,
): void {
  const { x, y, mass, radius } = buffers;
  const pad = PHYSICS.BOUNDARY_PADDING;
  const gap = PHYSICS.COLLISION_GAP;

  // Sort indices by radius descending (place biggest first)
  const indices = Array.from({ length: count }, (_, i) => i);
  indices.sort((a, b) => radius[b]! - radius[a]!);

  const CANDIDATES = 20; // random positions to try per bubble

  for (let k = 0; k < count; k++) {
    const i = indices[k]!;
    const r = radius[i]!;
    const minX = pad + r;
    const maxX = width - pad - r;
    const minY = pad + r;
    const maxY = height - pad - r;
    const rangeX = Math.max(1, maxX - minX);
    const rangeY = Math.max(1, maxY - minY);

    let bestX = minX + Math.random() * rangeX;
    let bestY = minY + Math.random() * rangeY;
    let bestMinDist = -Infinity;

    for (let c = 0; c < CANDIDATES; c++) {
      const cx = minX + Math.random() * rangeX;
      const cy = minY + Math.random() * rangeY;

      // Find minimum distance to any already-placed bubble
      let minDist = Infinity;
      for (let p = 0; p < k; p++) {
        const j = indices[p]!;
        const dx = cx - x[j]!;
        const dy = cy - y[j]!;
        const dist = Math.sqrt(dx * dx + dy * dy) - radius[j]! - r - gap;
        if (dist < minDist) minDist = dist;
      }

      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestX = cx;
        bestY = cy;
      }
    }

    x[i] = bestX;
    y[i] = bestY;
  }
}

// ---------------------------------------------------------------------------
// Physics step orchestrator -- called once per fixed timestep
// ---------------------------------------------------------------------------

/**
 * Execute one physics step: forces -> collisions -> boundary.
 * Called by the game loop at fixed dt intervals.
 */
export function stepPhysics(
  physicsState: PhysicsState,
  buffers: SimulationBuffers,
  count: number,
  dt: number,
  time: number,
): void {
  applyForces(buffers, count, time, dt, physicsState.noise2D);
  applySpreadForce(buffers, count, physicsState.canvasWidth, physicsState.canvasHeight, physicsState.densityGrid);
  resolveCollisions(buffers, count, physicsState.grid);
  enforceBoundary(buffers, count, physicsState.canvasWidth, physicsState.canvasHeight);
}

// ---------------------------------------------------------------------------
// Resize handler -- update dimensions and clamp positions
// ---------------------------------------------------------------------------

/**
 * Handle canvas resize. Updates physics state dimensions, resizes spatial
 * hash grid, and clamps all bubble positions to new bounds.
 */
export function handleResize(
  physicsState: PhysicsState,
  buffers: SimulationBuffers,
  count: number,
  newWidth: number,
  newHeight: number,
): void {
  const oldWidth = physicsState.canvasWidth;
  const oldHeight = physicsState.canvasHeight;
  physicsState.canvasWidth = newWidth;
  physicsState.canvasHeight = newHeight;
  physicsState.grid.resize(newWidth, newHeight);

  // Scale positions proportionally so bubbles stay spread across the canvas
  if (oldWidth > 0 && oldHeight > 0) {
    const sx = newWidth / oldWidth;
    const sy = newHeight / oldHeight;
    for (let i = 0; i < count; i++) {
      buffers.x[i] = buffers.x[i]! * sx;
      buffers.y[i] = buffers.y[i]! * sy;
    }
  }

  // Clamp + resolve any overlaps caused by scaling
  enforceBoundary(buffers, count, newWidth, newHeight);
  for (let i = 0; i < 5; i++) {
    resolveCollisions(buffers, count, physicsState.grid);
    enforceBoundary(buffers, count, newWidth, newHeight);
  }
}
