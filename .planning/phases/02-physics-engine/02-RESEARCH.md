# Phase 2: Physics Engine - Research

**Researched:** 2026-03-06
**Domain:** Custom 2D circle physics engine with spatial hash grid, Simplex noise ambient motion, fixed-timestep simulation loop, and Canvas 2D rendering at 400+ circles
**Confidence:** HIGH

## Summary

Phase 2 builds a custom circle-only physics engine that activates the 400+ stationary bubbles from Phase 1 into a lava-lamp-style floating simulation. The core technical challenges are: (1) O(1) collision detection via spatial hash grid instead of O(n^2) brute force, (2) smooth organic motion using Simplex noise forces, (3) soft-body collision response with mass-weighted resolution, and (4) a fixed-timestep game loop decoupled from the display refresh rate. All physics operates directly on the Phase 1 Float32Array typed arrays (x, y, vx, vy, radius, mass) without touching React state.

The user has explicitly decided: NO center gravity (PHYS-05 overridden), lava-lamp style ambient motion with Perlin/Simplex noise, soft-body collisions where bubbles overlap slightly before pushing apart, smaller bubbles move faster than larger ones, and soft boundary bouncing with padding. The physics engine must maintain 55+ fps with 400+ circles.

The approach is well-understood in the game development community. Semi-implicit Euler integration is the standard for game physics (used by most commercial engines). Spatial hash grids provide effectively optimal O(1) neighbor lookups for uniform-sized objects. Simplex noise (via the `simplex-noise` npm package, v4.0.3) provides smooth, organic force fields. The main risk is tuning: damping, noise parameters, and collision softness require empirical iteration to achieve the desired "peaceful, organic" feel.

**Primary recommendation:** Build a pure-function physics module (no React dependencies) with spatial hash grid, semi-implicit Euler integration, Simplex noise ambient forces, multi-pass soft collision resolution, and soft boundary containment. Wire it into a fixed-timestep game loop using requestAnimationFrame with accumulator pattern. All operations on Float32Array typed arrays for cache-friendly iteration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Lava lamp style ambient motion -- slow, smooth, organic floating
- Speed: moderate -- visible drift but not distracting (like soap bubbles)
- Smaller bubbles drift faster than larger ones (inversely proportional to mass)
- Use Perlin/Simplex noise for ambient force -- smooth, no jitter
- Soft body collision -- bubbles overlap slightly then push apart gradually (no sharp bounce)
- Maintain light momentum after collision -- bubble shifts a bit then slows down
- Mass-weighted collision resolution: small bubbles pushed more, large bubbles barely move
- Minor jitter acceptable -- no need for zero jitter, just not obviously visible
- NO center gravity (PHYS-05 overridden by user)
- Bubbles spread evenly across canvas
- Large bubbles prefer center -- via initial placement, NOT force attraction
- Random spawn across entire screen on startup
- Soft bounce at canvas edges -- decelerate, no jerk
- Bubbles fully contained in canvas -- no part sticking out (PHYS-06)
- Small padding (~10-20px) from canvas edges
- On browser resize: keep current positions, boundary containment pushes bubbles inward if they escaped

### Claude's Discretion
- Perlin noise parameters (frequency, amplitude, seed strategy)
- Damping coefficient tuning
- Collision iteration count (3-5 passes per PHYS-03)
- Spatial hash cell size relative to max bubble radius
- Exact soft-body overlap threshold before push-back
- Fixed timestep value (e.g., 1/60 vs 1/120)

### Deferred Ideas (OUT OF SCOPE)
- Drag interaction with force inversely proportional to mass (large bubbles harder to drag, small ones easier) -- Phase 4 (INTR-01)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PHYS-01 | Custom circle-only physics engine with semi-implicit Euler integration | Architecture Patterns section covers integration algorithm, velocity-then-position update order, damping |
| PHYS-02 | Spatial hash grid for O(1) collision detection (not brute-force O(n^2)) | Standard Stack + Architecture section details cell sizing, insert/query, and 50x performance gain over brute force |
| PHYS-03 | Multi-pass collision resolution (3-5 iterations) to prevent jitter | Architecture section covers iterative solver with soft-body overlap response and mass-weighted push-back |
| PHYS-04 | Fixed-timestep game loop decoupled from render rate | Architecture section covers accumulator pattern from Gaffer on Games, spiral of death prevention |
| PHYS-05 | Light center gravity pulling bubbles toward viewport center | USER OVERRIDE: No center gravity. Bubbles spread evenly. Large bubbles near center via initial placement only. |
| PHYS-06 | Boundary containment (bubbles stay within canvas) | Architecture section covers soft boundary bouncing with padding, clamp + velocity damping, resize handling |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| simplex-noise | 4.0.3 | Smooth noise for ambient forces | De facto JS/TS noise library; 2KB gzipped; 73M ops/sec; tree-shakeable; TypeScript-native |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | All other physics is custom | Spatial hash, integration, collision -- all hand-written for this specific circle-only use case |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| simplex-noise | Hand-rolled Perlin | simplex-noise is 2KB, 73M ops/sec, tested -- no reason to hand-roll |
| Custom spatial hash | rbush (R-tree) | R-tree is over-engineered for same-frame rebuild of uniform circles; grid is simpler and faster for this case |
| Custom physics | matter.js | 70KB+ library, rigid body engine -- overkill for circle-only soft-body; custom is lighter and tunable |
| Custom physics | planck.js / box2d-wasm | Full rigid body solvers -- wrong abstraction for soft lava-lamp feel |

**Installation:**
```bash
cd vn-stock-bubbles
npm install simplex-noise
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  simulation/
    state.ts           # (Phase 1 -- exists) SimulationBuffers, createSimulationBuffers, initBuffersFromStocks
    spatialHash.ts      # NEW: SpatialHashGrid class
    physics.ts          # NEW: Core physics engine (integration, forces, collision, boundary)
    gameLoop.ts         # NEW: Fixed-timestep loop with requestAnimationFrame
  components/
    BubbleCanvas.tsx    # (Phase 1 -- exists) Modified to use game loop + render all bubbles
```

### Pattern 1: Spatial Hash Grid

**What:** A 2D grid that bins circles into cells by position for O(1) neighbor lookups. Each frame: clear grid, insert all circles, query neighbors only for nearby cells.

**When to use:** Every physics step, before collision detection.

**Cell size selection (Claude's discretion):** Use `2 * maxRadius` as cell size. This ensures any circle touches at most 4 cells, and all potential collision partners are in the same cell or adjacent cells.

**Example:**
```typescript
// Source: redblobgames.com spatial hash + gorillasun.de grid optimization
export class SpatialHashGrid {
  private cellSize: number;
  private cols: number;
  private rows: number;
  private cells: Int32Array;      // Flat array: stores indices into entries
  private cellCounts: Int32Array; // Count of items per cell
  private entries: Int32Array;    // Stores bubble indices
  private maxPerCell: number;

  constructor(width: number, height: number, cellSize: number, maxEntries: number) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.maxPerCell = 16; // Max bubbles per cell (generous for 400 bubbles)
    const totalCells = this.cols * this.rows;
    this.cells = new Int32Array(totalCells * this.maxPerCell).fill(-1);
    this.cellCounts = new Int32Array(totalCells);
    this.entries = new Int32Array(maxEntries);
  }

  clear(): void {
    this.cellCounts.fill(0);
  }

  insert(index: number, x: number, y: number, radius: number): void {
    // A circle can span multiple cells -- insert into all overlapping cells
    const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellIdx = row * this.cols + col;
        const count = this.cellCounts[cellIdx];
        if (count < this.maxPerCell) {
          this.cells[cellIdx * this.maxPerCell + count] = index;
          this.cellCounts[cellIdx]++;
        }
      }
    }
  }

  // Query: find all potential neighbors in the same/adjacent cells
  queryNeighbors(index: number, x: number, y: number, radius: number, callback: (other: number) => void): void {
    const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellIdx = row * this.cols + col;
        const count = this.cellCounts[cellIdx];
        const base = cellIdx * this.maxPerCell;
        for (let k = 0; k < count; k++) {
          const other = this.cells[base + k];
          if (other > index) { // Only check each pair once
            callback(other);
          }
        }
      }
    }
  }
}
```

### Pattern 2: Semi-Implicit Euler Integration with Simplex Noise Ambient Forces

**What:** Update velocity first (with forces), then update position using the new velocity. Forces include: Simplex noise ambient force (inversely proportional to mass) and damping.

**When to use:** Every fixed timestep physics step.

**Example:**
```typescript
// Source: gafferongames.com/post/integration_basics + user decisions
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D(); // Uses Math.random() seed by default

// Recommended parameters (Claude's discretion):
const NOISE_FREQUENCY = 0.003;     // Lower = smoother, larger flow fields
const NOISE_AMPLITUDE = 0.15;      // Force magnitude (px/frame^2) -- gentle
const NOISE_TIME_SCALE = 0.0004;   // How fast the noise field evolves
const DAMPING = 0.98;              // Velocity damping per step (0.98 = slow stop)
const MAX_VELOCITY = 1.5;          // Cap velocity to prevent runaways

function applyForces(
  buffers: SimulationBuffers,
  count: number,
  time: number,
  dt: number,
): void {
  const { x, y, vx, vy, mass } = buffers;

  for (let i = 0; i < count; i++) {
    // Simplex noise ambient force -- unique per bubble via position
    const noiseX = noise2D(x[i] * NOISE_FREQUENCY, time * NOISE_TIME_SCALE);
    const noiseY = noise2D(y[i] * NOISE_FREQUENCY + 100, time * NOISE_TIME_SCALE + 100);

    // Smaller bubbles move faster (force inversely proportional to mass)
    const invMassScale = 1.0 / Math.sqrt(mass[i] + 1);
    const forceX = noiseX * NOISE_AMPLITUDE * invMassScale;
    const forceY = noiseY * NOISE_AMPLITUDE * invMassScale;

    // Semi-implicit Euler: update velocity FIRST
    vx[i] = (vx[i] + forceX * dt) * DAMPING;
    vy[i] = (vy[i] + forceY * dt) * DAMPING;

    // Clamp velocity
    const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
    if (speed > MAX_VELOCITY) {
      const scale = MAX_VELOCITY / speed;
      vx[i] *= scale;
      vy[i] *= scale;
    }

    // Then update position with new velocity
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
  }
}
```

### Pattern 3: Multi-Pass Soft-Body Collision Resolution

**What:** Iterate 3-5 times over all colliding pairs, pushing overlapping circles apart proportional to their inverse mass. Soft-body: allow slight overlap, push gradually.

**When to use:** After integration, every physics step. Multiple passes reduce jitter.

**Example:**
```typescript
// Source: Toptal game physics tutorial + user decisions (soft body, mass-weighted)

const COLLISION_ITERATIONS = 4;  // Claude's discretion: 4 passes
const OVERLAP_SLOP = 0.5;       // Allow 0.5px overlap before pushing (soft-body feel)
const PUSH_STRENGTH = 0.4;      // Don't resolve 100% per pass (soft feel)

function resolveCollisions(
  buffers: SimulationBuffers,
  count: number,
  grid: SpatialHashGrid,
): void {
  const { x, y, vx, vy, radius, mass } = buffers;

  for (let iter = 0; iter < COLLISION_ITERATIONS; iter++) {
    // Rebuild grid each iteration (positions shift during resolution)
    grid.clear();
    for (let i = 0; i < count; i++) {
      grid.insert(i, x[i], y[i], radius[i]);
    }

    for (let i = 0; i < count; i++) {
      grid.queryNeighbors(i, x[i], y[i], radius[i] * 2, (j: number) => {
        const dx = x[j] - x[i];
        const dy = y[j] - y[i];
        const distSq = dx * dx + dy * dy;
        const minDist = radius[i] + radius[j];

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;

          if (overlap > OVERLAP_SLOP) {
            // Normalize collision direction
            const nx = dx / dist;
            const ny = dy / dist;

            // Mass-weighted separation
            const totalInvMass = (1 / mass[i]) + (1 / mass[j]);
            const pushI = (1 / mass[i]) / totalInvMass;
            const pushJ = (1 / mass[j]) / totalInvMass;

            const correction = (overlap - OVERLAP_SLOP) * PUSH_STRENGTH;

            // Push apart (small bubbles move more)
            x[i] -= nx * correction * pushI;
            y[i] -= ny * correction * pushI;
            x[j] += nx * correction * pushJ;
            y[j] += ny * correction * pushJ;

            // Light velocity adjustment for soft momentum transfer
            const relVelDot = (vx[i] - vx[j]) * nx + (vy[i] - vy[j]) * ny;
            if (relVelDot > 0) {
              const dampedImpulse = relVelDot * 0.3; // Soft bounce (30% energy)
              vx[i] -= nx * dampedImpulse * pushI;
              vy[i] -= ny * dampedImpulse * pushI;
              vx[j] += nx * dampedImpulse * pushJ;
              vy[j] += ny * dampedImpulse * pushJ;
            }
          }
        }
      });
    }
  }
}
```

### Pattern 4: Soft Boundary Containment

**What:** Bubbles decelerate and push inward when touching canvas edges. No hard clamp -- smooth deceleration.

**When to use:** After collision resolution, every physics step.

**Example:**
```typescript
// Source: user decisions (soft bounce, 10-20px padding, no escaping)

const BOUNDARY_PADDING = 15;     // px from edge
const BOUNDARY_STIFFNESS = 0.1;  // Push-back force strength
const BOUNDARY_DAMPING = 0.8;    // Velocity damping at boundary

function enforceBoundary(
  buffers: SimulationBuffers,
  count: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const { x, y, vx, vy, radius } = buffers;
  const pad = BOUNDARY_PADDING;

  for (let i = 0; i < count; i++) {
    const r = radius[i];
    const minX = r + pad;
    const maxX = canvasWidth - r - pad;
    const minY = r + pad;
    const maxY = canvasHeight - r - pad;

    // Left boundary
    if (x[i] < minX) {
      x[i] = minX;
      if (vx[i] < 0) vx[i] *= -BOUNDARY_DAMPING;
      vx[i] += (minX - x[i]) * BOUNDARY_STIFFNESS;
    }
    // Right boundary
    if (x[i] > maxX) {
      x[i] = maxX;
      if (vx[i] > 0) vx[i] *= -BOUNDARY_DAMPING;
      vx[i] += (maxX - x[i]) * BOUNDARY_STIFFNESS;
    }
    // Top boundary
    if (y[i] < minY) {
      y[i] = minY;
      if (vy[i] < 0) vy[i] *= -BOUNDARY_DAMPING;
      vy[i] += (minY - y[i]) * BOUNDARY_STIFFNESS;
    }
    // Bottom boundary
    if (y[i] > maxY) {
      y[i] = maxY;
      if (vy[i] > 0) vy[i] *= -BOUNDARY_DAMPING;
      vy[i] += (maxY - y[i]) * BOUNDARY_STIFFNESS;
    }
  }
}
```

### Pattern 5: Fixed-Timestep Game Loop with Accumulator

**What:** Decouples physics updates (fixed dt) from rendering (variable frame rate). Uses accumulator pattern from Gaffer on Games.

**When to use:** This IS the main loop. Replaces the Phase 1 static render.

**Example:**
```typescript
// Source: gafferongames.com/post/fix_your_timestep

const FIXED_DT = 1000 / 60;       // 16.667ms physics step
const MAX_FRAME_TIME = 100;        // Cap at 100ms to prevent spiral of death
const MAX_STEPS_PER_FRAME = 5;     // Safety cap

export function createGameLoop(
  update: (dt: number, time: number) => void,
  render: () => void,
): { start: () => void; stop: () => void } {
  let rafId: number | null = null;
  let lastTime = 0;
  let accumulator = 0;
  let simTime = 0;

  function frame(currentTime: number) {
    if (lastTime === 0) lastTime = currentTime;

    let frameTime = currentTime - lastTime;
    lastTime = currentTime;

    // Clamp to prevent spiral of death (e.g., after tab was in background)
    if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;

    accumulator += frameTime;

    let steps = 0;
    while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      update(FIXED_DT, simTime);
      simTime += FIXED_DT;
      accumulator -= FIXED_DT;
      steps++;
    }

    render();
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (rafId !== null) return;
      lastTime = 0;
      accumulator = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}
```

### Pattern 6: Initial Placement Strategy

**What:** Scatter bubbles randomly across the canvas on startup, with larger bubbles biased toward center (per user decision -- via placement, not force).

**When to use:** Once, when initializing simulation or on canvas resize.

**Example:**
```typescript
// Source: user decision -- large bubbles near center via initial placement

function initialPlacement(
  buffers: SimulationBuffers,
  count: number,
  width: number,
  height: number,
): void {
  const { x, y, radius, mass } = buffers;

  // Sort indices by mass (descending) for placement priority
  const indices = Array.from({ length: count }, (_, i) => i);
  indices.sort((a, b) => mass[b] - mass[a]);

  const cx = width / 2;
  const cy = height / 2;

  for (let k = 0; k < count; k++) {
    const i = indices[k];
    // Larger bubbles get tighter spawn radius around center
    const t = k / count; // 0 = largest, 1 = smallest
    const spawnRadius = (0.2 + t * 0.7) * Math.min(width, height) / 2;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spawnRadius;

    x[i] = cx + Math.cos(angle) * dist;
    y[i] = cy + Math.sin(angle) * dist;
  }
}
```

### Pattern 7: Canvas Rendering for 400+ Bubbles

**What:** Render all bubbles from typed arrays each frame. Use batched paths where possible. The 3D gradient must be per-bubble (createRadialGradient cannot be batched).

**When to use:** Every render frame (called by game loop after physics).

**Key optimization:** For 400 circles with individual gradients, the main bottleneck is createRadialGradient + fill per circle. At 400 circles, Canvas 2D handles this fine at 60fps. Pre-rendering bubble sprites to offscreen canvases is a future optimization if needed, but unlikely necessary for 400 circles.

**Example:**
```typescript
function renderBubbles(
  ctx: CanvasRenderingContext2D,
  buffers: SimulationBuffers,
  count: number,
  width: number,
  height: number,
): void {
  // Clear
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  const { x, y, radius } = buffers;

  for (let i = 0; i < count; i++) {
    const cx = x[i];
    const cy = y[i];
    const r = radius[i];

    // Blue base (temporary -- Phase 3 adds real colors)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'hsl(210, 60%, 35%)';
    ctx.fill();

    // 3D sphere gradient overlay
    const grad = ctx.createRadialGradient(
      cx - r * 0.18, cy - r * 0.22, r * 0.05,
      cx, cy, r
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.14)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.05)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}
```

### Anti-Patterns to Avoid

- **Storing physics state in React state:** Never put x, y, vx, vy in useState or Zustand. Physics updates at 60fps must bypass React reconciliation entirely. Phase 1 already established this correctly.
- **Rebuilding spatial hash from scratch with `new` each frame:** Allocate once, call `clear()` each frame. Avoid garbage collection pressure.
- **Using `Math.sqrt` in tight inner loops when `distSq` comparison suffices:** For the broad-phase distance check, compare squared distances. Only compute `sqrt` when overlap is confirmed and you need the actual distance.
- **Variable timestep physics:** Never pass raw `deltaTime` into the physics integrator. Always use fixed dt with accumulator pattern.
- **Explicit Euler (position then velocity):** Always update velocity first, then position (semi-implicit Euler). The order matters for stability.
- **Allocating arrays/objects inside per-frame loops:** Pre-allocate all data structures. The inner collision loop runs ~1600 times per frame (400 * 4 passes) -- zero allocations allowed.
- **Canvas state save/restore in per-bubble loop:** Minimize `ctx.save()`/`ctx.restore()` calls. Only use them when absolutely necessary (e.g., clipping for text).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth noise generation | Custom Perlin noise implementation | `simplex-noise` v4.0.3 | 2KB, 73M ops/sec, TypeScript-native, tree-shakeable. Hand-rolling is error-prone and slower |
| Full rigid body physics | Box2D port, matter.js integration | Custom circle-only engine | The simulation only needs circles. A general rigid body solver is 70KB+ of unnecessary complexity |
| Rendering framework | pixi.js, three.js | Raw Canvas 2D API | 400 circles with gradients is well within Canvas 2D's capability. No framework needed |

**Key insight:** The physics engine is custom because it needs to be. Circle-only soft-body with lava-lamp feel is a very specific use case that no off-the-shelf library handles well. But noise generation is a solved problem -- use the library.

## Common Pitfalls

### Pitfall 1: Spiral of Death in Game Loop
**What goes wrong:** Tab is backgrounded for 5 seconds, then `requestAnimationFrame` fires with a 5000ms delta. The accumulator tries to run 300 physics steps, freezing the browser.
**Why it happens:** No frame time cap in the accumulator pattern.
**How to avoid:** Cap `frameTime` to 100ms (6 missed frames max). Also cap steps per frame to 5.
**Warning signs:** Browser freezing after switching tabs and returning.

### Pitfall 2: Bubbles Passing Through Each Other (Tunneling)
**What goes wrong:** Fast-moving small bubbles pass through each other without collision being detected.
**Why it happens:** At high velocity, a bubble can move past another in a single timestep, so they never overlap.
**How to avoid:** (a) Cap max velocity to prevent extreme motion, (b) use multi-pass collision resolution (4 passes), (c) fixed timestep prevents large position jumps.
**Warning signs:** Bubbles suddenly appearing on the wrong side of each other.

### Pitfall 3: Jittery Collisions From Over-Correction
**What goes wrong:** Bubbles oscillate rapidly when packed tightly, creating visible vibration.
**Why it happens:** Each collision pass pushes bubbles apart by 100% of the overlap, but adjacent pairs then re-overlap from the opposite direction.
**How to avoid:** (a) Push by only 40% of overlap per pass (`PUSH_STRENGTH = 0.4`), (b) allow small overlap slop (`OVERLAP_SLOP = 0.5px`), (c) use 4 iterations -- each pass converges closer to solution.
**Warning signs:** Bubbles vibrating in place, especially near canvas edges or in dense clusters.

### Pitfall 4: Uneven Motion -- Large and Small Bubbles Moving at Same Speed
**What goes wrong:** All bubbles drift at the same speed, making the simulation feel artificial.
**Why it happens:** Applying the same noise force to all bubbles regardless of mass.
**How to avoid:** Scale ambient force inversely with `sqrt(mass)`. Large bubbles (high mass) receive tiny force, small bubbles receive large force. User explicitly requested this behavior.
**Warning signs:** VIC (180,000B market cap) moving as fast as a 50B small-cap.

### Pitfall 5: Spatial Hash Cell Size Too Small
**What goes wrong:** Large bubbles span many cells, causing excessive cell insertions and queries. Performance degrades to worse than brute force.
**Why it happens:** Cell size chosen based on average radius rather than maximum radius.
**How to avoid:** Cell size = `2 * maxRadius`. This guarantees any circle touches at most 4 cells (2x2).
**Warning signs:** Profiler showing spatial hash operations taking longer than expected.

### Pitfall 6: Noise Field Produces Uniform Drift Direction
**What goes wrong:** All bubbles drift in the same direction, creating a "wind" effect instead of organic random motion.
**Why it happens:** Sampling noise at the same frequency for all bubbles, or using the same noise offset.
**How to avoid:** Use each bubble's position as noise input. Since bubbles are at different positions, they sample different parts of the noise field. The noise field should evolve slowly over time (TIME_SCALE = 0.0004).
**Warning signs:** All bubbles moving in the same direction simultaneously.

### Pitfall 7: Boundary Containment Breaks on Resize
**What goes wrong:** After browser resize, bubbles that were near the old right/bottom edges are now outside the new (smaller) canvas.
**Why it happens:** Only checking boundary during physics steps, not on resize events.
**How to avoid:** On resize, immediately clamp all bubble positions to new bounds and update the spatial hash grid dimensions.
**Warning signs:** Bubbles stuck outside visible canvas area after making the window smaller.

## Code Examples

Verified patterns from official sources:

### Simplex Noise Setup
```typescript
// Source: github.com/jwagner/simplex-noise.js README
import { createNoise2D } from 'simplex-noise';

// Default seeding (Math.random) -- fine for ambient motion
const noise2D = createNoise2D();

// Returns value in [-1, 1]
const value = noise2D(x * frequency, time * timeScale);
```

### Fixed Timestep with requestAnimationFrame (JavaScript)
```typescript
// Source: gafferongames.com/post/fix_your_timestep (adapted to JS)
const DT = 1000 / 60; // 16.667ms
let lastTime = 0;
let accumulator = 0;

function loop(now: number) {
  let frameTime = now - lastTime;
  lastTime = now;
  if (frameTime > 100) frameTime = 100; // Prevent spiral of death

  accumulator += frameTime;

  while (accumulator >= DT) {
    physicsStep(DT);
    accumulator -= DT;
  }

  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Circle-Circle Collision Detection (Distance Squared)
```typescript
// Source: MDN 2D collision detection + spicyyoghurt.com tutorial
const dx = x2 - x1;
const dy = y2 - y1;
const distSq = dx * dx + dy * dy;
const minDist = r1 + r2;

if (distSq < minDist * minDist) {
  // Collision detected -- only now compute sqrt
  const dist = Math.sqrt(distSq);
  const overlap = minDist - dist;
  // Resolve...
}
```

### Mass-Weighted Position Correction
```typescript
// Source: Newcastle University physics tutorial + Toptal game physics
const totalInvMass = (1 / massA) + (1 / massB);
const ratioA = (1 / massA) / totalInvMass; // Light object moves more
const ratioB = (1 / massB) / totalInvMass; // Heavy object moves less

// Push apart along collision normal
posA -= normal * overlap * ratioA;
posB += normal * overlap * ratioB;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Quadtree for spatial indexing | Spatial hash grid for uniform objects | Always preferred for same-size circles | Grid is simpler, faster, more cache-friendly for uniform particle systems |
| Explicit Euler integration | Semi-implicit Euler | Established best practice | Symplectic -- preserves energy, stable at large timesteps |
| Variable timestep physics | Fixed timestep with accumulator | Gaffer on Games (2004, still canonical) | Deterministic, reproducible, no physics instability |
| Per-frame garbage collection | Pre-allocated typed arrays | Modern JS performance practice | Eliminates GC pauses that cause frame drops |
| D3 force simulation | Custom engine | This project replaces D3 forces | D3's general-purpose force sim has overhead; custom is 10x lighter for circle-only use case |

**Deprecated/outdated:**
- D3 force simulation for this use case: The reference `script.js` uses `d3.forceSimulation` which is general-purpose and runs 500 pre-computation ticks. Phase 2 replaces this with a real-time custom engine.
- Perlin noise (original algorithm): Simplex noise is the successor -- same visual quality, lower computational cost, no directional artifacts.

## Open Questions

1. **Exact tuning of noise and damping parameters**
   - What we know: NOISE_FREQUENCY ~0.003, AMPLITUDE ~0.15, DAMPING ~0.98, TIME_SCALE ~0.0004 are reasonable starting values
   - What's unclear: The exact feel ("lava lamp, soap bubbles") requires visual tuning that can only happen empirically
   - Recommendation: Start with these values, plan for a tuning task where parameters are adjusted visually. Expose constants at the top of physics.ts for easy iteration.

2. **Rendering performance with 400 radial gradients**
   - What we know: Canvas 2D can handle 400 fillRect + arc calls easily. Radial gradients are more expensive.
   - What's unclear: Whether createRadialGradient per bubble per frame causes issues on lower-end devices
   - Recommendation: Implement direct gradient rendering first (simplest). If profiling shows gradient creation as bottleneck, add offscreen canvas sprite caching (pre-render each unique radius to a cached canvas, drawImage to main canvas). This optimization is unlikely to be needed for 400 circles but the escape hatch should be documented.

3. **Spatial hash grid resize on canvas resize**
   - What we know: Grid dimensions depend on canvas size. Cell size depends on max bubble radius (which is stable).
   - What's unclear: Whether to rebuild the grid on resize or just update dimensions
   - Recommendation: Store canvasWidth/canvasHeight as mutable state. On resize, update these values and clamp all bubble positions. The grid is rebuilt every frame anyway (clear + insert), so dimension changes are handled naturally.

## Sources

### Primary (HIGH confidence)
- [Gaffer on Games: Integration Basics](https://gafferongames.com/post/integration_basics/) - Semi-implicit Euler algorithm, stability properties, symplectic integration
- [Gaffer on Games: Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/) - Fixed timestep accumulator pattern, spiral of death prevention, interpolation
- [simplex-noise.js GitHub](https://github.com/jwagner/simplex-noise.js) - v4.0.3, createNoise2D API, seeding, 73M ops/sec benchmark, TypeScript-native
- [MDN: 2D Collision Detection](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection) - Circle-circle distance check algorithm
- [MDN: Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) - Offscreen canvas caching, pre-rendering, avoiding sub-pixel rendering
- [Red Blob Games: Spatial Hash](https://www.redblobgames.com/x/1730-spatial-hash/) - Grid-based spatial indexing concepts, comparison with R-tree

### Secondary (MEDIUM confidence)
- [Gorilla Sun: Particle System Optimization](https://www.gorillasun.de/blog/particle-system-optimization-grid-lookup-spatial-hashing/) - Grid implementation code, 50x speedup vs brute force benchmark
- [Toptal: Video Game Physics Part II](https://www.toptal.com/game/video-game-physics-part-ii-collision-detection-for-solid-objects) - Mass-weighted collision resolution formula
- [Spicy Yoghurt: Collision Detection Tutorial](https://spicyyoghurt.com/tutorials/html5-javascript-game-development/collision-detection-physics) - Circle collision JavaScript implementation
- [Newcastle University Physics Tutorials](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/5collisionresponse/) - Inverse mass position correction formula

### Tertiary (LOW confidence)
- Canvas performance with 400 radial gradients: No definitive benchmark found. Based on general knowledge that Canvas 2D handles 1000+ simple draw calls at 60fps, 400 gradient circles should be fine. Flag for profiling validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- simplex-noise v4.0.3 verified on GitHub, no alternatives needed
- Architecture (spatial hash): HIGH -- well-documented pattern with multiple implementations, 50x speedup verified
- Architecture (integration): HIGH -- semi-implicit Euler is canonical, Gaffer on Games is authoritative source
- Architecture (game loop): HIGH -- fixed timestep accumulator is the standard, Gaffer on Games is authoritative
- Architecture (collision response): HIGH -- mass-weighted resolution is standard physics, soft-body tuning is Claude's discretion
- Pitfalls: HIGH -- based on common game development issues, verified against multiple sources
- Performance (400 circles at 60fps): MEDIUM -- high confidence Canvas 2D can handle it, but gradient-per-bubble performance needs profiling

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- algorithms are timeless, simplex-noise unlikely to release breaking change)
