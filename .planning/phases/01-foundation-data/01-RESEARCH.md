# Phase 1: Foundation & Data - Research

**Researched:** 2026-03-06
**Domain:** React 19 + Vite scaffolding, Canvas 2D HiDPI rendering, mock data generation, Zustand state management, typed arrays for simulation
**Confidence:** HIGH

## Summary

Phase 1 establishes the application shell: a React 19 + TypeScript + Vite project with Tailwind CSS 4, a full-viewport HiDPI canvas element, a realistic mock data layer of ~400 VN stock tickers, and a two-tier state architecture (Zustand for UI state, Float32Array typed arrays for simulation state). The phase concludes by rendering one test bubble to validate the canvas pipeline.

The technology stack is mature and well-documented. React 19.2.x is stable, Vite 7.x provides fast builds with first-party Tailwind v4 plugin support, and Zustand 5.x is the de facto lightweight state management solution. The HiDPI canvas pattern is well-established (devicePixelRatio scaling). The main implementation work is curating realistic VN stock data and structuring the two-tier state correctly so downstream physics and rendering phases can consume it without refactoring.

**Primary recommendation:** Scaffold with `npm create vite@latest -- --template react-ts`, add Tailwind v4 via `@tailwindcss/vite` plugin, install Zustand 5, build a Canvas component with DPR scaling using useRef + useEffect, and create a static mock data module with ~400 hand-curated VN stock tickers linked to Float32Array simulation buffers by index.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Canvas initial state: render one test bubble to validate HiDPI canvas pipeline (not blank, not full dataset); dark theme background (#1a1a1a); canvas sits below a header shell (not fullscreen)
- Header shell: logo (simple bubble icon with colored circles, placeholder), app name "VN Stock Bubbles", timeframe tabs with Vietnamese labels (Ngay / Tuan / Thang / Nam), tabs are UI-only in Phase 1 (no functional behavior)
- No search, filter buttons, or settings in Phase 1
- Bubble visual style: 3D sphere effect using radial gradient (highlight top-left, shadow bottom-right), glow border for bubbles with high % change, temporary VN color convention (blue for positive change); Phase 3 implements full color system
- UI labels in Vietnamese (Ngay, Tuan, Thang, Nam)
- Typed arrays: pre-build full structure (x, y, vx, vy, radius, mass); vx/vy initialized to 0; mass computed from market cap; linked to stock data array via matching index
- Stock data: separate array of objects for non-numeric data (ticker symbol, company name, exchange, price, market cap, % changes per timeframe); linked to typed arrays by index position
- Zustand store: selectedTimeframe ('day' | 'week' | 'month' | 'year'), selectedExchange ('all' | 'HOSE' | 'HNX' | 'UPCOM'), searchQuery (string)
- Mock data: ~400 real VN stock tickers (VNM, VIC, FPT, HPG, VHM, TCB, MBB, ACB, SSI, VPB, BID, CTG, etc.); prices and market caps approximately realistic; % changes randomized; include exchange designation per ticker

### Claude's Discretion
- Exact radial gradient parameters for 3D effect
- Header height and spacing
- Logo SVG design details
- Typed array memory layout optimization
- File/folder structure within src/

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUN-01 | React 19 + TypeScript + Vite project scaffolding with Tailwind 4 | Standard stack section covers exact commands, versions, and config patterns |
| FOUN-02 | Two-tier state architecture: Zustand for UI state, plain JS typed arrays for simulation state | Architecture Patterns section documents both tiers with TypeScript types and linking strategy |
| DATA-01 | Mock data layer with ~400 realistic VN stock tickers (symbol, company name, price, market cap, % changes across all timeframes) | Code Examples section provides data structures, realistic ticker lists by exchange, and generation patterns |
| RNDR-01 | Canvas-based bubble renderer with Retina/HiDPI (devicePixelRatio) scaling | Architecture Patterns and Code Examples sections document the DPR scaling pattern with React useRef/useEffect |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.x | UI framework | Latest stable, automatic ref forwarding, hooks-first |
| react-dom | 19.2.x | DOM rendering | Paired with React 19 |
| typescript | 5.x | Type safety | Required by Vite react-ts template |
| vite | 7.x | Build tool + dev server | Fastest DX, native ESM, official react-ts template |
| @vitejs/plugin-react | latest | React Fast Refresh for Vite | Official Vite React plugin, ships with template |
| tailwindcss | 4.2.x | Utility-first CSS | Header/layout styling, v4 has dedicated Vite plugin |
| @tailwindcss/vite | latest | Tailwind Vite integration | First-party plugin, no PostCSS config needed |
| zustand | 5.x | UI state management | 1KB, hooks-based, no provider, TypeScript-native |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | Phase 1 has no additional dependencies |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | Redux Toolkit | Overkill for 3 UI state fields; more boilerplate |
| Zustand | React Context | Re-renders entire subtree on any state change; no selector support |
| Tailwind 4 | Plain CSS | Header is simple enough for plain CSS, but Tailwind provides consistency and rapid iteration for later phases |
| Canvas 2D | WebGL | Not needed yet -- Phase 1 only renders one test bubble; Canvas 2D is simpler to set up and sufficient for initial validation |

**Installation:**
```bash
npm create vite@latest vn-stock-bubbles -- --template react-ts
cd vn-stock-bubbles
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install zustand
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── App.tsx              # Root layout: header + canvas container
│   ├── Header.tsx           # Logo, app name, timeframe tabs
│   └── BubbleCanvas.tsx     # Canvas element with DPR scaling + test bubble
├── data/
│   └── mockStocks.ts        # ~400 VN stock tickers with realistic values
├── simulation/
│   └── state.ts             # Float32Array typed arrays for simulation
├── store/
│   └── useAppStore.ts       # Zustand UI state store
├── types/
│   └── stock.ts             # TypeScript interfaces for stock data
├── index.css                # Tailwind import + global styles
├── main.tsx                 # React entry point
└── vite-env.d.ts            # Vite type declarations
```

### Pattern 1: HiDPI Canvas with React

**What:** A Canvas component that scales its internal resolution by `devicePixelRatio` while keeping CSS dimensions matching the container, producing crisp rendering on Retina displays.

**When to use:** Always -- this is the core rendering surface for all phases.

**Example:**
```typescript
// Source: MDN devicePixelRatio + web.dev HiDPI Canvas article
import { useRef, useEffect } from 'react';

interface BubbleCanvasProps {
  className?: string;
}

export function BubbleCanvas({ className }: BubbleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      if (!parent) return;

      const w = parent.clientWidth;
      const h = parent.clientHeight;

      // Set internal resolution (actual pixels)
      canvas.width = w * dpr;
      canvas.height = h * dpr;

      // Set display size (CSS pixels)
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      // Scale context so drawing uses CSS pixel coordinates
      ctx.scale(dpr, dpr);

      // Draw content after resize
      drawTestBubble(ctx, w, h);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
```

### Pattern 2: Two-Tier State Architecture

**What:** Zustand manages UI state (selectedTimeframe, selectedExchange, searchQuery). Simulation state lives in plain Float32Array typed arrays outside React's render cycle -- no re-renders when physics updates positions at 60fps.

**When to use:** Always -- this separation is critical for Phase 2 performance.

**Why:** React state triggers re-renders. Physics simulation updates x, y, vx, vy positions 60 times per second for 400+ bubbles. Putting this in React state would cause catastrophic re-rendering. Typed arrays are updated in-place by the simulation loop, and the canvas reads them directly during requestAnimationFrame draws.

**Example:**
```typescript
// store/useAppStore.ts
import { create } from 'zustand';

type Timeframe = 'day' | 'week' | 'month' | 'year';
type Exchange = 'all' | 'HOSE' | 'HNX' | 'UPCOM';

interface AppState {
  selectedTimeframe: Timeframe;
  selectedExchange: Exchange;
  searchQuery: string;
  setTimeframe: (tf: Timeframe) => void;
  setExchange: (ex: Exchange) => void;
  setSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedTimeframe: 'day',
  selectedExchange: 'all',
  searchQuery: '',
  setTimeframe: (tf) => set({ selectedTimeframe: tf }),
  setExchange: (ex) => set({ selectedExchange: ex }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
```

```typescript
// simulation/state.ts
// Struct-of-Arrays layout for cache-friendly iteration
export interface SimulationBuffers {
  x: Float32Array;       // x position (CSS pixels)
  y: Float32Array;       // y position (CSS pixels)
  vx: Float32Array;      // x velocity (px/frame) -- 0 in Phase 1
  vy: Float32Array;      // y velocity (px/frame) -- 0 in Phase 1
  radius: Float32Array;  // bubble radius (CSS pixels)
  mass: Float32Array;    // derived from market cap
}

export function createSimulationBuffers(count: number): SimulationBuffers {
  return {
    x: new Float32Array(count),
    y: new Float32Array(count),
    vx: new Float32Array(count),    // initialized to 0 by default
    vy: new Float32Array(count),    // initialized to 0 by default
    radius: new Float32Array(count),
    mass: new Float32Array(count),
  };
}
```

### Pattern 3: Mock Data Structure

**What:** A static array of stock data objects, each containing non-numeric metadata. Linked to simulation typed arrays by matching array index.

**Example:**
```typescript
// types/stock.ts
export interface StockData {
  ticker: string;         // e.g., "VNM", "VIC", "FPT"
  companyName: string;    // e.g., "Vinamilk", "Vingroup"
  exchange: 'HOSE' | 'HNX' | 'UPCOM';
  price: number;          // VND, in thousands (e.g., 75.5 = 75,500 VND)
  marketCap: number;      // VND, in billions
  changeDay: number;      // % change today
  changeWeek: number;     // % change this week
  changeMonth: number;    // % change this month
  changeYear: number;     // % change this year
}
```

### Pattern 4: 3D Bubble Radial Gradient

**What:** Creates a 3D sphere illusion using `createRadialGradient` with a highlight offset toward the top-left and shadow at the bottom-right.

**When to use:** When drawing the test bubble in Phase 1 and all bubbles in later phases.

**Example (adapted from reference code script.js lines 242-253):**
```typescript
function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  baseColor: string
) {
  // Base fill
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();

  // 3D sphere highlight overlay
  const grad = ctx.createRadialGradient(
    x - r * 0.18, y - r * 0.22, r * 0.05,  // highlight: offset top-left
    x, y, r                                   // shadow: centered
  );
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
  grad.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}
```

### Anti-Patterns to Avoid

- **Storing simulation state in React:** Never put x, y, vx, vy in useState or Zustand. These are updated at 60fps and must bypass React's reconciliation.
- **Re-creating typed arrays on every frame:** Allocate once, mutate in place. `new Float32Array()` is expensive if called per frame.
- **Canvas without DPR scaling:** Forgetting `ctx.scale(dpr, dpr)` after setting canvas dimensions produces blurry output on Retina displays. This is the most common canvas pitfall.
- **Setting canvas width/height via CSS only:** CSS sizing stretches the canvas bitmap. You must set `canvas.width` and `canvas.height` attributes (the internal resolution) separately from the CSS display size.
- **Hardcoding DPR value:** Always use `window.devicePixelRatio || 1`. The value differs per device and can change at runtime (e.g., dragging window between displays).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UI state management | Custom pub/sub or React Context | Zustand | Built-in selectors prevent unnecessary re-renders; 1KB; TypeScript-native |
| CSS utility framework | Custom CSS classes for layout | Tailwind 4 | Header and layout styling is faster with utilities; consistent with later phases |
| Project scaffolding | Manual webpack/esbuild config | Vite react-ts template | HMR, TypeScript, ESLint preconfigured out of the box |
| VN stock ticker data | Web scraping or API calls | Static mock data module | Phase 1 is offline-first; hand-curated data ensures realistic values without network dependency |

**Key insight:** Phase 1's complexity is structural (getting the architecture right for downstream phases), not algorithmic. Use established tools so effort goes into data curation and state design.

## Common Pitfalls

### Pitfall 1: Blurry Canvas on Retina Displays
**What goes wrong:** Canvas renders at 1x resolution on 2x/3x displays, producing visibly blurry content.
**Why it happens:** Developers set canvas CSS dimensions but not the internal `width`/`height` attributes scaled by `devicePixelRatio`.
**How to avoid:** Always multiply canvas.width and canvas.height by DPR, then call `ctx.scale(dpr, dpr)` so drawing coordinates remain in CSS pixels.
**Warning signs:** Text and circles look fuzzy; edges are not crisp on MacBook/iPhone.

### Pitfall 2: Canvas Resize Flicker
**What goes wrong:** Canvas clears and flashes white during window resize.
**Why it happens:** Setting `canvas.width` or `canvas.height` clears the canvas bitmap. If redraw happens asynchronously (next frame), there's a visible flash.
**How to avoid:** Immediately redraw after setting dimensions in the same synchronous call. Debounce the resize handler but not the redraw.
**Warning signs:** White flash when dragging browser window edges.

### Pitfall 3: Typed Array Index Mismatch
**What goes wrong:** Stock data at index `i` doesn't correspond to simulation buffers at index `i`, causing wrong tickers to display on wrong bubbles.
**Why it happens:** Arrays are sorted or filtered independently, breaking the index linkage.
**How to avoid:** Never sort or filter the simulation arrays or stock data array independently. If filtering is needed, use a separate index mapping array. In Phase 1, the arrays are static and immutable, so this is unlikely -- but the pattern must be established now.
**Warning signs:** Incorrect ticker labels appearing on bubbles when filtering is added later.

### Pitfall 4: Zustand Double-Parentheses TypeScript Pattern
**What goes wrong:** TypeScript type inference fails or store loses type safety.
**Why it happens:** Zustand 5.x requires the curried `create<T>()((set) => ...)` pattern (double parentheses) for proper TypeScript inference when using middleware.
**How to avoid:** Always use `create<StateType>()((set) => ({ ... }))` even if not using middleware yet -- it's the standard pattern.
**Warning signs:** TypeScript errors about `set` parameter types or state shape not matching interface.

### Pitfall 5: Tailwind v4 Setup with Old v3 Patterns
**What goes wrong:** Tailwind classes don't work, build errors about missing config.
**Why it happens:** Following v3 guides that use `tailwind.config.js`, PostCSS config, and `@tailwind base/components/utilities` directives -- none of which apply to v4.
**How to avoid:** Tailwind v4 setup: install `tailwindcss @tailwindcss/vite`, add plugin to vite.config.ts, use `@import "tailwindcss"` in CSS. No config file, no PostCSS.
**Warning signs:** Error messages about `tailwind.config.js` or `@tailwind` directives.

### Pitfall 6: VND Price Formatting Confusion
**What goes wrong:** Stock prices displayed incorrectly because VND prices are in thousands (e.g., VNM trades at ~75,000 VND which is often written as 75.0 on trading screens).
**Why it happens:** VN stock prices are conventionally displayed in thousands of VND (e.g., 75.5 means 75,500 VND). Mixing raw VND values with thousand-VND values creates off-by-1000x errors.
**How to avoid:** Decide on a consistent unit in the mock data and document it. Recommendation: store as thousands of VND (matching how trading platforms display them). Add a comment in the type definition.
**Warning signs:** Market caps that don't make sense relative to prices.

## Code Examples

Verified patterns from official sources:

### Vite Config with React + Tailwind v4
```typescript
// vite.config.ts
// Source: https://tailwindcss.com/docs (Tailwind v4.2 official docs)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
});
```

### CSS Entry Point (Tailwind v4)
```css
/* src/index.css */
/* Source: https://tailwindcss.com/docs */
@import "tailwindcss";

/* Global overrides for dark theme */
body {
  margin: 0;
  background-color: #1a1a1a;
  color: #fff;
  font-family: 'Verdana', 'Arial', sans-serif;
  overflow: hidden;
}
```

### Zustand Store with TypeScript
```typescript
// Source: https://github.com/pmndrs/zustand README + TypeScript guide
import { create } from 'zustand';

type Timeframe = 'day' | 'week' | 'month' | 'year';
type Exchange = 'all' | 'HOSE' | 'HNX' | 'UPCOM';

interface AppState {
  selectedTimeframe: Timeframe;
  selectedExchange: Exchange;
  searchQuery: string;
  setTimeframe: (tf: Timeframe) => void;
  setExchange: (ex: Exchange) => void;
  setSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedTimeframe: 'day',
  selectedExchange: 'all',
  searchQuery: '',
  setTimeframe: (tf) => set({ selectedTimeframe: tf }),
  setExchange: (ex) => set({ selectedExchange: ex }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
```

### Simulation Buffers Initialization
```typescript
// simulation/state.ts
export interface SimulationBuffers {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  radius: Float32Array;
  mass: Float32Array;
}

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
 * radius: sqrt(marketCap) scaled to pixel range
 * mass: proportional to marketCap (for physics in Phase 2)
 */
export function initBuffersFromStocks(
  buffers: SimulationBuffers,
  stocks: { marketCap: number }[],
  minRadius: number,
  maxRadius: number,
): void {
  const caps = stocks.map(s => s.marketCap);
  const maxCap = Math.max(...caps);
  const minCap = Math.min(...caps);

  for (let i = 0; i < stocks.length; i++) {
    // sqrt scale for area-proportional sizing
    const t = maxCap > minCap
      ? (Math.sqrt(stocks[i].marketCap) - Math.sqrt(minCap)) / (Math.sqrt(maxCap) - Math.sqrt(minCap))
      : 0.5;
    buffers.radius[i] = minRadius + t * (maxRadius - minRadius);
    buffers.mass[i] = stocks[i].marketCap;
    // x, y positioned at center initially (single test bubble)
    // vx, vy remain 0 (Phase 2 activates physics)
  }
}
```

### Mock Stock Data Pattern
```typescript
// data/mockStocks.ts
import type { StockData } from '../types/stock';

// Helper: random % change in range [-magnitude, +magnitude]
function randChange(magnitude: number): number {
  return +((Math.random() - 0.5) * 2 * magnitude).toFixed(2);
}

// Top VN stocks by exchange with approximately realistic market caps and prices
// Prices in thousands of VND (e.g., 75.5 = 75,500 VND)
// Market caps in billions of VND
const HOSE_STOCKS: [string, string, number, number][] = [
  // [ticker, companyName, priceThousandVND, marketCapBillionVND]
  ['VIC', 'Vingroup', 42.0, 180000],
  ['VHM', 'Vinhomes', 36.0, 120000],
  ['BID', 'BIDV', 50.0, 102000],
  ['VCB', 'Vietcombank', 85.0, 95000],
  ['GAS', 'PV Gas', 80.0, 78000],
  ['VPB', 'VPBank', 20.5, 65000],
  ['HPG', 'Hoa Phat', 26.0, 62000],
  ['FPT', 'FPT Corp', 120.0, 55000],
  ['VNM', 'Vinamilk', 65.0, 42000],
  ['MBB', 'MB Bank', 24.0, 40000],
  ['TCB', 'Techcombank', 28.0, 38000],
  ['CTG', 'VietinBank', 35.0, 37000],
  ['ACB', 'ACB', 25.0, 36000],
  ['SSI', 'SSI Securities', 30.0, 22000],
  // ... (continue for ~300 HOSE tickers)
];

// Generate full stock data with randomized % changes
export function generateMockStocks(): StockData[] {
  const stocks: StockData[] = [];

  for (const [ticker, name, price, mcap] of HOSE_STOCKS) {
    stocks.push({
      ticker,
      companyName: name,
      exchange: 'HOSE',
      price,
      marketCap: mcap,
      changeDay: randChange(5),
      changeWeek: randChange(10),
      changeMonth: randChange(20),
      changeYear: randChange(60),
    });
  }

  // Similarly for HNX_STOCKS and UPCOM_STOCKS arrays
  // ...

  return stocks;
}
```

### Canvas Component with Test Bubble
```typescript
// components/BubbleCanvas.tsx
import { useRef, useEffect } from 'react';

export function BubbleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function render() {
      const parent = canvas!.parentElement;
      if (!parent || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;

      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dark background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, w, h);

      // Test bubble: centered, blue (positive), with 3D gradient
      const cx = w / 2;
      const cy = h / 2;
      const r = 60;

      // Blue base (VN positive convention)
      const hue = 210, sat = 60, lum = 35;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lum}%)`;
      ctx.fill();

      // 3D sphere highlight
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

      // Ticker label
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 16px Verdana, Arial, sans-serif';
      ctx.fillText('VNM', cx, cy - 8);
      ctx.font = '12px Verdana, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('+2.5%', cx, cy + 12);
    }

    render();
    window.addEventListener('resize', render);
    return () => window.removeEventListener('resize', render);
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tailwind base/components/utilities` directives | `@import "tailwindcss"` single import | Tailwind v4.0 (Jan 2025) | No tailwind.config.js, no PostCSS, simpler setup |
| `tailwindcss` + `postcss` + `autoprefixer` install | `tailwindcss` + `@tailwindcss/vite` only | Tailwind v4.0 (Jan 2025) | Dedicated Vite plugin, fewer dependencies |
| Create React App (CRA) | `npm create vite@latest` | CRA deprecated 2023 | Vite is the standard scaffolding tool |
| `forwardRef` for passing refs | Direct ref prop on function components | React 19 (Dec 2024) | Cleaner canvas ref patterns |
| Zustand `create(fn)` | Zustand `create<T>()(fn)` curried | Zustand 5.0 (2024) | Required for TypeScript type inference |
| Vite 5/6 | Vite 7 | 2025 | Faster builds, Node 20.19+ required |

**Deprecated/outdated:**
- Create React App (CRA): Fully deprecated, do not use
- Tailwind v3 config pattern (`tailwind.config.js` + PostCSS): Does not apply to v4
- `React.forwardRef`: No longer needed in React 19 for simple ref passing
- Zustand `create(fn)` without currying: Loses TypeScript type inference in v5

## VN Stock Data Reference

For the mock data layer, here are the key stocks organized by exchange based on current market data:

### HOSE (~400 stocks) -- Major Tickers
**Large Cap (top 30):** VIC, VHM, BID, GAS, VPB, HPG, FPT, VNM, HDB, STB, ACB, MSN, VJC, PLX, SSI, SHB, HVN, BCM, VRE, SAB, BVH, VIB, SSB, TPB, POW, EIB, PNJ, MSB, REE, VCB, MBB, TCB, CTG, NVL, MWG, KDH, DGC, PC1

**Mid Cap (examples):** GVR, DCM, DPM, NT2, BSR, OGC, PVD, PVT, HAG, HBC, DXG, IJC, HDG, KBC, LPB, TLG, DHC, VND, HCM, GMD, TCH, VGC, VSH, VTP, BWE, VCI, GEX, PHR, SCS, VPI

**Small Cap (examples):** AAA, ABT, AGG, ANV, ASM, BMP, BSI, CII, CMG, CSV, CTD, CTR, DAH, DBC, DBD, DHA, DHG, DMC, DPG, DRC, DSN, DVP, EVF, FCN, FMC, FRT, GTN, HAH, HHV, HHS, HNG, HQC, HSG, HT1, HTL, IDI, IMP, ITA, JVC, KBC, KDC, KHP, KOS, LAF, LDG, LGC, LHG, LSS, MPC, NKG, NLG, NSC, OPC, ORS, PAC, PAN, PDR, PET, PGC, PGI, PHR, PIT, PLP, PNJ, POM, PPC, PTB, PVD, PVP, QCG, RAL, RDP, SBT, SFG, SHP, SJS, SKG, SMA, SPM, SRC, SRF, STG, SVI, SZC, TAC, TBC, TCM, TDP, THG, TIG, TIP, TLH, TMP, TMS, TNH, TNI, TRA, TSC, TTA, TTF, TV2, TYA, VCA, VDS, VFG, VGI, VHC, VIX, VMD, VNE, VNS, VOS, VPH, VRC, VSC, VSI, VTO

### HNX (~350 stocks) -- Major Tickers
**Key stocks:** ACG, CEO, DTD, HUT, IDC, PVS, SHS, TNG, VC3, VCS, VGS, BVS, DDG, DVG, HLD, HTP, KLF, L14, L18, MBS, NBC, NDN, NRC, PGS, PLC, PSD, PVB, PVC, S99, SDG, SHN, SMT, TAR, TDN, THD, TIG, VC2, VCG, VCR, VNR, WSS

### UPCOM (~800+ stocks) -- Major Tickers
**Key stocks:** ACV, BSR, DAT, DVN, FOX, HRT, MCH, OIL, QNS, VEA, VGT, YEG, ADC, APS, AVF, BAB, BRR, BTW, CAB, CAN, CCL, CDN, CMN, CNG, DAE, DSE, DVW, EMC, HAD, HCC, HGM, IDJ, KSB, LMI, MFS, NAB, NCT, PCG, PFL, PMG, SAM, SHI, VKC, VMC, VNT, VTJ, VTP

### Price Range Guidelines (thousands VND)
- Blue chips: 40-120 (VCB ~85, FPT ~120, VIC ~42, VNM ~65)
- Mid caps: 15-50 (HPG ~26, MBB ~24, SSI ~30)
- Small caps: 5-30 (most trade in 10-25 range)
- Penny stocks: 1-10 (some UPCOM/HNX stocks)

### Market Cap Guidelines (billions VND)
- Large cap: >30,000 (VIC ~180,000, VCB ~95,000, FPT ~55,000)
- Mid cap: 5,000-30,000 (SSI ~22,000, PNJ ~12,000)
- Small cap: 1,000-5,000
- Micro cap: <1,000

## Open Questions

1. **Exact number of mock tickers needed**
   - What we know: User specified ~400 tickers. HOSE has ~400 listed stocks. HNX ~350, UPCOM ~800+.
   - What's unclear: Should we include only HOSE stocks (~400) or spread across all three exchanges?
   - Recommendation: Include ~300 HOSE + ~60 HNX + ~40 UPCOM = ~400 total. This matches the real distribution where HOSE dominates by market cap and provides realistic exchange diversity for the filter UI.

2. **Price unit convention**
   - What we know: VN stocks are quoted in VND. Common display is thousands of VND (e.g., 75.5 = 75,500 VND).
   - What's unclear: Which unit to store in mock data.
   - Recommendation: Store in thousands of VND (matching how VN trading platforms display). Document clearly in the type definition.

3. **Canvas resize strategy**
   - What we know: The canvas sits below a header (not fullscreen). Container height = viewport height minus header height.
   - What's unclear: Should ResizeObserver be used (more accurate for container changes) or window resize event (simpler)?
   - Recommendation: Use ResizeObserver on the parent container for accuracy. It handles cases where header size changes or the container is resized without a window resize event. However, plain window resize is sufficient for Phase 1's simple layout.

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v4.2 official docs](https://tailwindcss.com/docs) -- Vite plugin setup, `@import "tailwindcss"` syntax
- [Vite official guide](https://vite.dev/guide/) -- v7.3.1, `npm create vite@latest` command, Node 20.19+ requirement
- [Zustand GitHub repo](https://github.com/pmndrs/zustand) -- v5.x API, TypeScript curried pattern
- [MDN devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio) -- DPR scaling API reference
- [MDN Float32Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array) -- Typed array constructor and usage
- [web.dev HiDPI Canvas](https://web.dev/articles/canvas-hidipi) -- Canvas scaling best practices
- [companiesmarketcap.com Vietnam](https://companiesmarketcap.com/vietnam/largest-companies-in-vietnam-by-market-cap/) -- Top 30 VN stocks by market cap (March 2025 data)

### Secondary (MEDIUM confidence)
- [React 19.2 release blog](https://react.dev/blog/2025/10/01/react-19-2) -- Version 19.2.4 is latest (confirmed via web search)
- [Zustand TypeScript guide (DeepWiki)](https://deepwiki.com/pmndrs/zustand/5-typescript-integration) -- Curried create pattern explanation
- Multiple web guides confirming Tailwind v4 setup pattern (no tailwind.config.js, no PostCSS needed)

### Tertiary (LOW confidence)
- VN stock ticker lists: compiled from multiple sources (companiesmarketcap, Wikipedia, TradingView references). Individual ticker data should be verified for exact prices/caps, but approximate realism is sufficient for mock data.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all library versions verified against official sources, setup patterns confirmed
- Architecture: HIGH -- two-tier state pattern is well-established in canvas/game applications; HiDPI pattern is canonical
- Pitfalls: HIGH -- based on common developer reports and verified against official docs
- Mock data accuracy: MEDIUM -- ticker symbols are real but prices/market caps are approximate (sufficient for mock data purposes)

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- stable ecosystem, unlikely to change)
