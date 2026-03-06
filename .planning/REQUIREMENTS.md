# Requirements: VN Stock Bubbles

**Defined:** 2026-03-06
**Core Value:** Users can instantly see which stocks are moving the most across the entire Vietnamese market through a visually engaging, physics-based bubble chart.

## v1 Requirements

Requirements for Phase 1 (UI with mock data). Each maps to roadmap phases.

### Rendering

- [ ] **RNDR-01**: Canvas-based bubble renderer with Retina/HiDPI (devicePixelRatio) scaling
- [ ] **RNDR-02**: Bubble size maps to market cap using sqrt scale (area-proportional)
- [ ] **RNDR-03**: Bubble displays ticker symbol and % change text
- [ ] **RNDR-04**: Color intensity scales with % change magnitude

### Physics

- [ ] **PHYS-01**: Custom circle-only physics engine with semi-implicit Euler integration
- [ ] **PHYS-02**: Spatial hash grid for O(1) collision detection (not brute-force O(n^2))
- [ ] **PHYS-03**: Multi-pass collision resolution (3-5 iterations) to prevent jitter
- [ ] **PHYS-04**: Fixed-timestep game loop decoupled from render rate
- [ ] **PHYS-05**: Light center gravity pulling bubbles toward viewport center
- [ ] **PHYS-06**: Boundary containment (bubbles stay within canvas)

### Interaction

- [ ] **INTR-01**: User can drag bubbles with pointer -- physics responds with momentum
- [ ] **INTR-02**: User sees hover glow effect + tooltip showing ticker, price, % change
- [ ] **INTR-03**: Smooth animated transitions when switching time period (bubble sizes, colors, positions interpolate)

### Data

- [x] **DATA-01**: Mock data layer with ~400 realistic VN stock tickers (symbol, company name, price, market cap, % changes across all timeframes)
- [ ] **DATA-02**: Time period toggle (day, week, month, year) changes bubble colors and sizes

### Foundation

- [x] **FOUN-01**: React 19 + TypeScript + Vite project scaffolding with Tailwind 4
- [x] **FOUN-02**: Two-tier state architecture: Zustand for UI state, plain JS typed arrays for simulation state

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Filters & Search

- **FILT-01**: Search by ticker symbol or company name with fuzzy matching
- **FILT-02**: Exchange filter (HOSE, HNX, UPCOM, All)
- **FILT-03**: Bubble count filter (Top 50, 100, 200, 500, All)
- **FILT-04**: Bubble size toggle (market cap vs trading volume)

### Visual Polish

- **VISL-01**: VN color convention (purple=ceiling, blue=up, red=down, cyan=floor, yellow=reference)
- **VISL-02**: International color scheme toggle (green up, red down)
- **VISL-03**: Dark mode (default dark theme)
- **VISL-04**: Performance badges for ceiling/floor price hits

### Enhanced Interaction

- **ENCH-01**: Click detail panel with full stock info (no page navigation)
- **ENCH-02**: Responsive design with mobile touch support (tap, pinch-zoom, pan)
- **ENCH-03**: Full-screen / theater mode
- **ENCH-04**: Keyboard shortcuts (S=search, F=fullscreen, 1-4=timeframe)

### Data Integration

- **DINT-01**: Real VN stock market data via API (5-15 min delayed)
- **DINT-02**: 1500+ stocks across HOSE, HNX, UPCOM
- **DINT-03**: Sector/industry grouping with visual clustering

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time streaming data | Massive infrastructure cost; 5-15 min delay sufficient |
| Per-stock historical charts | Scope creep -- TradingView does this already |
| User accounts / authentication | Kills simplicity; use localStorage |
| Portfolio tracking | Completely different product |
| News/sentiment integration | Content licensing, moderation complexity |
| AI-powered predictions | Unreliable, legally risky |
| Trading integration | Regulatory compliance, different product |
| 3D visualization | No analytical value over 2D, worse on mobile |
| Social features / comments | Moderation burden, manipulation risk |
| Mobile native app | Web-first, responsive web covers mobile |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUN-01 | Phase 1 | Complete |
| FOUN-02 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 4 | Pending |
| RNDR-01 | Phase 1 | Pending |
| RNDR-02 | Phase 3 | Pending |
| RNDR-03 | Phase 3 | Pending |
| RNDR-04 | Phase 3 | Pending |
| PHYS-01 | Phase 2 | Pending |
| PHYS-02 | Phase 2 | Pending |
| PHYS-03 | Phase 2 | Pending |
| PHYS-04 | Phase 2 | Pending |
| PHYS-05 | Phase 2 | Pending |
| PHYS-06 | Phase 2 | Pending |
| INTR-01 | Phase 4 | Pending |
| INTR-02 | Phase 4 | Pending |
| INTR-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation*
