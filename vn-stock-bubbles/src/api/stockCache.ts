import type { StockData, MarketSummary } from '../types/stock';
import { getIndustry } from '../data/industries';

const CACHE_KEY = 'vnstock_data';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes — skip fetch entirely if fresh

interface CacheEntry {
  stocks: StockData[];
  marketSummary: MarketSummary | null;
  timestamp: number;
}

export function getCachedStocks(): { stocks: StockData[]; marketSummary: MarketSummary | null; isFresh: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (!entry.stocks?.length) return null;
    // Backfill industry for old cached data
    for (const s of entry.stocks) {
      if (!s.industry) s.industry = getIndustry(s.ticker);
    }
    const age = Date.now() - entry.timestamp;
    return { stocks: entry.stocks, marketSummary: entry.marketSummary ?? null, isFresh: age < CACHE_TTL };
  } catch {
    return null;
  }
}

export function setCachedStocks(stocks: StockData[], marketSummary: MarketSummary | null): void {
  try {
    const entry: CacheEntry = { stocks, marketSummary, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — ignore
  }
}
