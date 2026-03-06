import { create } from 'zustand';
import type { Timeframe, Exchange, StockData } from '../types/stock';

interface AppState {
  selectedTimeframe: Timeframe;
  selectedExchange: Exchange;
  searchQuery: string;
  selectedStock: StockData | null;
  currentPage: number;
  setTimeframe: (tf: Timeframe) => void;
  setExchange: (ex: Exchange) => void;
  setSearchQuery: (q: string) => void;
  setSelectedStock: (stock: StockData | null) => void;
  setCurrentPage: (page: number) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedTimeframe: 'day',
  selectedExchange: 'all',
  searchQuery: '',
  selectedStock: null,
  currentPage: 0,
  setTimeframe: (tf) => set({ selectedTimeframe: tf }),
  setExchange: (ex) => set({ selectedExchange: ex }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedStock: (stock) => set({ selectedStock: stock }),
  setCurrentPage: (page) => set({ currentPage: page }),
}));
