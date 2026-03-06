---
phase: 04-interaction-transitions
plan: 01
subsystem: ui
tags: [canvas, pointer-events, drag, hover, color-lerp, zustand, interaction]

# Dependency graph
requires:
  - phase: 02-physics-engine
    provides: SimulationBuffers (x/y/vx/vy/radius arrays), stepPhysics, game loop
  - phase: 01-foundation-data
    provides: StockData type, useAppStore Zustand store, BubbleCanvas rendering
provides:
  - Canvas pointer interaction (hit-test, drag with momentum, tap detection)
  - Hover glow effect (boosted glowT, faster pulse, wider spread)
  - Selected stock highlight (persistent glow for tapped bubble)
  - Smooth color lerp animation on timeframe switch (displayChange Float32Array)
  - selectedStock and setSelectedStock in Zustand store
affects: [04-interaction-transitions]

# Tech tracking
tech-stack:
  added: []
  patterns: [pointer-events-api, hit-test-point-in-circle, drag-exclusion-post-physics, color-lerp-float32array]

key-files:
  created: []
  modified:
    - vn-stock-bubbles/src/store/useAppStore.ts
    - vn-stock-bubbles/src/components/BubbleCanvas.tsx

key-decisions:
  - "Pointer state as plain closure variables (not React state) to avoid re-renders during 60fps interaction"
  - "Drag exclusion via post-physics re-pin (simpler than modifying physics module to skip pinned index)"
  - "displayChange Float32Array for smooth color and text lerp on timeframe switch (same LERP_SPEED as radius)"
  - "Combined hover and selected stock into single isHighlighted flag for unified glow rendering"
  - "touch-none CSS class on canvas to prevent default browser touch gestures"

patterns-established:
  - "Hit-test: reverse iteration over simulation buffers for topmost-bubble priority"
  - "Drag: setPointerCapture + track currentX/Y for post-physics re-pin"
  - "Tap vs drag: <200ms elapsed + <5px displacement = tap"
  - "Color lerp: parallel Float32Array (displayChange) lerped alongside radius animation"

requirements-completed: [INTR-01, INTR-02, INTR-03, DATA-02]

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 4 Plan 1: Pointer Interaction & Color Lerp Summary

**Canvas pointer interaction with drag momentum, tap-to-select, hover glow, and smooth color lerp transitions on timeframe change**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T20:49:06Z
- **Completed:** 2026-03-06T20:51:33Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Bubbles respond to pointer events: hit-testing, drag with momentum on release, tap detection
- Hover glow effect with boosted intensity (0.8 glowT), faster pulse (3.5x), and 50% wider spread
- Smooth color and % text animation when switching timeframes via displayChange Float32Array lerp
- Selected stock gets persistent glow highlight (same visual as hover, always-on)
- Zustand store extended with selectedStock state for detail panel consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Zustand store and add pointer interaction to BubbleCanvas** - `a8b7ce3` (feat)

## Files Created/Modified
- `vn-stock-bubbles/src/store/useAppStore.ts` - Extended with selectedStock (StockData | null) and setSelectedStock action
- `vn-stock-bubbles/src/components/BubbleCanvas.tsx` - Added pointer event handlers, hit-testing, drag with momentum, hover glow, color lerp, selected stock highlight, drag exclusion from physics

## Decisions Made
- Pointer state stored as plain closure variables inside useEffect (not React state) to avoid triggering re-renders during 60fps pointer tracking
- Drag exclusion implemented via post-physics re-pin (re-setting position and zeroing velocity after stepPhysics) rather than modifying the physics module
- Color lerp uses a parallel Float32Array (displayChange) with the same LERP_SPEED (0.07) as radius animation for consistent transition feel
- Hover and selected stock share the same isHighlighted visual treatment (boosted glow, faster pulse, wider spread)
- Added touch-none CSS class on canvas element to prevent default browser touch gestures (scroll, zoom) during drag

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- selectedStock state ready for Plan 02 (detail panel overlay) to consume
- Pointer interaction foundation complete for any future gesture extensions
- Color lerp pattern established for other animated properties

## Self-Check: PASSED

- [x] useAppStore.ts exists and contains selectedStock/setSelectedStock
- [x] BubbleCanvas.tsx exists with pointer interaction, hover glow, color lerp
- [x] 04-01-SUMMARY.md created
- [x] Commit a8b7ce3 verified in git log
- [x] TypeScript compiles cleanly (npx tsc --noEmit)
- [x] Production build succeeds (npm run build)

---
*Phase: 04-interaction-transitions*
*Completed: 2026-03-07*
