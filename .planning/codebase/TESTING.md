# Testing Patterns

**Analysis Date:** 2026-03-06

## Test Framework

**Runner:**
- None. No test framework is configured.
- No `package.json`, `jest.config.*`, `vitest.config.*`, `cypress.config.*`, or `playwright.config.*` exists.

**Assertion Library:**
- None.

**Run Commands:**
```bash
# No test commands available. No package.json or test runner configured.
```

## Test File Organization

**Location:**
- No test files exist in the project.
- The `test_v*.png` files (e.g., `test_v1.png` through `test_v9.png`) are visual screenshots used for manual comparison, not automated test artifacts.

**Naming:**
- Not applicable.

## Test Structure

**No automated tests exist.** The project relies entirely on manual browser testing, evidenced by 8 screenshot files (`test_v1.png` through `test_v9.png`, skipping v5) stored in the project root.

## Mocking

**Framework:** None.

**Built-in Mock Data:**
The application includes a built-in mock data fallback in `script.js` lines 346-409:

```javascript
// script.js - mockData() function
function mockData() {
    const rn = m => +(((Math.random() - 0.5) * 2 * m).toFixed(2));
    const coins = [
        ['bitcoin','btc','Bitcoin',1250e9,68500],
        // ... 100 coins total
    ];
    return coins.map(([id, symbol, name, mcap, price]) => ({
        id, symbol, name, market_cap: mcap, current_price: price, image: '',
        price_change_percentage_1h_in_currency: rn(4),
        price_change_percentage_24h_in_currency: rn(8),
        price_change_percentage_7d_in_currency: rn(14),
        price_change_percentage_30d_in_currency: rn(25),
        price_change_percentage_1y_in_currency: rn(100),
    }));
}
```

This `mockData()` function is invoked automatically when the CoinGecko API is unavailable (`script.js` line 88). It generates 100 mock cryptocurrency entries with randomized price change percentages. This serves as both an offline development aid and a graceful degradation path.

## Fixtures and Factories

**Test Data:**
- The `mockData()` function in `script.js` (lines 346-409) acts as both a runtime fallback and de facto test data factory.
- Mock data covers 100 cryptocurrencies with realistic market caps and prices.
- Price change percentages are randomly generated within configurable ranges.

**Location:**
- Inline in `script.js` (no separate fixtures directory).

## Coverage

**Requirements:** None enforced. No coverage tooling.

**View Coverage:**
```bash
# Not available. No coverage tool configured.
```

## Test Types

**Unit Tests:**
- None. Functions like `fmtPrice()`, `fmtCap()`, and `esc()` in `script.js` (lines 330-343) are pure functions that would be straightforward to unit test, but no tests exist.

**Integration Tests:**
- None.

**E2E Tests:**
- None. Manual visual testing via screenshots only.

**Visual/Manual Testing:**
- 8 screenshot files in project root document visual iterations:
  - `test_v1.png`, `test_v2.png`, `test_v3.png`, `test_v4.png`
  - `test_v6.png`, `test_v7.png`, `test_v8.png`, `test_v9.png`
- No `test_v5.png` exists (likely skipped or deleted).

## Recommendations for Adding Tests

If adding automated testing to this project, the recommended approach:

**1. Add a package.json and test runner:**
```bash
npm init -y
npm install --save-dev vitest jsdom
```

**2. Extract testable functions from `script.js`:**
The following pure functions are immediately testable without DOM mocking:
- `fmtPrice(p)` at `script.js` line 330 - Price formatting
- `fmtCap(c)` at `script.js` line 336 - Market cap formatting
- `esc(s)` at `script.js` line 343 - HTML escaping (requires DOM)
- `mockData()` at `script.js` line 346 - Mock data generation

**3. Suggested test file location:**
- Co-locate: `script.test.js` alongside `script.js`
- Or separate: `tests/script.test.js`

**4. DOM-dependent functions requiring jsdom or browser environment:**
- `fetchData()` - Network + DOM (image preloading)
- `layout()` - DOM measurements + D3 simulation
- `draw()` / `drawBubble()` - Canvas 2D context
- `showTip()` / `moveTip()` / `hideTip()` - DOM manipulation
- `bindEvents()` - Event listener registration

**5. Suggested first tests (highest value, lowest effort):**
```javascript
// Example: script.test.js
import { describe, it, expect } from 'vitest';

describe('fmtPrice', () => {
    it('formats null as em dash', () => {
        expect(fmtPrice(null)).toBe('\u2014');
    });
    it('formats large prices with 2 decimals', () => {
        expect(fmtPrice(68500)).toMatch(/^\$68,500\.00$/);
    });
    it('formats small prices with 4 decimals', () => {
        expect(fmtPrice(0.05)).toBe('$0.0500');
    });
    it('formats very small prices with 3 significant digits', () => {
        expect(fmtPrice(0.000022)).toBe('$0.0000220');
    });
});

describe('fmtCap', () => {
    it('formats trillions', () => {
        expect(fmtCap(1.25e12)).toBe('$1.25T');
    });
    it('formats billions', () => {
        expect(fmtCap(410e9)).toBe('$410.00B');
    });
    it('formats millions', () => {
        expect(fmtCap(5.5e6)).toBe('$5.5M');
    });
});
```

Note: The current single-file architecture with module-level globals makes testing difficult. Functions would need to be exported as ES modules or refactored to accept dependencies as parameters.

---

*Testing analysis: 2026-03-06*
