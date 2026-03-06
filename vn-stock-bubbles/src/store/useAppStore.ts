import { create } from 'zustand';
import type { Timeframe, Exchange } from '../types/stock';

interface AppState {
  selectedTimeframe: Timeframe;
  selectedExchange: Exchange;
  searchQuery: string;
  setTimeframe: (tf: Timeframe) => void;
  setExchange: (ex: Exchange) => void;
  setSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedTimeframe: 'day',
  selectedExchange: 'all',
  searchQuery: '',
  setTimeframe: (tf) => set({ selectedTimeframe: tf }),
  setExchange: (ex) => set({ selectedExchange: ex }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
