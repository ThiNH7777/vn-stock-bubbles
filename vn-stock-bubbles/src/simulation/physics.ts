/**
 * Core physics engine -- pure-function module with NO React dependencies.
 * All functions operate directly on SimulationBuffers typed arrays.
 *
 * Physics step chain: applyForces -> resolveCollisions -> enforceBoundary
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
  NOISE_FREQUENCY: 0.003,       // Lower = smoother, larger flow fields
  NOISE_AMPLITUDE: 0.15,        // Force magnitude -- gentle
  NOISE_TIME_SCALE: 0.0004,     // How fast noise field evolves
  DAMPING: 0.98,                // Velocity damping per step
  MAX_VELOCITY: 1.5,            // Cap to prevent runaways
  COLLISION_ITERATIONS: 4,      // Multi-pass collision (PHYS-03)
  OVERLAP_SLOP: 0.5,            // Allow 0.5px overlap (soft-body feel)
  PUSH_STRENGTH: 0.4,           // Partial resolution per pass (soft feel)
  BOUNDARY_PADDING: 15,         // px from canvas edge
  BOUNDARY_STIFFNESS: 0.1,      // Push-back force at edge
  BOUNDARY_DAMPING: 0.8,        // Velocity damping at boundary
} as const;

// ---------------------------------------------------------------------------
// Physics state (created once, reused every frame)
// ---------------------------------------------------------------------------
export interface PhysicsState {
  grid: SpatialHashGrid;
  noise2D: (x: number, y: number) => number;
  canvasWidth: number;
  canvasHeight: number;
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
  const { x, y, vx, vy, mass } = buffers;
  const freq = PHYSICS.NOISE_FREQUENCY;
  const amp = PHYSICS.NOISE_AMPLITUDE;
  const timeScale = PHYSICS.NOISE_TIME_SCALE;
  const damping = PHYSICS.DAMPING;
  const maxVel = PHYSICS.MAX_VELOCITY;

  for (let i = 0; i < count; i++) {
    // Simplex noise ambient force -- unique per bubble via position
    const noiseX = noise2D(x[i]! * freq, time * timeScale);
    const noiseY = noise2D(y[i]! * freq + 100, time * timeScale + 100);

    // Smaller bubbles move faster (force inversely proportional to mass)
    const invMassScale = 1.0 / Math.sqrt(mass[i]! + 1);
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
  const { x, y, vx, vy, radius, mass } = buffers;
  const iterations = PHYSICS.COLLISION_ITERATIONS;
  const slop = PHYSICS.OVERLAP_SLOP;
  const strength = PHYSICS.PUSH_STRENGTH;

  for (let iter = 0; iter < iterations; iter++) {
    // Rebuild grid each iteration (positions shift during resolution)
    grid.clear();
    for (let i = 0; i < count; i++) {
      grid.insert(i, x[i]!, y[i]!, radius[i]!);
    }

    for (let i = 0; i < count; i++) {
      // Query radius covers the maximum distance at which collision is possible
      grid.queryNeighbors(i, x[i]!, y[i]!, radius[i]! * 2, (j: number) => {
        const dx = x[j]! - x[i]!;
        const dy = y[j]! - y[i]!;
        const distSq = dx * dx + dy * dy;
        const minDist = radius[i]! + radius[j]!;

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

            // Light velocity transfer for soft momentum (30% energy)
            const relVelDot = (vx[i]! - vx[j]!) * nx + (vy[i]! - vy[j]!) * ny;
            if (relVelDot > 0) {
              const dampedImpulse = relVelDot * 0.3;
              vx[i] = vx[i]! - nx * dampedImpulse * pushI;
              vy[i] = vy[i]! - ny * dampedImpulse * pushI;
              vx[j] = vx[j]! + nx * dampedImpulse * pushJ;
              vy[j] = vy[j]! + ny * dampedImpulse * pushJ;
            }
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
 * Scatter bubbles with large ones biased toward center.
 * NO center gravity force -- placement only (PHYS-05 user override).
 * Called once at startup.
 */
export function initialPlacement(
  buffers: SimulationBuffers,
  count: number,
  width: number,
  height: number,
): void {
  const { x, y, mass } = buffers;

  // Sort indices by mass descending (largest first)
  const indices = Array.from({ length: count }, (_, i) => i);
  indices.sort((a, b) => mass[b]! - mass[a]!);

  const cx = width / 2;
  const cy = height / 2;
  const halfDiag = Math.sqrt(width * width + height * height) / 2;

  for (let k = 0; k < count; k++) {
    const i = indices[k]!;
    // Largest bubbles (t=0) get tight spawn radius around center (0.2 * halfDiagonal)
    // Smallest bubbles (t=1) get full canvas spread (0.9 * halfDiagonal)
    const t = k / count;
    const spawnRadius = (0.2 + t * 0.7) * halfDiag;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spawnRadius;

    x[i] = cx + Math.cos(angle) * dist;
    y[i] = cy + Math.sin(angle) * dist;
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
  physicsState.canvasWidth = newWidth;
  physicsState.canvasHeight = newHeight;
  physicsState.grid.resize(newWidth, newHeight);

  // Clamp all positions to new bounds (push inward if window shrank)
  enforceBoundary(buffers, count, newWidth, newHeight);
}
