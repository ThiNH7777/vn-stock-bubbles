# VN Stock Bubbles

## What This Is

A public-facing website that visualizes Vietnamese stock market data (HOSE, HNX, UPCOM — 1500+ stocks) as an interactive bubble chart, inspired by cryptobubbles.net. Each bubble represents a stock ticker, with size determined by market cap or trading volume (user-selectable), and color reflecting price change percentage. The bubbles have realistic physics — floating, colliding, draggable — creating an engaging way for Vietnamese investors to scan market performance at a glance.

## Core Value

Users can instantly see which stocks are moving the most (up or down) across the entire Vietnamese market through a visually engaging, physics-based bubble chart.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

- [ ] Interactive bubble chart with 1500+ stock tickers
- [ ] Physics simulation: floating, collision detection, drag interaction, light gravity
- [ ] Bubble size by market cap or trading volume (user-selectable)
- [ ] Color coding: VN convention default (purple=ceiling, blue=up, red=down, cyan=floor, yellow=reference) with international option (green up, red down)
- [ ] Time period toggle: day, week, month, year
- [ ] Search/filter by stock ticker or company name
- [ ] Stock count filter (top 50, 100, 200, all)
- [ ] Exchange filter (HOSE, HNX, UPCOM, all)
- [ ] Hover effect: glow + tooltip with stock details
- [ ] Click interaction: zoom/expand with more detail
- [ ] Smooth transitions when switching timeframe or filters
- [ ] Responsive design (desktop + mobile)
- [ ] Mock data for Phase 1 (realistic VN stock tickers and values)

### Out of Scope

- Real-time data integration — deferred to Phase 2
- User accounts / authentication — not needed for v1
- Portfolio tracking — different product direction
- Mobile native app — web-first
- Historical chart per stock — keep focus on bubble overview
- News/sentiment integration — adds complexity without core value

## Context

- Inspired by https://cryptobubbles.net/ — the gold standard for bubble chart market visualization
- Vietnamese stock market uses unique color conventions: purple (ceiling/limit up), blue (up), red (down), cyan (floor/limit down), yellow (reference/unchanged)
- HOSE (~400 stocks), HNX (~350 stocks), UPCOM (~800+ stocks) = 1500+ total tickers
- The hardest technical challenge is the physics simulation with 1500+ bubbles performing smoothly
- Phase 1 focuses entirely on UI/UX with mock data; Phase 2 adds real market data
- Starting from scratch — existing code in directory is reference only

## Constraints

- **Performance**: Must handle 1500+ animated bubbles at 60fps on modern browsers
- **Physics**: Collision detection + resolution for many circles requires spatial optimization (quadtree, spatial hashing)
- **Rendering**: Canvas or WebGL preferred over DOM/SVG for bubble count this high
- **Mobile**: Touch interactions (drag, pinch zoom) must feel native
- **Phase 1**: No backend needed — all mock data client-side

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Canvas/WebGL over SVG/DOM | 1500+ animated elements would lag in DOM | — Pending |
| VN color scheme as default | Target audience is Vietnamese investors | — Pending |
| Phase 1 UI-only, Phase 2 data | De-risk the hardest part (physics UI) first | — Pending |
| Tech stack TBD via research | Let GSD research best stack for physics-heavy web app | — Pending |

---
*Last updated: 2026-03-06 after initialization*
