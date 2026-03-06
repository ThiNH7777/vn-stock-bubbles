import { create } from 'zustand';
import type { StockData, MarketSummary } from '../types/stock';
import { fetchStockData } from '../api/stockApi';
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

    // 2. Fetch fresh data (in background if we already have cache)
    set(s => ({ loading: !s.isRealData, error: null }));
    try {
      const result = await fetchStockData();
      if (result.stocks.length > 0) {
        setCachedStocks(result.stocks, result.marketSummary);
        set({ stocks: result.stocks, marketSummary: result.marketSummary, loading: false, isRealData: true });
      } else {
        set({ loading: false, error: 'No data returned' });
      }
    } catch (e) {
      console.error('Failed to load real stock data:', e);
      // If we have cached data already showing, just stop loading
      if (get().isRealData) {
        set({ loading: false });
      } else {
        set({ loading: false, error: (e as Error).message });
      }
    }
  },
}));
