# Architecture Patterns

**Domain:** Interactive physics-based bubble chart visualization (1500+ entities)
**Researched:** 2026-03-06

## Recommended Architecture

A **layered architecture** with clear separation between physics simulation, spatial indexing, rendering, interaction handling, and application state. The system is structured as a real-time simulation loop with distinct update and render phases, following the fixed-timestep game loop pattern.

### High-Level System Diagram

```
+------------------------------------------------------------------+
|                        Application Shell                          |
|   (React/UI framework -- header, filters, search, settings)      |
+------------------------------------------------------------------+
        |                    |                      |
        v                    v                      v
+----------------+  +------------------+  +-------------------+
| App State      |  | Data Layer       |  | Interaction       |
| (Zustand)      |  | (Mock/API data)  |  | Manager           |
| - filters      |  | - stock tickers  |  | - mouse/touch     |
| - timeframe    |  | - market data    |  | - drag state      |
| - color scheme |  | - transformations|  | - hover detection |
| - view config  |  |                  |  | - zoom/pan        |
+-------+--------+  +--------+---------+  +---------+---------+
        |                     |                      |
        v                     v                      v
+------------------------------------------------------------------+
|                     Simulation Controller                         |
|   (owns the game loop, coordinates all subsystems)               |
|   - requestAnimationFrame loop                                   |
|   - fixed-timestep physics updates                               |
|   - variable-rate rendering                                      |
+------------------------------------------------------------------+
        |                    |                      |
        v                    v                      v
+----------------+  +------------------+  +-------------------+
| Physics Engine |  | Spatial Index    |  | Renderer          |
| (custom)       |  | (Spatial Hash)   |  | (Canvas 2D)       |
| - positions    |  | - broad-phase    |  | - circle drawing  |
| - velocities   |  |   collision      |  | - text caching    |
| - forces       |  | - neighbor query |  | - glow effects    |
| - constraints  |  | - hit testing    |  | - viewport culling|
| - boundaries   |  |                  |  | - DPR scaling     |
+----------------+  +------------------+  +-------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Data Owned |
|-----------|---------------|-------------------|------------|
| **App State** | UI state, filters, user preferences | All components read from it | Timeframe, color scheme, exchange filter, stock count, search query |
| **Data Layer** | Fetching, transforming, and caching stock data | App State (reads filters), Physics Engine (provides bubble specs) | Raw market data, computed bubble sizes/colors |
| **Simulation Controller** | Game loop orchestration, timestep management | Physics Engine, Spatial Index, Renderer, Interaction Manager | Frame timing, accumulator, running/paused state |
| **Physics Engine** | Position/velocity integration, force application, boundary constraints | Spatial Index (queries neighbors), Simulation Controller (receives tick calls) | Bubble positions, velocities, accelerations, radii |
| **Spatial Index** | Broad-phase collision detection, neighbor queries, point-in-bubble hit testing | Physics Engine (reads positions), Interaction Manager (hit test queries) | Grid cells, bucket assignments |
| **Renderer** | Drawing bubbles to canvas, visual effects, text labels | Physics Engine (reads positions), App State (reads color scheme), Data Layer (reads ticker info) | Canvas context, cached text bitmaps, offscreen canvases |
| **Interaction Manager** | Mouse/touch event handling, drag physics, hover state, zoom/pan transforms | Spatial Index (hit testing), Physics Engine (applies drag forces), Renderer (hover glow state) | Drag state, pointer position, active bubble reference, viewport transform |

## Data Flow

### Frame-by-Frame Data Flow (The Simulation Loop)

```
Each frame:

1. requestAnimationFrame fires
   |
   v
2. Simulation Controller calculates delta time
   |
   v
3. FIXED TIMESTEP LOOP (may run 0-N times per frame):
   |
   +---> Interaction Manager: process queued input events
   |     - Mouse/touch position -> drag force on grabbed bubble
   |     - Scroll events -> zoom level changes
   |
   +---> Physics Engine: integrate(dt)
   |     a. Apply forces: gravity-toward-center, drag damping,
   |        user drag force, ambient "float" noise
   |     b. Integrate positions (Verlet or semi-implicit Euler)
   |     c. Rebuild Spatial Index from new positions
   |     d. Broad-phase collision detection via Spatial Index
   |     e. Narrow-phase: circle-circle overlap resolution
   |     f. Boundary constraint: keep bubbles in viewport
   |
   +---> (loop back if accumulator >= fixed timestep)
   |
   v
4. RENDER (runs once per frame, at display refresh rate):
   |
   +---> Renderer: clear canvas
   +---> Renderer: for each visible bubble (viewport culling):
   |     - Draw filled circle with color from Data Layer
   |     - Draw 3D gradient overlay
   |     - Draw glow effect if hovered or large change
   |     - Draw cached text bitmap (ticker symbol + %)
   +---> Renderer: draw any UI overlays (tooltip handled by DOM)
```

### Data Transformation Pipeline (on filter/timeframe change)

```
User changes filter/timeframe
   |
   v
App State updates (Zustand store)
   |
   v
Data Layer recomputes:
   - Filter stocks by exchange, count, search query
   - Calculate bubble radii from market cap or volume
   - Calculate bubble colors from price change %
   - Generate BubbleSpec[] array
   |
   v
Physics Engine receives new BubbleSpec[]:
   - TRANSITION: animate existing bubbles to new sizes
   - ADD: new bubbles fade in from center
   - REMOVE: departing bubbles shrink and fade out
   - Positions preserved for bubbles that persist
   |
   v
Spatial Index: rebuilt on next physics tick
   |
   v
Renderer: picks up changes automatically next frame
```

## Component Deep Dives

### 1. Physics Engine (Custom, Not Matter.js)

**Why custom over Matter.js:** Matter.js is a full rigid-body engine with features this project does not need (polygons, constraints, joints, friction, restitution). Its `Engine.update()` takes 30-120ms with thousands of objects. A custom engine tailored to circle-only physics is 5-10x faster because:
- Only circles, no polygon SAT needed
- Circle-circle collision is a single distance check + overlap resolution
- No rotation, no angular velocity, no torque
- Simplified force model (gravity toward center + damping + noise)

**Integration method: Semi-implicit Euler** (not Verlet for this use case). Verlet is better for constraint-heavy simulations (cloth, ragdolls). For free-floating bubbles with simple forces, semi-implicit Euler is simpler, equally stable, and allows direct velocity manipulation for drag interactions.

```typescript
// Core physics step pseudocode
function integrate(bubbles: Bubble[], dt: number) {
  for (const b of bubbles) {
    // Apply forces
    b.vx += b.ax * dt;
    b.vy += b.ay * dt;

    // Damping (0.98-0.99 feels "floaty")
    b.vx *= DAMPING;
    b.vy *= DAMPING;

    // Integrate position
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Reset acceleration for next frame
    b.ax = 0;
    b.ay = 0;
  }
}
```

**Forces applied each tick:**
- **Center gravity:** Gentle pull toward viewport center (strength ~0.01-0.03). Keeps bubbles clustered.
- **Damping:** Velocity multiplied by 0.97-0.99 each tick. Creates floating feel.
- **Ambient noise:** Small random forces (Perlin noise or simplex) for organic floating motion.
- **Drag force:** When user drags a bubble, override its velocity to follow pointer.

**Collision resolution:**
```typescript
function resolveCollision(a: Bubble, b: Bubble) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist < minDist && dist > 0) {
    const overlap = minDist - dist;
    const nx = dx / dist;
    const ny = dy / dist;

    // Position correction (push apart proportional to mass/radius)
    const totalR = a.radius + b.radius;
    const ratioA = b.radius / totalR;
    const ratioB = a.radius / totalR;

    a.x -= nx * overlap * ratioA;
    a.y -= ny * overlap * ratioA;
    b.x += nx * overlap * ratioB;
    b.y += ny * overlap * ratioB;

    // Velocity dampening on collision
    const relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (relVel < 0) {
      a.vx += nx * relVel * ratioA * 0.5;
      a.vy += ny * relVel * ratioA * 0.5;
      b.vx -= nx * relVel * ratioB * 0.5;
      b.vy -= ny * relVel * ratioB * 0.5;
    }
  }
}
```

### 2. Spatial Index (Spatial Hash Grid)

**Why spatial hash over quadtree:** The bubbles have roughly uniform sizes within each "tier" (large-cap, mid-cap, small-cap), and the simulation space is bounded. Spatial hashing is O(1) lookup per cell, simpler to implement, and benchmarks show it handles 10k-20k uniform circles at 60Hz on modern hardware. Quadtrees add overhead from tree traversal and rebalancing that is unnecessary for this use case.

**Cell size:** Set to 2x the maximum bubble radius. This guarantees any collision pair shares at least one cell.

**Rebuild strategy:** Full rebuild every physics tick. At 1500 bubbles, a full rebuild (clear buckets + reinsert all) takes <1ms, which is faster than incremental updates with dirty tracking.

```typescript
class SpatialHashGrid {
  private cellSize: number;
  private cells: Map<number, Bubble[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  insert(bubble: Bubble) {
    // A circle can span multiple cells
    const minX = Math.floor((bubble.x - bubble.radius) / this.cellSize);
    const maxX = Math.floor((bubble.x + bubble.radius) / this.cellSize);
    const minY = Math.floor((bubble.y - bubble.radius) / this.cellSize);
    const maxY = Math.floor((bubble.y + bubble.radius) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = x * 73856093 ^ y * 19349663; // hash
        let cell = this.cells.get(key);
        if (!cell) { cell = []; this.cells.set(key, cell); }
        cell.push(bubble);
      }
    }
  }

  query(bubble: Bubble): Bubble[] {
    // Return all potential collision candidates
    const candidates = new Set<Bubble>();
    const minX = Math.floor((bubble.x - bubble.radius) / this.cellSize);
    const maxX = Math.floor((bubble.x + bubble.radius) / this.cellSize);
    const minY = Math.floor((bubble.y - bubble.radius) / this.cellSize);
    const maxY = Math.floor((bubble.y + bubble.radius) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = x * 73856093 ^ y * 19349663;
        const cell = this.cells.get(key);
        if (cell) {
          for (const b of cell) {
            if (b !== bubble) candidates.add(b);
          }
        }
      }
    }
    return Array.from(candidates);
  }

  // For hover/click hit testing
  queryPoint(px: number, py: number): Bubble | null {
    const cellX = Math.floor(px / this.cellSize);
    const cellY = Math.floor(py / this.cellSize);
    const key = cellX * 73856093 ^ cellY * 19349663;
    const cell = this.cells.get(key);
    if (!cell) return null;

    for (const b of cell) {
      const dx = px - b.x, dy = py - b.y;
      if (dx * dx + dy * dy <= b.radius * b.radius) return b;
    }
    return null;
  }
}
```

### 3. Renderer (Canvas 2D with Caching)

**Why Canvas 2D over WebGL:** For 1500 circles with text, Canvas 2D is sufficient and dramatically simpler. WebGL provides 10x speedup for 10,000+ objects, but at 1500 the bottleneck is JavaScript physics computation, not rendering. Canvas 2D with proper optimization (text caching, batch state changes, viewport culling) easily handles 1500 circles at 60fps. WebGL would require writing shaders, managing buffers, and implementing text rendering from scratch -- significant complexity for marginal gain at this scale.

**Why not PixiJS:** PixiJS adds 500KB+ bundle size and is optimized for sprite-based games. This project renders programmatic circles with gradients and dynamic text -- not sprite sheets. Raw Canvas 2D API gives full control with zero overhead.

**Key rendering optimizations:**

1. **Pre-rendered text bitmaps:** Each bubble's text (ticker symbol + percentage) is rendered to a small offscreen canvas once, then drawn via `drawImage()` each frame. Text rendering (`fillText()`) is the most expensive Canvas 2D operation -- caching drops frame time from ~10ms to ~1ms for text alone. Invalidate cache only when: bubble data changes (filter/timeframe switch) or bubble radius animates.

2. **Sorted draw order:** Draw bubbles back-to-front by z-index (smallest first, glowing last). One sort per frame, O(n log n).

3. **Minimize state changes:** Group bubbles by visual similarity. Avoid changing `fillStyle`, `font`, `shadowBlur` more than necessary. Set `shadowBlur = 0` after glow bubbles, not before each regular bubble.

4. **Viewport culling:** Skip `drawImage`/`arc` calls for bubbles fully outside the visible canvas area. At default zoom with all bubbles clustered, most are visible, but when zoomed in this matters significantly.

5. **DPR-aware rendering:** Scale canvas by `devicePixelRatio` for crisp rendering on Retina displays. The existing reference code already does this correctly.

```typescript
class BubbleRenderer {
  private ctx: CanvasRenderingContext2D;
  private textCache: Map<string, OffscreenCanvas>;

  renderFrame(bubbles: Bubble[], viewport: Viewport) {
    const { ctx } = this;
    ctx.save();
    ctx.scale(viewport.dpr, viewport.dpr);

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // Apply zoom/pan transform
    ctx.translate(viewport.panX, viewport.panY);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Sort: small first, glowing last
    const sorted = bubbles
      .filter(b => this.isVisible(b, viewport))
      .sort((a, b) => a.radius - b.radius);

    for (const bubble of sorted) {
      this.drawBubble(bubble);
    }

    ctx.restore();
  }

  private getCachedText(bubble: Bubble): OffscreenCanvas {
    const key = `${bubble.id}_${bubble.ticker}_${bubble.changePercent.toFixed(1)}_${Math.round(bubble.radius)}`;
    let cached = this.textCache.get(key);
    if (!cached) {
      cached = this.renderTextToOffscreen(bubble);
      this.textCache.set(key, cached);
    }
    return cached;
  }
}
```

### 4. Simulation Controller (Fixed-Timestep Game Loop)

**Why fixed timestep:** Without it, physics behaves differently on 60Hz vs 120Hz vs 144Hz displays. A bubble dragged on a 120Hz monitor would experience twice the damping per second as on 60Hz. Fixed timestep ensures deterministic physics regardless of display refresh rate.

**Target physics rate:** 60 updates/second (16.67ms timestep). This is sufficient for smooth bubble motion and collision response. The render rate is decoupled -- it runs at the display's native refresh rate.

```typescript
class SimulationController {
  private readonly FIXED_DT = 1000 / 60; // 16.67ms
  private accumulator = 0;
  private lastTime = 0;
  private running = false;

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    if (!this.running) return;

    const frameTime = Math.min(now - this.lastTime, 100); // cap at 100ms
    this.lastTime = now;
    this.accumulator += frameTime;

    // Fixed-rate physics updates
    while (this.accumulator >= this.FIXED_DT) {
      this.interactionManager.processInput();
      this.physicsEngine.step(this.FIXED_DT / 1000); // pass seconds
      this.accumulator -= this.FIXED_DT;
    }

    // Variable-rate rendering
    this.renderer.renderFrame(
      this.physicsEngine.getBubbles(),
      this.viewport
    );

    requestAnimationFrame(this.loop);
  };
}
```

### 5. Interaction Manager

**Separation from physics:** Input events (mousemove, touchmove) fire at arbitrary rates (potentially hundreds per second on touchscreens). The Interaction Manager queues events and processes them once per physics tick, preventing event flooding from destabilizing the simulation.

**Drag mechanics:**
- On pointer down: spatial hash `queryPoint()` to find bubble under cursor. If found, mark as "grabbed."
- While grabbed: each physics tick, set bubble velocity toward pointer position (not teleport -- this creates natural lag and push-aside of other bubbles).
- On pointer up: release bubble with current velocity for momentum.

**Hover detection:**
- Use spatial hash `queryPoint()` instead of linear scan. O(1) vs O(n).
- Throttle to once per frame (not every mousemove event).

**Zoom/Pan:**
- Mousewheel: adjust zoom level, zoom toward cursor position.
- Touch pinch: calculate pinch distance delta, apply as zoom.
- Click-drag on empty space: pan the viewport.
- Store transform as `{ zoom, panX, panY }` in viewport state.

### 6. App State (Zustand Store)

**Why Zustand:** Lightweight (1KB), works outside React components (physics engine can subscribe), no boilerplate. The physics simulation needs to read filter state but should NOT trigger React re-renders on every frame.

**Key principle: Two-tier state.**
- **UI state (Zustand):** Filters, timeframe, color scheme, search query. Changes infrequently (user interactions). Triggers data recomputation.
- **Simulation state (plain JS):** Bubble positions, velocities, frame timing. Changes 60x/second. Never stored in React state. The canvas reads it directly.

```typescript
// Zustand store -- UI state only
interface AppState {
  timeframe: 'day' | 'week' | 'month' | 'year';
  exchange: 'all' | 'HOSE' | 'HNX' | 'UPCOM';
  stockCount: 50 | 100 | 200 | 'all';
  colorScheme: 'vn' | 'international';
  sizeBy: 'marketCap' | 'volume';
  searchQuery: string;

  setTimeframe: (tf: string) => void;
  setExchange: (ex: string) => void;
  // ...
}

// Simulation reads this reactively:
useAppStore.subscribe(
  (state) => [state.timeframe, state.exchange, state.stockCount],
  () => {
    // Recompute bubble specs, trigger transition animation
    dataLayer.recompute();
    physicsEngine.transitionTo(dataLayer.getBubbleSpecs());
  }
);
```

### 7. Data Layer

**Responsibilities:**
- Hold raw stock data (mock in Phase 1, API in Phase 2)
- Apply filters (exchange, count, search)
- Compute derived values: bubble radius from market cap/volume, color from price change %
- Output `BubbleSpec[]` that physics engine consumes

**VN color scheme mapping:**

| Condition | Color | Hex |
|-----------|-------|-----|
| Ceiling (limit up, +7%) | Purple | #9933FF |
| Up (positive change) | Blue | #0066FF |
| Reference (0% or near-zero) | Yellow | #FFCC00 |
| Down (negative change) | Red | #FF3333 |
| Floor (limit down, -7%) | Cyan | #00CCCC |

**Bubble radius calculation:**
- Use `d3.scaleSqrt()` mapping market cap to radius range. Square root ensures bubble area (not radius) is proportional to value.
- Min radius: ~8px (still visible, shows ticker abbreviation)
- Max radius: ~15% of viewport min dimension

## Patterns to Follow

### Pattern 1: Entity-Component Data Layout (Struct of Arrays)

**What:** Store bubble properties in parallel typed arrays rather than an array of objects. This improves cache locality and allows bulk operations.

**When:** When physics computation becomes the bottleneck (1000+ bubbles).

```typescript
// Instead of: bubbles: Array<{ x, y, vx, vy, radius, ... }>
// Use:
class BubbleData {
  x: Float32Array;       // positions
  y: Float32Array;
  vx: Float32Array;      // velocities
  vy: Float32Array;
  radius: Float32Array;
  // Metadata in separate structure (not needed per-tick)
  meta: BubbleMeta[];    // ticker, name, color, etc.

  constructor(count: number) {
    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.vx = new Float32Array(count);
    this.vy = new Float32Array(count);
    this.radius = new Float32Array(count);
  }
}
```

**Why:** Float32Array operations are 2-5x faster than object property access in tight loops. V8 can auto-vectorize simple typed array loops.

### Pattern 2: Double-Buffered State for Transitions

**What:** When filters change and bubble set changes, maintain both old and new state to animate the transition smoothly.

**When:** User switches timeframe, exchange filter, or stock count.

```typescript
interface TransitionState {
  entering: BubbleSpec[];   // New bubbles: animate from center, size 0 -> target
  exiting: BubbleSpec[];    // Removed bubbles: animate size -> 0, then remove
  persisting: {             // Bubbles in both sets: animate radius/color change
    bubble: Bubble;
    targetRadius: number;
    targetColor: string;
  }[];
  progress: number;         // 0 -> 1 over transition duration
}
```

### Pattern 3: Event Queue for Input Decoupling

**What:** Buffer input events and process them synchronously during the physics tick, not asynchronously when they arrive.

**When:** Always. Prevents race conditions between input handling and physics state.

```typescript
class InputQueue {
  private events: InputEvent[] = [];

  // Called from DOM event listeners (async, any time)
  enqueue(event: InputEvent) {
    this.events.push(event);
  }

  // Called once per physics tick (sync, deterministic)
  drain(): InputEvent[] {
    const batch = this.events;
    this.events = [];
    return batch;
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: React State for Animation Data

**What:** Storing bubble positions in React state or triggering re-renders on animation frames.
**Why bad:** React reconciliation on 1500 elements at 60fps is impossible. Even with `useMemo` and `React.memo`, the overhead of state diffing destroys performance.
**Instead:** Keep all animation state in plain JavaScript objects. The canvas reads them directly. React only manages UI controls (header, filters, modals).

### Anti-Pattern 2: Using D3 Force Simulation as the Runtime Physics Engine

**What:** Running `d3.forceSimulation` continuously for real-time physics.
**Why bad:** D3's force simulation is designed for layout convergence (run N ticks, then stop). It has alpha decay that causes motion to settle. It does not support continuous user-driven forces (drag, ambient motion). Its collision force uses quadtree internally but is not optimized for sustained 60fps with 1500 nodes.
**Instead:** Use D3 force simulation only for initial layout placement (as the reference code does). Build custom physics for the continuous simulation.

### Anti-Pattern 3: Linear Scan for Hit Testing

**What:** Iterating through all 1500 bubbles on every mousemove to find hover target.
**Why bad:** At 1500 bubbles, this is 1500 distance calculations per mouse event. Mouse events fire at 60-120Hz. That is 90K-180K calculations/second just for hover.
**Instead:** Use spatial hash `queryPoint()` -- checks only ~4-8 bubbles in the relevant cell.

### Anti-Pattern 4: Rebuilding Everything on Filter Change

**What:** Destroying all bubbles and recreating from scratch when user changes a filter.
**Why bad:** Jarring visual discontinuity. Loses spatial context (user can't track where a bubble moved).
**Instead:** Use transition animations. Match bubbles by ticker ID. Persist positions for bubbles that remain. Animate radius/color changes over 300-500ms.

### Anti-Pattern 5: OffscreenCanvas + Web Worker for Physics (Premature)

**What:** Moving physics to a Web Worker with OffscreenCanvas from the start.
**Why bad:** Message passing between worker and main thread adds latency and complexity. SharedArrayBuffer is required for zero-copy data sharing but has COOP/COEP header requirements. For 1500 bubbles, main-thread physics takes <2ms per tick -- well within budget. Worker architecture is a premature optimization that adds significant complexity.
**Instead:** Start with main-thread physics. Profile. Only move to worker if physics exceeds 8ms/tick budget, which would require 5000+ bubbles.

## Scalability Considerations

| Concern | At 200 bubbles | At 1500 bubbles | At 5000+ bubbles |
|---------|---------------|-----------------|-------------------|
| Physics computation | <0.5ms/tick, any approach works | <2ms/tick with spatial hash, custom engine | Consider Web Worker offloading |
| Collision detection | Brute force O(n^2) is fine | Spatial hash required, ~1ms rebuild+query | Spatial hash still sufficient up to ~20K |
| Canvas rendering | No optimization needed | Text caching essential, ~3-5ms/frame | Consider WebGL or PixiJS for draw call batching |
| Memory | Negligible | ~5MB (typed arrays + text cache) | ~15MB, consider LOD (hide text on small bubbles) |
| Interaction | Linear scan for hover OK | Spatial hash queryPoint required | Same spatial hash scales |
| State transitions | Instant, no animation needed | 300ms transition, manageable | Stagger animations, batch updates |

## Suggested Build Order (Dependencies)

The architecture has clear dependency chains that dictate build order:

```
Phase 1: Foundation (no dependencies)
  1. Data Layer (mock data + transformations)
  2. App State store (Zustand)
  3. Canvas setup + basic rendering (single bubble)

Phase 2: Physics Core (depends on Phase 1)
  4. Physics Engine (integration, forces, boundaries)
  5. Spatial Hash Grid (collision broad-phase)
  6. Collision detection + resolution
  7. Simulation Controller (game loop with fixed timestep)

Phase 3: Rendering Pipeline (depends on Phase 1, parallel with Phase 2)
  8. Multi-bubble rendering with color scheme
  9. Text bitmap caching system
  10. 3D gradient/glow effects
  11. Viewport culling

Phase 4: Interaction (depends on Phase 2 + 3)
  12. Hover detection (spatial hash queryPoint)
  13. Drag interaction (pointer events + physics integration)
  14. Tooltip (DOM overlay positioned from canvas coords)
  15. Zoom/pan system

Phase 5: Polish (depends on all above)
  16. Filter transitions (enter/exit/update animations)
  17. Responsive layout + mobile touch
  18. Performance profiling + optimization pass
```

**Critical path:** Data Layer -> Physics Engine -> Spatial Hash -> Simulation Controller -> Renderer. This chain must be built sequentially. Rendering pipeline can be developed in parallel with physics once basic canvas setup exists.

## File/Module Structure

```
src/
  core/
    physics.ts          # Physics engine: integration, forces, boundaries
    spatial-hash.ts     # Spatial hash grid for collision + hit testing
    simulation.ts       # Game loop controller, timestep management
  rendering/
    renderer.ts         # Canvas 2D bubble renderer
    text-cache.ts       # Offscreen canvas text bitmap cache
    viewport.ts         # Zoom/pan transform state
    colors.ts           # VN and international color scheme mappings
  interaction/
    input-queue.ts      # Event buffering for physics decoupling
    drag-handler.ts     # Drag interaction state machine
    hover-handler.ts    # Hover detection + tooltip coordination
    zoom-handler.ts     # Mousewheel + pinch zoom
  data/
    mock-data.ts        # VN stock mock data (1500+ tickers)
    data-layer.ts       # Filtering, radius/color computation
    bubble-spec.ts      # BubbleSpec type definitions
  state/
    app-store.ts        # Zustand store for UI state
  components/
    App.tsx             # Root component
    BubbleCanvas.tsx    # Canvas wrapper (refs, resize observer)
    Header.tsx          # Navigation, filters, search
    Tooltip.tsx         # DOM tooltip overlay
  types/
    index.ts            # Shared type definitions
```

## Sources

- [D3 Force Simulation documentation](https://d3js.org/d3-force) -- force layout patterns, collision force internals
- [Matter.js performance issues with 1000+ objects](https://github.com/liabru/matter-js/issues/420) -- why a full physics engine is overkill
- [Matter.js stationary object performance](https://github.com/liabru/matter-js/issues/1309) -- 30-120ms update times with thousands of objects
- [Canvas vs WebGL performance comparison](https://digitaladblog.com/2025/05/21/comparing-canvas-vs-webgl-for-javascript-chart-performance/) -- WebGL advantage at 1000+ elements
- [SVG vs Canvas vs WebGL benchmarks 2025](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025) -- Canvas sufficient for this scale
- [Quadtree vs Spatial Hashing visualization](https://zufallsgenerator.github.io/2014/01/26/visually-comparing-algorithms) -- spatial hash faster for uniform objects
- [Collision detection benchmarks (0fps.net)](https://0fps.net/2015/01/23/collision-detection-part-3-benchmarks/) -- grid handles 10K+ objects at 60Hz
- [Quadtree collision detection patterns](https://pvigier.github.io/2019/08/04/quadtree-collision-detection.html) -- implementation reference
- [PixiJS v8 rendering architecture](https://pixijs.com/blog/pixi-v8-launches) -- WebGL batch rendering approach
- [Canvas text performance optimization](https://www.mirkosertic.de/blog/2015/03/tuning-html5-canvas-filltext/) -- 10x speedup with bitmap caching
- [Canvas rendering best practices (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) -- offscreen rendering, state management
- [Canvas performance optimization 2026](https://docs.bswen.com/blog/2026-02-21-canvas-performance-optimization/) -- hardware-accelerated drawImage
- [Fixed timestep game loop in JavaScript](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) -- accumulator pattern
- [Advanced requestAnimationFrame techniques](https://fsjs.dev/beyond-basics-requestanimationframe-techniques-game-development/) -- fixed vs variable timestep
- [OffscreenCanvas + Web Workers (web.dev)](https://web.dev/articles/offscreen-canvas) -- architecture pattern for worker offloading
- [Physics in Web Workers](https://dev.to/jerzakm/running-js-physics-in-a-webworker-part-1-proof-of-concept-ibj) -- message passing considerations
- [Verlet integration for physics engines](https://betterprogramming.pub/making-a-verlet-physics-engine-in-javascript-1dff066d7bc5) -- integration method comparison
- [D3 force layout with Canvas rendering](https://github.com/vasturiano/force-graph) -- Canvas rendering for large node counts
- [Graph visualization efficiency benchmarks (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12061801/) -- D3-Canvas handles 5K nodes, D3-WebGL 7K nodes
