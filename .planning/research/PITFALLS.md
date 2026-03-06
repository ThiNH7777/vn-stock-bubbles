# Pitfalls Research

**Domain:** Physics-based interactive bubble chart visualization (1500+ stock tickers, Canvas/WebGL)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: O(n^2) Collision Detection Without Spatial Partitioning

**What goes wrong:**
Naive brute-force collision detection checks every bubble against every other bubble. With 1500 bubbles, that is 1,124,250 pair checks per frame. At 60fps, the physics loop alone consumes the entire frame budget and the UI freezes or drops to single-digit FPS.

**Why it happens:**
Developers prototype with 20-50 bubbles where brute force works fine (190-1225 checks). They get the physics "working" and then add more bubbles, discovering the quadratic scaling too late. The code structure by that point is tightly coupled to the naive approach.

**How to avoid:**
- Implement spatial partitioning from the very first physics iteration. Use a **spatial hash grid** over a quadtree because all objects are circles of relatively similar scale (market-cap-based sizing still keeps bubbles within a 10x radius range). Spatial hashing is faster for uniform-ish sizes and avoids quadtree rebalancing overhead.
- Grid cell size should be 2x the largest bubble radius. This ensures each bubble occupies at most 4 cells.
- Only check collisions between bubbles sharing the same grid cell.
- Rebuild the spatial hash each frame (it is cheap -- just clear the hash map and re-insert). Do not try to incrementally update; the bookkeeping cost exceeds the rebuild cost for moving objects.

**Warning signs:**
- Physics loop takes >4ms per frame (measured via `performance.now()` around the collision pass).
- FPS drops below 50 when bubble count exceeds 200.
- "Works on my machine" but stutters on mid-range laptops or phones.

**Phase to address:**
Phase 1 (Core Physics Engine). Spatial partitioning must be the foundation, not an optimization added later.

---

### Pitfall 2: Physics Jitter and Instability with Variable-Size Circles

**What goes wrong:**
Bubbles range from tiny (small-cap stocks) to large (VIC, VHM, VNM). When many small bubbles cluster around a large one, the collision resolution becomes unstable: bubbles jitter, vibrate, or "explode" outward because each frame pushes overlapping circles apart, but the corrections conflict with each other, creating an endless oscillation.

**Why it happens:**
Simple position-correction collision resolution (separate overlapping circles by moving them apart) does not account for simultaneous multi-body collisions. When circle A pushes circle B, that push may cause B to overlap with C, which pushes B back toward A. With 1500 densely packed circles of varying sizes, this feedback loop is nearly guaranteed.

**How to avoid:**
- Use multiple collision resolution iterations per frame (3-5 passes). Each pass reduces remaining overlap. This converges toward a stable state rather than trying to solve everything in one pass.
- Apply position correction proportional to inverse mass (bubble area). Larger bubbles should move less when resolving collisions; smaller bubbles absorb more displacement. This prevents large bubbles from being shoved around by clusters of small ones.
- Add a small damping factor (0.3-0.5 velocity decay per frame) so residual energy from collision resolution dissipates rather than accumulating.
- Use a "soft constraint" approach: allow a tiny overlap tolerance (1-2px) rather than forcing exact zero overlap. This eliminates the jitter from fighting over sub-pixel precision.
- Consider "sleeping" bubbles that have settled -- once a bubble's velocity is below a threshold for several frames, stop simulating it until a neighbor moves.

**Warning signs:**
- Bubbles visibly vibrate in place even when no user interaction is happening.
- Clusters of small bubbles near large ones "buzz" or flicker.
- Occasional bubble "explosions" where a group suddenly flies apart.

**Phase to address:**
Phase 1 (Core Physics Engine). This must be tuned during physics development, not patched after rendering is built.

---

### Pitfall 3: Rendering 1500+ Circles Every Frame Without Draw Call Optimization

**What goes wrong:**
Drawing 1500 individual `arc()` + `fill()` calls per frame in Canvas 2D, each with different colors and sizes, burns through the frame budget. Add text labels, glow effects, or gradients and the render pass alone exceeds 16ms. The application feels sluggish even though the physics is fast.

**Why it happens:**
Canvas 2D API encourages an imperative "draw each shape" pattern. Developers write a loop that draws each bubble individually with its own `beginPath()`, color setting, `arc()`, and `fill()`. Each state change (fillStyle, shadowBlur, font) is expensive. The GPU is not being leveraged.

**How to avoid:**
- **Batch by color.** Group all bubbles of the same fill color, set `fillStyle` once, and draw all of them in one path before calling `fill()`. With the VN color scheme (5 colors: purple, blue, red, cyan, yellow), this reduces state changes from 1500 to 5.
- **Skip off-screen bubbles.** If the viewport is zoomed in, do not draw bubbles outside the visible area. Maintain a simple AABB check per bubble.
- **Use `alpha: false` on the canvas context** since the bubble chart has an opaque background. This eliminates per-pixel alpha compositing.
- **Pre-render bubble templates to offscreen canvases.** Create one offscreen canvas per unique size+color combination. Use `drawImage()` to stamp them, which is faster than re-drawing arcs. With 5 colors and ~20 size buckets, that is ~100 cached sprites.
- **Avoid `shadowBlur` for glow effects.** Instead, pre-render glow as part of the offscreen sprite template, or use a separate glow layer canvas rendered at lower resolution.
- **Round coordinates to integers.** Floating-point positions trigger sub-pixel anti-aliasing, which is measurably slower. Use `Math.round()` on x, y before drawing.

**Warning signs:**
- Render pass (measured separately from physics) takes >8ms.
- FPS drops specifically when many bubbles are the same color (counter-intuitive: this means you are NOT batching).
- Adding hover glow or text labels causes disproportionate FPS drops.

**Phase to address:**
Phase 1 (Rendering Engine). Build the batched rendering pipeline from the start.

---

### Pitfall 4: Canvas Looks Blurry on Retina/High-DPI Screens

**What goes wrong:**
The bubble chart looks crisp on a 1x display but blurry and unprofessional on MacBooks, modern phones, and high-DPI monitors. Text inside bubbles is especially unreadable. Since the target audience (Vietnamese investors) overwhelmingly uses phones and modern laptops, this affects the majority of users.

**Why it happens:**
The canvas element's pixel buffer does not automatically match the device pixel ratio. A canvas set to 800x600 CSS pixels on a 2x Retina display is only rendering at 800x600 physical pixels, which the browser stretches to cover 1600x1200 physical pixels, producing blurriness.

**How to avoid:**
- On initialization and on resize, set the canvas buffer size to `width * devicePixelRatio` by `height * devicePixelRatio`.
- Scale the drawing context by `devicePixelRatio` so all drawing coordinates remain in CSS-pixel space.
- Set `canvas.style.width` and `canvas.style.height` to the CSS dimensions.
- Do NOT hard-code `devicePixelRatio` to 2. Use `window.devicePixelRatio` dynamically; some devices are 1.5x, 2x, 3x, or even 4x.
- Be aware this quadruples (at 2x) or more the number of pixels being rendered. On a 4x display, the canvas buffer is 16x larger. This interacts with Pitfall 3 -- rendering optimization becomes even more critical on high-DPI devices.

**Warning signs:**
- Bubbles and text look soft or blurry when compared to surrounding HTML elements.
- The chart looks fine on your desktop monitor but bad on your phone during testing.
- Screenshots of the app look lower quality than expected.

**Phase to address:**
Phase 1 (Canvas Setup). This is a one-time setup but must be done before any visual work begins, otherwise all visual tuning is done against incorrect rendering.

---

### Pitfall 5: Blocking the Main Thread with Physics Computation

**What goes wrong:**
The physics simulation (collision detection, resolution, gravity, boundary forces) runs on the main thread alongside rendering, event handling, and UI updates. On mid-range mobile devices, the combined physics + render budget exceeds 16ms, causing dropped frames, unresponsive touch interactions, and janky scrolling.

**Why it happens:**
The simplest architecture runs everything in one `requestAnimationFrame` loop. This works on a developer's high-end machine but fails on the actual target devices (mid-range Android phones used by Vietnamese retail investors).

**How to avoid:**
- **Decouple physics tick rate from render rate.** Run physics at a fixed timestep (e.g., 60Hz) using accumulator-based stepping, and render at whatever rate the device can sustain. This prevents physics from "speeding up" on fast devices or "slowing down" on slow ones.
- **Move physics to a Web Worker** if main-thread budget is tight. Transfer bubble position arrays via `SharedArrayBuffer` or `postMessage` with transferable `Float32Array`. The worker updates positions; the main thread reads them and renders.
- **Profile on real target devices early.** Use Chrome DevTools Performance panel throttled to 4x CPU slowdown. If physics alone takes >6ms at 4x throttle, it will struggle on real phones.
- **Consider using OffscreenCanvas** (now supported in all modern browsers including Safari 16.6+) to move rendering itself to a worker, freeing the main thread entirely for user interaction.

**Warning signs:**
- Long Task warnings in DevTools (any task >50ms).
- Touch drag feels laggy -- there is a visible delay between finger movement and bubble response.
- FPS is fine on desktop but drops to 20-30fps on phones.

**Phase to address:**
Phase 1 (Architecture). The decision to use a Web Worker for physics should be made before writing the physics engine, as retrofitting worker communication onto an existing single-threaded architecture is painful.

---

### Pitfall 6: Broken or Missing Bubble Size-to-Value Mapping

**What goes wrong:**
Bubble area does not accurately represent the underlying data (market cap or volume). Either the radius is mapped linearly to the value (making large-cap stocks appear quadratically larger than they should), or the size range is too narrow (all bubbles look the same) or too wide (small-cap bubbles are invisible, 1-2px dots).

**Why it happens:**
The most common mistake in bubble chart design is mapping value to radius instead of area. A stock with 2x the market cap should have 2x the bubble area, which means its radius should be `sqrt(2)` times larger, not 2x. Developers who map radius linearly make large values appear 4x as significant as they actually are.

Additionally, Vietnamese stock market cap ranges from billions to hundreds of trillions of VND -- a range of 10,000x or more. A linear area mapping makes the smallest bubbles sub-pixel and the largest ones dominate the entire screen.

**How to avoid:**
- Map value to area, then derive radius: `radius = sqrt(value / PI) * scaleFactor`.
- Use a **clamped sqrt scale** for the value-to-area mapping. Pure linear mapping produces invisible small bubbles; pure log mapping makes everything the same size. A sqrt scale provides a good perceptual middle ground.
- Set a minimum radius of 8-10px (so every bubble is tappable on mobile) and a maximum radius of ~80-100px (so no single bubble dominates).
- Provide the scale factor dynamically based on viewport size and the number of visible bubbles.

**Warning signs:**
- Small-cap stocks are invisible or un-tappable.
- One or two large-cap stocks dominate the entire viewport.
- Users cannot distinguish between stocks of meaningfully different market caps.

**Phase to address:**
Phase 1 (Data Mapping). This must be correct before physics tuning, because bubble sizes affect collision density and physics behavior.

---

### Pitfall 7: Hit Detection Fails on Canvas (Clicks/Taps Do Not Register Correctly)

**What goes wrong:**
Unlike DOM elements, Canvas does not provide built-in event handling per drawn shape. When a user clicks or taps a bubble, the application must manually determine which bubble was hit. Naive implementations use `isPointInPath()` or iterate through all 1500 bubbles checking distance -- both are slow and produce missed clicks, wrong-bubble selections, or ghost clicks.

**Why it happens:**
Canvas is an immediate-mode rendering API. Once a circle is drawn, it has no identity -- it is just pixels. Developers coming from DOM/SVG backgrounds expect click handlers on shapes. When they realize Canvas does not work that way, the hastily-added hit detection is often inaccurate or slow.

**How to avoid:**
- **Reuse the spatial hash from physics** for hit detection. On click/tap, look up which grid cell the click coordinate falls in, then distance-check only the bubbles in that cell (typically 1-10 bubbles instead of 1500).
- For circles, hit detection is trivial: `dx*dx + dy*dy <= radius*radius`. Avoid `Math.sqrt()` -- compare squared distances.
- On touch devices, expand the hit target by 4-8px beyond the visual radius to account for finger imprecision (fat finger problem).
- For overlapping bubbles, iterate candidates from front-to-back (highest z-index first) and return the first hit.
- Cache the draw-order so hit detection matches visual stacking.

**Warning signs:**
- Users tap a bubble but nothing happens (especially small bubbles on mobile).
- The wrong bubble's tooltip appears.
- Hit detection has a noticeable delay (>50ms) after clicking.

**Phase to address:**
Phase 1 (Interaction Layer). Build hit detection alongside the spatial hash, since they share the same data structure.

---

### Pitfall 8: Smooth Transitions Cause Full Re-simulation Chaos

**What goes wrong:**
When the user switches filters (e.g., from "All 1500" to "Top 100" or changes the exchange from HOSE to HNX), the physics simulation must handle bubbles appearing, disappearing, and resizing. A naive approach -- clear everything and rebuild from scratch -- causes an ugly "explosion" as 100+ bubbles spawn at random positions and the physics settles them over 2-3 seconds of chaotic bouncing.

**Why it happens:**
Physics simulations need time to reach equilibrium. Spawning all bubbles at the center or at random positions means they are all overlapping, and the collision resolution pushes them apart violently. Developers focus on getting filters working and treat the transition as an afterthought.

**How to avoid:**
- **Animate out, then animate in.** Bubbles being removed should shrink to zero radius over 300ms (during which they still participate in physics). New bubbles should grow from zero radius over 300ms.
- **Preserve positions.** When switching from "All" to "Top 100", keep the existing positions for the 100 bubbles that remain. Only remove the others. Do not reset the simulation.
- **Seed new bubble positions intelligently.** Place new bubbles in gaps (low-density areas of the spatial hash) or near the edges of the viewport, not at the center.
- **Use physics "warm-up" at accelerated speed** by running several physics ticks without rendering to let the simulation settle before showing the new state.
- For size changes (switching market cap to volume), animate the target radius over 500ms while the physics adjusts continuously.

**Warning signs:**
- Filter changes cause a visible "explosion" of bubbles.
- There is a 1-3 second "settling" period where bubbles bounce chaotically after any filter change.
- Switching back and forth between filters feels jarring rather than smooth.

**Phase to address:**
Phase 2 (Filter and Transition System). But the physics engine in Phase 1 must be designed to support dynamic add/remove/resize of bubbles, or transitions will require rewriting the engine.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single-threaded physics + render | Simpler code, no worker communication | Cannot scale past ~500 bubbles on mobile | Phase 1 prototype only, must refactor before mobile testing |
| Drawing each bubble individually (no batching) | Simpler render loop | Render pass alone exceeds frame budget at 1500 bubbles | Never -- batch from day one, cost is minimal |
| Using a physics library (Matter.js) for bubble simulation | Fast to prototype | Massive overhead for a simple circle-packing use case; Matter.js handles rigid bodies, constraints, friction -- none of which are needed | Prototype/spike only; production should use custom lightweight sim |
| Hardcoding devicePixelRatio to 2 | "Fixes" Retina on your MacBook | Breaks on 1x displays (canvas is 2x too large, wasting GPU), renders wrong on 3x phones | Never |
| Using SVG or DOM elements for bubbles | Built-in event handling, easier styling | DOM thrashes at 200+ animated elements; impossible at 1500 | Never for the main visualization |
| Storing bubble state in the DOM | Easy to inspect and debug | Physics loop must read from/write to DOM each frame, causing forced layout/reflow | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stock data API (Phase 2) | Fetching all 1500 stocks in a single blocking request on page load | Use streaming/chunked loading. Display the first batch of bubbles while remaining data loads in the background. |
| Stock data API (Phase 2) | Re-fetching all data on every filter change | Cache all stock data client-side. Filters operate on the cached dataset; only periodic refresh hits the API. |
| Window resize events | Re-creating the entire canvas and physics world on every resize event | Debounce resize handler (150ms). Only resize the canvas buffer and update boundary walls. Preserve bubble positions and velocities. |
| Touch events on mobile | Using `click` events instead of `touchstart`/`touchend` | `click` has a 300ms delay on mobile browsers. Use pointer events (`pointerdown`/`pointerup`) for unified mouse+touch with no delay. |
| Browser visibility API | Physics simulation keeps running when the tab is hidden | Listen for `visibilitychange`. Pause `requestAnimationFrame` when the tab is hidden. Resume with a capped delta time to prevent a physics "time bomb" (accumulated delta causes explosion). |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Creating new objects in the render loop | GC pauses cause periodic frame drops every 5-10 seconds | Pre-allocate all arrays, vectors, and objects. Avoid `new`, object literals, and array spreads in the hot loop. Use object pools. | Noticeable at 500+ bubbles when GC runs more frequently |
| Using `Math.sqrt()` in collision detection | Subtle slowdown, hard to profile individually | Compare squared distances. `dx*dx + dy*dy <= (r1+r2)*(r1+r2)` | Measurable at 1000+ bubbles with spatial hash misses |
| Text rendering inside bubbles every frame | Each `fillText()` call is expensive; font shaping is CPU-intensive | Only render ticker text for bubbles above a minimum radius threshold (e.g., >20px). Cache text to sprite sheets. Update text sprites only when data changes, not every frame. | Noticeable at 200+ visible text labels |
| Glow/shadow effects via `shadowBlur` | Dramatic FPS drop, especially on mobile | Pre-render glow sprites on offscreen canvas. Apply glow only to hovered/selected bubble, not all bubbles. | Even 50 bubbles with shadowBlur can drop below 30fps on mobile |
| Not using `will-change: transform` on the canvas element | Browser may not promote canvas to its own compositor layer | Add `will-change: transform` CSS to the canvas element so the browser composites it on the GPU | Noticeable when other page content (UI overlays) triggers repaints |
| Forgetting to handle variable refresh rates | Physics runs 2x fast on 120Hz displays, half speed on 30Hz | Use delta-time or fixed-timestep accumulator pattern. Never assume 60fps. | Immediately on 120Hz monitors (increasingly common) and always on throttled mobile |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| All bubbles the same apparent size | Users cannot distinguish large-cap from small-cap stocks; the visualization conveys no information | Use sqrt-scaled area mapping with enforced min/max radius. The size difference must be immediately perceptible. |
| Color scheme with no legend | Users unfamiliar with VN stock color conventions (especially international visitors) have no idea what colors mean | Always show a color legend. Default to VN convention (purple/blue/red/cyan/yellow) but provide a toggle to international (green/red). |
| Tooltip blocks the bubble it describes | User hovers over a bubble, the tooltip covers neighboring bubbles, preventing further exploration | Position tooltip with smart avoidance: prefer top-right, but flip if near viewport edge. Use a slight offset so the bubble remains visible. |
| No indication that bubbles are draggable | Users never discover the drag interaction | Add a subtle drag cursor on hover. Consider a one-time onboarding hint ("Drag bubbles to explore"). |
| Tiny bubbles are impossible to tap on mobile | Small-cap stocks are un-selectable, frustrating users who specifically want to find them | Enforce minimum 16px touch target (expandable hit area beyond visual radius). Provide a search/filter alternative for finding specific small stocks. |
| Zoom breaks physics boundaries | User zooms in but bubbles float off screen because boundary walls are still at the original viewport size | Boundary walls should track the world bounds, not the viewport. Zooming is a camera operation, not a world resize. |
| Search does not highlight results visually | User searches for a ticker but cannot spot it among 1500 bubbles | Pulse/glow the matching bubble and dim all others. Auto-pan the viewport to center on the result. |

## "Looks Done But Isn't" Checklist

- [ ] **Physics simulation:** Often missing boundary containment -- bubbles slowly drift off-screen over time due to accumulated floating-point error in velocity integration. Verify by leaving the simulation running for 5+ minutes.
- [ ] **Retina rendering:** Looks fine on developer's non-retina monitor but blurry on 80%+ of actual user devices. Verify on a real phone, not just desktop DevTools emulation.
- [ ] **Touch interactions:** Drag works with mouse but not with touch. Pinch-zoom works but breaks bubble hit detection because coordinate transforms are not applied. Verify on a real touch device.
- [ ] **Filter transitions:** Switching filters "works" (correct bubbles appear) but the transition is jarring -- bubbles teleport, overlap, or explode. Verify by rapidly switching between filter options 5-6 times.
- [ ] **Performance on target devices:** Runs at 60fps on developer's MacBook Pro but 15fps on a mid-range Android phone (the actual target user's device). Verify with Chrome DevTools 4x CPU throttle AND on a real mid-range phone.
- [ ] **Browser resize:** Handles initial render but the canvas does not properly resize or re-scale on window resize, orientation change (mobile), or display scaling change.
- [ ] **Memory stability:** No visible leaks during a 5-minute session, but after 30+ minutes of filter switching and interaction, memory climbs steadily. Verify with Chrome Memory panel over an extended session.
- [ ] **Accessibility of data:** The visualization looks great but provides no way to access the underlying data (stock name, price, change %) without hovering. Mobile users without hover capability are stuck. Verify that tap/click on any bubble reveals its data.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No spatial partitioning (brute force O(n^2)) | MEDIUM | Implement spatial hash grid as a standalone module. Replace the collision loop's inner iteration with grid-cell lookups. Physics API does not change; only the broadphase changes. ~1-2 days. |
| Physics jitter from poor collision resolution | MEDIUM | Add multi-pass iteration (3-5 passes) and mass-proportional displacement. Requires tuning but not architectural change. ~1-2 days of tuning. |
| Blurry canvas on Retina | LOW | Add devicePixelRatio scaling in canvas initialization. One-time fix, <1 hour, but all visual tuning done before this fix may need re-evaluation. |
| Unoptimized rendering (no batching) | MEDIUM-HIGH | Refactor render loop to batch by color, pre-render sprites to offscreen canvases. May require changing how bubble visual state is stored. ~2-3 days. |
| Main-thread physics blocking UI | HIGH | Moving physics to a Web Worker requires defining a message protocol, restructuring state ownership, and handling synchronization. ~3-5 days if not designed for it from the start. |
| Linear radius mapping (wrong size perception) | LOW | Change the mapping function from `radius = value * scale` to `radius = sqrt(value) * scale`. Quick fix but may require re-tuning physics parameters since bubble sizes change. ~2-4 hours. |
| Explosive filter transitions | MEDIUM | Implement enter/exit animations (grow from zero, shrink to zero) and position preservation for persisting bubbles. ~2-3 days. |
| Memory leaks in animation loop | MEDIUM | Audit for object allocation in hot loop. Replace with pre-allocated pools. Add cleanup for removed bubbles. ~1-2 days to identify and fix, requires profiling. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| O(n^2) collision detection | Phase 1: Core Physics | Profile collision pass with 1500 bubbles: must be <4ms per frame |
| Physics jitter/instability | Phase 1: Core Physics | Run simulation for 60 seconds with 1500 bubbles: no visible jitter when settled |
| Unoptimized rendering | Phase 1: Rendering Engine | Render 1500 bubbles in <6ms per frame (measured via Performance panel) |
| Blurry Retina canvas | Phase 1: Canvas Setup | Visual comparison on 1x, 2x, and 3x displays -- text and edges must be crisp |
| Main thread blocking | Phase 1: Architecture | Touch drag response latency <50ms on 4x CPU throttle |
| Wrong size-to-value mapping | Phase 1: Data Mapping | Verify smallest visible bubble is >8px radius; verify 2x market cap = 2x area (not 4x) |
| Hit detection failure | Phase 1: Interaction | Tap every bubble size class on mobile: 100% hit rate for bubbles >8px |
| Explosive filter transitions | Phase 2: Filters & Transitions | Rapidly toggle filters 10 times: no explosions, settling time <500ms |
| Memory leaks | Phase 2: Stability | Run for 30 minutes with periodic filter changes: memory delta <10MB |
| GC pauses in hot loop | Phase 1: Core Loop | Zero new object allocations per frame (verified via Chrome Allocation Timeline) |
| Variable refresh rate issues | Phase 1: Core Loop | Test on 60Hz and 120Hz: physics speed must be identical |
| Mobile touch interaction | Phase 1: Interaction | Drag, tap, and pinch-zoom work on real iOS and Android devices |

## Sources

- [MDN: Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) -- authoritative Canvas performance guidance (HIGH confidence)
- [web.dev: Canvas Performance](https://web.dev/canvas-performance/) -- Google's canvas optimization guide (HIGH confidence)
- [web.dev: High DPI Canvas](https://web.dev/articles/canvas-hidipi) -- Retina/HiDPI fix (HIGH confidence)
- [MDN: OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) -- Worker-based rendering (HIGH confidence)
- [D3 Force Performance Issue #1936](https://github.com/d3/d3/issues/1936) -- real-world performance at 1000+ nodes (HIGH confidence)
- [0fps.net: Collision Detection Benchmarks](https://0fps.net/2015/01/23/collision-detection-part-3-benchmarks/) -- spatial partitioning comparison (MEDIUM confidence)
- [Quadtree vs Spatial Hashing Visualization](https://zufallsgenerator.github.io/2014/01/26/visually-comparing-algorithms) -- algorithm tradeoffs (MEDIUM confidence)
- [Bocoup: Animate Thousands of Points with Canvas](https://www.bocoup.com/blog/smoothly-animate-thousands-of-points-with-html5-canvas-and-d3) -- large-scale animation patterns (MEDIUM confidence)
- [DEV: Running JS Physics in a Web Worker](https://dev.to/jerzakm/running-js-physics-in-a-webworker-part-1-proof-of-concept-ibj) -- worker-based physics architecture (MEDIUM confidence)
- [Atlassian: Bubble Chart Guide](https://www.atlassian.com/data/charts/bubble-chart-complete-guide) -- area-vs-radius mapping UX (MEDIUM confidence)
- [Data to Viz: Bubble Plot](https://www.data-to-viz.com/graph/bubble.html) -- bubble chart UX pitfalls (MEDIUM confidence)
- [Lavrton: Canvas Hit Region Detection](https://lavrton.com/hit-region-detection-for-html5-canvas-and-how-to-listen-to-click-events-on-canvas-shapes-815034d7e9f8/) -- hit detection strategies (MEDIUM confidence)
- [Illyriad: Memory Leaks in Canvas Animation](https://www.illyriad.co.uk/blog/2011/09/fix-memory-leaks-animating-html5-canvas/) -- animation memory patterns (MEDIUM confidence)
- [Spicy Yoghurt: Collision Detection Physics](https://spicyyoghurt.com/tutorials/html5-javascript-game-development/collision-detection-physics) -- circle collision resolution (MEDIUM confidence)

---
*Pitfalls research for: VN Stock Bubbles -- Physics-based interactive bubble chart visualization*
*Researched: 2026-03-06*
