# Coding Conventions

**Analysis Date:** 2026-03-06

## Naming Patterns

**Files:**
- Lowercase, single-word names: `script.js`, `style.css`, `index.html`
- Screenshot files use `test_v{N}.png` naming (underscore + version number)

**Functions:**
- camelCase for all functions: `fetchData()`, `bindEvents()`, `drawBubble()`, `showTip()`, `hideTip()`, `moveTip()`
- Short abbreviated names for helper/formatter functions: `fmtPrice()`, `fmtCap()`, `esc()`
- Use verb-first naming: `fetchData`, `bindEvents`, `drawBubble`, `showTip`

**Variables:**
- camelCase for all variables: `allData`, `coinImages`, `resizeTimer`, `tooltipEl`, `searchInput`
- UPPER_SNAKE_CASE for constants: `API_URL`, `TF_KEY`, `DPR`
- Single-letter variables used freely in tight scopes: `n` (node), `d` (diameter), `e` (event), `r` (radius), `h`/`s`/`l` (HSL), `t` (interpolation factor), `p` (padding), `q` (query)

**CSS Classes:**
- kebab-case for all classes: `bubble-chart`, `flex-row`, `gap-m`, `solid-button`, `select-button-arrow`
- BEM-lite pattern for tooltip subcomponents: `tt-header`, `tt-name`, `tt-sym`, `tt-row`, `tt-label`, `tt-val`, `tt-pos`, `tt-neg`
- Utility classes for layout: `.grow`, `.gap-s`, `.gap-m`, `.flex-row`

**HTML IDs:**
- kebab-case: `bubble-chart`, `search-input`, `filter-select`, `currency-select`, `timeframe-tabs`

## Code Style

**Formatting:**
- No automated formatter (no Prettier, ESLint, or Biome configuration)
- 4-space indentation in all files (`index.html`, `script.js`, `style.css`)
- Single quotes for JavaScript strings
- Semicolons used consistently at statement ends
- Arrow functions preferred for callbacks and event handlers
- Template literals used for string interpolation (HTML generation, CSS values)

**Linting:**
- No linter configured
- No `package.json` exists; this is a zero-dependency vanilla project (D3.js loaded via CDN)

**Line Length:**
- No enforced limit
- Long lines appear freely, especially in SVG paths and inline HTML template strings (see `script.js` lines 309-315)

**Trailing Commas:**
- Trailing commas used in array/object literals (see `script.js` line 408 trailing comma after last mock coin entry)

## Import Organization

**No module system.** All JavaScript is in a single `script.js` file loaded via `<script>` tag. D3.js is loaded via CDN `<script>` in `index.html`.

**Load Order (in `index.html`):**
1. D3.js v7 from CDN (`<head>`)
2. `style.css` (`<head>`)
3. `script.js` (end of `<body>`)

## Error Handling

**Patterns:**
- try/catch around API fetch with graceful fallback to mock data (`script.js` lines 76-89)
- `console.warn()` used for non-critical errors (API unavailability)
- No global error handler
- No error boundaries or user-facing error UI
- Null checks use `== null` (loose equality) for price/cap formatting (`script.js` lines 331, 337)
- Fallback to empty string with `|| ''` for potentially missing string values (`script.js` lines 282, 310)
- Image load errors handled via `onerror="this.style.display='none'"` in tooltip HTML (`script.js` line 308)

**Error Handling Rule:** When fetching external data, always wrap in try/catch and fall back to mock/default data. Log with `console.warn`, not `console.error`.

## Logging

**Framework:** Browser `console` only

**Patterns:**
- `console.warn()` for expected failures (API unavailable) - `script.js` line 87
- No debug logging, no structured logging
- No log levels beyond `console.warn`

## Comments

**When to Comment:**
- Section headers use `// ====== Section Name ======` pattern throughout `script.js` (Config, State, DOM, Init, Events, Data, Layout, Draw, Tooltip, Helpers, Mock Data)
- CSS section headers use `/* ====== Section Name ====== */` pattern throughout `style.css`
- Inline comments explain non-obvious calculations (e.g., `// SIZE BY ABS(% CHANGE)`, `// Shuffle for even distribution`, `// 3D sphere highlight overlay`)
- No JSDoc or formal documentation

**Comment Style Rule:** Use `// ====== Name ======` banners to delineate major code sections. Use brief inline comments for non-obvious logic.

## Function Design

**Size:** Functions range from 1 line (`hideTip`) to ~65 lines (`layout`). Most functions are 10-30 lines.

**Parameters:** Minimal parameters. Functions primarily operate on module-level state (`allData`, `nodes`, `timeframe`, `coinImages`). Event handlers receive the native event object `e`. `drawBubble()` receives a single node object `n`.

**Return Values:** Most functions return `void` (side-effect-based). Helper functions (`fmtPrice`, `fmtCap`, `esc`) return formatted strings.

**Design Rule:** Functions mutate shared module-level state directly. No dependency injection or parameterization of state. Keep formatting/utility functions pure; keep rendering/layout functions side-effectful.

## Module Design

**Exports:** None. Single-file architecture with no module system.

**Barrel Files:** Not applicable.

**Code Organization:** All code lives in `script.js`, organized into clearly commented sections:
1. Config (constants)
2. State (mutable globals)
3. DOM (element references)
4. Init (DOMContentLoaded bootstrap)
5. Events (event binding)
6. Data (API fetch + mock)
7. Layout (D3 force simulation)
8. Draw (Canvas rendering)
9. Tooltip (hover UI)
10. Helpers (formatting utilities)
11. Mock Data (fallback dataset)

## CSS Conventions

**Architecture:**
- Single `style.css` file, no preprocessor (no Sass/Less/PostCSS)
- CSS custom properties defined on `<html>` element for theming: `--color-theme-light`, `--color-theme-dark`
- `var()` with fallback values: `var(--color-theme-dark, #a33)`

**Color Values:**
- Hex shorthand preferred: `#fff`, `#333`, `#555`, `#444`, `#222`
- Hex with alpha for transparency: `#ffffff1f`, `#ffffff40`, `#0003`, `#0006`
- Named transparency via `rgba()` in JS canvas code

**Responsive Design:**
- Two breakpoints: `900px` and `600px`
- Mobile-first hiding: elements hidden with `display: none` at small widths
- No CSS Grid; Flexbox used throughout

**Transitions:**
- Consistent `.4s` duration for hover/focus transitions
- `transition-property` explicitly listed (not `all`)

---

*Convention analysis: 2026-03-06*
