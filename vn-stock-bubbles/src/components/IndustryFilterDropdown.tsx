import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ALL_INDUSTRIES } from '../data/industries';
import type { Industry } from '../types/stock';

export function IndustryFilterDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedIndustry = useAppStore(s => s.selectedIndustry);
  const setIndustry = useAppStore(s => s.setIndustry);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const label = selectedIndustry === 'all' ? 'Ngành' : selectedIndustry;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
      {isOpen && (
        <div className="fixed inset-x-2 top-auto z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/15 bg-[#1e1e1e] shadow-2xl sm:absolute sm:inset-x-auto sm:left-0 sm:w-auto sm:min-w-[180px] sm:max-h-80">
          <button
            type="button"
            onClick={() => { setIndustry('all'); setIsOpen(false); }}
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
              onClick={() => { setIndustry(ind as Industry); setIsOpen(false); }}
              className={`flex w-full items-center px-3 py-2.5 text-left text-xs transition-colors sm:py-2 sm:text-sm ${
                selectedIndustry === ind ? 'bg-[#22ec6c]/15 text-[#22ec6c]' : 'text-white hover:bg-white/10'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
