import { create } from 'zustand';
import type { StockData, MarketSummary } from '../types/stock';
import { fetchStockDataFast, enrichStockData } from '../api/stockApi';
import { getCachedStocks, setCachedStocks } from '../api/stockCache';
import { MOCK_STOCKS } from '../data/mockStocks';

interface StockStore {
  stocks: StockData[];
  marketSummary: MarketSummary | null;
  loading: boolean;
  error: string | null;
  isRealData: boolean;
  loadRealData: () => Promise<void>;
}

export const useStockStore = create<StockStore>()((set, get) => ({
  stocks: MOCK_STOCKS,
  marketSummary: null,
  loading: true,
  error: null,
  isRealData: false,

  loadRealData: async () => {
    // 1. Try cache first — show cached data instantly
    const cached = getCachedStocks();
    if (cached) {
      set({ stocks: cached.stocks, marketSummary: cached.marketSummary, loading: false, isRealData: true });
      // If cache is fresh (< 5 min), skip network entirely
      if (cached.isFresh) return;
    }

    // 2. Phase 1: Fast fetch (listings + prices + daily change) — show bubbles ASAP
    set(s => ({ loading: !s.isRealData, error: null }));
    try {
      const fast = await fetchStockDataFast();
      if (fast.stocks.length > 0) {
        set({ stocks: fast.stocks, marketSummary: fast.marketSummary, loading: false, isRealData: true });

        // 3. Phase 2: Enrich with historical data in background (no loading spinner)
        try {
          const enriched = await enrichStockData(fast.stocks);
          setCachedStocks(enriched, fast.marketSummary);
          set({ stocks: enriched });
        } catch (e2) {
          console.warn('Historical enrichment failed, using fast data:', e2);
          setCachedStocks(fast.stocks, fast.marketSummary);
        }
      } else {
        set({ loading: false, error: 'No data returned' });
      }
    } catch (e) {
      console.error('Failed to load real stock data:', e);
      if (get().isRealData) {
        set({ loading: false });
      } else {
        set({ loading: false, error: (e as Error).message });
      }
    }
  },
}));
