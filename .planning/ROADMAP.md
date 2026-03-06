# Roadmap: VN Stock Bubbles

## Overview

Deliver an interactive physics-based bubble chart visualizing 400+ Vietnamese stock tickers with mock data. The project moves from scaffolding through the core technical risk (physics simulation at scale) to visual rendering and finally user interaction. Phase 1 gets the app running with a canvas and data. Phase 2 tackles the hardest problem: a performant physics engine with spatial hashing. Phase 3 makes bubbles visually correct (sizing, coloring, text). Phase 4 connects the user to the simulation through drag, hover, tooltips, and animated timeframe transitions.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Data** - Project scaffolding, mock data layer, canvas with HiDPI scaling
- [ ] **Phase 2: Physics Engine** - Custom circle physics with spatial hash, collision detection, and simulation loop
- [ ] **Phase 3: Rendering Pipeline** - Bubble sizing, color coding, text display, and sprite caching
- [ ] **Phase 4: Interaction & Transitions** - Drag, hover tooltips, time period toggle, and animated transitions

## Phase Details

### Phase 1: Foundation & Data
**Goal**: The application shell exists with a working canvas and realistic mock stock data ready for visualization
**Depends on**: Nothing (first phase)
**Requirements**: FOUN-01, FOUN-02, DATA-01, RNDR-01
**Success Criteria** (what must be TRUE):
  1. Running `npm run dev` opens a browser with a React app showing a full-viewport canvas element
  2. Canvas renders crisp on Retina/HiDPI displays (no blurriness on 2x screens)
  3. Mock data for ~400 VN stock tickers is accessible in code with realistic symbols, prices, market caps, and % changes across all timeframes
  4. UI state store (Zustand) and simulation state (typed arrays) are structurally in place
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md -- Scaffold Vite project, create types, Zustand store, simulation buffers, and ~400 mock VN stock tickers
- [ ] 01-02-PLAN.md -- Build Header UI with Vietnamese timeframe tabs and HiDPI Canvas with 3D test bubble

### Phase 2: Physics Engine
**Goal**: 400+ circles float, collide, and stay within bounds at 60fps using a spatial hash for O(1) neighbor lookups
**Depends on**: Phase 1
**Requirements**: PHYS-01, PHYS-02, PHYS-03, PHYS-04, PHYS-05, PHYS-06
**Success Criteria** (what must be TRUE):
  1. 400+ circles are visible on the canvas, floating with gentle ambient motion and light center gravity
  2. Circles collide realistically without passing through each other or jittering
  3. Circles stay contained within the canvas boundaries (no bubbles escaping off-screen)
  4. Frame rate stays at or above 55fps with 400+ active circles (verified via dev tools performance monitor)
  5. Simulation runs at a fixed timestep independent of display refresh rate
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Rendering Pipeline
**Goal**: Each bubble is visually identifiable -- sized proportional to market cap, colored by price change, and labeled with ticker and percentage
**Depends on**: Phase 2
**Requirements**: RNDR-02, RNDR-03, RNDR-04
**Success Criteria** (what must be TRUE):
  1. Bubble area is proportional to market cap (large-cap stocks like VNM, VIC are visibly larger than small-caps)
  2. Each bubble displays its ticker symbol and % change as readable text
  3. Bubble color reflects price change direction and intensity (strongly positive stocks are more saturated than mildly positive ones)
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Interaction & Transitions
**Goal**: Users can explore the market by dragging bubbles, hovering for details, and switching time periods with smooth animations
**Depends on**: Phase 3
**Requirements**: INTR-01, INTR-02, INTR-03, DATA-02
**Success Criteria** (what must be TRUE):
  1. User can click-and-drag any bubble -- it follows the pointer and has momentum when released
  2. Hovering over a bubble shows a glow effect and a tooltip displaying ticker, price, and % change
  3. Switching time period (day/week/month/year) causes bubble sizes, colors, and positions to animate smoothly to their new values (no instant jumps)
  4. Time period toggle UI is visible and responsive
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Data | 1/2 | In Progress | - |
| 2. Physics Engine | 0/2 | Not started | - |
| 3. Rendering Pipeline | 0/1 | Not started | - |
| 4. Interaction & Transitions | 0/2 | Not started | - |
