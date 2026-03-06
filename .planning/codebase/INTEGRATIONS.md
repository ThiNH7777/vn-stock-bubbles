# External Integrations

**Analysis Date:** 2026-03-06

## APIs & External Services

**Cryptocurrency Market Data:**
- CoinGecko API v3 - Fetches top 100 cryptocurrencies by market cap with price change data
  - SDK/Client: Native `fetch()` API (no SDK)
  - Auth: None required (public endpoint, no API key)
  - Base URL: `https://api.coingecko.com/api/v3/coins/markets` (hardcoded in `script.js` line 2)
  - Parameters used (`script.js` lines 77-81):
    - `vs_currency=usd`
    - `order=market_cap_desc`
    - `per_page=100`
    - `page=1`
    - `sparkline=false`
    - `price_change_percentage=1h,24h,7d,30d,1y`
  - Response fields consumed: `id`, `symbol`, `name`, `market_cap`, `current_price`, `image`, `price_change_percentage_1h_in_currency`, `price_change_percentage_24h_in_currency`, `price_change_percentage_7d_in_currency`, `price_change_percentage_30d_in_currency`, `price_change_percentage_1y_in_currency`
  - Rate limits: CoinGecko free tier allows ~10-30 calls/minute. No rate limiting logic implemented.

**CDN Dependencies:**
- D3.js served from `https://d3js.org/d3.v7.min.js` (`index.html` line 9)

**Coin Images:**
- CoinGecko-hosted images (URLs from API `image` field)
  - Loaded as `new Image()` with `crossOrigin = 'anonymous'` (`script.js` lines 92-98)
  - Drawn onto canvas as coin logos inside bubbles

## Data Storage

**Databases:**
- None - fully client-side application with no persistence

**File Storage:**
- None - no file upload/download functionality

**Caching:**
- None - data re-fetched on each page load
- Coin images cached in memory via `coinImages` object (`script.js` line 15)

## Fallback / Offline Strategy

**Mock Data:**
- When CoinGecko API is unavailable (network error or non-200 response), the app falls back to hardcoded mock data (`script.js` lines 86-89, `mockData()` function at lines 346-409)
- Mock data contains 100 cryptocurrencies with randomized price changes
- Mock data does not include image URLs (empty strings), so bubbles render without logos

## Authentication & Identity

**Auth Provider:**
- None - no user authentication, no login, no sessions

## Monitoring & Observability

**Error Tracking:**
- None - errors logged to `console.warn` only (`script.js` line 87)

**Logs:**
- `console.warn` for API failures
- No structured logging

## CI/CD & Deployment

**Hosting:**
- Not configured - static files only, deployable anywhere

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None

**Secrets location:**
- No secrets - CoinGecko public API requires no authentication

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Integration Risks

**CoinGecko API Dependency:**
- Free tier rate limits may cause failures under heavy use or if multiple users load simultaneously
- No retry logic implemented - single fetch attempt, then fallback to mock data
- API URL is hardcoded with no configuration mechanism to switch endpoints
- No caching strategy means every page load hits the API

**CDN Dependency:**
- D3.js loaded from `d3js.org` CDN - if CDN is down, the entire application breaks (no local fallback)
- No subresource integrity (SRI) hash on the D3 `<script>` tag

---

*Integration audit: 2026-03-06*
