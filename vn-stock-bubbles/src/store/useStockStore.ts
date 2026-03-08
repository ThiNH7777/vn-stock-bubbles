import { create } from 'zustand';
import type { StockData, MarketSummary } from '../types/stock';
import { fetchStockDataFast, enrichStockData } from '../api/stockApi';
import { getCachedStocks, setCachedStocks } from '../api/stockCache';
import { MOCK_STOCKS } from '../data/mockStocks';

interface StockStore {
  stocks: StockData[];
  marketSummary: MarketSummary | null;
  loading: boolean;
  enriching: boolean;
  error: string | null;
  isRealData: boolean;
  isEnriched: boolean;
  loadRealData: () => Promise<void>;
}

export const useStockStore = create<StockStore>()((set, get) => ({
  stocks: MOCK_STOCKS,
  marketSummary: null,
  loading: true,
  enriching: false,
  error: null,
  isRealData: false,
  isEnriched: false,

  loadRealData: async () => {
    // 1. Try cache first — cached data is already enriched
    const cached = getCachedStocks();
    if (cached) {
      const hasHistorical = cached.stocks.some(s => s.changeWeek !== 0 || s.changeMonth !== 0 || s.changeYear !== 0);
      set({
        stocks: cached.stocks, marketSummary: cached.marketSummary,
        loading: false, isRealData: true, isEnriched: hasHistorical,
      });
      // If cache is fresh (< 5 min), skip network entirely
      if (cached.isFresh) return;
    }

    // 2. Phase 1: Fast fetch (listings + prices + daily change) — show bubbles ASAP
    set(s => ({ loading: !s.isRealData, error: null }));
    try {
      const fast = await fetchStockDataFast();
      if (fast.stocks.length > 0) {
        set({ stocks: fast.stocks, marketSummary: fast.marketSummary, loading: false, isRealData: true, enriching: true });

        // 3. Phase 2: Enrich with historical data in background
        try {
          const enriched = await enrichStockData(fast.stocks);
          setCachedStocks(enriched, fast.marketSummary);
          set({ stocks: enriched, enriching: false, isEnriched: true });
        } catch (e2) {
          console.warn('Historical enrichment failed, using fast data:', e2);
          setCachedStocks(fast.stocks, fast.marketSummary);
          set({ enriching: false });
        }
      } else {
        set({ loading: false, error: 'No data returned' });
      }
    } catch (e) {
      console.error('Failed to load real stock data:', e);
      set({ enriching: false });
      if (get().isRealData) {
        set({ loading: false });
      } else {
        set({ loading: false, error: (e as Error).message });
      }
    }
  },
}));
