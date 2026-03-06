import type { StockData } from '../types/stock';

const CACHE_KEY = 'vnstock_data';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes — skip fetch entirely if fresh

interface CacheEntry {
  stocks: StockData[];
  timestamp: number;
}

export function getCachedStocks(): { stocks: StockData[]; isFresh: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (!entry.stocks?.length) return null;
    const age = Date.now() - entry.timestamp;
    return { stocks: entry.stocks, isFresh: age < CACHE_TTL };
  } catch {
    return null;
  }
}

export function setCachedStocks(stocks: StockData[]): void {
  try {
    const entry: CacheEntry = { stocks, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — ignore
  }
}
