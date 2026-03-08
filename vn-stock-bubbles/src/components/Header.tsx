import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useStockStore } from '../store/useStockStore';
import { SearchDropdown } from './SearchDropdown';
import { PageFilterDropdown } from './PageFilterDropdown';
import { IndustryFilterDropdown } from './IndustryFilterDropdown';
import { SortDropdown } from './SortDropdown';
import type { Timeframe } from '../types/stock';

const TIMEFRAME_TABS: { key: Timeframe; label: string }[] = [
  { key: 'day', label: 'Ngày' },
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
  { key: 'year', label: 'Năm' },
];

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
  const mobileView = useAppStore((s) => s.mobileView);
  const marketSummary = useStockStore((s) => s.marketSummary);
  const stocks = useStockStore((s) => s.stocks);
  const enriching = useStockStore((s) => s.enriching);
  const isEnriched = useStockStore((s) => s.isEnriched);
  const isMobileTable = mobileView === 'table';

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
      {/* Row 1: Logo + Search | VN-Index */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 sm:gap-3 sm:px-5 sm:py-2">
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <BubbleLogo />
            <span className="hidden text-base font-bold text-white sm:inline">VN Bubble</span>
          </div>
          <SearchDropdown />
        </div>

        {/* Right: VN-Index + GTGD (hidden on mobile table view) */}
        <div className={`flex items-center gap-1.5 text-[10px] sm:gap-5 sm:text-sm ${isMobileTable ? 'hidden sm:flex' : ''}`}>
          {marketSummary && marketSummary.vnIndexValue > 0 && (
            <div className="flex items-center gap-1 sm:gap-1.5">
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

      {/* Row 2: Timeframe tabs + Filters + Stats — hidden on mobile table view */}
      <div className={`flex items-center justify-between border-t border-white/10 px-2 py-1 sm:px-5 sm:py-1.5 ${isMobileTable ? 'hidden sm:flex' : ''}`}>
        {/* Left: scrollable strip of tabs + filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none sm:gap-2">
          {/* Timeframe tabs */}
          <nav className="flex shrink-0 items-center gap-1">
            {TIMEFRAME_TABS.map((tab) => {
              const isSelected = selectedTimeframe === tab.key;
              const needsEnrich = tab.key !== 'day';
              const disabled = needsEnrich && !isEnriched;
              const avg = avgByTimeframe[tab.key];
              const borderColor = avg >= 0 ? 'border-[#22ec6c]' : 'border-[#ff4136]';
              return (
                <button
                  key={tab.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setTimeframe(tab.key)}
                  className={`relative rounded-md border-2 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-colors sm:px-3 sm:py-1 sm:text-sm ${
                    isSelected
                      ? `bg-[#22ec6c] text-[#1a1a1a] border-[#22ec6c]`
                      : disabled
                        ? 'border-white/10 text-white/20 cursor-not-allowed'
                        : `${borderColor} text-white/60 hover:bg-white/10 hover:text-white`
                  }`}
                >
                  {tab.label}
                  {disabled && enriching && (
                    <span className="ml-1 inline-block h-2 w-2 animate-spin rounded-full border border-white/20 border-t-white/60 sm:h-2.5 sm:w-2.5" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="h-4 w-px shrink-0 bg-white/15" />

          {/* Filter controls */}
          <div className="flex shrink-0 items-center gap-1.5">
            <PageFilterDropdown />
            <IndustryFilterDropdown />
            <SortDropdown />
          </div>
        </div>

        {/* Right: Up/Down/Flat */}
        <div className="flex shrink-0 items-center gap-2 pl-2 sm:gap-5">
          {marketSummary && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium sm:gap-2 sm:text-sm">
              <span className="text-[#22ec6c]">↑{marketSummary.upCount}</span>
              <span className="text-[#ff4136]">↓{marketSummary.downCount}</span>
              <span className="text-[#ffc107]">→{marketSummary.flatCount}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
