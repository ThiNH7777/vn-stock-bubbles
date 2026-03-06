# Phase 1: Foundation & Data - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding (React 19 + TypeScript + Vite + Tailwind 4), mock data layer with ~400 realistic VN stock tickers, canvas element with HiDPI scaling, and two-tier state architecture (Zustand for UI state + typed arrays for simulation state). One test bubble rendered to validate the canvas pipeline.

</domain>

<decisions>
## Implementation Decisions

### Canvas initial state
- Render one test bubble to validate HiDPI canvas pipeline (not blank, not full dataset)
- Dark theme background (#1a1a1a)
- Canvas sits below a header shell — not fullscreen

### Header shell
- Logo: simple bubble icon (a few colored circles, placeholder)
- App name: "VN Stock Bubbles"
- Timeframe tabs: Ngày / Tuần / Tháng / Năm (Vietnamese labels)
- Tabs are UI-only in Phase 1 — no functional behavior yet
- No search, filter buttons, or settings in Phase 1

### Bubble visual style
- 3D sphere effect using radial gradient (highlight top-left, shadow bottom-right) — matching reference code pattern
- Glow border for bubbles with high % change (viền phát sáng)
- Temporary VN color convention: blue for positive change
- Phase 3 will implement the full color system (purple/blue/red/cyan/yellow)

### Language
- UI labels in Vietnamese (Ngày, Tuần, Tháng, Năm)

### Typed arrays (simulation state)
- Pre-build full structure: x, y, vx, vy, radius, mass
- vx/vy initialized to 0 (Phase 2 activates physics)
- mass computed from market cap
- Linked to stock data array via matching index

### Stock data (array of objects)
- Separate array of objects for non-numeric data: ticker symbol, company name, exchange, price, market cap, % changes per timeframe
- Linked to typed arrays by index position

### Zustand store (UI state)
- selectedTimeframe: 'day' | 'week' | 'month' | 'year'
- selectedExchange: 'all' | 'HOSE' | 'HNX' | 'UPCOM'
- searchQuery: string

### Mock data
- ~400 real VN stock tickers (VNM, VIC, FPT, HPG, VHM, TCB, MBB, ACB, SSI, VPB, BID, CTG, etc.)
- Prices and market caps approximately realistic (close to actual values)
- % changes randomized across all timeframes (day, week, month, year)
- Include exchange designation (HOSE, HNX, UPCOM) per ticker

### Claude's Discretion
- Exact radial gradient parameters for 3D effect
- Header height and spacing
- Logo SVG design details
- Typed array memory layout optimization
- File/folder structure within src/

</decisions>

<specifics>
## Specific Ideas

- Reference code (script.js) has a working 3D sphere highlight pattern using `createRadialGradient` — reuse this visual approach in the new React/Canvas implementation
- Cryptobubbles.net is the visual inspiration — dark background, glowing bubbles, clean header
- VN stock market convention: blue = up, red = down (different from international green/red)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `script.js:drawBubble()` (lines 193-299): 3D sphere gradient + glow border pattern — adapt this rendering approach for Phase 1 test bubble
- `script.js:layout()` (lines 102-167): HiDPI canvas scaling pattern (`canvas.width = W * DPR`) — reuse this approach
- `style.css`: Header styling, tab styling, tooltip CSS — reference for dark theme conventions

### Established Patterns
- Canvas 2D context with devicePixelRatio scaling (reference code uses `DPR = window.devicePixelRatio || 1`)
- HSL color system for bubble coloring based on % change
- Radial gradient for 3D sphere illusion

### Integration Points
- Starting from scratch with React 19 + Vite — no existing React code to integrate with
- Existing vanilla JS code is reference only (PROJECT.md confirms this)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-data*
*Context gathered: 2026-03-06*
