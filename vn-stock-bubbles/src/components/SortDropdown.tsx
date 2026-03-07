import { createPortal } from 'react-dom';
import { useAppStore } from '../store/useAppStore';
import { useDropdown } from '../hooks/useDropdown';
import type { SortBy } from '../types/stock';

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'default', label: 'Mặc định' },
  { key: 'marketCap', label: 'Vốn hóa' },
  { key: 'change', label: 'Biến động %' },
  { key: 'price', label: 'Giá' },
  { key: 'volume', label: 'Khối lượng' },
];

export function SortDropdown() {
  const { isOpen, toggle, close, buttonRef, panelRef, panelStyle } = useDropdown();
  const sortBy = useAppStore(s => s.sortBy);
  const setSortBy = useAppStore(s => s.setSortBy);

  const currentLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label || 'Sắp xếp';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm ${
          sortBy !== 'default'
            ? 'border-[#22ec6c]/40 bg-[#22ec6c]/15 text-[#22ec6c]'
            : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
        }`}
      >
        {currentLabel}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:h-[10px] sm:w-[10px]">
          <polyline points={isOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>
      {isOpen && createPortal(
        <div ref={panelRef} style={panelStyle} className="rounded-lg border border-white/15 bg-[#1e1e1e] shadow-2xl">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { setSortBy(opt.key); close(); }}
              className={`flex w-full items-center px-3 py-2.5 text-left text-xs transition-colors sm:py-2 sm:text-sm ${
                sortBy === opt.key ? 'bg-[#22ec6c]/15 text-[#22ec6c]' : 'text-white hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
