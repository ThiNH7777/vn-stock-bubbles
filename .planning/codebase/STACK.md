# Technology Stack

**Analysis Date:** 2026-03-06

## Languages

**Primary:**
- HTML5 - Page structure (`index.html`)
- CSS3 - Styling, animations, responsive layout (`style.css`)
- JavaScript (ES2017+) - All application logic (`script.js`)

**Secondary:**
- None

## Runtime

**Environment:**
- Browser-only (no server-side runtime)
- Uses `async/await`, `const/let`, arrow functions, template literals, destructuring, spread operator (ES2017+ features)
- Targets modern browsers with Canvas 2D and Fetch API support

**Package Manager:**
- None - no `package.json`, no dependency management
- All dependencies loaded via CDN `<script>` tags

## Frameworks

**Core:**
- D3.js v7 (loaded from CDN: `https://d3js.org/d3.v7.min.js`) - Force simulation for bubble layout, scale functions (`d3.scaleSqrt`, `d3.forceSimulation`, `d3.forceX`, `d3.forceY`, `d3.forceCollide`)

**Testing:**
- None - no test framework detected

**Build/Dev:**
- None - no build system, no bundler, no transpilation
- Files served directly as static assets

## Key Dependencies

**Critical:**
- D3.js v7 (CDN) - Powers the entire bubble layout physics simulation. Used for `forceSimulation`, `forceCollide`, `forceX`, `forceY`, `scaleSqrt`, and `d3.max`. Without D3, the bubble positioning breaks entirely.

**Infrastructure:**
- None - zero npm/pip/cargo dependencies

## Configuration

**Environment:**
- No environment variables
- No `.env` files
- API URL hardcoded as constant in `script.js` line 2: `const API_URL = 'https://api.coingecko.com/api/v3/coins/markets'`
- Color theme configured via CSS custom properties on the `<html>` element: `--color-theme-light:#f66` and `--color-theme-dark:#a33`

**Build:**
- No build configuration - static files served directly
- No `tsconfig.json`, no webpack/vite/rollup config

## Browser APIs Used

**Canvas 2D:**
- `canvas.getContext('2d')` - All bubble rendering
- Radial gradients, shadow effects, image drawing, text rendering, clipping

**Fetch API:**
- `fetch()` with `URLSearchParams` for API calls (`script.js` line 82)

**Device Pixel Ratio:**
- `window.devicePixelRatio` for HiDPI canvas rendering (`script.js` line 17)

**DOM APIs:**
- `document.getElementById`, `querySelectorAll`, `addEventListener`
- `classList`, `innerHTML`, `getBoundingClientRect`

## Platform Requirements

**Development:**
- Any HTTP server capable of serving static files (or open `index.html` directly in browser)
- No Node.js, no build step required

**Production:**
- Static file hosting (any CDN, S3, GitHub Pages, Netlify, etc.)
- No server-side processing required
- CORS: CoinGecko API must allow browser-origin requests (it does for public endpoints)

---

*Stack analysis: 2026-03-06*
