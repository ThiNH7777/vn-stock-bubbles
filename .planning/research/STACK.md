# Technology Stack

**Project:** VN Stock Bubbles
**Researched:** 2026-03-06

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.2.x | UI framework | Industry standard component model for the UI shell (header, filters, search, tooltips). Canvas rendering stays imperative via refs -- React never touches the 60fps loop. v19.2.4 is latest stable (Jan 2026). | HIGH |
| TypeScript | 5.9.x | Type safety | Catches physics math bugs at compile time. Autocompletion for D3 and Canvas APIs. v5.9.3 is latest stable. Avoid 6.0 beta (announced Feb 2026). | HIGH |
| Vite | 7.x | Build tool | Sub-second HMR, native ESM dev server, excellent React/TS support out of the box. `npm create vite@latest -- --template react-ts` gets you started in seconds. v7.3.1 is latest stable. | HIGH |

### Rendering Engine

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Canvas 2D API | Native | Bubble rendering | At 1500 circles, properly optimized Canvas 2D is sufficient and dramatically simpler than WebGL. The bottleneck at this scale is physics computation (collision detection), not rendering. Canvas 2D with text bitmap caching, offscreen sprite stamping, state change batching, and viewport culling handles 1500 circles + text at 60fps. Zero dependency overhead. | HIGH |

**Why Canvas 2D over alternatives:**

| Alternative | When to Use | Why Not for This Project |
|-------------|-------------|--------------------------|
| PixiJS v8 | 5000+ animated elements, sprite-sheet games, particle systems | Adds ~150KB gzipped for WebGL batching we don't need at 1500 elements. PixiJS shines when draw call count is the bottleneck (10K+ sprites). At 1500, Canvas 2D with offscreen sprite caching is fast enough. PixiJS also requires learning its scene graph API, which adds complexity for programmatic circles with gradients and dynamic text. **Upgrade path:** If bubble count exceeds 3000 or profiling shows render pass >8ms, migrate to PixiJS. The rendering layer is isolated, so migration is contained. |
| Three.js | 3D visualizations | 3D engine for a 2D problem. Unnecessary camera, lighting, materials complexity. CryptoBubbles reportedly uses Three.js, but that is a legacy choice. |
| SVG / DOM | <200 animated elements | 1500 animated DOM nodes = guaranteed layout thrashing and jank. |
| Raw WebGL | Maximum performance, custom shaders | Requires writing shaders, buffer management, and text rendering from scratch. Massive complexity for marginal gain at 1500 elements. |

**Key Canvas 2D optimizations (required, not optional):**

1. **Pre-render text to offscreen canvases.** `fillText()` is the most expensive Canvas 2D call. Cache each bubble's text (ticker + %) as a bitmap; stamp via `drawImage()`. Invalidate only on data change.
2. **Pre-render bubble sprites.** Render each unique size+color combination (circle + gradient + glow) to an offscreen canvas once. Stamp via `drawImage()` -- faster than `arc()` + `fill()` + `createRadialGradient()` per frame.
3. **Batch state changes.** Group bubbles by fill color. Set `fillStyle` once per color, not per bubble.
4. **Round coordinates.** `Math.round(x)` avoids sub-pixel anti-aliasing overhead.
5. **Use `alpha: false` context option.** Opaque background eliminates per-pixel alpha compositing.
6. **DPR scaling.** Canvas buffer at `width * devicePixelRatio` for crisp Retina rendering.

### Physics Simulation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom physics engine | N/A | Circle collision + gravity + drag | For this specific use case (circles only, no polygons, no joints, no constraints), a custom engine is better than Matter.js. Reasons: (1) Matter.js achieves only 40% of Box2D performance and adds 87KB minified; (2) Circle-circle collision is trivially `distance < r1 + r2`; (3) You need the spatial hash anyway; (4) Custom = full control over the "floaty" feel, damping, drag response. The physics is simple: semi-implicit Euler integration, circle overlap resolution, boundary containment, mouse drag forces. ~200-300 lines of TypeScript. | MEDIUM |
| d3-force | 3.x | Initial layout only | D3's `forceSimulation` + `forceCollide` is excellent for computing initial non-overlapping positions (as the reference code does with 500 ticks). Use it for the one-time pack layout when data loads or filters change. Then hand off to your custom continuous physics loop. D3-force is designed to converge and stop (alpha decay), not run continuously. | HIGH |

**Why custom over Matter.js:**

| Criterion | Custom Engine | Matter.js |
|-----------|--------------|-----------|
| Bundle size | 0 KB (your code) | 87 KB minified |
| Performance | Optimized for circles only | General-purpose rigid body engine (polygons, constraints, friction) |
| Control | Full control over floaty/bouncy feel | Must work within its simulation model |
| Complexity | ~200-300 lines for circle physics | API learning curve, integration overhead |
| Collision shapes | Circles only (perfect for bubbles) | Circles, polygons, composites (all unused overhead) |
| Feel tuning | Direct damping/force tweaking | Must map desired behavior onto Matter.js parameters |

### Spatial Optimization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Spatial hash grid | Custom | Broad-phase collision + hit testing | For 1500 circles with roughly uniform sizes (10x radius range max), spatial hashing outperforms quadtrees. Grid lookup is O(1) per cell. Cell size = 2x max bubble radius ensures collision pairs share at least one cell. Full rebuild each frame at 1500 elements takes <1ms. Also serves double duty for pointer hit testing (hover, click, drag). | MEDIUM |

**Why spatial hash over quadtree:** Quadtrees add tree traversal and rebalancing overhead. For objects of similar scale (not 1000x size difference) in a bounded space, spatial hashing is simpler, faster, and has better cache locality. Benchmarks show spatial hashing handles 10K-20K uniform circles at 60Hz.

### UI Layer (outside canvas)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.2.x | UI styling | For header, filters, tooltips, modals -- everything outside the canvas. v4 is a ground-up rewrite: 5x faster builds, zero-config (no `tailwind.config.js`), CSS-first with `@import "tailwindcss"`. v4.2.0 released Feb 2026. | HIGH |
| Zustand | 4.5.x | State management | Lightweight (1KB), hook-based, no providers/boilerplate. Perfect for: active timeframe, selected exchange, search query, bubble size mode, color scheme. Works outside React components too -- the physics engine can subscribe to state changes without triggering React renders. | HIGH |

### Animation (UI transitions only)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| GSAP | 3.12.x | Smooth data transitions | For animating bubble size/color morphing when switching timeframes or filters. GSAP is now free (backed by Webflow), can tween any JS property (not just CSS), has timeline sequencing, and is the most performant animation library. Use GSAP to interpolate `bubble.targetRadius` and `bubble.targetColor` over 300-600ms. The physics loop reads the interpolated values. Do NOT use GSAP for the physics loop itself. | MEDIUM |

**Why GSAP over Framer Motion:** Framer Motion only animates React component props (x, opacity, scale). It cannot tween arbitrary JS objects like bubble radius or color values inside a canvas. GSAP can tween any JS property, making it ideal for `gsap.to(bubble, { targetRadius: newR, duration: 0.6 })`.

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| d3-scale | 4.x | Radius/color mapping | `d3.scaleSqrt()` maps market cap to bubble radius (area-proportional). `d3.scaleLinear()` maps % change to color intensity. Import standalone, not all of D3. | HIGH |
| d3-force | 3.x | Initial layout packing | One-time `forceSimulation` + `forceCollide` to compute non-overlapping initial positions on data load/filter change. Runs 300-500 ticks synchronously, then stops. | HIGH |
| d3-color | 3.x | Color manipulation | HSL/RGB conversions for the VN color scheme (purple, blue, red, cyan, yellow). Smooth color interpolation for transitions. | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Rendering | Canvas 2D (optimized) | PixiJS v8 | 150KB overhead for WebGL batching not needed at 1500 elements. Upgrade path exists if scale increases. |
| Rendering | Canvas 2D (optimized) | Three.js | 3D engine for 2D problem; unnecessary complexity (camera, lighting, materials) |
| Rendering | Canvas 2D (optimized) | SVG/DOM | 1500 animated DOM nodes = guaranteed layout thrashing and jank |
| Physics | Custom engine | Matter.js | 87KB overhead, 40% of Box2D perf, overkill for circles-only physics |
| Physics | Custom engine | Planck.js | Box2D port, more accurate but heavier, unnecessary for floaty bubbles |
| Physics | Custom engine | D3-force (continuous) | D3-force has alpha decay -- it settles and stops by design. Not a continuous physics sim. |
| State | Zustand | Redux | Boilerplate-heavy for a single-page visualization app |
| State | Zustand | React Context | Zustand's fine-grained subscriptions prevent unnecessary re-renders; Context re-renders all consumers |
| Styling | Tailwind CSS 4 | Styled Components | CSS-in-JS adds runtime overhead; Tailwind is zero-runtime |
| Styling | Tailwind CSS 4 | Plain CSS | Tailwind's utility classes speed up UI development 3-5x with zero runtime cost |
| Animation | GSAP | Framer Motion | Cannot tween arbitrary JS objects or canvas properties; React-component-only |
| Build | Vite 7 | Next.js | No SSR/SSG needed; SPA is simpler for a pure client-side visualization |
| Build | Vite 7 | Webpack | 5-10x slower HMR; Vite is the standard for new React projects |

## Architecture Decision: React + Imperative Canvas

React manages the **UI shell** (header, filters, search, tooltips, modals). Canvas rendering runs **imperatively** via refs, completely outside React's render cycle. This is the standard and proven pattern for React + Canvas apps.

**Two-tier state model:**
- **UI state (Zustand):** Filters, timeframe, color scheme, search query. Changes infrequently (user clicks). Triggers data recomputation + transition animation.
- **Simulation state (plain JS):** Bubble positions, velocities, frame timing. Changes 60x/second. Never stored in React state. Canvas reads directly.

```typescript
// React component owns the container div
// Canvas is initialized imperatively via useEffect
// Zustand store bridges UI state to canvas: filter changes trigger layout recomputation
// Physics loop runs via requestAnimationFrame, independent of React render cycle

function BubbleCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimulationController>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: false })!;

    // Initialize simulation (physics + rendering + interaction)
    simRef.current = new SimulationController(canvas, ctx);
    simRef.current.start();

    return () => simRef.current?.stop();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
```

## Performance Architecture

```
Main Thread:
  React UI (filters, tooltips) --- Zustand store --- Canvas render loop
                                        |
                                        v
                               requestAnimationFrame
                               |
                               +-> Physics update (fixed timestep)
                               |   - Apply forces
                               |   - Integrate positions
                               |   - Rebuild spatial hash
                               |   - Collision detection + resolution
                               |   - Boundary containment
                               |
                               +-> Render (variable rate)
                                   - Clear canvas
                                   - Stamp pre-rendered sprites
                                   - Draw text from bitmap cache
                                   - Apply glow to selected bubbles

Performance budget per frame (16.67ms at 60fps):
  Physics:    <2ms (spatial hash + 1500 circle collisions)
  Rendering:  <5ms (cached sprites + text bitmaps)
  Headroom:   ~10ms for GC, events, React UI

Upgrade path (if needed):
  Web Worker: physics simulation (if physics exceeds 6ms/tick)
  PixiJS v8:  WebGL rendering (if render exceeds 8ms/tick at 3000+ bubbles)
  SharedArrayBuffer: zero-copy position transfer between worker and renderer
```

For 1500 circles, the physics computation with spatial hash takes <2ms per frame. No Web Worker needed initially. The Canvas 2D render pass with cached sprites takes <5ms. Total: well under the 16.67ms budget. Add Web Worker or PixiJS only if profiling on target devices shows a bottleneck.

## Installation

```bash
# Create project
npm create vite@latest vn-stock-bubbles -- --template react-ts
cd vn-stock-bubbles

# Layout and data mapping (individual d3 modules, NOT all of d3)
npm install d3-scale d3-force d3-color

# State management
npm install zustand

# UI animation (for data transitions, not physics)
npm install gsap

# Styling
npm install tailwindcss @tailwindcss/vite

# Dev dependencies
npm install -D @types/d3-scale @types/d3-force @types/d3-color
```

**Total added bundle (estimated):**
- d3-scale + d3-force + d3-color: ~15KB gzipped
- Zustand: ~1KB gzipped
- GSAP: ~25KB gzipped
- Tailwind: 0KB runtime (CSS only, extracted at build time)
- Canvas 2D: 0KB (native browser API)
- **Total: ~41KB gzipped** -- exceptionally lean for a visualization app

## Key Version Pins

| Package | Pin Strategy | Notes |
|---------|-------------|-------|
| react | ^19.2.0 | Latest stable. v19.2.4 released Jan 2026. |
| typescript | ~5.9.3 | Latest stable. Avoid 6.0 beta. |
| vite | ^7.0.0 | Latest stable major. v7.3.1 current. |
| tailwindcss | ^4.2.0 | v4 has breaking changes from v3 (no config file, CSS-first). |
| zustand | ^4.5.0 | Stable, minimal API surface. |
| gsap | ^3.12.0 | Free license since Webflow acquisition. |
| d3-scale | ^4.0.0 | Standalone module, tree-shakeable. |
| d3-force | ^3.0.0 | Standalone module for initial layout. |
| d3-color | ^3.0.0 | Standalone module for color math. |

## What NOT to Install

| Library | Why Not |
|---------|---------|
| `d3` (full bundle) | 240KB+ for features you won't use. Import `d3-scale`, `d3-force`, `d3-color` individually. |
| `pixi.js` | 150KB overhead for WebGL batching not needed at 1500 elements. Canvas 2D with optimizations is sufficient. Reserve as upgrade path if scale increases to 3000+. |
| `matter-js` | 87KB for a general-purpose rigid body engine. Circle-only physics is ~200 lines of custom code. |
| `@pixi/react` | Declarative JSX layer that would fight the imperative physics loop. |
| `react-three-fiber` / `three` | 3D engine wrappers. Wrong tool for 2D circles. |
| `chart.js` / `recharts` / `nivo` | Charting libraries for static charts, not physics simulations. |
| `framer-motion` | Cannot tween arbitrary JS objects. React-component-only animations. |
| `styled-components` / `emotion` | Runtime CSS-in-JS overhead. Tailwind is zero-runtime. |
| `redux` / `@reduxjs/toolkit` | Overkill state management for this app's complexity. |
| `konva` | Canvas 2D abstraction layer that adds overhead without WebGL benefit. |

## Sources

- [PixiJS v8 ParticleContainer](https://pixijs.com/blog/particlecontainer-v8) -- 1M particles at 60fps; confirms WebGL needed at very high counts, but overkill at 1500
- [PixiJS v8 Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips) -- Batching, GraphicsContext reuse patterns
- [PixiJS v8 Graphics guide](https://pixijs.com/8.x/guides/components/scene-objects/graphics) -- Circle drawing, shared geometry
- [PixiJS releases](https://github.com/pixijs/pixijs/releases) -- v8.16.0 latest stable (Feb 2026)
- [Canvas engines comparison benchmark](https://benchmarks.slaylines.io/) -- PixiJS vs Canvas 2D vs others at various scales
- [MDN Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) -- Offscreen canvas, batch operations, alpha: false
- [Canvas rendering best practices (ag-Grid)](https://blog.ag-grid.com/optimising-html5-canvas-rendering-best-practices-and-techniques/) -- drawImage stamping, state change minimization
- [D3-force simulation docs](https://d3js.org/d3-force/simulation) -- Velocity Verlet integration, alpha decay
- [D3 forceCollide docs](https://d3js.org/d3-force/collide) -- Collision radius and iterations
- [Matter.js docs](https://brm.io/matter-js/) -- v0.20.0, 87KB minified size
- [Top 9 2D physics engines compared](https://daily.dev/blog/top-9-open-source-2d-physics-engines-compared) -- Matter.js achieves 40% of Box2D performance
- [Spatial hashing vs quadtree visualization](https://zufallsgenerator.github.io/2014/01/26/visually-comparing-algorithms) -- Performance comparison for uniform objects
- [Collision detection benchmarks (0fps.net)](https://0fps.net/2015/01/23/collision-detection-part-3-benchmarks/) -- Grid handles 10K+ objects at 60Hz
- [Zustand GitHub](https://github.com/pmndrs/zustand) -- v4.5.5, 1KB, hook-based state management
- [GSAP pricing](https://gsap.com/pricing/) -- Free since Webflow acquisition
- [GSAP vs Framer Motion](https://semaphore.io/blog/react-framer-motion-gsap) -- GSAP tweens any JS property; Framer is React-only
- [Vite getting started](https://vite.dev/guide/) -- v7.x, react-ts template
- [React 19.2 release](https://react.dev/blog/2025/10/01/react-19-2) -- v19.2.4 latest stable
- [Tailwind CSS v4.2 release](https://github.com/tailwindlabs/tailwindcss/releases) -- Zero-config, CSS-first, 5x faster builds
- [TypeScript releases](https://www.npmjs.com/package/typescript) -- v5.9.3 stable, 6.0 beta in Feb 2026
- [Web Worker + OffscreenCanvas (web.dev)](https://web.dev/articles/offscreen-canvas) -- Future optimization path if needed
- [React + Canvas animation patterns](https://dev.to/ptifur/animation-with-canvas-and-requestanimationframe-in-react-5ccj) -- useRef + rAF imperative pattern
