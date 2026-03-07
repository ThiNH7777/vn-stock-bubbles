import { create } from 'zustand';
import type { Timeframe, Exchange, Industry, SortBy, StockData } from '../types/stock';

interface AppState {
  selectedTimeframe: Timeframe;
  selectedExchange: Exchange;
  selectedIndustry: Industry | 'all';
  sortBy: SortBy;
  searchQuery: string;
  selectedStock: StockData | null;
  currentPage: number;
  setTimeframe: (tf: Timeframe) => void;
  setExchange: (ex: Exchange) => void;
  setIndustry: (ind: Industry | 'all') => void;
  setSortBy: (sort: SortBy) => void;
  setSearchQuery: (q: string) => void;
  setSelectedStock: (stock: StockData | null) => void;
  setCurrentPage: (page: number) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedTimeframe: 'day',
  selectedExchange: 'all',
  selectedIndustry: 'all',
  sortBy: 'default',
  searchQuery: '',
  selectedStock: null,
  currentPage: 0,
  setTimeframe: (tf) => set({ selectedTimeframe: tf }),
  setExchange: (ex) => set({ selectedExchange: ex }),
  setIndustry: (ind) => set({ selectedIndustry: ind, currentPage: 0 }),
  setSortBy: (sort) => set({ sortBy: sort, currentPage: 0 }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedStock: (stock) => set({ selectedStock: stock }),
  setCurrentPage: (page) => set({ currentPage: page }),
}));
