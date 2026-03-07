import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStockStore } from '../store/useStockStore';
import { useAppStore } from '../store/useAppStore';

const LOGO_URL = 'https://finance.vietstock.vn/image/';

function exchangeBadge(exchange: string): string {
  switch (exchange) {
    case 'HOSE': return 'bg-blue-500/20 text-blue-400';
    case 'HNX': return 'bg-amber-500/20 text-amber-400';
    case 'UPCOM': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-white/10 text-white/60';
  }
}

export function SearchDropdown() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const stocks = useStockStore(s => s.stocks);
  const setSelectedStock = useAppStore(s => s.setSelectedStock);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const topByMarketCap = useMemo(
    () => [...stocks].sort((a, b) => b.marketCap - a.marketCap).slice(0, 10),
    [stocks],
  );

  const results = useMemo(() =>
    query.length > 0
      ? stocks.filter(s =>
          s.ticker.toLowerCase().includes(query.toLowerCase()) ||
          s.companyName.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 30)
      : topByMarketCap,
    [query, stocks, topByMarketCap],
  );

  // Position panel below input
  useEffect(() => {
    if (!isOpen || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: 8,
        right: 8,
        zIndex: 50,
      });
    } else {
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 288), // 288 = w-72
        width: 288,
        zIndex: 50,
      });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (inputRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const onLogoError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).style.display = 'none';
  }, []);

  return (
    <>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Tìm mã cổ phiếu..."
          className="h-7 w-28 rounded-lg border border-white/15 bg-white/10 pl-7 pr-2 text-[16px] text-white placeholder-white/40 outline-none transition-colors focus:border-[#22ec6c]/40 focus:bg-white/15 sm:h-9 sm:w-64 sm:pl-8 sm:text-sm"
        />
      </div>
      {isOpen && results.length > 0 && createPortal(
        <div ref={panelRef} style={panelStyle} className="max-h-96 overflow-y-auto rounded-lg border border-white/15 bg-[#1e1e1e] shadow-2xl">
          {query.length === 0 && (
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Top vốn hóa
            </div>
          )}
          {results.map(s => (
            <button
              key={s.ticker}
              type="button"
              onClick={() => {
                setSelectedStock(s);
                setIsOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/10 sm:py-2"
            >
              <img
                src={`${LOGO_URL}${s.ticker}`}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full bg-white/5 object-contain"
                onError={onLogoError}
              />
              <span className="w-12 shrink-0 text-sm font-bold text-white">{s.ticker}</span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${exchangeBadge(s.exchange)}`}>
                {s.exchange}
              </span>
              <span className={`ml-auto shrink-0 text-xs font-medium ${s.changeDay > 0 ? 'text-[#22ec6c]' : s.changeDay < 0 ? 'text-[#ff4136]' : 'text-[#ffc107]'}`}>
                {s.changeDay > 0 ? '+' : ''}{s.changeDay.toFixed(2)}%
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
