# Codebase Concerns

**Analysis Date:** 2026-03-06

## Tech Debt

**Single monolithic script file:**
- Issue: All application logic (data fetching, layout, rendering, tooltip, mock data, helpers) lives in one 409-line file with no modularity.
- Files: `script.js`
- Impact: Any change risks breaking unrelated functionality. Impossible to unit-test individual functions. No separation of data layer, view layer, or business logic.
- Fix approach: Split into ES modules: `api.js` (data fetching), `layout.js` (D3 force simulation), `renderer.js` (canvas drawing), `tooltip.js` (tooltip UI), `mock-data.js` (fallback data), `utils.js` (helpers). Use native ES modules with `<script type="module">`.

**No build system or package manager:**
- Issue: No `package.json`, no bundler, no dependency management. D3 is loaded from a CDN via a `<script>` tag in `index.html` (line 9: `https://d3js.org/d3.v7.min.js`). No version pinning beyond major version.
- Files: `index.html` (line 9)
- Impact: No dependency lockfile means builds are not reproducible. CDN outage breaks the app entirely. Cannot tree-shake unused D3 modules (full d3.v7 bundle loaded when only `d3-force`, `d3-scale`, and `d3-array` are needed). No minification, no code splitting.
- Fix approach: Add `package.json`, install `d3-force`, `d3-scale`, `d3-array` as npm dependencies, use a bundler (Vite recommended for simplicity) to produce optimized builds.

**Global mutable state:**
- Issue: Core application state (`timeframe`, `allData`, `nodes`, `coinImages`, `resizeTimer`) is stored as module-level `let` variables with no encapsulation.
- Files: `script.js` (lines 12-16)
- Impact: Any function can mutate state at any time with no traceability. Makes debugging difficult and prevents any future concurrency or state management patterns. Race conditions possible between `fetchData` image `onload` callbacks and `layout()`.
- Fix approach: Encapsulate state in a single state object or use a simple store pattern. Pass state explicitly to functions rather than relying on closures over globals.

**Hardcoded mock data (100 coins inline):**
- Issue: 55+ lines of hardcoded mock cryptocurrency data embedded directly in `script.js`.
- Files: `script.js` (lines 346-409, function `mockData()`)
- Impact: Bloats the main script file. Mock data generates random values on each call, making behavior non-deterministic and debugging harder.
- Fix approach: Move mock data to a separate `mock-data.json` or `mock-data.js` module. Use seeded random for deterministic fallback behavior.

**No auto-refresh of data:**
- Issue: Data is fetched once on `DOMContentLoaded` and never refreshed. The CSS loading animation on `.data-updater` (60-second loop) visually suggests periodic updates, but no refresh actually occurs.
- Files: `script.js` (line 27-32), `style.css` (lines 127-143)
- Impact: Users see stale data indefinitely. The loading bar animation is misleading -- it implies data is being refreshed every 60 seconds but nothing happens.
- Fix approach: Implement `setInterval` to call `fetchData()` periodically (e.g., every 60 seconds to match the animation). Add visual feedback for loading state.

## Known Bugs

**Tooltip accesses wrong property keys:**
- Symptoms: Tooltip rows for 1h/24h/7d/30d/1y show `undefined` or missing data because `TF_KEY` is accessed with dot notation on a plain object instead of bracket notation.
- Files: `script.js` (lines 303-307)
- Trigger: Hover over any bubble. The tooltip code uses `n[TF_KEY.hour]` but `TF_KEY` is an object `{hour: '...', day: '...', ...}`, so `TF_KEY.hour` correctly resolves. However, the `rows` array maps labels but the actual node `n` has been spread from `allData` plus a `change` property -- the original API keys are preserved, so this works. Not a bug per se but fragile: if the data shape changes, it silently breaks.
- Workaround: None needed currently, but the data access pattern should be made explicit with a helper function.

**Shuffle then sort creates wasted computation:**
- Symptoms: In `layout()`, nodes are first shuffled (Fisher-Yates, lines 139-142) then immediately sorted by radius descending (line 145). The shuffle is completely overridden by the sort.
- Files: `script.js` (lines 139-145)
- Trigger: Every call to `layout()`.
- Workaround: Remove the shuffle. It does nothing.

**Non-functional UI elements:**
- Symptoms: The filter dropdown button ("1 - 100"), currency selector ("USD"), and settings gear icon are rendered in the header but have zero event listeners -- clicking them does nothing.
- Files: `index.html` (lines 29-39), `script.js` (no handlers for `#filter-select`, `#currency-select`, or settings button)
- Trigger: Click any header button besides the timeframe tabs.
- Workaround: None. These are non-functional stubs.

## Security Considerations

**XSS risk in tooltip HTML construction:**
- Risk: Tooltip HTML is built via string interpolation in `showTip()`. While `esc()` is used for `n.name`, `n.symbol`, and `n.image`, the `n.image` value is inserted into an `<img src="...">` attribute. If the API returns a malicious image URL with attribute injection (e.g., `" onload="alert(1)`), the `esc()` function (which only escapes HTML entities via `textContent`) would prevent basic XSS but the pattern is fragile.
- Files: `script.js` (lines 302-315, line 343)
- Current mitigation: The `esc()` helper escapes `<`, `>`, `&`, `"` via `textContent`/`innerHTML` conversion. This is adequate for the current use case.
- Recommendations: Use DOM APIs (`createElement`, `appendChild`) instead of `innerHTML` for tooltip construction. This eliminates injection vectors entirely.

**No Content Security Policy:**
- Risk: No CSP headers or meta tags. The page loads an external script from `d3js.org` and images from `coingecko.com` CDN with no restriction on what other scripts or resources could be injected.
- Files: `index.html`
- Current mitigation: None.
- Recommendations: Add a `<meta http-equiv="Content-Security-Policy">` tag restricting `script-src` to `'self'` and `d3js.org`, `img-src` to `'self'` and CoinGecko image domains, and `connect-src` to `api.coingecko.com`.

**No Subresource Integrity (SRI) on CDN script:**
- Risk: The D3 library is loaded from `https://d3js.org/d3.v7.min.js` without an `integrity` attribute. If the CDN is compromised, arbitrary JavaScript runs in the user's browser.
- Files: `index.html` (line 9)
- Current mitigation: None.
- Recommendations: Add `integrity="sha384-..."` and `crossorigin="anonymous"` attributes to the D3 script tag.

**No HTTPS enforcement:**
- Risk: No mechanism to redirect HTTP to HTTPS. If served over HTTP, all API calls and CDN loads are vulnerable to MITM.
- Files: `index.html`
- Current mitigation: None (depends entirely on hosting configuration).
- Recommendations: Add `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">` at minimum.

## Performance Bottlenecks

**500-iteration force simulation on every layout:**
- Problem: The D3 force simulation runs 500 synchronous tick iterations on every call to `layout()` -- which happens on every timeframe change, window resize, and search keystroke.
- Files: `script.js` (lines 154-166)
- Cause: The simulation is created fresh and ticked 500 times synchronously in a `for` loop, blocking the main thread. For 100 nodes this takes 10-50ms, but it blocks UI rendering entirely during computation.
- Improvement path: Reduce iterations (200-300 is typically sufficient for convergence). Cache simulation results when only search filtering changes. Consider using `requestAnimationFrame` for progressive rendering. Debounce search input (currently no debounce on search, only on resize).

**Full canvas redraw on every image load:**
- Problem: Each coin image `onload` callback triggers a full `draw()` call. With 100 coins, this means up to 100 full canvas redraws during initial load as images trickle in.
- Files: `script.js` (lines 91-98)
- Cause: `img.onload = () => { coinImages[c.id] = img; draw(); }` fires individually per image.
- Improvement path: Batch image loads with a debounced draw call, or use `requestAnimationFrame` to coalesce redraws. For example, set a flag `needsRedraw = true` in `onload` and use a single `rAF` loop.

**Linear search for hit testing on mousemove:**
- Problem: Hover detection iterates through all nodes on every `mousemove` event using `Array.find()` with distance calculation.
- Files: `script.js` (lines 56-59)
- Cause: No spatial indexing. O(n) distance checks per mouse event.
- Improvement path: For 100 nodes this is fast enough, but if the dataset grows, use a quadtree (`d3.quadtree`) for O(log n) hit testing. Also consider throttling `mousemove` handler.

**No search input debounce:**
- Problem: Every keystroke in the search input triggers `layout()` + `draw()`, meaning a full force simulation re-run (500 ticks) per character typed.
- Files: `script.js` (line 71)
- Cause: Direct binding of `input` event to `layout(); draw()` with no debounce.
- Improvement path: Add 200-300ms debounce (similar to the resize handler pattern already in the code at line 47-48).

## Fragile Areas

**Canvas coordinate system / DPR handling:**
- Files: `script.js` (lines 17, 107-110, 174-176)
- Why fragile: Device Pixel Ratio (`DPR`) is captured once at module load. If the user moves the browser between displays with different DPR (e.g., Retina to external monitor), the canvas renders at the wrong resolution. The `layout()` function sizes the canvas with `W * DPR` but hit testing in `mousemove` uses CSS coordinates directly without DPR adjustment -- this works only because `mousemove` compares against `n.x`/`n.y` which are in CSS-pixel space. Any change to the coordinate system could break hit testing.
- Safe modification: When modifying canvas sizing or hit testing, verify both the DPR scaling path and the CSS-pixel coordinate path. Add a `matchMedia` listener for `devicePixelRatio` changes.
- Test coverage: No tests exist.

**Tooltip HTML injection pattern:**
- Files: `script.js` (lines 302-315)
- Why fragile: The tooltip is built as a raw HTML string with template literals. Adding new fields requires careful escaping. Forgetting to call `esc()` on any user-controlled data introduces XSS.
- Safe modification: Always wrap interpolated values with `esc()`. Better: refactor to DOM API construction.
- Test coverage: No tests exist.

**Tight coupling between data shape and rendering:**
- Files: `script.js` (lines 121-124, 302-307)
- Why fragile: The code directly accesses CoinGecko API response keys like `price_change_percentage_24h_in_currency` throughout. If CoinGecko changes their API response format, the entire app breaks silently (values become `undefined`, bubbles render with 0% change).
- Safe modification: Add a data transformation layer that maps API responses to an internal model. Validate API response shape before using it.
- Test coverage: No tests exist.

## Scaling Limits

**CoinGecko free API rate limiting:**
- Current capacity: 1 request per page load (100 coins).
- Limit: CoinGecko free tier allows ~10-30 calls/minute. No API key is used. Adding auto-refresh or multi-page fetching will quickly hit rate limits.
- Scaling path: Register for a CoinGecko API key (free tier with higher limits) or use CoinGecko Pro API. Implement client-side caching with `localStorage`. Add exponential backoff on rate limit errors.

**Fixed 100-coin limit:**
- Current capacity: Always fetches and displays exactly 100 coins.
- Limit: The filter dropdown shows "1 - 100" but is non-functional. Cannot view coins ranked 101+.
- Scaling path: Implement pagination. The API supports `page` parameter. Update force simulation parameters for larger datasets.

**Canvas rendering with large datasets:**
- Current capacity: 100 bubbles render smoothly.
- Limit: At 500+ bubbles, the 500-tick force simulation and full-canvas redraws will cause noticeable lag. Canvas text rendering is particularly expensive at scale.
- Scaling path: Use WebGL renderer, reduce simulation iterations, implement viewport culling (only draw visible bubbles), or use offscreen canvas for background computation.

## Dependencies at Risk

**D3.js v7 loaded from CDN without version pinning:**
- Risk: The script tag loads `d3.v7.min.js` which auto-resolves to the latest v7.x patch. A breaking change in a minor/patch release or CDN outage breaks the app instantly with no fallback.
- Impact: Layout and force simulation completely fail. The entire bubble visualization depends on D3.
- Migration plan: Pin to a specific version (e.g., `d3@7.9.0`), add SRI hash, or better yet install via npm and bundle locally. Only import the specific D3 modules needed (`d3-force`, `d3-scale`, `d3-array`).

**CoinGecko free API dependency:**
- Risk: CoinGecko has changed their free API terms multiple times. Rate limits, required API keys, or endpoint deprecation could break the app.
- Impact: App falls back to mock data (static, randomized, stale). Users see fake data with no indication it is not real.
- Migration plan: Add clear UI indication when showing mock/fallback data. Consider supporting multiple data sources (CoinMarketCap, CryptoCompare) with a fallback chain.

## Missing Critical Features

**No error state UI:**
- Problem: When the API fails, the app silently falls back to mock data with a `console.warn`. Users have no way to know they are viewing fake data.
- Blocks: User trust. Users may make financial decisions based on random mock numbers.

**No loading state:**
- Problem: No loading indicator during initial data fetch. The canvas is blank until data arrives and images load.
- Blocks: User experience on slow connections. Users see a black rectangle with no feedback.

**No mobile touch support:**
- Problem: Tooltip functionality uses `mousemove` and `mouseleave` events only. Touch devices cannot trigger tooltips. The search input is hidden on mobile (`@media max-width: 600px` sets `display: none`).
- Files: `script.js` (lines 52-68), `style.css` (lines 192-198)
- Blocks: Mobile usability. The viewport meta tag includes `user-scalable=no` (line 6 of `index.html`) but provides no touch interaction in return.

**No accessibility:**
- Problem: Canvas-based rendering provides zero screen reader support. No ARIA labels, no keyboard navigation, no focus management. Buttons have no accessible names beyond icon-only SVGs (settings button).
- Files: `index.html`, `script.js`
- Blocks: WCAG compliance. The app is completely inaccessible to users with visual impairments or keyboard-only users.

## Test Coverage Gaps

**No tests exist:**
- What's not tested: The entire codebase. Zero test files, no test framework, no test configuration.
- Files: `script.js` (all 409 lines), `index.html`, `style.css`
- Risk: Any change can introduce regressions with no safety net. The force simulation parameters, color calculations, price formatting, data transformation, and hit testing logic are all untested.
- Priority: High. At minimum, add unit tests for pure functions: `fmtPrice()`, `fmtCap()`, `esc()`, `mockData()`, and the data transformation in `layout()`. These are easily testable without DOM dependencies.

## Repository Hygiene

**Test screenshots committed to repository:**
- Issue: 8 PNG screenshot files (`test_v1.png` through `test_v9.png`, skipping v5) totaling ~5.7MB are committed to the repository root. These appear to be development iteration screenshots, not application assets.
- Files: `test_v1.png`, `test_v2.png`, `test_v3.png`, `test_v4.png`, `test_v6.png`, `test_v7.png`, `test_v8.png`, `test_v9.png`
- Impact: Bloats repository size unnecessarily. Binary files in git history are permanent even if deleted later.
- Fix approach: Remove from tracking, add `*.png` or `test_*.png` to `.gitignore`. Use git-filter-branch or BFG to purge from history if repo size is a concern.

**No .gitignore file:**
- Issue: No `.gitignore` exists. Any file added to the directory will be tracked by default.
- Files: (missing)
- Impact: Risk of accidentally committing OS files (`.DS_Store`), editor configs, or future `node_modules/` if a package manager is adopted.
- Fix approach: Add a `.gitignore` with standard entries for OS files, editor configs, `node_modules/`, and `dist/`.

---

*Concerns audit: 2026-03-06*
