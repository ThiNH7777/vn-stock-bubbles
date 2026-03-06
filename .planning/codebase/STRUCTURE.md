# Codebase Structure

**Analysis Date:** 2026-03-06

## Directory Layout

```
clonewebbubble/
├── .git/               # Git repository
├── .planning/          # GSD planning documents
│   └── codebase/       # Codebase analysis documents
├── index.html          # Main HTML page (entry point)
├── script.js           # All application logic (410 lines)
├── style.css           # All styles (199 lines)
├── test_v1.png         # Screenshot/reference image v1
├── test_v2.png         # Screenshot/reference image v2
├── test_v3.png         # Screenshot/reference image v3
├── test_v4.png         # Screenshot/reference image v4
├── test_v6.png         # Screenshot/reference image v6
├── test_v7.png         # Screenshot/reference image v7
├── test_v8.png         # Screenshot/reference image v8
└── test_v9.png         # Screenshot/reference image v9
```

## Directory Purposes

**Root (`clonewebbubble/`):**
- Purpose: Everything lives at the root -- this is a flat, single-page static site
- Contains: HTML, JS, CSS source files and PNG reference screenshots
- Key files: `index.html`, `script.js`, `style.css`

**`.planning/codebase/`:**
- Purpose: GSD planning and analysis documents
- Contains: Markdown analysis files
- Key files: `ARCHITECTURE.md`, `STRUCTURE.md`

## Key File Locations

**Entry Points:**
- `index.html`: The single HTML page; open in browser to run the app

**Configuration:**
- `script.js` lines 1-9: API URL and timeframe key mapping (hardcoded constants, no config file)
- `index.html` line 2: CSS custom properties for theme colors (`--color-theme-light`, `--color-theme-dark`)

**Core Logic:**
- `script.js` lines 1-9: Configuration constants (`API_URL`, `TF_KEY`)
- `script.js` lines 11-17: Global state variables (`timeframe`, `allData`, `nodes`, `coinImages`, `DPR`)
- `script.js` lines 19-24: DOM element references
- `script.js` lines 27-32: Initialization (DOMContentLoaded handler)
- `script.js` lines 35-72: Event binding (tabs, resize, mousemove, search)
- `script.js` lines 75-99: Data fetching and image preloading (`fetchData()`)
- `script.js` lines 102-167: Layout computation with D3 force simulation (`layout()`)
- `script.js` lines 170-190: Main render loop (`draw()`)
- `script.js` lines 193-299: Individual bubble rendering (`drawBubble()`)
- `script.js` lines 302-327: Tooltip show/move/hide logic
- `script.js` lines 330-343: Formatting helpers (`fmtPrice`, `fmtCap`, `esc`)
- `script.js` lines 346-409: Mock data fallback (`mockData()`)

**Styling:**
- `style.css` lines 1-27: Reset and base element styles
- `style.css` lines 29-49: Header bar
- `style.css` lines 51-68: Search input
- `style.css` lines 70-95: Button styles (icon and solid)
- `style.css` lines 97-143: Tabs and data updater bar
- `style.css` lines 145-156: Bubble chart container and canvas
- `style.css` lines 158-183: Tooltip
- `style.css` lines 185-198: Responsive breakpoints (900px, 600px)

**Testing:**
- No test files exist. The `test_v*.png` files are visual reference screenshots, not automated tests.

## Naming Conventions

**Files:**
- Lowercase, single-word names: `index.html`, `script.js`, `style.css`
- Screenshot files use `test_v{N}.png` naming (version iterations)

**JavaScript Functions:**
- camelCase: `fetchData`, `bindEvents`, `drawBubble`, `showTip`, `hideTip`, `moveTip`
- Short abbreviated helper names: `fmtPrice`, `fmtCap`, `esc`

**JavaScript Variables:**
- camelCase for multi-word: `allData`, `coinImages`, `resizeTimer`, `searchInput`
- UPPER_SNAKE_CASE for constants: `API_URL`, `TF_KEY`, `DPR`

**CSS Classes:**
- kebab-case: `bubble-chart`, `flex-row`, `solid-button`, `select-button-arrow`
- Tooltip classes use `tt-` prefix: `tt-header`, `tt-name`, `tt-sym`, `tt-row`, `tt-val`, `tt-pos`, `tt-neg`
- State classes: `selected`, `visible`

**DOM IDs:**
- kebab-case: `bubble-chart`, `search-input`, `timeframe-tabs`, `filter-select`, `currency-select`

## Where to Add New Code

**New Feature (e.g., new UI control or visualization mode):**
- HTML structure: Add to `index.html` in the appropriate section (header for controls, main for content)
- JavaScript logic: Add a new comment-delimited section in `script.js` following the existing pattern (`// ====== SectionName ======`)
- Event binding: Add event listeners inside `bindEvents()` in `script.js`
- Styling: Append to `style.css` with a comment header matching the section pattern (`/* ====== SectionName ====== */`)

**New API Integration or Data Source:**
- Add fetch logic near `fetchData()` in `script.js` (lines 75-99)
- Add new configuration constants at the top of `script.js` (lines 1-9)

**New Visual Elements on Canvas:**
- Add rendering logic near `drawBubble()` in `script.js` (lines 193-299)
- Follow the existing pattern: save context, clip to shape, draw content, restore context

**Utilities/Helpers:**
- Add to the helpers section at the bottom of `script.js` (lines 330-343)

**New Stylesheet:**
- If `style.css` grows large, create a new CSS file and add a `<link>` tag to `index.html` after the existing one

## Special Directories

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: By GSD mapping tools
- Committed: Yes (tracked by git)

**Reference Screenshots (`test_v*.png`):**
- Purpose: Visual reference images showing iterations of the bubble chart design
- Generated: Manually captured screenshots
- Committed: Yes (tracked by git, total ~5.8 MB)

## External Dependencies

**D3.js v7 (CDN):**
- Loaded from: `https://d3js.org/d3.v7.min.js` (referenced in `index.html` line 9)
- No local copy; requires internet connection for D3 force simulation
- Used for: `d3.scaleSqrt`, `d3.max`, `d3.forceSimulation`, `d3.forceX`, `d3.forceY`, `d3.forceCollide`

**No package manager, no `node_modules`, no build tooling.**

---

*Structure analysis: 2026-03-06*
