# Phase 4: Interaction & Transitions - Research

**Researched:** 2026-03-07
**Domain:** Canvas pointer interaction, DOM overlay panels, area chart rendering, gesture handling
**Confidence:** HIGH

## Summary

Phase 4 adds all user interaction to the bubble chart: drag with momentum, hover glow, tap-to-detail panel, and smooth timeframe transitions. The codebase already has a canvas-based renderer with physics simulation (Float32Array buffers, SpatialHashGrid), radius lerp animation for timeframe switching, and a Zustand store pattern. This phase bridges the canvas world (pointer hit-testing, drag physics, glow rendering) with the React DOM world (detail panel overlay, area chart, swipe-to-dismiss).

The key architectural challenge is that bubbles are canvas-rendered (no DOM elements), so all pointer interaction must use manual hit-testing (point-in-circle math against the simulation buffers). The detail panel is a React DOM component overlaid on top of the canvas, not drawn on canvas. This canvas+DOM hybrid is the standard pattern used by cryptobubbles.net and similar bubble visualizations.

The existing codebase has all the foundation pieces: `SimulationBuffers` with x/y/radius arrays for hit-testing, `useAppStore` (Zustand) ready to extend with `selectedStock` state, stock logos already loading from Vietstock CDN, color helpers for glow effects, and a radius lerp animation system for timeframe transitions. No new dependencies are needed -- the area chart can be drawn with canvas 2D API directly, and all gestures use the native Pointer Events API.

**Primary recommendation:** Implement in 3 plans: (1) pointer interaction layer (hit-test + drag + hover glow on canvas), (2) detail panel overlay (React DOM component with stock info + canvas-drawn area chart), (3) smooth timeframe transitions (color lerp + position settling to complement existing radius lerp).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Tap Detail Panel Content**: Header with stock logo (Vietstock CDN) + ticker + company name + close button (X). Price in VND format (e.g., 75,500d). Stats row: Market Cap (billions VND), Trading Volume, P/E, EPS. 52-week High/Low indicator. Exchange badge (HOSE/HNX/UPCOM). Area chart (line + filled area) with price history and high/low annotations. Timeframe tabs below chart: Day/Week/Month/Year with % change for each (all 4 always visible). Link to Vietstock stock detail page. Layout inspired by cryptobubbles.net detail panel.
- **Tap Detail Panel UI Style**: Overlay centered on screen, background dims + blurs (bubbles still animate behind). Slide down from top animation. Desktop: ~400px width centered. Mobile: full-width. Dark theme consistent with app background.
- **Tap Detail Panel Close Behavior**: Close via X button in header. Close via swipe down gesture (mobile-friendly). No close on tap-outside (could conflict with tap-on-other-bubble). Tapping another bubble switches to that stock's detail (no close+reopen).
- **Tap vs Drag Distinction**: Tap (<200ms, no pointer movement) = open detail panel. Hold + move = drag bubble with momentum on release.
- **Hover Behavior (Desktop)**: Hover = glow effect only (brighten/pulse). No tooltip on hover -- detail info only via click/tap.
- **Timeframe Transitions**: Animate bubble sizes, colors, and positions smoothly. Radius lerp animation already partially implemented.

### Claude's Discretion
- Exact slide-down animation timing/easing
- Glow effect intensity and style on hover
- Area chart library choice or canvas-drawn
- Drag momentum physics (throw velocity, friction)
- Swipe-down threshold distance to trigger close
- Panel border radius and shadow styling

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTR-01 | User can drag bubbles with pointer -- physics responds with momentum | Pointer Events API with setPointerCapture for unified mouse/touch; hit-test against SimulationBuffers x/y/radius arrays; inject velocity into physics vx/vy on release |
| INTR-02 | User sees hover glow effect + tooltip showing ticker, price, % change | Glow via increased outer glow radial gradient alpha on hovered bubble index; CONTEXT overrides tooltip to glow-only (no tooltip); detail info via tap panel instead |
| INTR-03 | Smooth animated transitions when switching time period (sizes, colors, positions interpolate) | Radius lerp already exists (LERP_SPEED 0.07); add color lerp (interpolate RGB components); position settling via collision resolution naturally handles radius changes |
| DATA-02 | Time period toggle (day, week, month, year) changes bubble colors and sizes | Toggle UI already exists in Header.tsx; Zustand selectedTimeframe already drives radius targets; extend render function to lerp colors based on current vs target timeframe |

</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | Detail panel DOM overlay component | Already in project |
| Zustand | ^5.0.11 | UI state: selectedStock, panel open/close | Already managing timeframe/search |
| Tailwind CSS | ^4.2.1 | Detail panel styling, backdrop blur, responsive | Already in project |
| Canvas 2D API | Native | Area chart in detail panel, glow effects | Zero-dependency; project already canvas-based |
| Pointer Events API | Native | Unified mouse/touch drag, hover, tap | W3C standard, supported in all modern browsers |

### Supporting (no install needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS backdrop-filter | Native | Dim + blur background behind detail panel | Baseline 2024, 95%+ browser support |
| CSS @keyframes | Native | Slide-down panel animation | Standard CSS animation |
| requestAnimationFrame | Native | Already used via game loop | Canvas glow animations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas-drawn area chart | recharts / Chart.js | Adds 40-200KB dependency for a single sparkline; canvas 2D is trivial for a simple area fill |
| Native Pointer Events | interact.js / use-gesture | Adds dependency; pointer events are simple enough for this use case (single-point drag) |
| CSS transitions for panel | framer-motion | 40KB+ for a single slide-down animation; CSS @keyframes + transition sufficient |

**No installation needed.** All functionality uses native APIs and existing dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── BubbleCanvas.tsx       # MODIFY: add pointer event handlers, glow rendering, hit-testing
│   ├── DetailPanel.tsx        # NEW: stock detail overlay (React DOM)
│   ├── DetailChart.tsx        # NEW: area chart component (canvas-based sparkline)
│   ├── App.tsx                # MODIFY: render DetailPanel overlay
│   └── Header.tsx             # NO CHANGE
├── store/
│   └── useAppStore.ts         # MODIFY: add selectedStock, setSelectedStock
├── simulation/
│   └── physics.ts             # MODIFY: add drag force injection (pinBubble/releaseBubble)
└── types/
    └── stock.ts               # MODIFY: extend StockData or add DetailStockData type
```

### Pattern 1: Canvas Hit-Testing (Point-in-Circle)
**What:** Determine which bubble the pointer is over by checking distance from pointer to each bubble center against its radius. Use the simulation buffers directly.
**When to use:** Every pointer event on the canvas (pointerdown, pointermove, pointerup).
**Example:**
```typescript
// Source: Standard geometry + project's SimulationBuffers pattern
function hitTest(
  px: number, py: number,
  buffers: SimulationBuffers, count: number
): number {
  // Iterate in reverse draw order (topmost bubble = last drawn = highest priority)
  for (let i = count - 1; i >= 0; i--) {
    const dx = px - buffers.x[i]!;
    const dy = py - buffers.y[i]!;
    const r = buffers.radius[i]!;
    if (dx * dx + dy * dy <= r * r) return i;
  }
  return -1; // No hit
}
```

### Pattern 2: Pointer Events for Unified Touch/Mouse Drag
**What:** Use pointerdown/pointermove/pointerup with setPointerCapture for drag operations. Distinguish tap vs drag by tracking time and movement distance.
**When to use:** Canvas element event handlers.
**Example:**
```typescript
// Source: MDN Pointer Events API + project requirements
const TAP_THRESHOLD_MS = 200;
const TAP_THRESHOLD_PX = 5;

let dragState: {
  bubbleIndex: number;
  startTime: number;
  startX: number;
  startY: number;
  isDragging: boolean;
  lastX: number;
  lastY: number;
  lastTime: number;
} | null = null;

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const idx = hitTest(px, py, buffers, count);
  if (idx < 0) return;

  canvas.setPointerCapture(e.pointerId);
  dragState = {
    bubbleIndex: idx,
    startTime: performance.now(),
    startX: px, startY: py,
    isDragging: false,
    lastX: px, lastY: py,
    lastTime: performance.now(),
  };
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragState) {
    // Hover hit-test for glow
    const rect = canvas.getBoundingClientRect();
    hoveredIndex = hitTest(e.clientX - rect.left, e.clientY - rect.top, buffers, count);
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const dx = px - dragState.startX;
  const dy = py - dragState.startY;

  if (!dragState.isDragging && Math.sqrt(dx*dx + dy*dy) > TAP_THRESHOLD_PX) {
    dragState.isDragging = true;
  }

  if (dragState.isDragging) {
    // Move bubble to pointer position (pin it)
    buffers.x[dragState.bubbleIndex] = px;
    buffers.y[dragState.bubbleIndex] = py;
    buffers.vx[dragState.bubbleIndex] = 0;
    buffers.vy[dragState.bubbleIndex] = 0;
    dragState.lastX = px;
    dragState.lastY = py;
    dragState.lastTime = performance.now();
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (!dragState) return;
  const elapsed = performance.now() - dragState.startTime;

  if (!dragState.isDragging && elapsed < TAP_THRESHOLD_MS) {
    // TAP: open detail panel
    const stock = stocks[dragState.bubbleIndex];
    useAppStore.getState().setSelectedStock(stock);
  } else if (dragState.isDragging) {
    // RELEASE: apply momentum (throw velocity)
    const dt = Math.max(1, performance.now() - dragState.lastTime);
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const throwVx = (px - dragState.lastX) / dt * 16; // Scale to per-frame
    const throwVy = (py - dragState.lastY) / dt * 16;
    buffers.vx[dragState.bubbleIndex] = throwVx * 0.3; // Dampen throw
    buffers.vy[dragState.bubbleIndex] = throwVy * 0.3;
  }

  dragState = null;
});
```

### Pattern 3: Canvas+DOM Hybrid (Detail Panel Overlay)
**What:** Render the detail panel as a React DOM component absolutely positioned over the canvas. The canvas continues animating behind a dimmed/blurred backdrop.
**When to use:** Any time you need rich UI (text, inputs, links) overlaid on a canvas.
**Example:**
```typescript
// Source: Standard React overlay pattern
// In App.tsx:
<div className="flex h-screen flex-col">
  <Header />
  <div className="relative flex-1">
    <BubbleCanvas />
    <DetailPanel />  {/* Absolutely positioned overlay */}
  </div>
</div>

// DetailPanel renders when selectedStock is non-null
function DetailPanel() {
  const stock = useAppStore(s => s.selectedStock);
  if (!stock) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative mx-auto mt-0 w-full max-w-[400px] animate-slide-down ...">
        {/* Panel content */}
      </div>
    </div>
  );
}
```

### Pattern 4: Canvas-Drawn Area Chart (Zero Dependencies)
**What:** Draw the price history area chart using canvas 2D API directly. Simpler and lighter than importing a charting library for a single sparkline.
**When to use:** When you need a simple area/line chart and already have canvas experience in the project.
**Example:**
```typescript
// Source: Canvas 2D API standard patterns
function drawAreaChart(
  ctx: CanvasRenderingContext2D,
  prices: number[],
  x: number, y: number, w: number, h: number,
  color: string
) {
  if (prices.length < 2) return;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const stepX = w / (prices.length - 1);

  // Draw filled area
  ctx.beginPath();
  ctx.moveTo(x, y + h); // Bottom-left
  for (let i = 0; i < prices.length; i++) {
    const px = x + i * stepX;
    const py = y + h - ((prices[i] - min) / range) * h;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + h); // Bottom-right
  ctx.closePath();

  // Gradient fill
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, color + '40'); // Semi-transparent at top
  grad.addColorStop(1, color + '05'); // Nearly transparent at bottom
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw line on top
  ctx.beginPath();
  for (let i = 0; i < prices.length; i++) {
    const px = x + i * stepX;
    const py = y + h - ((prices[i] - min) / range) * h;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}
```

### Anti-Patterns to Avoid
- **Drawing the detail panel on canvas:** Text rendering, scrolling, links, and accessibility all break. Use React DOM for rich UI.
- **Using mouse events instead of pointer events:** Touch won't work. Pointer Events API unifies mouse, touch, and pen.
- **Adding React state per bubble for hover:** Would cause 100+ re-renders per second. Track hoveredIndex as a plain variable in the canvas render closure.
- **Importing a full charting library for one sparkline:** recharts/Chart.js adds 40-200KB for something canvas 2D does in ~30 lines.
- **Animating backdrop-filter blur with CSS transition:** Known browser bug -- backdrop-filter: blur() breaks when animated directly. Use opacity transition on a pre-blurred overlay instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Touch/mouse unification | Separate touch + mouse handlers | Pointer Events API | Standard API, handles all input devices, setPointerCapture ensures drag works outside canvas |
| Backdrop dim + blur | Custom overlay rendering | CSS `backdrop-filter: blur()` + `bg-black/50` | Native CSS, GPU-accelerated, Baseline 2024 |
| Slide-down animation | JS animation frame loop | CSS `@keyframes` + Tailwind `animate-*` | CSS animations are GPU-composited, simpler code |
| VND price formatting | Manual string concatenation | `Intl.NumberFormat('vi-VN')` | Handles grouping separators, edge cases |

**Key insight:** This phase's complexity is in the canvas interaction layer (hit-testing, drag physics, glow rendering), not in the DOM side. The detail panel is straightforward React+CSS. Don't over-engineer the panel; focus effort on making canvas interactions feel right.

## Common Pitfalls

### Pitfall 1: Pointer Coordinates vs Canvas Coordinates
**What goes wrong:** Using `e.clientX/Y` directly with canvas draw coordinates produces wrong hit-tests on HiDPI displays or when canvas is not at (0,0).
**Why it happens:** Canvas has CSS size vs pixel size (DPR scaling). The existing code uses `setTransform(dpr, ...)` for rendering.
**How to avoid:** Convert pointer coordinates: `px = (e.clientX - rect.left)`, `py = (e.clientY - rect.top)`. Do NOT multiply by DPR -- the simulation buffers store CSS-pixel positions, and the DPR transform is applied only during rendering.
**Warning signs:** Clicks register on wrong bubbles, or hit-testing only works in top-left quadrant.

### Pitfall 2: Drag Conflicting with Physics
**What goes wrong:** The physics engine moves the bubble away from the pointer during drag, causing jitter.
**Why it happens:** `applyForces()` and `resolveCollisions()` update the dragged bubble's position every physics tick.
**How to avoid:** While dragging, zero out the dragged bubble's velocity and force-set its position to the pointer location each physics tick (or skip forces for that bubble index). On release, inject throw velocity.
**Warning signs:** Dragged bubble vibrates or doesn't follow pointer smoothly.

### Pitfall 3: Glow Effect Multiplying Draw Calls
**What goes wrong:** Adding a separate glow pass for hovered bubble doubles the radial gradient draws, dropping framerate.
**Why it happens:** Each bubble already draws 5-6 gradient passes. A glow adds more.
**How to avoid:** Reuse the existing outer glow code (already in render function, lines 187-203). For hover, simply increase the `glowT` multiplier for the hovered bubble index. One line change, zero extra draw calls.
**Warning signs:** FPS drops when hovering over bubbles.

### Pitfall 4: Detail Panel Blocking Canvas Events
**What goes wrong:** When the detail panel overlay is open, pointer events on the canvas stop working (can't tap another bubble).
**Why it happens:** The overlay `div` covers the entire screen and captures all pointer events.
**How to avoid:** Use `pointer-events-none` on the backdrop, `pointer-events-auto` only on the panel itself. Or: handle clicks that miss the panel in the overlay's onClick to forward them to canvas hit-testing.
**Warning signs:** Can't interact with bubbles while detail panel is open (user expects to tap another bubble to switch).

### Pitfall 5: Area Chart Data Not Available
**What goes wrong:** The detail panel needs price history data, but `StockData` only has current price and % changes (no historical array).
**Why it happens:** The VPS historical data is fetched during `fetchStockData()` but discarded after computing % changes -- the raw price arrays are not stored.
**How to avoid:** Two options: (1) Lazy-fetch price history when detail panel opens (one API call per stock, fast), or (2) Store the VPS historical bars during initial load. Option 1 is better -- avoids bloating initial load with 200 stocks x 365 days of data.
**Warning signs:** Detail panel chart is empty or requires separate API call design.

### Pitfall 6: Swipe-Down Gesture Conflicting with Scroll
**What goes wrong:** Swiping down on the detail panel scrolls the panel content instead of dismissing it.
**Why it happens:** Touch events have default scroll behavior.
**How to avoid:** Only trigger swipe-dismiss when the panel is scrolled to top (scrollTop === 0) and the touch direction is downward. Use `touch-action: pan-x` CSS or conditionally `preventDefault()`.
**Warning signs:** Can't dismiss panel by swiping, or can't scroll panel content.

## Code Examples

Verified patterns from the existing codebase and official APIs:

### Extending Zustand Store for Selected Stock
```typescript
// Source: Existing useAppStore.ts pattern
interface AppState {
  selectedTimeframe: Timeframe;
  selectedExchange: Exchange;
  searchQuery: string;
  selectedStock: StockData | null;  // NEW
  setTimeframe: (tf: Timeframe) => void;
  setExchange: (ex: Exchange) => void;
  setSearchQuery: (q: string) => void;
  setSelectedStock: (stock: StockData | null) => void;  // NEW
}
```

### Hover Glow (Modify Existing Render Code)
```typescript
// Source: Existing BubbleCanvas.tsx render function pattern
// In the render loop, modify glowT calculation for hovered bubble:
const isHovered = (i === hoveredIndex);
const baseGlowT = abs > 1 ? Math.min((abs - 1) / 11, 1) : 0;
const glowT = isHovered ? Math.max(baseGlowT, 0.8) : baseGlowT; // Boost glow on hover
// Optionally increase breathe amplitude for hovered bubble
const breathe = isHovered
  ? 1 - 0.25 + 0.25 * Math.sin(animTime * 3 + i * 0.3)  // Faster, stronger pulse
  : 1 - 0.15 + 0.15 * Math.sin(animTime * 1.9 + i * 0.3);
```

### CSS Slide-Down Animation (Tailwind Custom)
```css
/* Source: CSS @keyframes standard + Tailwind v4 custom utilities */
@keyframes slide-down {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
/* In Tailwind v4, use @utility or inline style */
.animate-slide-down {
  animation: slide-down 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}
```

### Lazy-Fetch Price History for Detail Panel
```typescript
// Source: Existing stockApi.ts VPS historical endpoint
// Reuse existing fetchVpsHistory function
async function fetchStockHistory(ticker: string): Promise<{ t: number[]; c: number[] } | null> {
  const today = new Date();
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const toTs = Math.floor(today.getTime() / 1000);
  const fromTs = Math.floor(yearAgo.getTime() / 1000);
  const url = `https://histdatafeed.vps.com.vn/tradingview/history?symbol=${ticker}&resolution=D&from=${fromTs}&to=${toTs}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.s === 'ok' ? { t: data.t, c: data.c } : null;
}
```

### VND Price Formatting
```typescript
// Source: Intl.NumberFormat standard
function formatVND(priceThousands: number): string {
  // price is stored in thousands of VND (e.g., 75.5 = 75,500 VND)
  const vnd = priceThousands * 1000;
  return new Intl.NumberFormat('vi-VN').format(vnd) + 'd';
  // Output: "75.500d"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate mouse + touch event handlers | Pointer Events API (unified) | 2020+ (Baseline) | Single codebase for all input devices |
| Heavy charting libraries for sparklines | Canvas 2D or SVG path for simple charts | Always available | Zero dependency, <50 lines of code |
| JavaScript-driven backdrop blur | CSS `backdrop-filter: blur()` | Baseline 2024 | GPU-accelerated, one CSS property |
| react-dnd / react-beautiful-dnd | Native pointer events + setPointerCapture | 2023+ | No library needed for simple drag |

**Deprecated/outdated:**
- `mousedown/touchstart` dual handlers: Use `pointerdown` instead (unified)
- `backdrop-filter` animation via CSS transition: Known to break -- animate opacity of a pre-blurred element instead

## Open Questions

1. **Additional stock data (P/E, EPS, 52-week High/Low, Trading Volume)**
   - What we know: Current `StockData` type only has ticker, companyName, exchange, price, marketCap, and 4 change percentages. The detail panel requires P/E, EPS, 52-week High/Low, and Trading Volume.
   - What's unclear: Which API provides P/E and EPS for VN stocks. VPS API has volume (`lot`) and high/low in `VpsPrice`. 52-week high/low can be computed from VPS historical data. P/E and EPS may need a separate source (Vietstock or another provider).
   - Recommendation: For v1, fetch P/E and EPS lazily when detail panel opens, or show "N/A" if unavailable. Volume and 52-week high/low are computable from existing VPS data. Extend `StockData` type or create a separate `StockDetail` type for panel-specific data.

2. **Pointer coordinate edge case with canvas container offset**
   - What we know: The canvas is inside `<div className="relative flex-1 overflow-hidden">`. `getBoundingClientRect()` gives correct offset.
   - What's unclear: Whether the header height causes any offset issues.
   - Recommendation: Use `canvas.getBoundingClientRect()` for all pointer coordinate transforms -- this handles any parent offsets correctly.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `BubbleCanvas.tsx`, `physics.ts`, `state.ts`, `gameLoop.ts`, `useAppStore.ts`, `stockApi.ts` -- direct code analysis
- [MDN: Element.setPointerCapture()](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) -- Pointer capture API
- [MDN: Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) -- Unified pointer event model
- [MDN: CSS backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) -- Background blur/dim
- [Tailwind CSS: Backdrop Blur](https://tailwindcss.com/docs/backdrop-blur) -- Tailwind utility classes

### Secondary (MEDIUM confidence)
- [Creating drag interactions with setPointerCapture](https://blog.r0b.io/post/creating-drag-interactions-with-set-pointer-capture-in-java-script/) -- Drag pattern reference
- [Animated backdrop filter blur overlay](https://expensive.toys/blog/animated-blur-overlay) -- Blur animation workaround
- [javascript.info: Pointer Events](https://javascript.info/pointer-events) -- Comprehensive pointer events guide

### Tertiary (LOW confidence)
- VPS historical API endpoint structure -- inferred from existing `stockApi.ts` code, not from official documentation
- P/E and EPS data availability for VN stocks via public APIs -- needs validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all native APIs with existing project patterns
- Architecture: HIGH - Canvas+DOM hybrid is the established pattern; hit-testing is standard geometry
- Pitfalls: HIGH - Derived from direct codebase analysis (DPR scaling, physics conflict, render performance)
- Detail panel data: MEDIUM - P/E and EPS sources need validation; price history fetch is straightforward

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- native APIs, no fast-moving dependencies)
