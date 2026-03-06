# Architecture

**Analysis Date:** 2026-03-06

## Pattern Overview

**Overall:** Single-page static web application (vanilla HTML/CSS/JS, no framework)

**Key Characteristics:**
- No build system, bundler, or transpiler -- files are served directly
- All application logic lives in a single JavaScript file (`script.js`)
- Uses Canvas 2D API for rendering bubble visualizations
- D3.js used solely for force-layout physics simulation (not for DOM rendering)
- Procedural architecture organized by comment-delimited sections within one file

## Layers

**Presentation (HTML + CSS):**
- Purpose: Static page shell, layout, and visual styling
- Location: `index.html`, `style.css`
- Contains: Header bar with controls (search, timeframe tabs, filter/currency selects, settings button), main canvas container, tooltip overlay
- Depends on: Nothing
- Used by: `script.js` manipulates DOM elements by ID

**Application Logic (JavaScript):**
- Purpose: All runtime behavior -- data fetching, layout computation, rendering, interaction
- Location: `script.js`
- Contains: Six logical sections separated by comment headers (Config, State, DOM, Events, Data, Layout, Draw, Tooltip, Helpers, Mock Data)
- Depends on: D3.js (loaded from CDN), `index.html` DOM elements
- Used by: Loaded by `index.html` via `<script>` tag at end of body

**External Data (API):**
- Purpose: Supplies real-time cryptocurrency market data
- Location: `https://api.coingecko.com/api/v3/coins/markets`
- Contains: Top 100 coins by market cap with price change percentages
- Depends on: Nothing
- Used by: `fetchData()` in `script.js`

## Data Flow

**Application Initialization:**

1. `DOMContentLoaded` event fires (`script.js` line 27)
2. `bindEvents()` registers all event listeners (timeframe tabs, window resize, canvas mouse, search input)
3. `fetchData()` calls CoinGecko API, stores results in global `allData` array, begins async image preloading
4. `layout()` computes bubble positions using D3 force simulation
5. `draw()` renders all bubbles to canvas

**Timeframe Change:**

1. User clicks a timeframe tab (Hour/Day/Week/Month/Year)
2. Click handler in `bindEvents()` updates global `timeframe` variable
3. `layout()` re-computes bubble radii based on the new timeframe's `price_change_percentage_*` field
4. `draw()` re-renders all bubbles with updated sizes and colors

**Search Filter:**

1. User types in search input
2. `input` event triggers `layout()` which filters `allData` by name/symbol match
3. `draw()` renders the filtered subset

**State Management:**
- All state is in module-level globals in `script.js`: `timeframe` (string), `allData` (array from API), `nodes` (computed bubble data), `coinImages` (preloaded Image objects)
- No state management library; direct mutation of global variables
- State changes always flow: user event -> update global -> `layout()` -> `draw()`

## Key Abstractions

**Bubble Node:**
- Purpose: Represents a single cryptocurrency as a visual bubble
- Examples: Created in `layout()` at `script.js` lines 132-136
- Pattern: Plain object with spread of API coin data plus computed `r` (radius), `x`, `y` (position), and `change` (percentage for current timeframe)

**Timeframe Key Mapping:**
- Purpose: Maps human-readable timeframe names to CoinGecko API field names
- Examples: `TF_KEY` constant at `script.js` lines 3-9
- Pattern: Static lookup object (`{ hour: 'price_change_percentage_1h_in_currency', ... }`)

**Mock Data Generator:**
- Purpose: Provides fallback data when API is unavailable
- Examples: `mockData()` at `script.js` lines 346-409
- Pattern: Factory function that generates 100 coins with randomized price changes

## Entry Points

**Page Load:**
- Location: `index.html`
- Triggers: Opening `index.html` in a browser (or serving via any static file server)
- Responsibilities: Loads CSS, loads D3.js from CDN, loads `script.js`, which self-initializes on `DOMContentLoaded`

**API Entry:**
- Location: `script.js` line 2 (`API_URL`)
- Triggers: Called once on page load by `fetchData()`
- Responsibilities: Fetches top 100 coins from CoinGecko with multi-timeframe price change data

## Error Handling

**Strategy:** Graceful fallback with console warnings

**Patterns:**
- API fetch failure: `try/catch` in `fetchData()` catches any network or parse error, falls back to `mockData()` with a `console.warn` (`script.js` lines 87-89)
- Image load failure: Tooltip uses `onerror="this.style.display='none'"` to hide broken coin images (`script.js` line 308)
- No validation of individual coin data fields; missing values default to `0` via `|| 0` (`script.js` line 123)

## Cross-Cutting Concerns

**Logging:** `console.warn` only, used in the API fallback path. No structured logging.

**Validation:** Minimal. API response is checked for being a non-empty array (`script.js` line 85). Individual coin fields are not validated.

**Authentication:** None. CoinGecko free API is used without an API key.

**Responsive Design:** CSS media queries at 900px and 600px breakpoints (`style.css` lines 186-198). Canvas and bubble layout dynamically adapt to container size via `layout()`. Window resize is debounced at 200ms.

**HiDPI/Retina Support:** Canvas is scaled by `window.devicePixelRatio` (`script.js` line 17, used in `layout()` and `draw()`).

**XSS Prevention:** User-provided tooltip content is escaped via `esc()` helper function (`script.js` line 343).

---

*Architecture analysis: 2026-03-06*
