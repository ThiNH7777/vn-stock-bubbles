import { useAppStore } from '../store/useAppStore';
import type { Timeframe } from '../types/stock';

const TIMEFRAME_TABS: { key: Timeframe; label: string }[] = [
  { key: 'day', label: 'Ngay' },
  { key: 'week', label: 'Tuan' },
  { key: 'month', label: 'Thang' },
  { key: 'year', label: 'Nam' },
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
      <circle cx="12" cy="16" r="10" fill="#3b82f6" opacity="0.7" />
      <circle cx="21" cy="12" r="7" fill="#06b6d4" opacity="0.7" />
      <circle cx="20" cy="22" r="6" fill="#8b5cf6" opacity="0.7" />
    </svg>
  );
}

export function Header() {
  const selectedTimeframe = useAppStore((s) => s.selectedTimeframe);
  const setTimeframe = useAppStore((s) => s.setTimeframe);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between bg-[#0d0d0d] px-2 sm:h-14 sm:px-4">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <BubbleLogo />
        <span className="hidden text-lg font-bold text-white sm:inline">VN Stock Bubbles</span>
        <span className="text-sm font-bold text-white sm:hidden">VNSB</span>
      </div>

      <nav className="flex items-center gap-0.5 sm:gap-1">
        {TIMEFRAME_TABS.map((tab) => {
          const isSelected = selectedTimeframe === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTimeframe(tab.key)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${
                isSelected
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-white/50 hover:text-white/80 border border-transparent'
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
