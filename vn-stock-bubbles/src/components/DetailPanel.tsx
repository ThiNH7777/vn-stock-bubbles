import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DetailChart } from './DetailChart';
import type { ChartPeriod } from './DetailChart';
import type { StockData } from '../types/stock';

// Format price in VND (price field is thousands of VND)
function formatVND(priceThousands: number): string {
  const fullVND = Math.round(priceThousands * 1000);
  return new Intl.NumberFormat('vi-VN').format(fullVND) + 'd';
}

// Format market cap (billions VND)
function formatMarketCap(billionsVND: number): string {
  if (billionsVND >= 1000) {
    return (billionsVND / 1000).toFixed(1) + 'T';
  }
  return billionsVND.toLocaleString('vi-VN') + 'B';
}

// Format volume (number of shares)
function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(1) + 'K';
  return vol.toLocaleString('vi-VN');
}

// Exchange badge color
function exchangeColor(exchange: string): string {
  switch (exchange) {
    case 'HOSE': return 'bg-blue-500/20 text-blue-400';
    case 'HNX': return 'bg-amber-500/20 text-amber-400';
    case 'UPCOM': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-white/10 text-white/60';
  }
}

// Change color
function changeColor(val: number): string {
  if (val > 0) return 'text-green-400';
  if (val < 0) return 'text-red-400';
  return 'text-yellow-400';
}

function changeBgColor(val: number): string {
  if (val > 0) return 'bg-green-500/15';
  if (val < 0) return 'bg-red-500/15';
  return 'bg-yellow-500/15';
}

interface TimeframeInfo {
  label: string;
  key: keyof Pick<StockData, 'changeDay' | 'changeWeek' | 'changeMonth' | 'changeYear'>;
  period: ChartPeriod;
}

const TIMEFRAMES: TimeframeInfo[] = [
  { label: 'Day', key: 'changeDay', period: 'day' },
  { label: 'Week', key: 'changeWeek', period: 'week' },
  { label: 'Month', key: 'changeMonth', period: 'month' },
  { label: 'Year', key: 'changeYear', period: 'year' },
];

export function DetailPanel() {
  const selectedStock = useAppStore(s => s.selectedStock);
  const setSelectedStock = useAppStore(s => s.setSelectedStock);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('year');

  // Swipe-down gesture refs
  const panelRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef({
    startY: 0,
    currentY: 0,
    swiping: false,
  });

  const close = useCallback(() => {
    setSelectedStock(null);
  }, [setSelectedStock]);

  // Swipe handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    // Only activate swipe if panel content is scrolled to top
    if (panel.scrollTop > 0) return;
    swipeRef.current.startY = e.touches[0]!.clientY;
    swipeRef.current.swiping = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current.swiping) return;
    const panel = panelRef.current;
    if (!panel) return;

    const deltaY = e.touches[0]!.clientY - swipeRef.current.startY;
    if (deltaY <= 0) {
      // Swiping up -- reset
      panel.style.transform = '';
      panel.style.opacity = '';
      return;
    }

    // Moving down -- translate panel
    panel.style.transition = 'none';
    panel.style.transform = `translateY(${deltaY}px)`;
    panel.style.opacity = `${Math.max(0.3, 1 - deltaY / 400)}`;
    swipeRef.current.currentY = e.touches[0]!.clientY;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!swipeRef.current.swiping) return;
    swipeRef.current.swiping = false;
    const panel = panelRef.current;
    if (!panel) return;

    const deltaY = swipeRef.current.currentY - swipeRef.current.startY;
    if (deltaY > 100) {
      // Dismiss
      panel.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      panel.style.transform = 'translateY(100%)';
      panel.style.opacity = '0';
      setTimeout(close, 200);
    } else {
      // Snap back
      panel.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
      panel.style.transform = '';
      panel.style.opacity = '';
    }
  }, [close]);

  // Logo error handling
  const onLogoError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).style.display = 'none';
  }, []);

  // Compute 52-week high/low from chart data -- we show N/A since we don't have
  // synchronous access to chart data here (it's fetched inside DetailChart)
  // The High/Low annotations are shown on the chart itself

  // Vietstock URL
  const vietStockUrl = useMemo(() => {
    if (!selectedStock) return '';
    return `https://finance.vietstock.vn/${selectedStock.ticker}/ho-so-doanh-nghiep.htm`;
  }, [selectedStock]);

  // ESC key to close
  useEffect(() => {
    if (!selectedStock) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedStock, close]);

  if (!selectedStock) return null;

  const stock = selectedStock;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop -- click to close, no blur so bubbles stay visible */}
      <div
        className="absolute inset-0"
        onClick={close}
      />

      {/* Panel container */}
      <div className="flex justify-center sm:pt-8 pointer-events-none">
        <div
          ref={panelRef}
          className="pointer-events-auto w-full max-w-[480px] max-h-[85vh] overflow-y-auto
            bg-[#1e1e1e]/50 backdrop-blur-xl border border-white/10 shadow-2xl
            rounded-b-xl sm:rounded-xl"
          style={{ animation: 'slide-down 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Swipe indicator (mobile) */}
          <div className="flex justify-center pt-2 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            {/* Logo */}
            <img
              src={`https://finance.vietstock.vn/image/${stock.ticker}`}
              alt={stock.ticker}
              className="w-10 h-10 rounded-full bg-white/5 object-contain"
              onError={onLogoError}
            />

            {/* Ticker + Company */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{stock.ticker}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${exchangeColor(stock.exchange)}`}>
                  {stock.exchange}
                </span>
              </div>
              <p className="text-xs text-white/50 truncate">{stock.companyName}</p>
            </div>

            {/* Close button */}
            <button
              onClick={close}
              className="flex items-center justify-center w-8 h-8 rounded-full
                bg-white/5 hover:bg-white/15 text-white/60 hover:text-white
                transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Price */}
          <div className="px-4 pt-1 pb-2">
            <span className="text-2xl font-bold text-white">{formatVND(stock.price)}</span>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 px-4 pb-3 text-xs">
            <div>
              <span className="text-white/40">Market Cap</span>
              <p className="text-white/80 font-medium">{formatMarketCap(stock.marketCap)} VND</p>
            </div>
            <div>
              <span className="text-white/40">Volume</span>
              <p className="text-white/80 font-medium">{stock.volume ? formatVolume(stock.volume) : 'N/A'}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-white/5" />

          {/* Area Chart */}
          <div className="px-4 py-3">
            <DetailChart ticker={stock.ticker} period={chartPeriod} />
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-white/5" />

          {/* Timeframe % change tabs — click to switch chart period */}
          <div className="grid grid-cols-4 gap-2 px-4 py-3">
            {TIMEFRAMES.map((tf) => {
              const val = stock[tf.key];
              const sign = val > 0 ? '+' : '';
              const isActive = chartPeriod === tf.period;
              return (
                <button
                  key={tf.key}
                  onClick={() => setChartPeriod(tf.period)}
                  className={`flex flex-col items-center py-2 rounded-lg cursor-pointer transition-all
                    ${isActive ? 'ring-1 ring-white/30 ' + changeBgColor(val) : changeBgColor(val) + ' opacity-60 hover:opacity-90'}`}
                >
                  <span className={`text-[10px] font-medium ${isActive ? 'text-white/80' : 'text-white/50'}`}>{tf.label}</span>
                  <span className={`text-sm font-bold ${changeColor(val)}`}>
                    {sign}{val.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Vietstock link */}
          <div className="px-4 pb-4 pt-1">
            <a
              href={vietStockUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-white/40
                hover:text-white/70 transition-colors"
            >
              <span>View on Vietstock</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M3 1h6v6M9 1L1 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
