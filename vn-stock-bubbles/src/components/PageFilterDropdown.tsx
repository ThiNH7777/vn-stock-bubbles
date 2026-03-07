import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useFilteredStocks } from '../hooks/useFilteredStocks';
import type { StockData, Timeframe } from '../types/stock';

function getChange(stock: StockData, tf: Timeframe): number {
  switch (tf) {
    case 'day': return stock.changeDay;
    case 'week': return stock.changeWeek;
    case 'month': return stock.changeMonth;
    case 'year': return stock.changeYear;
  }
}

function avgChange(stocks: StockData[], tf: Timeframe): number {
  if (stocks.length === 0) return 0;
  let sum = 0;
  for (const s of stocks) sum += getChange(s, tf);
  return sum / stocks.length;
}

export function PageFilterDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stocks = useFilteredStocks();
  const currentPage = useAppStore(s => s.currentPage);
  const setCurrentPage = useAppStore(s => s.setCurrentPage);
  const selectedTimeframe = useAppStore(s => s.selectedTimeframe);

  const pages = useMemo(() => {
    const result = [];
    const maxStocks = Math.min(stocks.length, 1000);
    const totalPages = Math.ceil(maxStocks / 100);
    for (let i = 0; i < totalPages; i++) {
      const pageStocks = stocks.slice(i * 100, Math.min((i + 1) * 100, maxStocks));
      result.push({
        index: i,
        label: `${i * 100 + 1} - ${Math.min((i + 1) * 100, maxStocks)}`,
        avgChange: avgChange(pageStocks, selectedTimeframe),
        count: pageStocks.length,
      });
    }
    return result;
  }, [stocks, selectedTimeframe]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLabel = pages[currentPage]?.label || '1 - 100';

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/15 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm"
      >
        {currentLabel}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:h-[10px] sm:w-[10px]">
          <polyline points={isOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>
      {isOpen && (
        <div className="fixed inset-x-2 top-auto z-50 mt-1 rounded-lg border border-white/15 bg-[#1e1e1e] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:w-auto sm:min-w-[220px]">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Pages
          </div>
          {pages.map(p => {
            const isActive = p.index === currentPage;
            const avg = p.avgChange;
            return (
              <button
                key={p.index}
                type="button"
                onClick={() => { setCurrentPage(p.index); setIsOpen(false); }}
                className={`flex w-full items-center justify-between gap-4 px-3 py-2 text-left transition-colors ${
                  isActive ? 'bg-[#22ec6c]/15 text-[#22ec6c]' : 'text-white hover:bg-white/10'
                }`}
              >
                <span className="text-sm font-medium">{p.label}</span>
                <span className={`text-xs font-medium ${avg >= 0 ? 'text-[#22ec6c]' : 'text-[#ff4136]'}`}>
                  {avg > 0 ? '+' : ''}{avg.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
