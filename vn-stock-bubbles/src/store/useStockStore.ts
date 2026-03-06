import { create } from 'zustand';
import type { StockData } from '../types/stock';
import { fetchStockData } from '../api/stockApi';
import { getCachedStocks, setCachedStocks } from '../api/stockCache';
import { MOCK_STOCKS } from '../data/mockStocks';

interface StockStore {
  stocks: StockData[];
  loading: boolean;
  error: string | null;
  isRealData: boolean;
  loadRealData: () => Promise<void>;
}

export const useStockStore = create<StockStore>()((set, get) => ({
  stocks: MOCK_STOCKS,  // start with mock data for instant render
  loading: false,
  error: null,
  isRealData: false,

  loadRealData: async () => {
    // 1. Try cache first — show cached data instantly
    const cached = getCachedStocks();
    if (cached) {
      set({ stocks: cached.stocks, isRealData: true });
      // If cache is fresh (< 5 min), skip network entirely
      if (cached.isFresh) return;
    }

    // 2. Fetch fresh data (in background if we already have cache)
    set(s => ({ loading: !s.isRealData, error: null }));
    try {
      const stocks = await fetchStockData();
      if (stocks.length > 0) {
        setCachedStocks(stocks);
        set({ stocks, loading: false, isRealData: true });
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
