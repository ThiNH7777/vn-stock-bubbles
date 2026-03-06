import { useRef, useEffect, useState, useCallback } from 'react';
import { fetchStockHistory, fetchStockIntraday } from '../api/stockApi';

export type ChartPeriod = 'day' | 'week' | 'month' | 'year';

interface DetailChartProps {
  ticker: string;
  period: ChartPeriod;
}

interface FullData {
  closes: number[];
  highs: number[];
  lows: number[];
  timestamps: number[]; // unix seconds
  volumes: number[];
}

/** Slice full-year data to the selected period */
function sliceByPeriod(full: FullData, period: ChartPeriod): FullData {
  if (period === 'year') return full;
  const now = full.timestamps[full.timestamps.length - 1]!;
  const cutoff: Record<ChartPeriod, number> = {
    day: now - 2 * 86400,
    week: now - 7 * 86400,
    month: now - 31 * 86400,
    year: 0,
  };
  const minTs = cutoff[period];
  let startIdx = full.timestamps.findIndex(t => t >= minTs);
  if (startIdx < 0) startIdx = 0;
  // Ensure at least 2 data points
  if (full.timestamps.length - startIdx < 2) startIdx = Math.max(0, full.timestamps.length - 2);
  return {
    closes: full.closes.slice(startIdx),
    highs: full.highs.slice(startIdx),
    lows: full.lows.slice(startIdx),
    timestamps: full.timestamps.slice(startIdx),
    volumes: full.volumes.slice(startIdx),
  };
}

function formatPrice(p: number): string {
  if (p >= 1000) return (p / 1000).toFixed(1) + 'k';
  return p.toFixed(1);
}

function formatDate(unixSec: number, showTime = false): string {
  const d = new Date(unixSec * 1000);
  if (showTime) {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DetailChart({ ticker, period }: DetailChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fullData, setFullData] = useState<FullData | null>(null);
  const [intradayData, setIntradayData] = useState<FullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);

  // Fetch daily + intraday data once per ticker
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setFullData(null);
    setIntradayData(null);

    Promise.all([fetchStockHistory(ticker), fetchStockIntraday(ticker)]).then(([daily, intraday]) => {
      if (cancelled) return;
      if (!daily || daily.c.length === 0) {
        setError(true);
        setLoading(false);
        return;
      }
      setFullData({
        closes: daily.c, highs: daily.h, lows: daily.l,
        timestamps: daily.t, volumes: daily.v,
      });
      if (intraday && intraday.c.length >= 2) {
        setIntradayData({
          closes: intraday.c, highs: intraday.h, lows: intraday.l,
          timestamps: intraday.t, volumes: intraday.v,
        });
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [ticker]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fullData) return;
    // Use hourly data for day/week/month, daily for year
    const useIntraday = period !== 'year' && intradayData;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = parent.clientWidth;
    const displayH = 200;

    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const data = useIntraday ? sliceByPeriod(intradayData, period) : fullData;
    const { closes, timestamps } = data;
    if (closes.length < 2) return;

    const padLeft = 8;
    const padRight = 8;
    const padTop = 24;
    const padBottom = 24;
    const chartW = displayW - padLeft - padRight;
    const chartH = displayH - padTop - padBottom;

    let min = Infinity, max = -Infinity, minIdx = 0, maxIdx = 0;
    for (let i = 0; i < closes.length; i++) {
      if (closes[i]! < min) { min = closes[i]!; minIdx = i; }
      if (closes[i]! > max) { max = closes[i]!; maxIdx = i; }
    }
    const range = max - min || 1;

    const getX = (i: number) => padLeft + (i / (closes.length - 1)) * chartW;
    const getY = (val: number) => padTop + chartH - ((val - min) / range) * chartH;

    ctx.clearRect(0, 0, displayW, displayH);

    const overallUp = closes[closes.length - 1]! >= closes[0]!;
    const lineColor = overallUp ? '#22ec6c' : '#ff4336';

    // Filled area
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);
    for (let i = 0; i < closes.length; i++) ctx.lineTo(getX(i), getY(closes[i]!));
    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, lineColor + '40');
    grad.addColorStop(1, lineColor + '08');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < closes.length; i++) {
      const px = getX(i); const py = getY(closes[i]!);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // High marker
    const hx = getX(maxIdx), hy = getY(max);
    ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#22ec6c'; ctx.fill();
    ctx.font = '600 10px Verdana, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = maxIdx > closes.length * 0.7 ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`H: ${formatPrice(max)}`, hx + (maxIdx > closes.length * 0.7 ? -6 : 6), hy - 5);

    // Low marker
    const lx = getX(minIdx), ly = getY(min);
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4336'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = minIdx > closes.length * 0.7 ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`L: ${formatPrice(min)}`, lx + (minIdx > closes.length * 0.7 ? -6 : 6), ly + 5);

    // Y-axis labels
    ctx.font = '500 9px Verdana, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(formatPrice(max), padLeft, padTop - 16);
    ctx.textBaseline = 'bottom';
    ctx.fillText(formatPrice(min), padLeft, padTop + chartH + 16);

    // ── Crosshair tooltip ──
    const hover = hoverRef.current;
    if (hover && hover.x >= padLeft && hover.x <= padLeft + chartW) {
      // Find nearest data point
      const ratio = (hover.x - padLeft) / chartW;
      const idx = Math.round(ratio * (closes.length - 1));
      const clampedIdx = Math.max(0, Math.min(closes.length - 1, idx));
      const snapX = getX(clampedIdx);
      const snapY = getY(closes[clampedIdx]!);
      const price = closes[clampedIdx]!;
      const ts = timestamps[clampedIdx]!;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(snapX, padTop);
      ctx.lineTo(snapX, padTop + chartH);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dot on line
      ctx.beginPath();
      ctx.arc(snapX, snapY, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(snapX, snapY, 2, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();

      // Tooltip box with price
      const priceText = formatPrice(price);
      ctx.font = '600 10px Verdana, Arial, sans-serif';
      const textW = ctx.measureText(priceText).width;
      const boxW = textW + 10;
      const boxH = 18;
      let boxX = snapX - boxW / 2;
      if (boxX < padLeft) boxX = padLeft;
      if (boxX + boxW > padLeft + chartW) boxX = padLeft + chartW - boxW;
      const boxY = snapY - boxH - 8;

      ctx.fillStyle = 'rgba(80,80,80,0.9)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceText, boxX + boxW / 2, boxY + boxH / 2);

      // Date label at bottom
      const dateText = formatDate(ts, !!useIntraday);
      ctx.font = '500 9px Verdana, Arial, sans-serif';
      const dateW = ctx.measureText(dateText).width;
      let dateX = snapX;
      ctx.textAlign = 'center';
      if (dateX - dateW / 2 < padLeft) dateX = padLeft + dateW / 2;
      if (dateX + dateW / 2 > padLeft + chartW) dateX = padLeft + chartW - dateW / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textBaseline = 'top';
      ctx.fillText(dateText, dateX, padTop + chartH + 4);
    }
  }, [fullData, intradayData, period]);

  // Redraw on data/period/resize
  useEffect(() => {
    if (!fullData) return;
    drawChart();
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => drawChart());
    observer.observe(parent);
    return () => observer.disconnect();
  }, [fullData, intradayData, drawChart]);

  // Mouse/touch hover handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fullData) return;

    const getPos = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMove = (e: MouseEvent) => {
      hoverRef.current = getPos(e);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawChart);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        hoverRef.current = getPos(e.touches[0]!);
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(drawChart);
      }
    };
    const onLeave = () => {
      hoverRef.current = null;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawChart);
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onLeave);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [fullData, drawChart]);

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <span className="text-xs text-white/40">Loading chart...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <span className="text-xs text-white/30">Chart unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <canvas ref={canvasRef} className="block w-full cursor-crosshair" />
    </div>
  );
}
