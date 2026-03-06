import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useStockStore } from '../store/useStockStore';
import { SearchDropdown } from './SearchDropdown';
import { PageFilterDropdown } from './PageFilterDropdown';
import type { Timeframe, StockData } from '../types/stock';

const TIMEFRAME_TABS: { key: Timeframe; label: string }[] = [
  { key: 'day', label: 'Ngày' },
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
  { key: 'year', label: 'Năm' },
];

function getChange(stock: StockData, tf: Timeframe): number {
  switch (tf) {
    case 'day': return stock.changeDay;
    case 'week': return stock.changeWeek;
    case 'month': return stock.changeMonth;
    case 'year': return stock.changeYear;
  }
}

function BubbleLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="16" r="10" fill="#22ec6c" opacity="0.6" />
      <circle cx="21" cy="12" r="7" fill="#22ec6c" opacity="0.45" />
      <circle cx="20" cy="22" r="6" fill="#22ec6c" opacity="0.35" />
    </svg>
  );
}

export function Header() {
  const selectedTimeframe = useAppStore((s) => s.selectedTimeframe);
  const setTimeframe = useAppStore((s) => s.setTimeframe);
  const marketSummary = useStockStore((s) => s.marketSummary);
  const stocks = useStockStore((s) => s.stocks);

  // Average change per timeframe (for tab border color)
  const avgByTimeframe = useMemo(() => {
    const top = stocks.slice(0, 100);
    if (top.length === 0) return { day: 0, week: 0, month: 0, year: 0 };
    const sum = { day: 0, week: 0, month: 0, year: 0 };
    for (const s of top) {
      sum.day += s.changeDay;
      sum.week += s.changeWeek;
      sum.month += s.changeMonth;
      sum.year += s.changeYear;
    }
    const n = top.length;
    return { day: sum.day / n, week: sum.week / n, month: sum.month / n, year: sum.year / n };
  }, [stocks]);

  return (
    <header className="shrink-0 bg-[#2a2a2a]">
      {/* Row 1: Logo + Timeframe tabs + Market info */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-5">
        {/* Left: Logo + Tabs */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <BubbleLogo />
            <span className="hidden text-base font-bold text-white sm:inline">VN Bubble</span>
            <span className="text-sm font-bold text-white sm:hidden">VNB</span>
          </div>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            {TIMEFRAME_TABS.map((tab) => {
              const isSelected = selectedTimeframe === tab.key;
              const avg = avgByTimeframe[tab.key];
              const borderColor = avg >= 0 ? 'border-[#22ec6c]' : 'border-[#ff4136]';
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTimeframe(tab.key)}
                  className={`rounded-md border-2 px-2 py-0.5 text-xs font-semibold transition-colors sm:px-3 sm:py-1 sm:text-sm ${
                    isSelected
                      ? `bg-[#22ec6c] text-[#1a1a1a] border-[#22ec6c]`
                      : `${borderColor} text-white/60 hover:bg-white/10 hover:text-white`
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Market info */}
        <div className="flex items-center gap-3 text-xs sm:gap-5 sm:text-sm">
          {marketSummary && marketSummary.vnIndexValue > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="hidden text-white/50 sm:inline">VN-Index</span>
              <span className="font-bold text-white">{marketSummary.vnIndexValue.toLocaleString()}</span>
              <span className={`font-medium ${marketSummary.vnIndexChangePercent >= 0 ? 'text-[#22ec6c]' : 'text-[#ff4136]'}`}>
                {marketSummary.vnIndexChangePercent >= 0 ? '▲' : '▼'}{Math.abs(marketSummary.vnIndexChangePercent)}%
              </span>
            </div>
          )}
          {marketSummary && marketSummary.gtgd > 0 && (
            <div className="hidden items-center gap-1 sm:flex">
              <span className="text-white/50">GTGD</span>
              <span className="font-bold text-white">{marketSummary.gtgd.toLocaleString()}</span>
              <span className="text-white/40">Tỷ</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Stats + Legend + Search + PageFilter */}
      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-1.5 sm:px-5">
        {/* Left: Up/Down/Flat + Legend */}
        <div className="flex items-center gap-3 sm:gap-5">
          {marketSummary && (
            <div className="flex items-center gap-2 text-xs font-medium sm:text-sm">
              <span className="text-[#22ec6c]">↑{marketSummary.upCount}</span>
              <span className="text-[#ff4136]">↓{marketSummary.downCount}</span>
              <span className="text-[#ffc107]">→{marketSummary.flatCount}</span>
            </div>
          )}
          <div className="hidden items-center gap-1.5 text-[10px] text-white/40 sm:flex">
            <span className="inline-block h-2 w-2 rounded-full bg-white/30" />
            <span>Kích thước = Vốn hóa</span>
          </div>
        </div>

        {/* Right: Search + Page filter */}
        <div className="flex items-center gap-2">
          <SearchDropdown />
          <PageFilterDropdown />
        </div>
      </div>
    </header>
  );
}
