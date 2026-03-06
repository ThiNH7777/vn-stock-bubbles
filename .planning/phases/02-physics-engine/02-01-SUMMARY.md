---
phase: 02-physics-engine
plan: 01
subsystem: simulation
tags: [physics, spatial-hash, simplex-noise, collision-detection, typed-arrays]

# Dependency graph
requires:
  - phase: 01-foundation-data
    provides: SimulationBuffers typed arrays (x, y, vx, vy, radius, mass) from state.ts
provides:
  - SpatialHashGrid class for O(1) neighbor lookups (spatialHash.ts)
  - Complete physics step function (stepPhysics) chaining forces, collisions, boundary
  - Initial placement strategy biasing large bubbles toward center
  - Physics constants exported for tuning iteration
  - handleResize for canvas resize support
affects: [02-02 game loop integration, 03-rendering-pipeline, 04-interaction-transitions]

# Tech tracking
tech-stack:
  added: [simplex-noise@4.0.3]
  patterns: [spatial-hash-grid, semi-implicit-euler, multi-pass-soft-body-collision, mass-weighted-resolution]

key-files:
  created:
    - vn-stock-bubbles/src/simulation/spatialHash.ts
    - vn-stock-bubbles/src/simulation/physics.ts
  modified:
    - vn-stock-bubbles/package.json
    - vn-stock-bubbles/package-lock.json

key-decisions:
  - "Cell size = 2 * maxRadius ensures any circle touches at most 4 grid cells"
  - "maxPerCell = 16 is generous for 400 bubbles in reasonable spatial distribution"
  - "PUSH_STRENGTH = 0.4 for soft-body feel (40% correction per pass across 4 iterations)"
  - "Inverse sqrt(mass) scaling for ambient force -- smaller bubbles drift visibly faster"
  - "halfDiagonal-based spawn radius for initial placement (0.2 to 0.9 range)"

patterns-established:
  - "Pure-function physics: all physics functions take SimulationBuffers + params, return void (mutate in place)"
  - "Zero hot-path allocations: all storage pre-allocated as Int32Array/Float32Array"
  - "Grid rebuilt every frame via clear() + insert() -- not incremental"
  - "Squared distance comparison before sqrt in collision detection"

requirements-completed: [PHYS-01, PHYS-02, PHYS-03, PHYS-05, PHYS-06]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 2 Plan 1: Core Physics Engine Summary

**SpatialHashGrid with O(1) collision detection and Simplex noise physics engine: forces, 4-pass soft-body collision, boundary containment, and mass-biased initial placement**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T16:15:04Z
- **Completed:** 2026-03-06T16:17:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- SpatialHashGrid with pre-allocated Int32Array storage providing O(1) neighbor lookups for 400+ circles
- Complete physics step function chaining: Simplex noise forces -> 4-pass soft-body collision -> soft boundary containment
- Mass-weighted collision resolution where small bubbles move more and large bubbles barely budge
- Initial placement strategy biasing large bubbles toward center without any center gravity force (PHYS-05 override)
- All tuning constants exported at top of physics.ts for empirical iteration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SpatialHashGrid class for O(1) neighbor lookups** - `da1813a` (feat)
2. **Task 2: Build core physics engine with forces, collision, boundary, and initial placement** - `79e403a` (feat)

## Files Created/Modified
- `vn-stock-bubbles/src/simulation/spatialHash.ts` - SpatialHashGrid class with clear/insert/queryNeighbors/resize methods
- `vn-stock-bubbles/src/simulation/physics.ts` - Core physics engine: PHYSICS constants, createPhysicsState, applyForces, resolveCollisions, enforceBoundary, initialPlacement, stepPhysics, handleResize
- `vn-stock-bubbles/package.json` - Added simplex-noise dependency
- `vn-stock-bubbles/package-lock.json` - Lock file updated

## Decisions Made
- Cell size = 2 * maxRadius for spatial hash grid (any circle touches at most 4 cells)
- maxPerCell = 16 (generous upper bound for 400 bubbles)
- PUSH_STRENGTH = 0.4 per pass across 4 collision iterations for soft-body feel
- Inverse sqrt(mass) scaling for ambient noise force (smaller bubbles drift faster)
- halfDiagonal-based spawn radius (0.2 for largest bubbles to 0.9 for smallest)
- Grid resized only when new total cells exceeds current capacity (avoids unnecessary re-allocation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- spatialHash.ts and physics.ts are complete and ready for game loop integration (Plan 02-02)
- All physics functions are pure computation modules with no React dependencies
- stepPhysics() is the single entry point for the fixed-timestep game loop
- handleResize() is ready for BubbleCanvas resize events
- Physics constants need empirical tuning once visual rendering is live

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 02-physics-engine*
*Completed: 2026-03-06*
