import { useMemo } from 'react';
import { useStockStore } from '../store/useStockStore';
import { useAppStore } from '../store/useAppStore';
import type { StockData, Timeframe } from '../types/stock';

function getChange(s: StockData, tf: Timeframe): number {
  switch (tf) {
    case 'day': return s.changeDay;
    case 'week': return s.changeWeek;
    case 'month': return s.changeMonth;
    case 'year': return s.changeYear;
  }
}

/** Returns all stocks after applying industry filter + sort (before pagination). */
export function useFilteredStocks(): StockData[] {
  const allStocks = useStockStore(s => s.stocks);
  const selectedIndustry = useAppStore(s => s.selectedIndustry);
  const sortBy = useAppStore(s => s.sortBy);
  const selectedTimeframe = useAppStore(s => s.selectedTimeframe);

  return useMemo(() => {
    let result = allStocks;

    // Filter by industry
    if (selectedIndustry !== 'all') {
      result = result.filter(s => s.industry === selectedIndustry);
    }

    // Sort
    if (sortBy !== 'default') {
      result = [...result].sort((a, b) => {
        switch (sortBy) {
          case 'marketCap': return b.marketCap - a.marketCap;
          case 'change': return Math.abs(getChange(b, selectedTimeframe)) - Math.abs(getChange(a, selectedTimeframe));
          case 'price': return b.price - a.price;
          case 'volume': return b.volume - a.volume;
          default: return 0;
        }
      });
    }

    return result;
  }, [allStocks, selectedIndustry, sortBy, selectedTimeframe]);
}
