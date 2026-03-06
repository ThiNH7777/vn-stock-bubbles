# Research Summary: VN Stock Bubbles

**Domain:** Interactive physics-based bubble chart visualization for Vietnamese stock market
**Researched:** 2026-03-06
**Overall confidence:** HIGH

## Executive Summary

VN Stock Bubbles is a physics-based interactive bubble chart that visualizes 1500+ Vietnamese stocks (HOSE, HNX, UPCOM) with real-time collision, drag interaction, and smooth animated transitions. The core technical challenge is rendering and simulating 1500+ animated circles at 60fps with collision detection while maintaining responsive touch/mouse interaction.

The recommended stack is intentionally lean: React 19 + TypeScript + Vite for the application shell, native Canvas 2D API with aggressive caching for rendering, a custom circle-only physics engine with spatial hash grid for collision detection, and Zustand for state management. Total dependency weight is approximately 41KB gzipped -- nearly 5x lighter than stacks using PixiJS or Three.js. This is possible because at 1500 elements, the bottleneck is physics computation (collision detection), not rendering. Canvas 2D with pre-rendered sprite caching and text bitmap stamping comfortably handles this scale.

The architecture follows a game-loop pattern: a fixed-timestep physics simulation decoupled from variable-rate rendering, with an event queue to decouple user input from physics ticks. React manages only the UI shell (header, filters, search, tooltips); all animation state lives in plain JavaScript objects outside React's render cycle. Zustand bridges the two worlds: UI state changes trigger data recomputation and transition animations, which the canvas reads imperatively.

The most dangerous pitfalls are: O(n^2) collision detection without spatial partitioning (must use spatial hash from day one), physics jitter from poor multi-body collision resolution (requires multiple resolution passes + mass-proportional displacement), and Canvas 2D performance degradation from per-bubble state changes (requires sprite caching, not individual arc()/fill() calls). All three must be addressed in the initial implementation, not patched later.

## Key Findings

**Stack:** React 19 + TypeScript + Vite + Canvas 2D + custom circle physics + spatial hash + Zustand + Tailwind 4. Total: ~41KB gzipped dependencies.

**Architecture:** Fixed-timestep game loop with decoupled physics/rendering, two-tier state (Zustand for UI, plain JS for simulation), spatial hash grid serving both collision detection and hit testing.

**Critical pitfall:** O(n^2) collision detection. With 1500 bubbles, brute-force checking means 1.12M pair checks per frame -- instant performance death. Spatial hash grid reduces this to ~4-8 neighbor checks per bubble.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation & Canvas Setup** - Project scaffolding, mock data layer, canvas with DPR scaling, basic single-bubble rendering
   - Addresses: Project setup, data layer, canvas initialization
   - Avoids: Blurry Retina canvas (Pitfall 4), wrong size-to-value mapping (Pitfall 6)
   - Rationale: Everything depends on the canvas and data layer existing first

2. **Physics Engine & Spatial Index** - Custom physics (integration, forces, boundaries), spatial hash grid, collision detection + resolution, fixed-timestep simulation loop
   - Addresses: Core physics simulation, collision detection, floating animation
   - Avoids: O(n^2) collision (Pitfall 1), physics jitter (Pitfall 2), main thread blocking (Pitfall 5)
   - Rationale: Physics is the hardest technical challenge and the core "wow factor." Must be built before interaction and polish.

3. **Multi-Bubble Rendering Pipeline** - Color scheme (VN convention), size mapping (d3-scaleSqrt), text bitmap caching, sprite stamping, glow effects
   - Addresses: Bubble visualization, color coding, rendering performance
   - Avoids: Unoptimized rendering (Pitfall 3), text rendering bottleneck (Performance Trap)
   - Rationale: Can be built in parallel with Phase 2 once basic canvas exists. Must use caching from the start.

4. **Interaction Layer** - Hover detection (via spatial hash), drag interaction (pointer events + physics), tooltips (DOM overlay), search/filter UI
   - Addresses: Hover tooltip, drag interaction, search, filters
   - Avoids: Hit detection failure (Pitfall 7), fat finger problem on mobile
   - Rationale: Depends on both physics engine (drag forces) and renderer (hover glow). Spatial hash enables O(1) hit testing.

5. **Filters, Transitions & Polish** - Timeframe toggle, exchange/count filters, smooth enter/exit/update transitions (GSAP), responsive layout, mobile touch
   - Addresses: Timeframe toggle, exchange filter, stock count filter, smooth transitions, responsive design
   - Avoids: Explosive filter transitions (Pitfall 8), variable refresh rate issues
   - Rationale: Transitions require physics engine to support dynamic add/remove/resize. Mobile needs all systems working.

**Phase ordering rationale:**
- Phases 1-3 form the foundation and can partially parallelize (data layer + rendering are independent of physics internals)
- Phase 4 depends on both physics and rendering being functional
- Phase 5 is polish that requires all systems operational
- The physics engine (Phase 2) is on the critical path and is the highest-risk component

**Research flags for phases:**
- Phase 2 (Physics): Likely needs deeper research on damping/force tuning to achieve the "floaty" feel. Multiple iteration passes for collision resolution need careful parameter tuning.
- Phase 3 (Rendering): Standard patterns, unlikely to need research. Canvas 2D sprite caching is well-documented.
- Phase 5 (Transitions): May need research on transition orchestration -- coordinating GSAP tweens with physics state is a nuanced integration.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | React + TypeScript + Vite is industry standard. Canvas 2D capabilities well-documented. D3 modules are proven. All versions verified against npm/official sources. |
| Features | HIGH | Feature landscape well-mapped against CryptoBubbles.net and 5+ competitors. VN-specific features (color convention, exchange filter) are clear differentiators. |
| Architecture | HIGH | Game-loop pattern (fixed timestep + spatial hash + cached rendering) is well-established in game development and visualization. Multiple sources confirm viability at 1500 elements. |
| Physics | MEDIUM | Custom circle physics is straightforward in theory but tuning (damping, force strengths, collision iterations) requires empirical experimentation. The "floaty" feel of CryptoBubbles is an art, not a science. |
| Pitfalls | HIGH | Well-documented across MDN, web.dev, game development literature, and real-world post-mortems. All critical pitfalls have concrete prevention strategies. |

## Gaps to Address

- **Physics feel tuning:** The damping, center gravity strength, and ambient noise parameters that produce the "alive but not chaotic" floating feel need experimentation. No amount of research substitutes for iterating on these values with 1500 bubbles on screen.
- **Mobile performance baselines:** Research confirms 1500 circles at 60fps on desktop. Mid-range Android phones (the primary VN investor device) need empirical testing. May need to reduce default bubble count on mobile (Top 200 instead of All).
- **VN stock mock data:** Need realistic ticker symbols, company names, market cap ranges, and sector classifications for 1500+ Vietnamese stocks across HOSE, HNX, and UPCOM. This is data research, not technical research.
- **GSAP + physics integration:** How GSAP tweens (for size/color transitions) interact with the continuous physics loop needs careful design. The tween modifies target values that physics interpolates toward -- but the exact handoff mechanism needs prototyping.
- **Touch gesture disambiguation:** How to distinguish drag (move bubble), tap (select bubble), pinch (zoom), and pan (scroll viewport) on mobile requires careful gesture recognition design.
