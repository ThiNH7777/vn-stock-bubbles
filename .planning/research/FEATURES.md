# Feature Research

**Domain:** Interactive bubble chart stock market visualization (Vietnamese market)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist based on cryptobubbles.net, Finviz, BubbleScreener, BanterBubbles, and TradingView heatmaps. Missing any of these and the product feels broken or amateur.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Bubble visualization with size encoding** | Core concept -- every competitor maps market cap or volume to bubble size. Users instantly understand "bigger = more important." | HIGH | The physics-based floating/collision simulation is the hardest part. CryptoBubbles uses simple force layout; we need quadtree or spatial hashing for 1500+ bubbles at 60fps. |
| **Color coding by performance** | Universal across all competitors. Green/red (international) is default. VN convention (purple/blue/red/cyan/yellow) is a local necessity. | LOW | Implement as a theme system. Default to VN colors, toggle to international. Color intensity should scale with % change magnitude. |
| **Time period toggle** | CryptoBubbles: 1h, 24h, 7d, 30d, 1y. BubbleScreener: daily, weekly, monthly, yearly. Finviz: 1d, 1w, 1m, 3m, 6m, 1y. Users expect at minimum: day, week, month, year. | LOW | Data structure must support multiple timeframes per ticker. Smooth transitions when switching (not a jarring reload). |
| **Hover tooltip with stock details** | Every single competitor shows ticker, price, % change, market cap, volume on hover. This is the primary way users get detail from the visualization. | LOW | Show: ticker symbol, company name, current price, % change, market cap, volume. Keep it fast -- no network requests on hover. |
| **Search/filter by ticker or name** | CryptoBubbles, BubbleScreener, Finviz all have search. With 1500+ stocks, finding a specific ticker without search is impossible. | LOW | Fuzzy search across ticker and company name. Highlight matching bubble and scroll/zoom to it. |
| **Exchange filter** | Specific to VN market: HOSE (~400), HNX (~350), UPCOM (~800+). No competitor needs this for single-exchange markets, but VN has three exchanges with very different characteristics. | LOW | Toggle between HOSE, HNX, UPCOM, or All. UPCOM stocks are generally less liquid -- users often want to exclude them. |
| **Bubble count filter** | BubbleScreener has Top 100, 101-200, 201-300. CryptoBubbles shows top 1000. With 1500+ VN stocks, showing all creates clutter. | LOW | Top 50, 100, 200, 500, All. Default to Top 200 for performance; let power users load all. |
| **Click for more detail** | Finviz opens full chart on click. CryptoBubbles shows expanded coin info. BubbleScreener opens detailed chart panel. Users expect clicking a bubble to reveal more. | MEDIUM | Expand bubble or open side panel with: full name, exchange, sector/industry, all timeframe changes, key metrics. Do NOT navigate away from the visualization. |
| **Responsive design (desktop + mobile)** | CryptoBubbles has dedicated mobile apps. BubbleScreener and Finviz are responsive. A visualization that only works on desktop loses half the audience. | HIGH | Canvas/WebGL resize handling. Touch: tap for tooltip, long-press or double-tap for detail, pinch-to-zoom. Reduce bubble count on mobile for performance (default to Top 100). |
| **Bubble size toggle (market cap vs volume)** | CryptoBubbles and BubbleScreener both let users switch what drives bubble size. Market cap shows importance; volume shows activity. Different analytical views. | LOW | Smooth size transition animation when switching. These are the two most useful sizing metrics for market overview. |
| **Smooth transitions** | CryptoBubbles animates between states. Jarring reloads feel broken. Users expect fluid state changes when switching timeframes, filters, or size metrics. | MEDIUM | Interpolate bubble positions, sizes, and colors. Use spring/ease physics for natural feel. Budget ~300-500ms for transitions. |

### Differentiators (Competitive Advantage)

Features that set VN Stock Bubbles apart. Not required, but create competitive moats and user delight.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **VN-specific color convention** | No existing tool respects Vietnamese market color norms (purple=ceiling, blue=up, red=down, cyan=floor, yellow=reference). This immediately signals "built for VN investors" and reduces cognitive load for the target audience. | LOW | This is the single strongest differentiator for the Vietnamese market. International tools use green/red which confuses VN investors where red=down but culturally red=lucky. |
| **Physics-based bubble interaction** | CryptoBubbles has basic floating. Implementing realistic physics (gravity, collision, drag, momentum) makes the visualization feel alive and playful. Users share and return to tools that feel delightful. | HIGH | Use a 2D physics engine (Matter.js or custom). Light gravity pulling bubbles down, collision response, draggable with momentum. This is technically the hardest feature but the biggest "wow factor." |
| **Sector/industry grouping** | Finviz groups by sector. BanterBubbles groups by "narrative." No VN tool groups bubbles by Vietnamese industry sectors (banking, real estate, steel, seafood, etc.). Grouping reveals sector rotation at a glance. | MEDIUM | Cluster bubbles by sector with visual boundaries or labels. VN market has distinct sector dynamics (banking dominates HOSE, real estate is cyclical). Requires sector metadata per ticker. |
| **Dark mode** | CryptoBubbles defaults to dark. Financial tools increasingly default dark (TradingView, Bloomberg terminal). Dark mode reduces eye strain during extended market watching and looks more professional. | LOW | Design dark-first (most finance users prefer it). Offer light toggle. Dark backgrounds make colored bubbles pop more visually. |
| **Full-screen / theater mode** | Useful for traders with dedicated monitors. No VN market tool offers this. Makes the visualization feel like a professional trading tool rather than a widget. | LOW | Simple CSS fullscreen API. Hide header/footer, maximize canvas. Add keyboard shortcut (F key). |
| **Shareable snapshots / screenshots** | Users want to share market states on social media and forums. CryptoBubbles is frequently screenshotted and shared on Twitter/X. Built-in sharing removes friction. | MEDIUM | Canvas-to-image export with branding watermark. Share buttons for Zalo (primary VN social), Facebook, Twitter. Each share is free marketing. |
| **Keyboard shortcuts** | Power users expect keyboard navigation. No bubble visualization tool currently offers this well. | LOW | S for search, F for fullscreen, 1/2/3/4 for timeframe toggle, Esc to close detail panels. Small effort, big UX win for repeat users. |
| **Performance indicator badges** | Show small visual indicators on bubbles for special states: ceiling price (tran), floor price (san), new 52-week high/low. VN market has daily price limits that are culturally significant. | MEDIUM | VN stocks have +-7% (HOSE), +-10% (HNX), +-15% (UPCOM) daily limits. Hitting ceiling/floor is significant news. Badge or ring effect on these bubbles. |
| **Locale-aware number formatting** | Vietnamese users expect: 1.234.567 (dot separators), VND currency, Vietnamese company names. | LOW | Format numbers with dot thousands separator. Show prices in VND (no decimals for VND). Support Vietnamese diacritical marks in search and display. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time streaming data** | "I want live prices updating every second." | Massive infrastructure cost, WebSocket complexity, SSE at scale. CryptoBubbles updates every few minutes, not real-time. For a Phase 1 product with mock data, this is premature optimization. Even Phase 2 should use 5-15 minute delayed data. | Periodic refresh (5-15 min intervals). Display "last updated" timestamp. Real-time is a Phase 3+ consideration after validating demand. |
| **Per-stock historical charts** | "Let me see a candlestick chart for each stock." | Scope creep -- this turns a visualization tool into a full trading platform. TradingView already does this perfectly. Building charting duplicates existing tools poorly. | Link out to TradingView or Vietstock for the specific ticker when users want detailed charts. Keep focus on the bubble overview. |
| **User accounts / authentication** | "Let me save my watchlist and preferences." | Auth adds backend complexity, security concerns, GDPR/privacy obligations. Kills the "just open and use" simplicity that makes CryptoBubbles successful. | Use localStorage for preferences and watchlists. No accounts needed for v1. Consider accounts only if users explicitly request cloud sync. |
| **Portfolio tracking** | "Let me enter my holdings and see my portfolio as bubbles." | Completely different product. Requires position management, P&L calculation, transaction history. Competes with established portfolio apps (VPS SmartOne, SSI iBoard). | Stay focused: market overview visualization. Not a portfolio tool. |
| **News/sentiment integration** | "Show me news for each stock." BanterBubbles does this. | Content licensing, moderation, data sourcing for Vietnamese language news is extremely complex. Adds latency and distraction. BanterBubbles has a dedicated content team. | Keep visualization pure. Link to external news sources if anything. The bubble chart IS the insight. |
| **AI-powered predictions** | Laika CryptoBubbles added AI queries. "Predict which stocks will go up." | ML models for stock prediction are unreliable, legally risky (investment advice), and expensive to run. Adds false confidence. | The visualization itself helps users spot patterns. Let humans interpret, not AI. |
| **Trading integration** | "Let me buy/sell directly from the bubble chart." | Requires brokerage API integration, regulatory compliance (SSC Vietnam), liability. Completely different product category. | Link to brokerage platforms. The tool is for discovery, not execution. |
| **3D visualization** | "Make the bubbles 3D for more visual impact." Finviz experimented with 3D maps. | 3D adds visual complexity without analytical value. Harder to compare sizes in 3D (perspective distortion). Much harder to implement performantly. Worse on mobile. | 2D with depth effects (shadows, glow) gives visual richness without 3D complexity. |
| **Social features / comments** | "Let users comment on stocks or chat." BanterBubbles has per-coin chat. | Requires moderation, spam prevention, user management. Vietnamese stock forums are notoriously full of pump-and-dump manipulation. Liability risk. | No social features. Users have Zalo groups, Facebook groups, and F319 forums for discussion. |
| **Notification / alerts** | "Alert me when a stock moves X%." | Requires persistent backend, push notification infrastructure, user accounts. Over-engineered for a visualization tool. | Users can bookmark and check periodically. The visual nature of bubbles makes scanning fast enough. |

## Feature Dependencies

```
[Canvas/WebGL Renderer]
    +-- requires --> [Bubble Visualization]
                        +-- requires --> [Color Coding by Performance]
                        +-- requires --> [Bubble Size Encoding]
                        +-- requires --> [Hover Tooltip]
                        +-- requires --> [Click Detail Panel]

[Physics Engine]
    +-- requires --> [Bubble Visualization]
    +-- enables --> [Drag Interaction]
    +-- enables --> [Floating/Collision Animation]
    +-- enables --> [Smooth Transitions]

[Data Layer (Mock)]
    +-- requires --> [Time Period Toggle]
    +-- requires --> [Bubble Size Toggle]
    +-- requires --> [Exchange Filter]
    +-- requires --> [Bubble Count Filter]
    +-- requires --> [Search/Filter]

[Sector Grouping]
    +-- requires --> [Bubble Visualization]
    +-- requires --> [Data Layer with sector metadata]

[Responsive Design]
    +-- requires --> [Canvas/WebGL Renderer]
    +-- requires --> [Touch interaction layer]

[Dark Mode]
    +-- independent, can be built anytime

[VN Color Convention]
    +-- requires --> [Color Coding by Performance]
    +-- independent of other features

[Shareable Snapshots]
    +-- requires --> [Canvas/WebGL Renderer] (canvas.toDataURL)
    +-- requires --> [Bubble Visualization] (meaningful state to capture)
```

### Dependency Notes

- **Canvas/WebGL Renderer is the foundation:** Everything visual depends on the rendering layer. This must be built and optimized first.
- **Physics Engine is independent of data:** Physics simulation can be developed with placeholder circles before real data structure exists.
- **Data Layer is independent of rendering:** Mock data schema can be designed before the renderer is ready, enabling parallel development.
- **VN Color Convention requires only the color system:** It's a theme swap, not a structural dependency. Can be added at any point after basic color coding works.
- **Sector Grouping requires enriched data:** Each ticker needs sector/industry metadata. This affects the mock data schema design.
- **Search conflicts with physics dragging on mobile:** Both need touch input handling. Implement search as an overlay that pauses physics, not inline.

## MVP Definition

### Launch With (v1 -- Phase 1: Mock Data)

- [x] **Canvas-based bubble renderer** -- foundation for everything visual
- [x] **Physics simulation (floating, collision, drag)** -- the core "wow factor" and hardest technical challenge
- [x] **Bubble size by market cap** -- most intuitive default sizing
- [x] **Color coding with VN convention** -- immediate signal this is built for VN market
- [x] **Time period toggle (day, week, month, year)** -- minimum useful timeframe range
- [x] **Hover tooltip (ticker, price, % change)** -- primary detail access method
- [x] **Search by ticker/name** -- essential with 1500+ stocks
- [x] **Exchange filter (HOSE, HNX, UPCOM, All)** -- essential for VN market structure
- [x] **Bubble count filter (Top 50/100/200/All)** -- performance management
- [x] **Responsive layout (desktop + mobile)** -- half the Vietnamese investor audience is mobile
- [x] **Mock data for ~400 realistic VN tickers** -- enough to validate the concept

### Add After Validation (v1.x)

- [ ] **Click detail panel** -- trigger: users hovering but wanting more info
- [ ] **Bubble size toggle (market cap vs volume)** -- trigger: user feedback requesting volume view
- [ ] **Dark mode** -- trigger: likely requested immediately by power users
- [ ] **Sector/industry grouping** -- trigger: users asking "which sectors are moving?"
- [ ] **Smooth transitions between states** -- trigger: state changes feel jarring
- [ ] **Full-screen mode** -- trigger: users using it on trading monitors
- [ ] **Keyboard shortcuts** -- trigger: repeat users wanting faster navigation
- [ ] **Performance badges (ceiling/floor)** -- trigger: users wanting VN-specific market signals

### Future Consideration (v2+)

- [ ] **Real market data integration (API)** -- why defer: requires backend, data sourcing, costs
- [ ] **Shareable snapshots** -- why defer: needs meaningful real data to be worth sharing
- [ ] **International color scheme toggle** -- why defer: low priority until foreign users appear
- [ ] **Locale-aware number formatting** -- why defer: nice-to-have polish
- [ ] **Multiple watchlists (localStorage)** -- why defer: needs user demand signal
- [ ] **Embeddable widget** -- why defer: distribution channel, not core product

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Bubble visualization (canvas) | HIGH | HIGH | P1 |
| Physics simulation | HIGH | HIGH | P1 |
| Color coding (VN convention) | HIGH | LOW | P1 |
| Bubble size by market cap | HIGH | LOW | P1 |
| Hover tooltip | HIGH | LOW | P1 |
| Search/filter by ticker | HIGH | LOW | P1 |
| Time period toggle | HIGH | LOW | P1 |
| Exchange filter | HIGH | LOW | P1 |
| Bubble count filter | MEDIUM | LOW | P1 |
| Responsive design | HIGH | HIGH | P1 |
| Mock data (VN tickers) | HIGH | MEDIUM | P1 |
| Click detail panel | MEDIUM | MEDIUM | P2 |
| Size toggle (cap vs volume) | MEDIUM | LOW | P2 |
| Dark mode | MEDIUM | LOW | P2 |
| Sector grouping | MEDIUM | MEDIUM | P2 |
| Smooth transitions | MEDIUM | MEDIUM | P2 |
| Full-screen mode | LOW | LOW | P2 |
| Keyboard shortcuts | LOW | LOW | P2 |
| Performance badges | MEDIUM | LOW | P2 |
| Real data integration | HIGH | HIGH | P3 |
| Shareable snapshots | MEDIUM | MEDIUM | P3 |
| Embeddable widget | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (Phase 1 MVP)
- P2: Should have, add iteratively after core works
- P3: Future consideration, requires Phase 2+ infrastructure

## Competitor Feature Analysis

| Feature | CryptoBubbles.net | BubbleScreener | BanterBubbles | Finviz Maps | Stockmap.vn | **VN Stock Bubbles** |
|---------|-------------------|----------------|---------------|-------------|-------------|---------------------|
| Bubble/tile visualization | Bubbles (floating) | Bubbles (static) | Bubbles (floating) | Treemap tiles | Bubbles (basic) | Bubbles (physics-based) |
| Physics simulation | Basic floating | None | Basic floating | None | None | **Full physics (collision, drag, gravity)** |
| Color coding | Green/Red | Green/Red + 2 alt schemes | Green/Red | Green/Red (intensity) | Blue/Red | **VN convention (5 colors) + intl toggle** |
| Time periods | 1h, 24h, 7d, 30d, 1y | Daily, weekly, monthly, yearly | Multiple | 1d, 1w, 1m, 3m, 6m, 1y, YTD | Real-time | Day, week, month, year |
| Size encoding | Market cap, volume | Market cap, volume, performance | Market cap | Market cap | Order imbalance | Market cap, volume |
| Search | Yes | Limited | Yes | Yes (screener) | No | Yes (fuzzy) |
| Grouping | By blockchain | By index | By narrative/ecosystem | By sector/industry | By sector/index | By exchange, sector |
| Click detail | Coin info panel | Chart panel | News + chat | Full stock page | Basic info | Detail panel (no nav away) |
| Mobile | Native apps (iOS/Android) | Responsive web | Native apps | Responsive web | Web only | Responsive web |
| Dark mode | Default dark | Light only | Dark | Light only | Light only | Dark (default) |
| VN market support | No | No | No | No | **Yes** | **Yes (primary focus)** |
| VN color convention | No | No | No | No | No | **Yes (unique)** |
| Ceiling/floor indicators | N/A | N/A | N/A | N/A | Partial | **Yes (planned)** |
| Ad-free | Yes | Yes | No | Free has ads | Paid tiers | Yes |

**Key competitive gap:** No existing tool combines physics-based bubble visualization with Vietnamese market focus and VN color conventions. Stockmap.vn has basic bubble charts but lacks physics, and no tool respects the VN color system (purple/blue/red/cyan/yellow).

## Sources

- [CryptoBubbles.net](https://cryptobubbles.net) -- primary inspiration, gold standard for bubble visualization
- [BubbleScreener](https://bubblescreener.com/) -- stock-focused bubble tool with multi-market support
- [BanterBubbles](https://banterbubbles.com/) -- news-integrated bubble visualization
- [Finviz Maps](https://finviz.com/map.ashx) -- treemap-style market visualization
- [Finviz Bubbles](https://finviz.com/bubbles.ashx) -- bubble chart for S&P 500
- [TradingView Stock Heatmap](https://www.tradingview.com/heatmap/stock/) -- heatmap with extensive filters
- [Stockmap.vn Bubble Chart](https://help.stockmap.vn/bo-cong-cu-hien-dai-cua-stockmap/bubble-chart-va-nhung-tinh-nang-vuot-troi) -- Vietnamese market bubble tool
- [VietstockFinance Market Map](https://finance.vietstock.vn/ban-do-thi-truong) -- Vietnamese market heatmap
- [FiinTrade Heatmap](https://web.fiintrade.vn/en/features/market/heat-map/) -- Vietnamese market heatmap tool
- [Laika vs CryptoBubbles vs BanterBubbles comparison](https://laikalabs.ai/blogs/laika-crypto-bubbles-vs-cryptobubblesnet-vs-banter-bubbles-which-one-is-best-for-you)
- [Finscreener Bubble Chart](https://www.finscreener.org/map/bubble) -- stock bubble chart with 85+ filter criteria
- [Smashing Magazine: Fun With Physics in Data Visualization](https://www.smashingmagazine.com/2015/03/fun-with-physics-in-data-visualization/)

---
*Feature research for: VN Stock Bubbles -- Interactive Bubble Chart Stock Market Visualization*
*Researched: 2026-03-06*
