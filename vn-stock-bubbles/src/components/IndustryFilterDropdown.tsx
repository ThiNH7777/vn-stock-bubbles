import { createPortal } from 'react-dom';
import { useAppStore } from '../store/useAppStore';
import { useDropdown } from '../hooks/useDropdown';
import { ALL_INDUSTRIES } from '../data/industries';
import type { Industry } from '../types/stock';

export function IndustryFilterDropdown() {
  const { isOpen, toggle, close, buttonRef, panelRef, panelStyle } = useDropdown();
  const selectedIndustry = useAppStore(s => s.selectedIndustry);
  const setIndustry = useAppStore(s => s.setIndustry);

  const label = selectedIndustry === 'all' ? 'Ngành' : selectedIndustry;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm ${
          selectedIndustry !== 'all'
            ? 'border-[#22ec6c]/40 bg-[#22ec6c]/15 text-[#22ec6c]'
            : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
        }`}
      >
        {label}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:h-[10px] sm:w-[10px]">
          <polyline points={isOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>
      {isOpen && createPortal(
        <div ref={panelRef} style={panelStyle} className="max-h-64 overflow-y-auto rounded-lg border border-white/15 bg-[#1e1e1e] shadow-2xl sm:max-h-80">
          <button
            type="button"
            onClick={() => { setIndustry('all'); close(); }}
            className={`flex w-full items-center px-3 py-2.5 text-left text-xs transition-colors sm:py-2 sm:text-sm ${
              selectedIndustry === 'all' ? 'bg-[#22ec6c]/15 text-[#22ec6c]' : 'text-white hover:bg-white/10'
            }`}
          >
            Tất cả ngành
          </button>
          {ALL_INDUSTRIES.map(ind => (
            <button
              key={ind}
              type="button"
              onClick={() => { setIndustry(ind as Industry); close(); }}
              className={`flex w-full items-center px-3 py-2.5 text-left text-xs transition-colors sm:py-2 sm:text-sm ${
                selectedIndustry === ind ? 'bg-[#22ec6c]/15 text-[#22ec6c]' : 'text-white hover:bg-white/10'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
