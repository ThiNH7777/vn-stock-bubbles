# Phase 4: Interaction & Transitions - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can explore the market by dragging bubbles, hovering for details, tapping for a detail panel, and switching time periods with smooth animations. This phase adds all user interaction to the bubble chart.

</domain>

<decisions>
## Implementation Decisions

### Tap Detail Panel - Content
- Header: stock logo (from Vietstock) + ticker symbol + company name + close button (X)
- Price displayed in VND format (e.g., 75,500d)
- Stats row: Market Cap (billions VND), Trading Volume, P/E, EPS
- 52-week High/Low indicator
- Exchange badge (HOSE/HNX/UPCOM)
- Area chart (line + filled area below) showing price history with high/low annotations
- Timeframe tabs below chart: Day / Week / Month / Year with % change for each (all 4 always visible)
- Link to Vietstock stock detail page (single external link, not multiple sites)
- Reference: layout inspired by cryptobubbles.net detail panel (see screenshot)

### Tap Detail Panel - UI Style
- Overlay panel centered on screen, background dims + blurs (bubbles still animate behind)
- Animation: slide down from top of screen
- Desktop: panel width ~400px centered
- Mobile: panel full-width
- Panel has dark theme consistent with app background

### Tap Detail Panel - Close Behavior
- Close via X button in panel header
- Close via swipe down gesture (mobile-friendly)
- No close on tap-outside (could conflict with tap-on-other-bubble)
- When panel is open, tapping another bubble switches to that stock's detail (no close+reopen needed)

### Tap vs Drag Distinction
- Tap (short press <200ms, no pointer movement) = open detail panel
- Hold + move = drag bubble (physics interaction with momentum on release)

### Hover Behavior (Desktop)
- Hover over bubble = glow effect only (bubble brightens/pulses)
- No tooltip on hover -- detail info only available via click/tap

### Timeframe Transitions
- Switching timeframe (Day/Week/Month/Year) animates bubble sizes, colors, and positions smoothly
- Already partially implemented: radius lerp animation exists in BubbleCanvas

### Claude's Discretion
- Exact slide-down animation timing/easing
- Glow effect intensity and style on hover
- Area chart library choice or canvas-drawn
- Drag momentum physics (throw velocity, friction)
- Swipe-down threshold distance to trigger close
- Panel border radius and shadow styling

</decisions>

<specifics>
## Specific Ideas

- "I want it to look similar to cryptobubbles.net detail panel" -- user provided screenshot reference showing: logo, name, stats row (Rank/MarketCap/Volume), area chart with high/low labels, timeframe % tabs at bottom
- For VN stocks: no Rank (unlike crypto), no Trade links, replace crypto exchange links with Vietstock only
- Stock-specific additions over crypto: P/E, EPS, 52-week High/Low
- Panel slides down from top (not fade/scale from bubble position)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StockData` type: has ticker, companyName, exchange, price, marketCap, changeDay/Week/Month/Year
- `useAppStore` (Zustand): manages selectedTimeframe, searchQuery -- can extend with selectedStock state
- Stock logos already loaded from `finance.vietstock.vn/image/{TICKER}` in BubbleCanvas
- Color helpers (getBubbleColor, rgbToHSL, hslToRGB) exist in BubbleCanvas

### Established Patterns
- Canvas-based rendering (no DOM elements for bubbles) -- hit testing needs manual implementation (point-in-circle check)
- Zustand for UI state, Float32Array typed arrays for simulation state
- HiDPI scaling via setTransform
- ResizeObserver for responsive canvas

### Integration Points
- BubbleCanvas.tsx: needs click/pointer event handlers added to canvas element
- useAppStore: extend with `selectedStock: StockData | null` and `setSelectedStock`
- Detail panel will be a React DOM component overlaid on the canvas (not drawn on canvas)
- Simulation buffers (x, y, radius arrays) needed for hit-testing which bubble was tapped

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 04-interaction-transitions*
*Context gathered: 2026-03-07*
