import { useAppStore } from '../store/useAppStore';
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
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  return (
    <header className="shrink-0 bg-[#0d0d0d]">
      {/* Row 1: Logo + Search */}
      <div className="flex h-11 items-center justify-between px-2 sm:h-12 sm:px-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <BubbleLogo />
          <span className="hidden text-lg font-bold text-white sm:inline">VN Stock Bubbles</span>
          <span className="text-sm font-bold text-white sm:hidden">VNSB</span>
        </div>

        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã cổ phiếu..."
            className="h-8 w-36 rounded-md border border-white/10 bg-white/5 pl-8 pr-2 text-xs text-white placeholder-white/30 outline-none transition-colors focus:border-white/25 focus:bg-white/8 sm:h-9 sm:w-56 sm:text-sm"
          />
        </div>
      </div>

      {/* Row 2: Timeframe tabs */}
      <nav className="flex items-center gap-0.5 border-t border-white/5 px-2 py-1.5 sm:gap-1 sm:px-4">
        {TIMEFRAME_TABS.map((tab) => {
          const isSelected = selectedTimeframe === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTimeframe(tab.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3.5 sm:py-1.5 sm:text-sm ${
                isSelected
                  ? 'bg-[#22ec6c]/15 text-[#22ec6c] border border-[#22ec6c]/30'
                  : 'text-white/50 hover:text-white/80 border border-transparent hover:border-white/10'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
